/**
 * NewsGraph API.
 *
 * Read-only news interfaces: topics, articles, changes since a cursor, and an
 * MCP server for agent frameworks. This is the canonical source for the
 * mounted at `/api/*` by the Next app, so the site and the API are one
 * deployment. It also runs standalone on Node via `server.ts`.
 *
 * Anonymous news reads are public; account operations share metering across transports.
 */

import { db, hasDatabaseEnv } from "@newsgraph/db";
import { Hono } from "hono";
import { newsRoutes } from "./lib/news-routes.js";
import { rateLimit, rateLimits } from "./lib/limit.js";
import { keyRoutes } from "./lib/key-routes.js";
import { mcpResponse } from "./lib/mcp.js";

import { subscriptionRoutes } from "./lib/subscriptions.js";
import { bodyLimit } from "hono/body-limit";
import { openApi } from "./lib/openapi.js";
import { resourceMetadata } from "./lib/oauth.js";
const app = new Hono();
app.use(
  "*",
  bodyLimit({
    maxSize: 65536,
    onError: (c) =>
      c.json(
        {
          error: {
            code: "request_too_large",
            message: "Maximum request size is 64 KB",
          },
        },
        413,
      ),
  }),
);

app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  c.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, MCP-Protocol-Version, MCP-Session-Id",
  );
  c.header(
    "Access-Control-Expose-Headers",
    "WWW-Authenticate, Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
  );
  if (c.req.method === "OPTIONS") return c.body(null, 204);
  await next();
});

// Counting happens before routing, so refused requests cost one indexed upsert.
app.use("*", rateLimit);

app.get("/openapi.json", (c) => c.json(openApi(new URL(c.req.url).origin)));
app.get("/.well-known/oauth-protected-resource", (c) => {
  const data = resourceMetadata();
  return c.json(data ?? { error: "OAuth not configured" }, data ? 200 : 503);
});
app.get("/health", (c) =>
  c.json({ ok: true, service: "newsgraph", version: "0.4.0" }),
);

app.get("/ready", async (c) => {
  if (!hasDatabaseEnv())
    return c.json({ ready: false, reason: "database_unavailable" }, 503);
  try {
    const sql = db();
    const [row] =
      await sql`select to_regclass('public.usage_reservations') is not null and to_regclass('public.news_documents') is not null and to_regclass('public.account_sessions') is not null and to_regclass('public.news_subscriptions') is not null as ready`;
    return c.json(
      {
        ready: !!row?.ready,
        version: "0.4.0",
        cron_configured: !!process.env.CRON_SECRET,
        webhooks_configured: !!process.env.NEWSGRAPH_WEBHOOK_SECRET,
      },
      row?.ready ? 200 : 503,
    );
  } catch {
    return c.json({ ready: false, reason: "database_unavailable" }, 503);
  }
});
app.get("/", (c) =>
  c.json({
    service: "NewsGraph",
    docs: "https://newsgraph.vercel.app/docs",
    repo: "https://github.com/thepeternemec/NewsGraph",
    routes: [
      "/v2/search",
      "/v2/story",
      "/v2/subscriptions",
      "/openapi.json",
      "/ready",
      "/v2/topics",
      "/v2/news",
      "/v2/changes",
      "/v2/watch",
      "/v2/brief",
      "/v2/stories",
      "/v2/tools",
      "/mcp",
      "/health",
      "/keys/authorize",
    ],
    rate_limits: rateLimits,
  }),
);

app.route("/v2", newsRoutes);
app.route("/v2/subscriptions", subscriptionRoutes);
// Self-serve keys. Separate from /v2 because it is not a news route.
app.route("/keys", keyRoutes);
app.all("/mcp", (c) => mcpResponse(c.req.raw, c.get("principal")));

export default app;
