import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const origin = "https://www.newsbeat.dev";
const expected = readFileSync(new URL("../../packages/contracts/src/intelligence.ts", import.meta.url), "utf8").match(/INTELLIGENCE_VERSION = "([^"]+)"/)[1];
let last = "deployment not ready";
for (let attempt = 0; attempt < 20; attempt++) {
  try {
    const response = await fetch(origin + "/api/v2/intelligence?beat_id=b_bb964843350e&check=" + Date.now(), { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.beat_id, "b_bb964843350e"); assert.equal(data.pilot, true);
    assert.equal(data.context.id, "fundamentals");
    assert.ok(Array.isArray(data.constructions)); assert.ok(Array.isArray(data.alerts));
    const assessed = data.constructions.filter(item => item.assessment);
    last = JSON.stringify({ status: data.status, analysis: data.analysis, signals: data.signals.length, assessed: assessed.length, alerts: data.alerts.length });
    console.log(last);
    for (const signal of data.signals) {
      assert.equal(signal.basis, "headline_metadata");
      assert.ok(signal.evidence.some(item => item.title === signal.what_changed));
    }
    for (const item of data.constructions) {
      assert.equal(item.market_reaction.status, "unmeasured");
      if (item.status === "alert") assert.ok(item.checks.every(check => check.passed));
    }
    if (data.analysis?.pipeline_version === expected && data.analysis.last_success_at && !data.analysis.error && (assessed.length || !data.signals.length)) {
      const liquidity = await fetch(origin + "/api/v2/intelligence?beat_id=b_bb964843350e&context=liquidity", { signal: AbortSignal.timeout(15000) }).then(result => result.json());
      assert.equal(liquidity.context.id, "liquidity");
      const invalid = await fetch(origin + "/api/v2/intelligence?beat_id=b_bb964843350e&context=invented", { signal: AbortSignal.timeout(15000) });
      assert.equal(invalid.status, 400);
      const cron = await fetch(origin + "/api/cron/intelligence", { signal: AbortSignal.timeout(15000) }); assert.equal(cron.status, 401);
      const tools = await fetch(origin + "/api/v2/tools", { signal: AbortSignal.timeout(15000) }).then(result => result.json());
      const tool = tools.tools.find(item => item.function?.name === "newsbeat_intelligence");
      assert.deepEqual(tool.function.parameters.properties.context.enum, ["fundamentals", "liquidity", "risk"]);
      const home = await fetch(origin + "/?verify=signals", { signal: AbortSignal.timeout(15000) }).then(result => result.text());
      assert.ok(!/event.intelligence/i.test(home));
      assert.ok(home.includes("Signal construction"));
      assert.ok(home.includes("id=\"agent-workflow\""));
      console.log("Verified contextual constructions, context selection, landing copy, tool discovery and authenticated generation.");
      process.exit(0);
    }
  } catch (error) {
    last = error instanceof Error ? error.message : "read failed"; console.log(last);
  }
  await new Promise(resolve => setTimeout(resolve, 30000));
}
throw new Error("No successful scheduled signal construction observed: " + last);
