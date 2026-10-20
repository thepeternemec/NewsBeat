import assert from "node:assert/strict";
import { test } from "node:test";
import { SEED_BEATS } from "@newsbeat/contracts";
import { TOPIC_PAGE_MAX } from "./news.js";
import { boundedPage, readCursor, signCursor } from "./news.js";
import { mcpResponse } from "./mcp.js";
process.env.NEWSBEAT_CURSOR_SECRET = "unit-test-key-never-for-production";
const beat = "b_bb964843350e";
test("signed cursor is topic-bound, operation-bound, tamper resistant, and expires", async () => {
    const cursor = await signCursor(beat, "9007199254740999", "changes", 1000);
    assert.equal(await readCursor(cursor, beat, "changes", 2000), "9007199254740999");
    await assert.rejects(() => readCursor(cursor, "b_191edd8895e2", "changes", 2000), /another topic/);
    await assert.rejects(() => readCursor(cursor, beat, "history", 2000), /another topic/);
    const [payload, signature] = cursor.split(".");
    const changed = Buffer.from(JSON.stringify({ v: 2, b: beat, s: "999", m: "changes", e: 999999999 })).toString("base64url");
    await assert.rejects(() => readCursor(`${changed}.${signature}`, beat, "changes", 2000), /invalid/);
    await assert.rejects(() => readCursor(cursor, beat, "changes", 31 * 86400000), /expired/);
});
test("budget trimming preserves an ordered prefix and advertises unread rows", () => {
    const rows = Array.from({ length: 9 }, (_, i) => ({ id: i, text: "x".repeat(500) }));
    const result = boundedPage(rows, 500);
    assert.deepEqual(result.items.map(x => x.id), [0, 1]);
    assert(result.has_more);
    assert(result.estimated_tokens <= 500);
    assert.equal(boundedPage([]).has_more, false);
});
test("MCP rejects cross-origin requests and negotiates with standard client headers", async () => {
    const payload = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } } };
    const request = (origin?: string) => new Request("http://localhost:8787/mcp", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(payload) });
    assert.equal((await mcpResponse(request("https://untrusted.example"))).status, 403);
    const response = await mcpResponse(request());
    assert.equal(response.status, 200);
    const body = await response.json() as {
        result: {
            serverInfo: {
                name: string;
            };
            capabilities: {
                tools: unknown;
            };
        };
    };
    assert.equal(body.result.serverInfo.name, "newsbeat");
    assert(body.result.capabilities.tools);
});

test("one page can reach every topic", () => {
  // This has been wrong twice: 1000 against a 1035 catalog, then 2000 against
  // 2030. Both times the topics past the cap were served by `q`, so nothing looked
  // broken — you simply could not page to them. The cap must never be the reason
  // a topic is unreachable.
  assert.ok(
    TOPIC_PAGE_MAX >= SEED_BEATS.length,
    `TOPIC_PAGE_MAX is ${TOPIC_PAGE_MAX} but the catalog is ${SEED_BEATS.length}; ${SEED_BEATS.length - TOPIC_PAGE_MAX} topics cannot be paged to`,
  );
});
