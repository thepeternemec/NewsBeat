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
      "X-NewsBeat-Traffic": "synthetic",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
    signal: AbortSignal.timeout(30000),
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

const start = Date.now();
const bitcoin = await call("tools/call", { name: "newsbeat_investment", arguments: { ticker: "BTC" } });
assert.notEqual(bitcoin.isError, true);
const brief = bitcoin.structuredContent;
const research = brief.research;
assert.equal(brief.ticker, "BTC");
assert.equal(research.assets[0].ticker, "BTC");
assert.ok(brief.stance);
const fresh = new Set(research.evidence.filter(item => item.freshness === "fresh").map(item => item.id));
console.log(JSON.stringify({ case: "BTC investment brief", method: research.method, coverage: research.assets[0].news_status,
  market: research.assets[0].market_status, failure: research.generation_error, fresh_evidence: fresh.size, elapsed_ms: Date.now() - start }));
if (fresh.size) {
  assert.equal(research.method, "reasoned", "fresh evidence should produce validated reasoning");
  assert.equal(research.generation_error, null);
  assert.ok(research.answer.answer.trim());
  assert.ok(research.answer.next_checks.length);
  for (const claim of research.answer.reasoning) {
    assert.ok(claim.evidence_ids.length);
    assert.ok(claim.evidence_ids.every(id => fresh.has(id)), "reasoning cites fresh supplied evidence");
  }
} else {
  assert.equal(brief.stance.state, "wait");
  assert.equal(research.answer, null);
}
console.log(JSON.stringify({ service: initialized.serverInfo.name, protocolVersion,
  tools: catalog.tools.length, research: "callable", ambiguity: "preserved" }));
