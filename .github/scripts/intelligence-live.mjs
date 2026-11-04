import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const origin = "https://www.newsbeat.dev";
const expected = readFileSync(new URL("../../packages/contracts/src/intelligence.ts", import.meta.url), "utf8").match(/INTELLIGENCE_VERSION = "([^"]+)"/)[1];
const policy = readFileSync(new URL("../../packages/contracts/src/quantitative.ts", import.meta.url), "utf8").match(/QUANT_POLICY_VERSION = "([^"]+)"/)[1];
const read = async path => {
  const response = await fetch(origin + path, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200); return response.json();
};
function verifyMarket(data, kind) {
  const quant = data.quantitative;
  assert.equal(quant?.policy_version, policy); assert.equal(quant.market.instrument?.kind, kind);
  assert.equal(quant.market.instrument.venue, "kraken"); assert.equal(quant.market.instrument.quote, "USD");
  assert.ok(quant.market.fit?.samples >= 60, "real aligned market baseline is present");
  assert.ok(Date.now() - Date.parse(quant.computed_at) < 10 * 60000, "collector has run recently");
  assert.ok(quant.market.curve.length > 1);
  assert.ok(Array.isArray(quant.evaluation.review_horizons));
  for (const item of data.constructions) {
    if (item.market_reaction.status === "observed") {
      assert.ok(Number.isFinite(item.market_reaction.asset_return));
      assert.ok(Date.parse(item.market_reaction.end_at) <= Date.now());
    }
    if (item.status === "alert") {
      assert.ok(item.checks.every(check => check.passed));
      assert.equal(item.quantitative?.phase, "developing");
      assert.equal(item.quantitative.policy_version, policy);
    }
  }
  for (const record of quant.evaluations) for (const row of record.outcomes) {
    if (row.status === "observed") assert.ok(Date.parse(row.market_at) >= Date.parse(row.due_at));
    if (row.status !== "observed") assert.equal(row.asset_return, null);
  }
}
let last = "deployment not ready";
for (let attempt = 0; attempt < 20; attempt++) {
  try {
    const data = await read("/api/v2/intelligence?beat_id=b_bb964843350e&check=" + Date.now());
    assert.equal(data.beat_id, "b_bb964843350e"); assert.equal(data.pilot, true); assert.equal(data.context.id, "fundamentals");
    assert.ok(Array.isArray(data.constructions)); assert.ok(Array.isArray(data.alerts));
    const assessed = data.constructions.filter(item => item.assessment);
    last = JSON.stringify({ status: data.status, analysis: data.analysis, signals: data.signals.length, assessed: assessed.length,
      market: data.quantitative?.market.status, policy: data.quantitative?.policy_version });
    console.log(last);
    for (const signal of data.signals) {
      assert.equal(signal.basis, "headline_metadata");
      assert.ok(signal.evidence.some(item => item.title === signal.what_changed));
    }
    verifyMarket(data, "tokenized_equity");
    if (data.analysis?.pipeline_version === expected && data.analysis.last_success_at && !data.analysis.error && (assessed.length || !data.signals.length)) {
      const liquidity = await read("/api/v2/intelligence?beat_id=b_bb964843350e&context=liquidity");
      assert.equal(liquidity.context.id, "liquidity"); assert.equal(liquidity.quantitative.context_id, "liquidity");
      const topics = await read("/api/v2/topics?q=ethereum&limit=5");
      const eth = topics.topics.find(item => item.ticker === "ETH"); assert.ok(eth);
      verifyMarket(await read("/api/v2/intelligence?beat_id=" + eth.beat_id), "crypto");
      const invalid = await fetch(origin + "/api/v2/intelligence?beat_id=b_bb964843350e&context=invented"); assert.equal(invalid.status, 400);
      for (const route of ["intelligence", "market-intelligence"]) {
        const cron = await fetch(origin + "/api/cron/" + route); assert.equal(cron.status, 401);
      }
      const tools = await read("/api/v2/tools");
      const tool = tools.tools.find(item => item.function?.name === "newsbeat_intelligence");
      assert.deepEqual(tool.function.parameters.properties.context.enum, ["fundamentals", "liquidity", "risk"]);
      const home = await fetch(origin + "/?verify=timing").then(result => result.text());
      assert.ok(!/event.intelligence/i.test(home)); assert.ok(home.includes("Signal construction")); assert.ok(home.includes('id="agent-workflow"'));
      assert.ok(home.includes("Delta. Confirmation. Timing."));
      console.log("Verified measured xStock/crypto context, grounded analysis, timing safety, outcome records, context selection, discovery and authenticated workers.");
      process.exit(0);
    }
  } catch (error) { last = error instanceof Error ? error.message : "read failed"; console.log(last); }
  await new Promise(resolve => setTimeout(resolve, 30000));
}
throw new Error("No complete measured signal pipeline observed: " + last);
