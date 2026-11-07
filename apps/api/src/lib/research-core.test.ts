import assert from "node:assert/strict";
import { test } from "node:test";
import { SEED_BEATS, type ResearchEvidence } from "@newsbeat/contracts";
import { qualifiesReport, resolveResearchAssets, validateResearchAnswer } from "./research-core.js";
import { researchQuestion, priceIdsForAsset } from "./research.js";

test("every catalog identity can be researched by its stable ID", () => {
  assert.equal(SEED_BEATS.length, 2030);
  for (const asset of SEED_BEATS) {
    const result = resolveResearchAssets("What could change the outlook?", [asset.beat_id]);
    assert.equal(result.issue, null);
    assert.equal(result.assets[0]?.beat_id, asset.beat_id);
  }
});

test("research resolves comparisons and preserves stock/crypto ambiguity", () => {
  assert.deepEqual(resolveResearchAssets("Compare NVIDIA and AMD").assets.map(a => a.ticker), ["NVDA", "AMD"]);
  const ambiguous = resolveResearchAssets("What is happening with SUI?");
  assert.ok(ambiguous.issue);
  assert.ok(ambiguous.candidates.some(a => a.asset === "crypto"));
  assert.ok(ambiguous.candidates.some(a => a.asset === "equity"));
  assert.equal(resolveResearchAssets("What is happening in the market now?").assets.length, 0);
  assert.deepEqual(resolveResearchAssets("Why is NVIDIA moving now?").assets.map(a => a.ticker), ["NVDA"]);
  assert.deepEqual(resolveResearchAssets("Why is Bitcoin moving?").assets.map(a => a.ticker), ["BTC"]);
  assert.deepEqual(resolveResearchAssets("What is driving Ethereum gas?").assets.map(a => a.ticker), ["ETH"]);
  assert.deepEqual(resolveResearchAssets("Please request research for Bitcoin").assets.map(a => a.ticker), ["BTC"]);
  assert.deepEqual(resolveResearchAssets("What changed for NVIDIA xStock?").assets.map(a => a.ticker), ["NVDAX"]);
  assert.deepEqual(resolveResearchAssets("Compare NVIDIA and NVIDIA xStock").assets.map(a => a.ticker), ["NVDA", "NVDAX"]);
  assert.ok(resolveResearchAssets("Compare NVIDIA, Apple, Microsoft and Tesla").issue);
  assert.ok(resolveResearchAssets("What changed?", ["b_000000000000"]).issue);
});

test("entity qualification excludes fruit stories for Apple", () => {
  const apple = SEED_BEATS.find(a => a.ticker === "AAPL")!;
  assert.equal(qualifiesReport("Apple pie recipe wins a prize", apple), false);
  assert.equal(qualifiesReport("Apple revenue and iPhone demand rise", apple), true);
});

test("company requests never receive unrelated crypto quote mappings", () => {
  assert.deepEqual(priceIdsForAsset(SEED_BEATS.find(a => a.ticker === "MSFT")!), []);
  assert.deepEqual(priceIdsForAsset(SEED_BEATS.find(a => a.ticker === "BTC" && a.asset === "crypto")!), ["bitcoin"]);
});

const evidence: ResearchEvidence[] = [{
  id: "report:a", beat_id: "b_bb964843350e", kind: "report", text: "Nvidia reports rising demand for its chips",
  source: "Example", url: "https://example.com/report", observed_at: new Date().toISOString(), freshness: "fresh",
}];
const answer = () => ({
  answer: "Demand reporting could support the outlook, but the market response is unmeasured.",
  reasoning: [{ kind: "interpretation", claim: "If demand converts to sales, it could support revenue; the headline alone cannot establish a price reaction.", evidence_ids: ["report:a"] }],
  unknowns: ["Whether this changes earlier expectations."],
  next_checks: ["Check company guidance and an identified market response."],
});

test("reasoning requires fresh known citations and cannot introduce figures", () => {
  assert.ok(validateResearchAnswer(answer(), evidence));
  assert.equal(validateResearchAnswer(answer(), [{ ...evidence[0]!, freshness: "stale" }]), null);
  const unknown = answer(); unknown.reasoning[0]!.evidence_ids = ["made-up"];
  assert.equal(validateResearchAnswer(unknown, evidence), null);
  const invented = answer(); invented.answer = "Revenue could grow 35% and shares could rise 12%.";
  assert.equal(validateResearchAnswer(invented, evidence), null);
  const order = answer(); order.answer = "Buy now for guaranteed returns.";
  assert.equal(validateResearchAnswer(order, evidence), null);
});

test("a headline digest alone is not a reasoned answer and observations stay verbatim", () => {
  const digest = answer();
  digest.reasoning = [{ kind: "observation", claim: evidence[0]!.text, evidence_ids: ["report:a"] }];
  assert.equal(validateResearchAnswer(digest, evidence), null);
  const altered = answer();
  altered.reasoning.push({ kind: "observation", claim: "Nvidia has record profits", evidence_ids: ["report:a"] });
  assert.equal(validateResearchAnswer(altered, evidence), null);
  altered.reasoning[1]!.claim = evidence[0]!.text;
  assert.ok(validateResearchAnswer(altered, evidence));
});

test("invalid requests and unresolved scope cannot call the model or data services", async () => {
  await assert.rejects(() => researchQuestion({ question: "x" }), /3–600/);
  const result = await researchQuestion({ question: "What is happening in the market now?" });
  assert.equal(result.status, "needs_clarification");
  assert.equal(result.answer, null);
  assert.equal(result.evidence.length, 0);
});

test("a cited evidence-limit conclusion does not require a modal buzzword", () => {
  const result = answer();
  result.reasoning[0]!.claim = "The cited report does not establish a new business catalyst or a measured market reaction.";
  assert.ok(validateResearchAnswer(result, evidence));
  result.reasoning[0]!.claim = "Shares will rise and outperform.";
  assert.equal(validateResearchAnswer(result, evidence), null);
});
