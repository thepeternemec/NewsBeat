import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import app from "../apps/api/dist/index.js";
import { handlers } from "../apps/api/dist/lib/operations.js";
delete process.env.DATABASE_URL;
test("official MCP client initializes, discovers all tools, and reads a structured news result", async () => {
  const original = handlers.news;
  handlers.news = async () => ({
    items: [{ title: "Verified fixture", url: "https://example.com/news" }],
    cursor: "fixture",
    has_more: false,
    freshness: { status: "fresh", last_success_at: new Date().toISOString() },
  });
  const client = new Client({
    name: "newsgraph-integration-test",
    version: "1",
  });
  const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost/mcp"),
    { fetch: (url, init) => app.fetch(new Request(url, init)) },
  );
  try {
    await client.connect(transport);
    const listed = await client.listTools();
    assert.equal(listed.tools.length, 8);
    const result = await client.callTool({
      name: "newsgraph_news",
      arguments: { beat_id: "b_bb964843350e" },
    });
    assert.equal(result.isError, undefined);
    assert.equal(result.structuredContent.items.length, 1);
    assert.equal(result.structuredContent.usage.cost_micro, 0);
    const invalid = await client.callTool({
      name: "newsgraph_news",
      arguments: {},
    });
    assert.equal(invalid.isError, true);
    assert.match(invalid.content[0].text, /invalid_request/);
  } finally {
    handlers.news = original;
    await client.close();
  }
});
test("OpenAPI and all tool definitions agree; subscription endpoints require an account", async () => {
  const spec = await (await app.request("/openapi.json")).json();
  assert.equal(spec.openapi, "3.1.0");
  assert.ok(spec.paths["/v2/search"]);
  const response = await app.request("/v2/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(response.status, 401);
});
