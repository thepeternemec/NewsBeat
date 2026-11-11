import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTokenAsset, TOKENIZED_EQUITIES, type TokenIntelligence } from "@newsbeat/contracts";
import app from "../index.js";
import { matchTokenPools, readTokenIntelligence } from "./token-intelligence.js";

const address = "0x" + "cafe".repeat(10);
const pair = (suffix: string, liquidity: number, base = address) => ({
  chainId: "base", dexId: "example-dex", pairAddress: "0x" + suffix.repeat(40),
  baseToken: { address: base, name: "Example token", symbol: "TEST" },
  quoteToken: { address, symbol: "USDC" }, priceUsd: "0.000004812",
  liquidity: { usd: liquidity }, volume: { h24: 1234 }, priceChange: { h24: -0.25 },
});

test("token identity includes the chain and preserves Solana mint case", () => {
  const solana = TOKENIZED_EQUITIES[0]!.addresses.solana;
  assert.deepEqual(parseTokenAsset("solana:" + solana), { chain: "solana", address: solana });
  assert.deepEqual(parseTokenAsset("base:" + address.toUpperCase()), { chain: "base", address });
  for (const invalid of [address, "NVDAx", "ethereum:" + address + ",more", "unknown:" + address, "solana:" + address]) {
    assert.equal(parseTokenAsset(invalid), null);
  }
});

test("market readings exclude wrong chains, wrong contracts and quote-only matches", () => {
  const result = matchTokenPools("base", address, [
    pair("1", 10), pair("2", 500, address.toUpperCase()), pair("2", 250),
    pair("3", 600, "0x" + "f".repeat(40)), { ...pair("4", 700), chainId: "ethereum" },
  ]);
  assert.equal(result.matching_pools, 2);
  assert.equal(result.pools[0]?.liquidity_usd, 500);
  assert.equal(result.pools[0]?.price_usd, 0.000004812);
  assert.equal(result.pools[0]?.change_24h_pct, -0.25);
});

test("REST and the MCP alias use the same exact-contract pool data", async t => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async (url: string) => {
    requests++;
    assert.equal(url, "https://api.dexscreener.com/token-pairs/v1/base/" + address);
    return Response.json([pair("1", 10)]);
  });
  const asset = "base:" + address;
  const invalid = await app.request("/v2/tokens?asset=NVDAx");
  assert.equal(invalid.status, 400);
  const rest = await app.request("/v2/tokens?" + new URLSearchParams({ asset }));
  assert.equal(rest.status, 200);
  const direct = await rest.json() as TokenIntelligence;
  assert.equal(direct.market.status, "fresh");
  assert.equal(direct.registry, null);
  const mcp = await app.request("/mcp", { method: "POST", headers: {
    "content-type": "application/json", accept: "application/json, text/event-stream",
  }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "rarebird_token_intelligence", arguments: { asset } } }) });
  assert.equal(mcp.status, 200);
  const mcpPayload = await mcp.json() as { result: { structuredContent: unknown } };
  assert.deepEqual(mcpPayload.result.structuredContent, direct);
  assert.equal(requests, 1);
});

test("issuer coverage survives a pool outage and never carries across chains", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  const issuer = TOKENIZED_EQUITIES[0]!;
  const [known, wrongChain] = await Promise.all([
    readTokenIntelligence("solana:" + issuer.addresses.solana),
    readTokenIntelligence("base:" + issuer.addresses.ethereum),
  ]);
  assert.equal(known.registry?.ticker, "NVDA");
  assert.equal(known.asset.symbol, "NVDAx");
  assert.equal(known.market.status, "unavailable");
  assert.equal(wrongChain.registry, null);
  assert.equal(wrongChain.underlying_news, null);
});
