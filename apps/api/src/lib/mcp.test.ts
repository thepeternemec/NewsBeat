import assert from "node:assert/strict";
import { test } from "node:test";
import { NEWS_TOOLS, type CatalystRadar, type InvestmentBrief, type ResearchResponse } from "@newsbeat/contracts";
import { mcpResponse } from "./mcp.js";

type RpcBody<T> = {
  error?: unknown;
  result?: {
    serverInfo?: { name: string; title?: string };
    instructions?: string;
    tools?: Array<{ name: string }>;
    structuredContent?: T;
    isError?: boolean;
  };
};

async function call<T = ResearchResponse>(method: string, params: unknown) {
  const response = await mcpResponse(new Request("https://www.newsbeat.dev/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2025-03-26" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  }));
  assert.equal(response.status, 200);
  const body = await response.json() as RpcBody<T>;
  assert.equal(body.error, undefined);
  return body.result;
}

test("MCP initializes through the Streamable HTTP transport and publishes research guidance", { timeout: 10000 }, async () => {
  const result = await call("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "newsbeat-test", version: "1.0" } });
  assert.equal(result?.serverInfo?.name, "newsbeat");
  assert.equal(result?.serverInfo?.title, "Rarebird");
  assert.ok(result?.instructions?.includes("newsbeat_research"));
});

test("MCP transport advertises exactly the shared tool catalog", { timeout: 10000 }, async () => {
  const result = await call("tools/list", {});
  assert.ok(result?.tools);
  assert.deepEqual(new Set(result.tools.map(tool => tool.name)), new Set(NEWS_TOOLS.map(tool => tool.name)));
});

test("MCP research preserves ambiguous identities without storage or generation", { timeout: 10000 }, async () => {
  const result = await call("tools/call", { name: "newsbeat_research", arguments: { question: "What happened with SUI?" } });
  assert.notEqual(result?.isError, true);
  assert.equal(result?.structuredContent?.status, "needs_clarification");
  assert.equal(result?.structuredContent?.answer, null);
  assert.deepEqual(result?.structuredContent?.candidates.map(asset => asset.asset).sort(), ["crypto", "equity"]);
});

test("MCP transport distinguishes application tool failures from protocol failures", { timeout: 10000 }, async () => {
  const result = await call("tools/call", { name: "newsbeat_nonexistent", arguments: {} });
  assert.equal(result?.isError, true);
});

test("MCP exposes filing coverage through the Rarebird alias", { timeout: 10000 }, async () => {
  const result = await call<CatalystRadar>("tools/call", { name: "rarebird_catalysts", arguments: { beat_id: "b_06c91290de1c" } });
  assert.notEqual(result?.isError, true);
  assert.equal(result?.structuredContent?.coverage[0]?.status, "unsupported");
  assert.deepEqual(result?.structuredContent?.items, []);
});

test("MCP ticker lookup asks users to disambiguate a shared symbol", async () => {
  const result = await call<InvestmentBrief>("tools/call", { name: "rarebird_investment", arguments: { ticker: "SUI" } });
  assert.equal(result?.structuredContent?.stance, null);
  assert.deepEqual(result?.structuredContent?.research.candidates.map(asset => asset.asset).sort(), ["crypto", "equity"]);
});
