import assert from "node:assert/strict";
import { test } from "node:test";
import type { IntelligenceEventDraft, IntelligenceEvidence } from "@newsbeat/contracts";
import { validateIntelligence, reconcileSignal } from "./intelligence-core.js";

const now = "2026-11-03T12:00:00Z";
const reports: IntelligenceEvidence[] = [
  { id: "r1", title: "Nvidia plans new chip supply restrictions", source: "Publisher A", url: "https://example.com/1", published_at: now },
  { id: "r2", title: "Nvidia denies planned chip supply restrictions", source: "Publisher B", url: "https://example.com/2", published_at: now },
  { id: "r3", title: "Nvidia plans new chip supply restrictions", source: "Publisher C", url: "https://example.com/3", published_at: now },
];
const draft: IntelligenceEventDraft = {
  existing_event_id: null, change_kind: "new", category: "operations", event_state: "planned",
  evidence_ids: ["r1"], affected_entities: ["Nvidia"], attention: "review",
  attention_reason: "A reported change could affect access to supply.",
  change_reason: "A new reported plan needs investigation.",
  implications: [{ hypothesis: "If implemented, the plan could constrain customer access.",
    mechanism: "Restrictions could narrow the set of eligible buyers.",
    watch_for: "Published terms and customer confirmation.", evidence_ids: ["r1"] }],
  unknowns: ["Whether the plan will be implemented."], next_checks: ["Check official policy terms."],
};
const clone = () => structuredClone(draft);

test("a valid event preserves source facts and adds separately labeled interpretation", () => {
  assert.deepEqual(validateIntelligence({ events: [draft] }, reports, []), [draft]);
  const signal = reconcileSignal("equity:nvda", draft, reports, [], now, "test/model");
  assert.equal(signal.what_changed, reports[0]!.title);
  assert.equal(signal.basis, "headline_metadata");
  assert.equal(signal.interpretation, "model_inference");
  assert.equal(signal.implications[0]!.basis, "inference");
  assert.equal(signal.version, 1);
});

test("invented sources, named entities and numeric facts cannot enter an event", () => {
  const source = clone(); source.evidence_ids = ["invented"];
  assert.equal(validateIntelligence({ events: [source] }, reports, []), null);
  const entity = clone(); entity.affected_entities = ["Microsoft"];
  assert.equal(validateIntelligence({ events: [entity] }, reports, []), null);
  const number = clone(); number.implications[0]!.mechanism = "It could reduce revenue by 25%.";
  assert.equal(validateIntelligence({ events: [number] }, reports, []), null);
  const citation = clone(); citation.implications[0]!.evidence_ids = ["r2"];
  assert.equal(validateIntelligence({ events: [citation] }, reports, []), null);
});

test("unqualified predictions and duplicated event evidence fail validation", () => {
  const forecast = clone(); forecast.implications[0]!.hypothesis = "Shares will surge.";
  assert.equal(validateIntelligence({ events: [forecast] }, reports, []), null);
  assert.equal(validateIntelligence({ events: [draft, draft] }, reports, []), null);
  assert.deepEqual(validateIntelligence({ events: [] }, reports, []), []);
});

test("repeat coverage extends event memory without replacing the interpretation or increasing its version", () => {
  const previous = reconcileSignal("equity:nvda", draft, reports, [], now, "test/model");
  const repeat = clone(); repeat.existing_event_id = previous.id; repeat.change_kind = "evidence_only"; repeat.evidence_ids = ["r3"];
  repeat.attention_reason = "This wording should not overwrite the established interpretation.";
  const next = reconcileSignal("equity:nvda", repeat, reports, [previous], "2026-11-03T13:00:00Z", "test/model");
  assert.equal(next.id, previous.id);
  assert.equal(next.version, previous.version);
  assert.equal(next.attention_reason, previous.attention_reason);
  assert.equal(next.updated_at, previous.updated_at);
  assert.equal(next.change_kind, "evidence_added");
  assert.equal(next.evidence.length, 2);
});

test("new contradictory reporting can revise an event while preserving its identity and original evidence", () => {
  const previous = reconcileSignal("equity:nvda", draft, reports, [], now, "test/model");
  const update = clone(); update.existing_event_id = previous.id; update.change_kind = "update";
  update.evidence_ids = ["r2"]; update.event_state = "denied"; update.implications[0]!.evidence_ids = ["r2"];
  update.change_reason = "New reporting denies the previously reported plan.";
  assert.ok(validateIntelligence({ events: [update] }, reports, [previous]));
  const next = reconcileSignal("equity:nvda", update, reports, [previous], "2026-11-03T13:00:00Z", "test/model");
  assert.equal(next.id, previous.id);
  assert.equal(next.version, 2);
  assert.equal(next.event_state, "denied");
  assert.equal(next.first_detected_at, now);
  assert.equal(next.evidence.length, 2);
});

test("an update requires new evidence and cannot point to an invented event", () => {
  const previous = reconcileSignal("equity:nvda", draft, reports, [], now, "test/model");
  const update = clone(); update.existing_event_id = previous.id; update.change_kind = "update";
  assert.equal(validateIntelligence({ events: [update] }, reports, [previous]), null);
  update.existing_event_id = "invented";
  assert.equal(validateIntelligence({ events: [update] }, reports, [previous]), null);
});

test("evidence overlap reconnects an event without allowing cross-asset identity reuse", () => {
  const previous = reconcileSignal("equity:nvda", draft, reports, [], now, "test/model");
  const repeat = reconcileSignal("equity:nvda", draft, reports, [previous], now, "test/model");
  assert.equal(repeat.id, previous.id);
  assert.equal(repeat.version, previous.version);
  const other = reconcileSignal("equity:other", draft, reports, [previous], now, "test/model");
  assert.notEqual(other.id, previous.id);
});

test("retaining new evidence never removes citations needed by the established interpretation", () => {
  const previous = reconcileSignal("equity:nvda", draft, reports, [], now, "test/model");
  previous.evidence = [...previous.evidence, ...Array.from({ length: 29 }, (_, index) => ({ ...reports[1]!, id: "old-" + index }))];
  const repeat = clone(); repeat.existing_event_id = previous.id; repeat.change_kind = "evidence_only"; repeat.evidence_ids = ["r3"];
  const next = reconcileSignal("equity:nvda", repeat, reports, [previous], now, "test/model");
  assert.equal(next.evidence.length, 30);
  assert.ok(next.evidence.some(report => report.id === "r1"));
  assert.ok(next.evidence.some(report => report.id === "r3"));
});

test("a denial cannot be silently added as unchanged evidence to a reported plan", () => {
  const previous = reconcileSignal("equity:nvda", draft, reports, [], now, "test/model");
  const denial = clone(); denial.existing_event_id = previous.id; denial.change_kind = "evidence_only"; denial.evidence_ids = ["r2"];
  assert.equal(validateIntelligence({ events: [denial] }, reports, [previous]), null);
  denial.event_state = "denied";
  assert.equal(validateIntelligence({ events: [denial] }, reports, [previous]), null);
});

test("a revised interpretation retains its cited report even when that report is older than retained evidence", () => {
  const previous = reconcileSignal("equity:nvda", draft, reports, [], now, "test/model");
  previous.evidence = [...previous.evidence, ...Array.from({ length: 29 }, (_, index) => ({ ...reports[0]!, id: "recent-" + index }))];
  const older = { ...reports[1]!, id: "older-denial", published_at: "2026-11-02T12:00:00Z" };
  const update = clone(); update.existing_event_id = previous.id; update.change_kind = "update";
  update.evidence_ids = [older.id]; update.event_state = "denied"; update.implications[0]!.evidence_ids = [older.id];
  const next = reconcileSignal("equity:nvda", update, [...reports, older], [previous], now, "test/model");
  assert.equal(next.version, 2);
  assert.ok(next.evidence.some(report => report.id === older.id));
  assert.ok(next.evidence.some(report => report.id === "r1"));
});
