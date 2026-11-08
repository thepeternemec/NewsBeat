import assert from "node:assert/strict";

const endpoint = "https://www.newsbeat.dev/api/mcp";
let protocolVersion = "2025-03-26";
let id = 0;
async function call(method, params) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": protocolVersion,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, 200, method + " HTTP status");
  const body = await response.json();
  assert.equal(body.id, id);
  assert.equal(body.error, undefined, method + " protocol error");
  assert.ok(body.result, method + " result");
  return body.result;
}

const initialized = await call("initialize", {
  protocolVersion, capabilities: {},
  clientInfo: { name: "newsbeat-ci", version: "1.0" },
});
assert.equal(initialized.serverInfo.name, "newsbeat");
assert.ok(initialized.instructions.includes("newsbeat_research"));
protocolVersion = initialized.protocolVersion;

const catalog = await call("tools/list", {});
assert.ok(catalog.tools.some(tool => tool.name === "newsbeat_research"));
assert.equal(new Set(catalog.tools.map(tool => tool.name)).size, catalog.tools.length);

const called = await call("tools/call", {
  name: "newsbeat_research", arguments: { question: "What happened with SUI?" },
});
assert.notEqual(called.isError, true);
assert.equal(called.structuredContent.status, "needs_clarification");
assert.equal(called.structuredContent.answer, null);
assert.deepEqual(called.structuredContent.candidates.map(asset => asset.asset).sort(), ["crypto", "equity"]);
console.log(JSON.stringify({ service: initialized.serverInfo.name, protocolVersion,
  tools: catalog.tools.length, research: "callable", ambiguity: "preserved" }));
