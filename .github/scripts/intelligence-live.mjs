import assert from "node:assert/strict";

const origin = "https://www.newsbeat.dev";
let last = "deployment not ready";
for (let attempt = 0; attempt < 20; attempt++) {
  try {
    const response = await fetch(origin + "/api/v2/intelligence?beat_id=b_bb964843350e&check=" + Date.now(), { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200, "pilot read endpoint");
    const data = await response.json();
    assert.equal(data.beat_id, "b_bb964843350e");
    assert.equal(data.pilot, true);
    assert.ok(Array.isArray(data.signals));
    last = JSON.stringify({ status: data.status, analysis: data.analysis, signals: data.signals.length });
    console.log(last);
    for (const signal of data.signals) {
      assert.equal(signal.basis, "headline_metadata");
      assert.equal(signal.interpretation, "model_inference");
      assert.ok(signal.evidence.some(item => item.title === signal.what_changed));
      for (const implication of signal.implications) {
        assert.ok(implication.evidence_ids.every(id => signal.evidence.some(item => item.id === id)));
      }
    }
    if (data.analysis?.last_success_at && !data.analysis.error) {
      const cron = await fetch(origin + "/api/cron/intelligence", { signal: AbortSignal.timeout(15000) });
      assert.equal(cron.status, 401, "public requests cannot trigger model generation");
      const tools = await fetch(origin + "/api/v2/tools", { signal: AbortSignal.timeout(15000) }).then(result => result.json());
      assert.ok(tools.tools.some(item => item.function?.name === "newsbeat_intelligence"));
      console.log("Verified deployed stored analysis, source citations, tool discovery and authenticated generation.");
      process.exit(0);
    }
  } catch (error) {
    last = error instanceof Error ? error.message : "read failed";
    console.log(last);
  }
  await new Promise(resolve => setTimeout(resolve, 30000));
}
throw new Error("No successful scheduled pilot analysis observed: " + last);
