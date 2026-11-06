import assert from "node:assert/strict";
import { test } from "node:test";
import { CollectionRequestSchema } from "@newsbeat/contracts";
import app from "../index.js";
import { mcpResponse } from "./mcp.js";

test("fast collection requires an explicit one-minute request for an allowed asset", () => {
  const beat_id = "b_bb964843350e";
  assert.equal(CollectionRequestSchema.safeParse({ action: "start", beat_id }).success, false);
  assert.equal(CollectionRequestSchema.safeParse({ action: "start", beat_id, interval_seconds: 30 }).success, false);
  assert.equal(CollectionRequestSchema.safeParse({ action: "start", beat_id: "unknown", interval_seconds: 60 }).success, false);
  assert.equal(CollectionRequestSchema.safeParse({ action: "start", beat_id, interval_seconds: 60 }).success, true);
  assert.equal(CollectionRequestSchema.safeParse({ action: "status", beat_id }).success, true);
  assert.equal(CollectionRequestSchema.safeParse({ action: "stop", beat_id }).success, false);
});
test("malformed and cross-origin starts are rejected before scheduling", async () => {
  const a = await app.request("/v2/collection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", beat_id: "b_bb964843350e" }) });
  assert.equal(a.status, 400);
  const b = await app.request("http://localhost:3000/v2/collection", { method: "POST", headers: { origin: "https://example.com", "Content-Type": "application/json" }, body: "{}" });
  assert.equal(b.status, 403);
});
test("MCP labels collection control as a write while research tools remain read-only", async () => {
  const response = await mcpResponse(new Request("http://localhost:3000/api/mcp", { method: "POST", headers: { "Content-Type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }) }));
  const body = await response.json() as { result: { tools: Array<{ name: string; annotations: { readOnlyHint: boolean } }> } };
  assert.equal(body.result.tools.find(t => t.name === "newsbeat_collection")?.annotations.readOnlyHint, false);
  assert.ok(body.result.tools.filter(t => t.name !== "newsbeat_collection").every(t => t.annotations.readOnlyHint));
});
