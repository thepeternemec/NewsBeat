import type { Context, Next } from "hono";
import {
  consumeRateLimit,
  db,
  env,
  hasDatabaseEnv,
  hashKey,
  resolveKey,
} from "@newsgraph/db";
import { ANONYMOUS, type Principal } from "./operations.js";
import { oauthPrincipal, challenge } from "./oauth.js";
declare module "hono" {
  interface ContextVariableMap {
    principal: Principal;
  }
}
const ANON_LIMIT = Math.max(1, Number(env("NEWSGRAPH_RATE_ANON") ?? 120));
const KEYED_LIMIT = Math.max(1, Number(env("NEWSGRAPH_RATE_KEYED") ?? 1200));
export const rateLimits = {
  anonymous: `${ANON_LIMIT}/minute`,
  with_key: `${KEYED_LIMIT}/minute`,
};
export async function rateLimit(c: Context, next: Next) {
  c.set("principal", ANONYMOUS);
  if (
    c.req.method === "OPTIONS" ||
    /\/(health|ready|openapi.json)$/.test(c.req.path) ||
    c.req.path.includes(".well-known")
  )
    return next();
  const authorization = c.req.header("authorization");
  const secret = authorization?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (authorization && !secret)
    return c.json(
      {
        error: {
          code: "invalid_token",
          message: "Use a Bearer token in Authorization.",
        },
      },
      401,
    );
  if (secret && !hasDatabaseEnv())
    return c.json(
      {
        error: {
          code: "service_unavailable",
          message: "Credential storage is unavailable.",
        },
      },
      503,
    );
  let principal = ANONYMOUS;
  if (secret) {
    if (secret.startsWith("ng_")) {
      let key;
      try {
        key = await resolveKey(db(), secret);
      } catch {
        return c.json(
          {
            error: {
              code: "service_unavailable",
              message: "Credential storage is unavailable.",
            },
          },
          503,
        );
      }
      if (key)
        principal = {
          accountId: key.accountId,
          keyHash: key.keyHash,
          kind: "key",
          scopes: ["news:read", "watches:write"],
        };
      else {
        c.header("WWW-Authenticate", challenge(new URL(c.req.url).origin));
        return c.json(
          {
            error: {
              code: "invalid_token",
              message: "This key is invalid or revoked.",
            },
          },
          401,
        );
      }
    } else {
      try {
        principal = await oauthPrincipal(secret);
      } catch {
        c.header("WWW-Authenticate", challenge(new URL(c.req.url).origin));
        return c.json(
          {
            error: {
              code: "invalid_token",
              message:
                "The access token is invalid, expired, or lacks news:read permission.",
            },
          },
          401,
        );
      }
    }
  }
  if (
    c.req.path.endsWith("/mcp") &&
    env("NEWSGRAPH_REQUIRE_MCP_AUTH") === "true" &&
    principal.kind === "anonymous"
  ) {
    c.header("WWW-Authenticate", challenge(new URL(c.req.url).origin));
    return c.json(
      {
        error: {
          code: "authentication_required",
          message: "Connect your NewsGraph account.",
        },
      },
      401,
    );
  }
  c.set("principal", principal);
  if (!hasDatabaseEnv()) return next();
  try {
    const address =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      "unknown";
    const bucket = principal.accountId
      ? `account:${principal.accountId}`
      : principal.keyHash
        ? `key:${principal.keyHash}`
        : `ip:${await hashKey(address)}`;
    const limit = principal.kind === "anonymous" ? ANON_LIMIT : KEYED_LIMIT;
    const rate = await consumeRateLimit(db(), bucket, limit);
    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(rate.remaining));
    c.header("X-RateLimit-Reset", String(rate.resetSeconds));
    if (!rate.allowed) {
      c.header("Retry-After", String(rate.resetSeconds));
      return c.json(
        {
          error: { code: "rate_limited", message: "Request limit reached." },
          retry_after_seconds: rate.resetSeconds,
        },
        429,
      );
    }
  } catch {
    return c.json(
      {
        error: {
          code: "service_unavailable",
          message: "Request accounting is temporarily unavailable.",
        },
      },
      503,
    );
  }
  await next();
}
