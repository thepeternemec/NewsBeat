import assert from "node:assert/strict";
import { test } from "node:test";
import type { IntelligenceEventDraft, IntelligenceEvidence } from "@newsbeat/contracts";
import { parseIntelligenceResult } from "./intelligence-model.js";

const now = "2026-11-03T12:00:00Z";
const reports: IntelligenceEvidence[] = [{ id: "r1", title: "Nvidia raises revenue guidance after new customer orders", source: "Publisher", url: "https://example.com/1", published_at: now }];
const draft: IntelligenceEventDraft = {
  existing_event_id: null, change_kind: "new", category: "guidance", event_state: "reported",
  evidence_ids: ["r1"], affected_entities: ["Nvidia"], attention: "priority", attention_reason: "Guidance could affect expected revenue.", change_reason: "A reported guidance revision.",
  implications: [{ hypothesis: "Higher guidance could indicate stronger demand.", mechanism: "Orders could translate into revenue.", watch_for: "Official guidance.", evidence_ids: ["r1"] }],
  unknowns: ["Commercial terms and the size of the revision."], next_checks: ["Read official guidance."],
  market_assessment: { channel: "revenue", direction: "supportive", materiality: "high", horizon: "days", market_relevance: "A guidance revision could change revenue expectations.", why_it_may_not_move: "The revision may be small or offset by costs.", invalidation: "A withdrawal of guidance would weaken the premise.", trigger: { condition: "Nvidia reports a revenue guidance increase.", status: "reported", report_id: "r1", headline_quote: "Nvidia raises revenue guidance" } },
};

const result = (value: unknown, finish_reason = "stop") => ({ choices: [{ finish_reason, message: { content: JSON.stringify(value) } }] });
test("complete grounded constructions parse and an empty selection is valid", () => {
  assert.equal(parseIntelligenceResult(result({ events: [draft] }), reports, []).length, 1);
  assert.deepEqual(parseIntelligenceResult(result({ events: [] }), reports, []), []);
});
test("truncated and malformed generations are rejected before persistence", () => {
  assert.throws(() => parseIntelligenceResult(null, reports, []), /invalid_analysis_empty/);
  assert.throws(() => parseIntelligenceResult({ choices: [{ message: { content: 42 } }] }, reports, []), /invalid_analysis_empty/);
  assert.throws(() => parseIntelligenceResult(result({ events: [draft] }, "length"), reports, []), /invalid_analysis_truncated/);
  assert.throws(() => parseIntelligenceResult({ choices: [{ message: { content: '{"events":[' } }] }, reports, []), /invalid_analysis_json/);
});
test("schema, evidence and missing context errors remain distinguishable", () => {
  assert.throws(() => parseIntelligenceResult(result({ events: [{ bogus: true }] }), reports, []), /invalid_analysis_schema/);
  const unsupported = structuredClone(draft); unsupported.market_assessment!.trigger.headline_quote = "Nvidia reports a different development";
  assert.throws(() => parseIntelligenceResult(result({ events: [unsupported] }), reports, []), /invalid_analysis_unsupported_trigger_quote/);
  const legacy = structuredClone(draft); delete legacy.market_assessment;
  assert.throws(() => parseIntelligenceResult(result({ events: [legacy] }), reports, []), /invalid_analysis_missing_context/);
});
test("oversized model batches are rejected as a whole", () => {
  const events = Array.from({ length: 3 }, (_, index) => {
    const item = structuredClone(draft), id = "r" + (index + 1);
    item.evidence_ids = [id]; item.implications[0]!.evidence_ids = [id]; item.market_assessment!.trigger.report_id = id;
    return item;
  });
  const evidence = events.map((_, index) => ({ ...reports[0]!, id: "r" + (index + 1) }));
  assert.throws(() => parseIntelligenceResult(result({ events }), evidence, []), /invalid_analysis_batch_limit/);
});
