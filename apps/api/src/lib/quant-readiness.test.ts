import assert from "node:assert/strict";
import { test } from "node:test";
import type { ConstructedSignal, QuantSignalDecision } from "@newsbeat/contracts";
import { applyTiming } from "./quant-decision.js";

const now = Date.parse("2026-11-05T20:00:00Z");
function fixture(phase: QuantSignalDecision["phase"] = "old_information") {
  const base = {
    id: "construction", source_signal_id: "signal", beat_id: "asset", version: 1, context_id: "fundamentals",
    status: "watch", action: "keep_watching", assessment: null, explanation: "Stored hypothesis.",
    checks: [
      { id: "freshness", label: "Analysis", passed: true, reason: "Analysis is current." },
      { id: "context", label: "Focus", passed: true, reason: "Focus matches." },
      { id: "trigger", label: "Trigger", passed: true, reason: "A trigger was reported." },
      { id: "window", label: "Age", passed: false, reason: "The reported trigger is too old." },
      { id: "state", label: "State", passed: true, reason: "Reported." },
    ], evaluated_at: new Date(now).toISOString(), alert_id: null,
    market_reaction: { status: "unmeasured", reason: "Not measured." },
  } as ConstructedSignal;
  const decision = {
    source_signal_id: "signal", signal_version: 1, context_id: "fundamentals", evaluated_at: new Date(now).toISOString(),
    phase, action: phase === "developing" ? "review_now" : "keep_watching", reason: "The news is no longer new.",
    delta: { meaningful: false, description: "Existing information." }, alert_id: phase === "developing" ? "alert" : null,
    event_window: null, checks: [{ id: "analysis_current", passed: true, reason: "Current." }, { id: "reported_trigger", passed: true, reason: "Reported." }],
  } as QuantSignalDecision;
  return { base, decision };
}
test("an old trigger does not become a false analysis outage", () => {
  const { base, decision } = fixture();
  const result = applyTiming(base, decision, now);
  assert.equal(result.quantitative?.phase, "old_information");
  assert.equal(result.action, "keep_watching");
  assert.match(result.explanation, /trigger is too old/);
  assert.equal(result.quantitative?.checks.find(check => check.id === "reported_trigger")?.passed, false);
});
test("a held review stays held while the actual source condition is explained", () => {
  const { base, decision } = fixture("developing");
  const result = applyTiming(base, decision, now);
  assert.equal(result.action, "keep_watching");
  assert.equal(result.alert_id, null);
  assert.equal(result.quantitative?.action, "keep_watching");
  assert.equal(result.quantitative?.alert_id, null);
  assert.equal(result.quantitative?.phase, "unconfirmed");
});
test("genuine pending analysis retains its hold and invalidates the analysis check", () => {
  const { base, decision } = fixture("developing");
  base.checks.find(check => check.id === "freshness")!.passed = false;
  const result = applyTiming(base, decision, now);
  assert.equal(result.quantitative?.phase, "analysis_hold");
  assert.equal(result.quantitative?.checks.find(check => check.id === "analysis_current")?.passed, false);
  assert.equal(result.action, "keep_watching");
});
