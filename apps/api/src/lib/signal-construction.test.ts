import assert from "node:assert/strict";
import { test } from "node:test";
import { SIGNAL_CONTEXTS, type IntelligenceEventDraft, type IntelligenceEvidence } from "@newsbeat/contracts";
import { reconcileSignal, validateIntelligence } from "./intelligence-core.js";
import { constructSignal, type SignalConditions } from "./signal-construction.js";

const now = "2026-11-03T12:00:00Z";
const reports: IntelligenceEvidence[] = [{ id: "r1", title: "Nvidia raises revenue guidance after new customer orders", source: "Publisher", url: "https://example.com/1", published_at: now }];
const draft: IntelligenceEventDraft = {
  existing_event_id: null, change_kind: "new", category: "guidance", event_state: "reported",
  evidence_ids: ["r1"], affected_entities: ["Nvidia"], attention: "priority", attention_reason: "Guidance could affect expected revenue.", change_reason: "A reported guidance revision.",
  implications: [{ hypothesis: "Higher guidance could indicate stronger demand.", mechanism: "Orders could translate into revenue.", watch_for: "Official guidance.", evidence_ids: ["r1"] }],
  unknowns: ["Commercial terms and the size of the revision."], next_checks: ["Read official guidance."],
  market_assessment: { channel: "revenue", direction: "supportive", materiality: "high", horizon: "days", market_relevance: "A guidance revision could change revenue expectations.", why_it_may_not_move: "The revision may be small or offset by costs.", invalidation: "A withdrawal of guidance would weaken the premise.", trigger: { condition: "Nvidia reports a revenue guidance increase.", status: "reported", report_id: "r1", headline_quote: "Nvidia raises revenue guidance" } },
};
const conditions: SignalConditions = { now, source_freshness: "fresh", analysis_ready: true, analysis_at: now };
const signal = () => reconcileSignal("b_test", structuredClone(draft), structuredClone(reports), [], now, "test/model");
const fundamentals = SIGNAL_CONTEXTS.find(item => item.id === "fundamentals")!;
const liquidity = SIGNAL_CONTEXTS.find(item => item.id === "liquidity")!;

test("one development alerts in a matching context and is suppressed in another", () => {
  const relevant = constructSignal(signal(), fundamentals, conditions);
  assert.equal(relevant.status, "alert"); assert.equal(relevant.action, "review_now"); assert.ok(relevant.alert_id);
  assert.equal(relevant.market_reaction.status, "unmeasured");
  const other = constructSignal(signal(), liquidity, conditions);
  assert.equal(other.action, "no_alert"); assert.equal(other.alert_id, null);
});
test("plans, allegations, denials and disputes cannot pass a review-alert gate", () => {
  for (const state of ["planned", "alleged", "denied", "disputed"] as const) {
    const item = signal(); item.event_state = state;
    const output = constructSignal(item, fundamentals, conditions);
    assert.notEqual(output.status, "alert"); assert.equal(output.alert_id, null);
    if (["denied", "disputed"].includes(state)) assert.equal(output.action, "reassess");
  }
});
test("stale, pending or old analysis and invalid report times fail closed", () => {
  for (const override of [{ source_freshness: "stale" }, { analysis_ready: false }, { analysis_at: "2026-11-03T09:00:00Z" }, { analysis_at: null }]) {
    assert.equal(constructSignal(signal(), fundamentals, { ...conditions, ...override }).status, "watch");
  }
  for (const date of ["2026-11-03T08:00:00Z", "2026-11-03T13:00:00Z", "invalid"]) {
    const item = signal(); item.evidence[0]!.published_at = date;
    assert.equal(constructSignal(item, fundamentals, conditions).alert_id, null);
  }
});
test("low materiality, uncertain direction and unobserved triggers stay on watch", () => {
  for (const materiality of ["low", "medium", "unknown"] as const) {
    const item = signal(); item.market_assessment!.materiality = materiality;
    assert.equal(constructSignal(item, fundamentals, conditions).status, "watch");
  }
  const unclear = signal(); unclear.market_assessment!.direction = "unclear";
  assert.equal(constructSignal(unclear, fundamentals, conditions).status, "watch");
  const waiting = signal(); waiting.market_assessment!.trigger = { condition: "Official guidance must be published.", status: "not_observed", report_id: null, headline_quote: null };
  assert.equal(constructSignal(waiting, fundamentals, conditions).status, "watch");
});
test("trigger observations need a real report and matching excerpt, including persisted input", () => {
  for (const [reportId, quote] of [["invented", "Nvidia raises revenue guidance"], ["r1", "Nvidia cuts its guidance"], ["r1", "Nvidia"]]) {
    const item = signal(); item.market_assessment!.trigger.report_id = reportId!; item.market_assessment!.trigger.headline_quote = quote!;
    assert.equal(constructSignal(item, fundamentals, conditions).alert_id, null);
    const candidate = structuredClone(draft); candidate.market_assessment = item.market_assessment;
    assert.equal(validateIntelligence({ events: [candidate] }, reports, []), null);
  }
});
test("repeat coverage cannot alert again and stable version IDs support idempotency", () => {
  const item = signal(); const first = constructSignal(item, fundamentals, conditions);
  assert.ok(first.alert_id); assert.equal(constructSignal(item, fundamentals, conditions).alert_id, first.alert_id);
  item.change_kind = "evidence_added";
  assert.equal(constructSignal(item, fundamentals, conditions).alert_id, null);
  item.change_kind = "update"; item.version++;
  const revision = constructSignal(item, fundamentals, conditions);
  assert.equal(revision.id, first.id); assert.notEqual(revision.alert_id, first.alert_id);
});
test("an old explanation is not promoted to a market construction", () => {
  const item = signal(); delete item.market_assessment;
  const output = constructSignal(item, fundamentals, conditions);
  assert.equal(output.status, "watch"); assert.equal(output.assessment, null); assert.equal(output.alert_id, null);
});
test("first construction upgrades legacy memory once without claiming new reporting", () => {
  const old = signal(); delete old.market_assessment;
  const upgrade = structuredClone(draft); upgrade.existing_event_id = old.id; upgrade.change_kind = "update";
  assert.ok(validateIntelligence({ events: [upgrade] }, reports, [old]));
  const next = reconcileSignal(old.beat_id, upgrade, reports, [old], now, "test/model");
  assert.equal(next.version, 2); assert.ok(next.market_assessment);
  assert.equal(validateIntelligence({ events: [upgrade] }, reports, [next]), null);
});
test("changing only a citation ID is not a new market interpretation", () => {
  const old = signal(); const second = { ...reports[0]!, id: "r2" };
  const repeat = structuredClone(draft); repeat.existing_event_id = old.id; repeat.evidence_ids = [second.id];
  repeat.implications[0]!.evidence_ids = [second.id]; repeat.market_assessment!.trigger.report_id = second.id;
  const next = reconcileSignal(old.beat_id, repeat, [second], [old], now, "test/model");
  assert.equal(next.version, old.version); assert.equal(next.change_kind, "evidence_added");
});

test("construction evidence retains fresh denials and revisions within the bounded input", async () => {
  const { selectIntelligenceEvidence } = await import("./intelligence-core.js");
  const report = (id: number, title: string) => ({ id: String(id), title, source: "publisher", url: "https://example.com/" + id, published_at: "2026-11-03T12:00:00.000Z" });
  const groups = Array.from({ length: 30 }, (_, index) => ({ reports: [report(index + 1, "Nvidia announces a product " + index)] }));
  groups.push({ reports: [report(31, "Nvidia denies a revenue guidance increase")] });
  groups[0]!.reports.push(report(32, "Repeated coverage"), report(33, "Repeated coverage"), report(34, "Nvidia withdraws its earlier guidance"));
  const selected = selectIntelligenceEvidence(groups, "30");
  assert.equal(selected.length, 24);
  assert.equal(new Set(selected.map(item => item.id)).size, 24);
  assert.ok(selected.some(item => item.id === "31"));
  assert.ok(selected.some(item => item.id === "34"));
  assert.ok(selected.some(item => item.id === "1"), "retain ranked context as well as arrivals");
});
