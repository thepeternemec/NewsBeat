import assert from "node:assert/strict";
import { test } from "node:test";
import type { IntelligenceEventDraft, IntelligenceEvidence } from "@newsbeat/contracts";
import { generateValidatedIntelligence, intelligenceInput, parseIntelligenceResult } from "./intelligence-model.js";
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
  assert.deepEqual(input.previous_events[0]!.already_seen_report_ids, ["r1"]);
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

test("excess citations trigger one grounded correction without truncating evidence", async () => {
  const evidence = Array.from({ length: 6 }, (_, i) => ({ ...reports[0]!, id: "r" + (i + 1) }));
  const oversized = structuredClone(draft); oversized.evidence_ids = evidence.map(report => report.id);
  const requests: Array<{ body: any; signal: AbortSignal | null | undefined }> = [];
  const request: typeof fetch = async (_url, options) => {
    requests.push({ body: JSON.parse(String(options?.body)), signal: options?.signal });
    return new Response(JSON.stringify(result({ events: [requests.length === 1 ? oversized : draft] })));
  };
  const output = await generateValidatedIntelligence(evidence, [], { label: "Nvidia", ticker: "NVDA" }, "test-credential", request);
  assert.equal(output.length, 1);
  assert.deepEqual(output[0]!.evidence_ids, ["r1"]);
  assert.equal(requests.length, 2);
  assert.equal(requests[0]!.signal, requests[1]!.signal, "both attempts share the original timeout");
  assert.equal(requests[1]!.body.messages.length, 4);
  assert.match(requests[1]!.body.messages[3].content, /evidence_ids_too_big/);
  assert.equal(JSON.parse(requests[1]!.body.messages[1].content).reports.length, 6);
});
test("a correction cannot bypass citation grounding or retry indefinitely", async () => {
  const invalid = structuredClone(draft); invalid.evidence_ids = ["unknown-report"];
  let calls = 0;
  const request: typeof fetch = async () => { calls++; return new Response(JSON.stringify(result({ events: [invalid] }))); };
  await assert.rejects(generateValidatedIntelligence(reports, [], { label: "Nvidia", ticker: "NVDA" }, "test-credential", request), /invalid_analysis_unknown_evidence/);
  assert.equal(calls, 2);
});
test("a valid empty result and an upstream failure do not trigger correction calls", async () => {
  let calls = 0;
  const empty: typeof fetch = async () => { calls++; return new Response(JSON.stringify(result({ events: [] }))); };
  assert.deepEqual(await generateValidatedIntelligence(reports, [], { label: "Nvidia", ticker: "NVDA" }, "test-credential", empty), []);
  assert.equal(calls, 1);
  const unavailable: typeof fetch = async () => { calls++; return new Response("unavailable", { status: 503 }); };
  await assert.rejects(generateValidatedIntelligence(reports, [], { label: "Nvidia", ticker: "NVDA" }, "test-credential", unavailable), /model_unavailable/);
  assert.equal(calls, 2);
});

test("correction feedback identifies unsupported figures without relaxing the numeric gate", async () => {
  const invalid = structuredClone(draft);
  invalid.implications[0]!.mechanism = "Orders could add 37 percent to revenue.";
  assert.throws(() => parseIntelligenceResult(result({ events: [invalid] }), reports, []), error => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /invalid_analysis_unsupported_number_or_prediction/);
    assert.match(String(error.cause), /Unsupported numeric tokens: 37/);
    return true;
  });
  let calls = 0;
  const request: typeof fetch = async (_url, options) => {
    calls++;
    const body = JSON.parse(String(options?.body));
    if (calls === 2) {
      assert.match(body.messages.at(-1).content, /Unsupported numeric tokens: 37/);
      assert.match(body.messages.at(-1).content, /Prefer a conditional explanation without numbers/);
    }
    return new Response(JSON.stringify(result({ events: [calls === 1 ? invalid : draft] })));
  };
  assert.equal((await generateValidatedIntelligence(reports, [], { label: "Nvidia", ticker: "NVDA" }, "test-credential", request)).length, 1);
  assert.equal(calls, 2);
  const stillInvalid: typeof fetch = async () => new Response(JSON.stringify(result({ events: [invalid] })));
  await assert.rejects(generateValidatedIntelligence(reports, [], { label: "Nvidia", ticker: "NVDA" }, "test-credential", stillInvalid), /unsupported_number_or_prediction/);
});
test("source metadata exposes exact headline figures without treating publication dates as evidence", () => {
  const input = intelligenceInput([{ ...reports[0]!, title: "Nvidia reports 37 percent revenue growth" }], [], { label: "Nvidia", ticker: "NVDA" });
  assert.deepEqual(input.reports[0]!.headline_figures, ["37"]);
  assert.ok(!input.reports[0]!.headline_figures.includes("2026"));
});

test("trigger correction names the allowed reports and still rejects ungrounded triggers", async () => {
  const invalid = structuredClone(draft); invalid.market_assessment!.trigger.report_id = "unknown-report";
  assert.throws(() => parseIntelligenceResult(result({ events: [invalid] }), reports, []), error => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /invalid_analysis_ungrounded_trigger/);
    assert.match(String(error.cause), /evidence_ids: r1/);
    assert.match(String(error.cause), /Received report_id: unknown-report/);
    return true;
  });
  let calls = 0;
  const request: typeof fetch = async (_url, options) => {
    calls++;
    if (calls === 2) assert.match(JSON.parse(String(options?.body)).messages.at(-1).content, /evidence_ids: r1/);
    return new Response(JSON.stringify(result({ events: [calls === 1 ? invalid : draft] })));
  };
  assert.equal((await generateValidatedIntelligence(reports, [], { label: "Nvidia", ticker: "NVDA" }, "test-credential", request)).length, 1);
  assert.equal(calls, 2);
  const badQuote = structuredClone(draft); badQuote.market_assessment!.trigger.headline_quote = "Nvidia announces something unrelated";
  assert.throws(() => parseIntelligenceResult(result({ events: [badQuote] }), reports, []), error => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /unsupported_trigger_quote/);
    assert.match(String(error.cause), /exact headline is: Nvidia raises revenue guidance/);
    return true;
  });
  const neverGrounded: typeof fetch = async () => new Response(JSON.stringify(result({ events: [invalid] })));
  await assert.rejects(generateValidatedIntelligence(reports, [], { label: "Nvidia", ticker: "NVDA" }, "test-credential", neverGrounded), /ungrounded_trigger/);
});
