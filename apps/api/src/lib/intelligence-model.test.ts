import assert from "node:assert/strict";
import { test } from "node:test";
import type { IntelligenceEventDraft, IntelligenceEvidence } from "@newsbeat/contracts";
import { intelligenceInput, parseIntelligenceResult } from "./intelligence-model.js";
import { reconcileSignal } from "./intelligence-core.js";

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
  const events = Array.from({ length: 2 }, (_, index) => {
    const item = structuredClone(draft), id = "r" + (index + 1);
    item.evidence_ids = [id]; item.implications[0]!.evidence_ids = [id]; item.market_assessment!.trigger.report_id = id;
    return item;
  });
  const evidence = events.map((_, index) => ({ ...reports[0]!, id: "r" + (index + 1) }));
  assert.throws(() => parseIntelligenceResult(result({ events }), evidence, []), /invalid_analysis_batch_limit/);
});

test("prior memory exposes only current citable report IDs and stays bounded", () => {
  const old = structuredClone(reconcileSignal("test", draft, reports, [], now, "test"));
  old.evidence.push({ ...reports[0]!, id: "expired-citation" });
  old.implications[0]!.evidence_ids = ["expired-citation"];
  old.market_assessment!.trigger.report_id = "expired-citation";
  const previous = Array.from({ length: 8 }, (_, index) => ({ ...old, id: "event-" + index }));
  const input = intelligenceInput(reports, previous, { label: "Nvidia", ticker: "NVDA" });
  assert.equal(input.previous_events.length, 4);
  assert.ok(!JSON.stringify(input).includes("expired-citation"));
  assert.deepEqual(input.previous_events[0]!.evidence_ids, ["r1"]);
});

test("known unchanged reporting is a no-op, while unsupported state changes still fail", () => {
  const old = structuredClone(reconcileSignal("test", draft, reports, [], now, "test"));
  const repeat = structuredClone(draft); repeat.existing_event_id = old.id; repeat.change_kind = "update";
  repeat.attention_reason = "Fresh wording must not refresh old information.";
  assert.deepEqual(parseIntelligenceResult(result({ events: [repeat] }), reports, [old]), []);
  repeat.event_state = "denied";
  assert.throws(() => parseIntelligenceResult(result({ events: [repeat] }), reports, [old]), /missing_new_evidence/);
  repeat.event_state = "reported"; repeat.change_kind = "new";
  assert.throws(() => parseIntelligenceResult(result({ events: [repeat] }), reports, [old]), /invalid_new_kind/);
});

test("formatting normalization preserves facts and diagnostic codes identify schema fields", () => {
  const formatted = structuredClone(draft); formatted.unknowns = ["Commercial terms\nand the size of the revision."];
  assert.equal(parseIntelligenceResult(result({ events: [formatted] }), reports, [])[0]!.unknowns[0], draft.unknowns[0]);
  const invalid = structuredClone(draft) as any; invalid.market_assessment.direction = "bullish";
  assert.throws(() => parseIntelligenceResult(result({ events: [invalid] }), reports, []), /invalid_analysis_schema_events__market_assessment_direction/);
});
