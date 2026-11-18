import assert from "node:assert/strict";
import { test } from "node:test";
import { AgentRequestSchema, SEED_BEATS, type AgentRequest, type AgentTool, type MarketForecasts, type ResearchEvidence } from "@rarebird/contracts";
import { agentAssets, readAgentBriefing, runAgent } from "./agent.js";
import { fallbackAgentPlan, planAgent } from "./agent-plan.js";
import { extractAgentContract, forecastEvidence, sourcedEvidence, type AgentToolReading } from "./agent-tools.js";

const btc = SEED_BEATS.find(asset => asset.ticker === "BTC" && asset.asset === "crypto")!;
const eth = SEED_BEATS.find(asset => asset.ticker === "ETH" && asset.asset === "crypto")!;
const nvda = SEED_BEATS.find(asset => asset.ticker === "NVDA" && asset.asset !== "crypto")!;
const sui = SEED_BEATS.filter(asset => asset.ticker === "SUI");
const ev = (tool: AgentTool, freshness: ResearchEvidence["freshness"] = "fresh"): ResearchEvidence => ({
  id: "agent:" + tool, beat_id: btc.beat_id, text: "A sourced observation for " + tool + ".",
  kind: "measurement", source: "Example source", url: "https://example.com/observation", observed_at: new Date().toISOString(), freshness,
});
const reading = (evidence: ResearchEvidence[] = []): AgentToolReading => ({ evidence, assets: [], limitations: [], suggestions: [] });
const dependencies = (tools: AgentTool[], read = async (tool: AgentTool) => reading([ev(tool)])) => ({
  plan: async (input: AgentRequest) => ({ question: input.question, tools, context: "fundamentals" as const }),
  read,
  reason: async () => null,
});

test("a follow-up retains the asset; a named new subject replaces it", () => {
  const history = [{ question: "Research NVIDIA", beat_ids: [nvda.beat_id], tools: ["research" as const] }];
  const follow = AgentRequestSchema.parse({ question: "What are its risks?", history });
  assert.deepEqual(agentAssets(follow, fallbackAgentPlan(follow.question, follow.history)).assets.map(asset => asset.beat_id), [nvda.beat_id]);
  const changed = { ...follow, question: "What changed for Bitcoin?" };
  assert.deepEqual(agentAssets(changed, fallbackAgentPlan(changed.question, history)).assets.map(asset => asset.beat_id), [btc.beat_id]);
});

test("a comparison can add one asset to the prior scope without accepting invented planner assets", () => {
  const input = AgentRequestSchema.parse({ question: "Compare it with Ethereum", history: [{ question: "Bitcoin", beat_ids: [btc.beat_id] }] });
  assert.deepEqual(new Set(agentAssets(input, fallbackAgentPlan(input.question)).assets.map(asset => asset.beat_id)), new Set([btc.beat_id, eth.beat_id]));
  const invented = agentAssets({ ...input, question: "What about its risks?" }, { question: "Research NVIDIA", tools: ["research"], context: "risk" });
  assert.deepEqual(invented.assets.map(asset => asset.beat_id), [btc.beat_id]);
});

test("ambiguous tickers require a choice and that choice resolves on retry", async () => {
  assert(sui.length > 1);
  const ambiguous = await runAgent({ question: "Research SUI" }, undefined, dependencies(["research"]));
  assert.equal(ambiguous.status, "needs_clarification");
  assert.equal(ambiguous.tools.length, 0);
  const chosen = await runAgent({ question: "Research SUI", beat_ids: [sui[0]!.beat_id] }, undefined, dependencies(["research"]));
  assert.equal(chosen.candidates.length, 0);
  assert.equal(chosen.assets[0]!.beat_id, sui[0]!.beat_id);
});

test("broad forecasts and recommendations clear the previous company scope", () => {
  const history = [{ question: "Research NVIDIA", beat_ids: [nvda.beat_id] }];
  for (const question of ["Show the latest forecasts and their results", "What deserves attention right now?"]) {
    const input = AgentRequestSchema.parse({ question, history });
    assert.deepEqual(agentAssets(input, fallbackAgentPlan(question, history)).assets, []);
  }
});

test("fallback routing covers the app and carries tool context if planning is unavailable", async () => {
  const cases: Array<[string, AgentTool]> = [["Show forecasts", "forecasts"], ["What deserves attention?", "opportunities"],
    ["Current funding rates", "indicators"], ["Market sentiment", "market"], ["Ethereum gas", "chain"],
    ["Token contract pools", "token"], ["Apple earnings filings", "filings"], ["Bitcoin headlines", "reporting"],
    ["Investment brief for NVIDIA", "investment"], ["Connect Claude with MCP", "connections"], ["Discover recent developments", "discovery"]];
  for (const [question, tool] of cases) assert(fallbackAgentPlan(question).tools.includes(tool), question);
  const input = AgentRequestSchema.parse({ question: "Explain it more", history: [{ question: "Show forecasts", beat_ids: [btc.beat_id], tools: ["forecasts"] }] });
  const result = await planAgent(input, "test-credential", async () => new Response("Unavailable", { status: 503 }));
  assert.deepEqual(result.tools, ["forecasts"]);
  assert.match(result.question, /Bitcoin/);
});

test("contracts require a supported chain and valid address; addresses keep case where needed", () => {
  const address = "0x" + "aB".repeat(20);
  assert.equal(extractAgentContract("Check base:" + address), "base:" + address.toLowerCase());
  assert.equal(extractAgentContract("Check " + address), undefined);
  assert.equal(extractAgentContract("Check base:0x123"), undefined);
  assert.equal(extractAgentContract("Check solana:So11111111111111111111111111111111111111112"), "solana:So11111111111111111111111111111111111111112");
});

test("contract follow-ups reuse the last identified contract, never a replacement address's chain", async () => {
  const token_asset = "base:0x" + "a".repeat(40);
  let received: string | undefined;
  const services = { ...dependencies(["token"]), read: async (_tool: AgentTool, input: { tokenAsset?: string }) => {
    received = input.tokenAsset;
    return reading([ev("token")]);
  } };
  const history = [{ question: "Check this contract", beat_ids: [], tools: ["token"], token_asset }];
  const follow = await runAgent({ question: "How liquid are its pools?", history }, undefined, services);
  assert.equal(received, token_asset);
  assert.equal(follow.token_asset, token_asset);
  const replacement = await runAgent({ question: "Check 0x" + "b".repeat(40), history }, undefined, services);
  assert.equal(replacement.status, "needs_clarification");
});

test("one failed tool leaves the other sourced results usable", async () => {
  const result = await runAgent({ question: "What is the market sentiment and funding?" }, undefined, dependencies(["market", "indicators"], async tool => {
    if (tool === "market") throw new Error("Provider down");
    return reading([ev(tool)]);
  }));
  assert.equal(result.status, "partial");
  assert.equal(result.tools.find(tool => tool.id === "market")?.status, "unavailable");
  assert.equal(result.evidence.length, 1);
  assert(result.answer);
});

test("stale evidence never becomes a current answer or reaches the reasoning model", async () => {
  let calls = 0;
  const services = { ...dependencies(["market"], async tool => reading([ev(tool, "stale")])), reason: async () => { calls++; return null; } };
  const result = await runAgent({ question: "Market overview" }, undefined, services);
  assert.equal(result.status, "unavailable");
  assert.equal(result.answer, null);
  assert.equal(calls, 0);
});

test("a generation failure still returns fresh source observations", async () => {
  const result = await runAgent({ question: "Market overview" }, undefined, { ...dependencies(["market"]), reason: async () => { throw new Error("Generation unavailable"); } });
  assert.equal(result.method, "evidence_only");
  assert.equal(result.generation_error, "generation_failed");
  assert(result.answer);
});

test("an identified current price keeps the exact value without model generation", async () => {
  let generated = false;
  const result = await runAgent({ question: "What is the Bitcoin price?" }, undefined, {
    ...dependencies(["market"], async () => reading([{ ...ev("market"), id: "quote:" + btc.beat_id, text: "Bitcoin reference price: USD 123.45." }])),
    reason: async () => { generated = true; return null; },
  });
  assert.equal(result.method, "measured");
  assert.match(result.answer!.answer, /123\.45/);
  assert.equal(generated, false);
});

test("passive briefings never plan or generate an interpretation", async () => {
  const result = await readAgentBriefing(nvda.beat_id, {
    ...dependencies(["research"]), plan: async () => { throw new Error("Passive planning"); }, reason: async () => { throw new Error("Passive generation"); },
  });
  assert.equal(result.method, "evidence_only");
  assert.deepEqual(result.tools.map(tool => tool.id), ["research", "reporting"]);
  assert.equal(result.assets[0]?.beat_id, nvda.beat_id);
});

test("unknown subjects and malformed conversation histories are rejected before tool calls", async () => {
  const result = await runAgent({ question: "Tell me about ZZZZZZZZ" }, undefined, dependencies(["research"]));
  assert.equal(result.status, "needs_clarification");
  assert.equal(result.tools.length, 0);
  await assert.rejects(runAgent({ question: "Bitcoin", history: Array.from({ length: 5 }, () => ({ question: "Bitcoin", beat_ids: [] })) }, undefined, dependencies(["research"])));
  assert.equal(AgentRequestSchema.safeParse({ question: "Bitcoin", history: [{ question: "Before", beat_ids: [], token_asset: "base:0x123" }] }).success, false);
});

test("generic source readings retain timestamps, missing coverage and source attribution", () => {
  const observed_at = new Date().toISOString();
  const output = sourcedEvidence("market", { source: "Example", source_url: "https://example.com", fetched_at: observed_at,
    freshness: { status: "fresh" }, data: { assets: [{ symbol: "BTC", price_usd: 123, observed_at }] } });
  assert.equal(output[0]?.observed_at, observed_at);
  assert.equal(output[0]?.source, "Example");
  assert.match(output[0]!.text, /123/);
  assert.deepEqual(sourcedEvidence("chain", { source: "Example", source_url: "https://example.com", fetched_at: observed_at, freshness: { status: "fresh" }, data: null }), []);
});

test("expired forecasts remain evidence of a past call, never a fresh prediction", () => {
  const now = Date.now();
  const snapshot: MarketForecasts = { generated_at: new Date(now).toISOString(), status: "ready", model_version: "test", horizon_minutes: 60, scorecard_days: 30,
    assets: [{ ticker: "BTC", pair: "XBTUSD", forecast: null, recent: [], scorecard: { issued: 0, pending: 0, scored: 0, missing: 0, model_brier: null, baseline_brier: null },
      move_risk: { model_version: "test", recent: [], scorecard: { issued: 0, pending: 0, scored: 0, missing: 0, model_brier: null, baseline_brier: null },
        forecast: { issued_at: new Date(now - 3600_000).toISOString(), reference_at: new Date(now - 3600_000).toISOString(), target_at: new Date(now - 1000).toISOString(),
          reference_price_usd: 100, threshold_fraction: 0.01, probability: 0.4, baseline_probability: 0.2, realized_volatility_1h: 0.01, sample_size: 100, matched_windows: 20, matched_moves: 8,
          source: { name: "Kraken", url: "https://kraken.com", observed_at: new Date(now - 3600_000).toISOString() } } } }] };
  const output = forecastEvidence(snapshot, [btc], now);
  assert.equal(output.length, 1);
  assert.equal(output[0]!.freshness, "stale");
  assert.match(output[0]!.text, /Matching windows: 20/);
});
