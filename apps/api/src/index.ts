/**
 * Black Sheep API.
 *
 * Read-only news interfaces: topics, articles, changes since a cursor, and an
 * MCP server for agent frameworks. This is the canonical source for the
 * mounted at `/api/*` by the Next app, so the site and the API are one
 * deployment. It also runs standalone on Node via `server.ts`.
 *
 * No credential is required. There is no billing here.
 */

import { Hono } from "hono";
import { newsRoutes } from "./lib/news-routes.js";
import { rateLimit, rateLimits } from "./lib/limit.js";
import { keyRoutes } from "./lib/key-routes.js";
import { mcpResponse } from "./lib/mcp.js";
import { marketplaceRoutes } from "./lib/marketplace.js";
import { operationRoutes } from "./lib/operations.js";
export { runOperationalCheck } from "./lib/operations.js";

const app = new Hono();

app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  c.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, MCP-Protocol-Version, MCP-Session-Id",
  );
  if (c.req.method === "OPTIONS") return c.body(null, 204);
  await next();
});

// Counting happens before routing, so refused requests cost one indexed upsert.
// Status reads remain available without rate-limit or account billing dependencies.
app.route("/status", operationRoutes);
// Authenticated GitHub deliveries must not depend on news quotas or account balances.
app.route("/webhooks/github/marketplace", marketplaceRoutes);
app.use("*", rateLimit);

app.get("/health", (c) => c.json({ ok: true, service: "blacksheep", version: "0.3.0" }));

app.get("/", (c) =>
  c.json({
    service: "Black Sheep",
    docs: "https://www.newsbeat.dev/docs",
    repo: "https://github.com/thepeternemec/black-sheep",
    routes: ["/v2/topics", "/v2/news", "/v2/changes", "/v2/watch", "/v2/brief", "/v2/stories", "/v2/summary", "/v2/tools", "/mcp", "/health", "/status", "/status/feed", "/keys/authorize"],
    rate_limits: rateLimits,
  }),
);

app.route("/v2", newsRoutes);
  // Self-serve keys. Separate from /v2 because it is not a news route.
  app.route("/keys", keyRoutes);
app.all("/mcp", (c) => mcpResponse(c.req.raw));

export default app;
