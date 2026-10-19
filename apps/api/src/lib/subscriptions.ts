import { Hono } from "hono";
import { z } from "zod";
import { randomBytes, randomUUID } from "node:crypto";
import { db, env } from "@newsgraph/db";
import { OperationSchemas } from "@newsgraph/contracts";
import { executeOperation, type Principal } from "./operations.js";
import { seal, unseal, webhookTarget, deliverWebhook } from "./webhooks.js";
const input = z
  .object({
    label: z.string().trim().min(1).max(80),
    operation: z.enum(["watch", "search"]),
    arguments: z.unknown(),
    webhook_url: z.string().url().max(2048),
    interval_minutes: z.number().int().min(15).max(1440).default(15),
  })
  .strict();
export const subscriptionRoutes = new Hono();
subscriptionRoutes.use("*", async (c, next) => {
  const p = c.get("principal");
  if (!p?.accountId)
    return c.json(
      {
        error: {
          code: "authentication_required",
          message: "Use an account API key or OAuth access token.",
        },
      },
      401,
    );
  if (!p.scopes.includes("watches:write"))
    return c.json(
      {
        error: {
          code: "insufficient_scope",
          message: "watches:write permission is required.",
        },
      },
      403,
    );
  c.header("Cache-Control", "no-store");
  await next();
});
subscriptionRoutes.get("/", async (c) => {
  const sql = db();
  const rows =
    await sql`select id,label,operation,interval_minutes,enabled,next_run_at,last_error,created_at from news_subscriptions where account_id=${c.get("principal").accountId!} order by created_at desc`;
  return c.json({ subscriptions: rows });
});
subscriptionRoutes.post("/", async (c) => {
  if (!env("NEWSGRAPH_WEBHOOK_SECRET"))
    return c.json(
      {
        error: {
          code: "delivery_unavailable",
          message: "Webhook delivery is not configured.",
        },
      },
      503,
    );
  const parsed = input.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success)
    return c.json(
      { error: { code: "invalid_request", message: parsed.error.message } },
      400,
    );
  const data = parsed.data,
    args = OperationSchemas[data.operation].safeParse(data.arguments);
  if (!args.success)
    return c.json(
      { error: { code: "invalid_request", message: args.error.message } },
      400,
    );
  try {
    await webhookTarget(data.webhook_url);
  } catch {
    return c.json(
      {
        error: {
          code: "invalid_webhook",
          message: "Use an accessible public HTTPS webhook.",
        },
      },
      400,
    );
  }
  const secret = randomBytes(32).toString("hex"),
    cipher = seal(secret),
    sql = db(),
    account = c.get("principal").accountId!;
  const id = await sql.begin(async (tx) => {
    await tx`select account_id from accounts where account_id=${account} for update`;
    const [count] =
      await tx`select count(*)::int as n from news_subscriptions where account_id=${account}`;
    if (Number(count?.n) >= 20) return null;
    const [row] =
      await tx`insert into news_subscriptions(account_id,label,operation,arguments,webhook_url,secret_cipher,interval_minutes) values (${account},${data.label},${data.operation},${tx.json(args.data)},${data.webhook_url},${cipher},${data.interval_minutes}) returning id`;
    return row!.id;
  });
  if (!id)
    return c.json(
      {
        error: {
          code: "subscription_limit",
          message: "Maximum 20 subscriptions per account.",
        },
      },
      409,
    );
  return c.json(
    {
      id,
      webhook_secret: secret,
      note: "Save this signing secret now. Deliveries are at least once; deduplicate x-newsgraph-delivery. Watches use your account credit.",
    },
    201,
  );
});
subscriptionRoutes.post("/:id/pause", async (c) => {
  const id = z.string().uuid().safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "Invalid id" }, 400);
  const sql = db();
  const rows =
    await sql`update news_subscriptions set enabled=false where id=${id.data} and account_id=${c.get("principal").accountId!} returning id`;
  return c.json({ paused: rows.length > 0 });
});
subscriptionRoutes.post("/:id/resume", async (c) => {
  const id = z.string().uuid().safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "Invalid id" }, 400);
  const sql = db();
  const rows =
    await sql`update news_subscriptions set enabled=true,next_run_at=now() where id=${id.data} and account_id=${c.get("principal").accountId!} returning id`;
  return c.json({ resumed: rows.length > 0 });
});
export function advanceArguments(
  operation: "watch" | "search",
  args: any,
  result: any,
) {
  if (operation === "search")
    return { ...args, before: undefined, cursor: result.cursor };
  return {
    ...args,
    watches: args.watches.map((watch: any, i: number) => {
      const row = result.results[i];
      // Expiry requires a new baseline; report it in this delivery, recover on the next check.
      if (row.error?.code === "cursor_expired")
        return { beat_id: watch.beat_id };
      return row.error ? watch : { beat_id: watch.beat_id, cursor: row.cursor };
    }),
  };
}
export async function runSubscriptions(
  deps = { database: db, execute: executeOperation, deliver: deliverWebhook },
) {
  const sql = deps.database();
  let checked = 0,
    delivered = 0;
  const deadline = Date.now() + 45000;
  const lease = randomUUID();
  const due =
    await sql`update news_subscriptions set lease_until=now()+interval '5 minutes',lease_token=${lease} where id in (select id from news_subscriptions where enabled and next_run_at<=now() and (lease_until is null or lease_until<now()) order by next_run_at for update skip locked limit 5) returning *`;
  for (const sub of due) {
    if (Date.now() > deadline) break;
    try {
      const p: Principal = {
        accountId: sub.account_id,
        keyHash: null,
        kind: "key",
        scopes: ["news:read", "watches:write"],
      };
      const result: any = await deps.execute(sub.operation, sub.arguments, p);
      const next = advanceArguments(sub.operation, sub.arguments, result);
      const hasMore =
        sub.operation === "search"
          ? result.has_more
          : result.results.some((r: any) => r.has_more);
      const changed =
        sub.operation === "search"
          ? result.items.length > 0
          : result.moved > 0 || result.failed > 0;
      const unhealthy =
        sub.operation === "search"
          ? result.freshness.status !== "fresh"
          : result.results.some((r: any) => r.freshness?.status !== "fresh");
      await sql.begin(async (tx) => {
        const active =
          await tx`select id from news_subscriptions where id=${sub.id} and enabled and lease_token=${lease} for update`;
        if (!active.length) return;
        if (changed || unhealthy)
          await tx`insert into news_deliveries(id,subscription_id,payload) values (${randomUUID()},${sub.id},${tx.json({ type: "news.changed", subscription_id: sub.id, created_at: new Date().toISOString(), result })})`;
        await tx`update news_subscriptions set arguments=${tx.json(next)},next_run_at=now()+(${hasMore ? 1 : sub.interval_minutes}::text||' minutes')::interval,lease_until=null,lease_token=null,last_error=null where id=${sub.id} and lease_token=${lease}`;
      });
      checked++;
    } catch (error) {
      const code = (error as any).code ?? "check_failed";
      if (code === "cursor_expired" && sub.operation === "search") {
        const args = { ...sub.arguments };
        delete args.cursor;
        delete args.before;
        await sql`update news_subscriptions set arguments=${sql.json(args)} where id=${sub.id} and lease_token=${lease}`;
      }
      await sql`update news_subscriptions set lease_until=null,lease_token=null,last_error=${code},next_run_at=now()+interval '15 minutes' where id=${sub.id} and lease_token=${lease}`;
    }
  }
  await sql`update news_subscriptions set lease_until=null,lease_token=null where lease_token=${lease}`;
  const deliveryLease = randomUUID();
  const pending =
    await sql`update news_deliveries set lease_until=now()+interval '5 minutes',lease_token=${deliveryLease} where id in (select d.id from news_deliveries d join news_subscriptions s on s.id=d.subscription_id where s.enabled and d.delivered_at is null and d.failed_at is null and d.next_attempt_at<=now() and (d.lease_until is null or d.lease_until<now()) order by d.created_at for update of d skip locked limit 5) returning *`;
  for (const delivery of pending) {
    if (Date.now() > deadline) break;
    const [sub] =
      await sql`select webhook_url,secret_cipher,enabled from news_subscriptions where id=${delivery.subscription_id}`;
    if (!sub?.enabled) continue;
    try {
      await deps.deliver(
        sub.webhook_url,
        unseal(sub.secret_cipher),
        delivery.id,
        delivery.payload,
      );
      await sql`update news_deliveries set delivered_at=now(),lease_until=null,lease_token=null where id=${delivery.id} and lease_token=${deliveryLease}`;
      delivered++;
    } catch {
      const attempts = Number(delivery.attempts) + 1;
      await sql`update news_deliveries set attempts=${attempts},last_error='delivery_failed',failed_at=${attempts >= 8 ? new Date() : null},next_attempt_at=now()+(${Math.min(1440, 2 ** attempts)}::text||' minutes')::interval,lease_until=null,lease_token=null where id=${delivery.id} and lease_token=${deliveryLease}`;
    }
  }
  await sql`update news_deliveries set lease_until=null,lease_token=null where lease_token=${deliveryLease}`;
  return { checked, delivered };
}
