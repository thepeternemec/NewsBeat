/**
 * Rate limiting.
 *
 * Keys are **optional**. An anonymous caller is limited by address; a keyed one
 * gets a higher ceiling. Nothing in the public contract changes — the project
 * documents the API as needing no credential in six places, and that stays true.
 *
 * Fails **open**. If the counter is unreachable the request is served rather
 * than refused: this is a free read API, and an outage in the limiter should not
 * become an outage in the product.
 */
import type { Context, Next } from "hono";
import {
  consumeRateLimit,
  costFor,
  openBalance,
  db,
  env,
  hasDatabaseEnv,
  hashKey,
  recordUsage,
  resolveKey,
  spend,
} from "@newsgraph/db";

const ANON_LIMIT = Math.max(1, Number(env("NEWSGRAPH_RATE_ANON") ?? 120));
const KEYED_LIMIT = Math.max(1, Number(env("NEWSGRAPH_RATE_KEYED") ?? 1200));

/** Advertised at the API root so clients can discover the ceiling. */
export const rateLimits = { anonymous: `${ANON_LIMIT}/minute`, with_key: `${KEYED_LIMIT}/minute` };

/** Vercel sets x-forwarded-for; the left-most entry is the client. */
function clientAddress(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return c.req.header("x-real-ip") ?? "unknown";
}

export async function rateLimit(c: Context, next: Next): Promise<Response | void> {
  // Preflights and liveness probes are not work and are not counted.
  if (c.req.method === "OPTIONS" || c.req.path.endsWith("/health") || !hasDatabaseEnv()) {
    return next();
  }

  const header = c.req.header("authorization") ?? "";
  const secret = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";

  let sql;
  try {
    sql = db();
  } catch {
    return next();
  }

  let bucket = "";
  let limit = ANON_LIMIT;
  let identified = false;
  let accountId: string | null = null;
  try {
    const key = secret ? await resolveKey(sql, secret) : null;
    if (key) {
      bucket = `key:${key.keyHash}`;
      limit = KEYED_LIMIT;
      identified = true;
      accountId = key.accountId;
      c.header("X-RateLimit-Tier", "keyed");
    } else {
      // The address is hashed, never stored: a limiter does not need to know who.
      bucket = `ip:${await hashKey(clientAddress(c))}`;
      c.header("X-RateLimit-Tier", "anonymous");
    }

    const result = await consumeRateLimit(sql, bucket, limit);
    c.header("X-RateLimit-Limit", String(result.limit));
    c.header("X-RateLimit-Remaining", String(result.remaining));
    c.header("X-RateLimit-Reset", String(result.resetSeconds));

    if (!result.allowed) {
      c.header("Retry-After", String(result.resetSeconds));
      return c.json(
        {
          error: "rate_limited",
          detail: identified
            ? `This key allows ${result.limit} requests a minute. Retry in ${result.resetSeconds}s.`
            : `Anonymous callers are limited to ${result.limit} requests a minute. Retry in ${result.resetSeconds}s, or use a key for a higher ceiling.`,
          limit: result.limit,
          retry_after_seconds: result.resetSeconds,
        },
        429,
      );
    }
  } catch {
    // Counter unavailable — serve the request.
  }

  // A key that belongs to an account is metered; a hand-issued key is the
  // operator's own and is not. Checked **before** the work: a 402 after the query
  // has run is a refusal that already cost us the thing being refused.
  if (accountId) {
    try {
      // `openBalance` rather than `balanceFor`, because it is idempotent and
      // creates the trial grant when the row is missing. An account that
      // predates this code has no row, and "no row" must not mean "no money" —
      // that would refuse every existing key the first time it was used.
      const balance = await openBalance(sql, accountId);
      c.header("X-Newsgraph-Credits-Micro", String(balance.availableMicro));
      if (balance.availableMicro <= 0) {
        // 402, not 429: this is not "you are going too fast", it is "there is
        // nothing left to spend". A 429 would tell them to retry, which would
        // fail identically forever.
        return c.json(
          {
            error: {
              code: "payment_required",
              message:
                "This key's balance is empty. Top up, or use the anonymous tier, which is free at 120 requests a minute.",
            },
            balance_micro: 0,
            top_up: "/pricing",
          },
          402,
        );
      }
    } catch {
      // Failing open, for the same reason the rate limiter does: an outage in our
      // billing is not the caller's problem.
    }
  }

  const started = Date.now();
  await next();
  // Hono returns void from next(); the response it produced is on the context.
  const response = c.res;
  const costMicro = costFor(c.req.path, await peekJson(response));
  c.header("X-Newsgraph-Cost-Micro", String(costMicro));

  const keyHash = bucket.startsWith("key:") ? bucket.slice(4) : null;
  if (accountId && costMicro > 0) {
    // Awaited, not fired and forgotten. This is a serverless function: the moment
    // the response returns the instance can be frozen and a floating promise never
    // lands. The first version recorded exactly zero rows for exactly that reason.
    //
    // The decrement and the ledger row are one transaction, so the balance can
    // never drift from the history that explains it.
    try {
      const { balance, charged } = await spend(sql, {
        accountId,
        keyHash,
        route: c.req.path,
        beatId: c.req.query("beat_id") ?? null,
        costMicro,
      });
      c.header("X-Newsgraph-Credits-Micro", String(balance.availableMicro));
      c.header("X-Newsgraph-Charged-Micro", String(charged));
    } catch (error) {
      console.error("spend failed:", error);
    }
  } else {
    // Anonymous and hand-issued keys: recorded so the prices can be checked
    // against traffic, but there is no balance to spend.
    await recordUsage(sql, {
      accountId: null,
      keyHash,
      route: c.req.path,
      beatId: c.req.query("beat_id") ?? null,
      costMicro,
      creditsAfter: null,
    });
  }
  c.header("X-Newsgraph-Ms", String(Date.now() - started));
  return response;
}

/**
 * Read a response body for costing without consuming it.
 *
 * Cost depends on the result — an empty check is 500 micro and one that moved is
 * 4000 — so the route alone cannot decide it. Cloning is the only way to look
 * without spending the body the client is about to receive.
 */
async function peekJson(response: Response): Promise<unknown> {
  try {
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("json")) return null;
    return await response.clone().json();
  } catch {
    return null;
  }
}
