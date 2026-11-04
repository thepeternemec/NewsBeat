import assert from "node:assert/strict";
import { test } from "node:test";
import { MARKET_INTERVAL_MS as I, SIGNAL_CONTEXTS } from "@newsbeat/contracts";
import { parseBook, parseClosedBars, verifyInstrument, MARKET_PROFILES } from "./quant-market.js";
import { alignMarket, fitBefore, buildMarketContext, informationDelta, measureWindow } from "./quant-engine.js";
import { decideTiming, applyTiming, beginEvaluation, updateOutcomes } from "./quant-decision.js";
import { quantitativeFixture } from "./quant-fixtures.js";
import { constructSignal } from "./signal-construction.js";

test("provider mapping verifies asset class and preserves xStock symbol case", () => {
  const profile = MARKET_PROFILES[0]!;
  const body = { error: [], result: { "NVDAx/USD": { altname: "NVDAxUSD", base: "NVDAx", quote: "USD", aclass_base: "tokenized_asset", status: "online" } } };
  assert.equal(verifyInstrument(body, profile, new Date().toISOString()).base, "NVDAx");
  assert.throws(() => verifyInstrument({ ...body, result: { "NVDAx/USD": { ...body.result["NVDAx/USD"], aclass_base: "currency" } } }, profile, ""), /mapping_unverified/);
  assert.throws(() => verifyInstrument(body, { ...profile, base: "NVDA" }, ""), /mapping_unverified/);
});
test("uncommitted candles, duplicate timestamps and invalid prices never enter the estimator", () => {
  const f = quantitativeFixture(), t = Math.floor(f.now / I) * I / 1000;
  const rows = [[t - 600, "100", "102", "99", "101", "101", "10", 2], [t - 300, "101", "103", "100", "102", "102", "12", 3], [t, "102", "999", "1", "900", "100", "1", 1]];
  const body = { error: [], result: { "NVDAx/USD": rows, last: t } };
  const parsed = parseClosedBars(body, f.asset.instrument, f.now);
  assert.equal(parsed.length, 2); assert.equal(parsed.at(-1)!.close, 102);
  assert.throws(() => parseClosedBars({ ...body, result: { "AAPLx/USD": rows } }, f.asset.instrument, f.now), /pair_mismatch/);
  const corrupt = structuredClone(body); corrupt.result["NVDAx/USD"][0]![4] = "-1";
  assert.throws(() => parseClosedBars(corrupt, f.asset.instrument, f.now), /bar_invalid/);
  const duplicate = structuredClone(body); duplicate.result["NVDAx/USD"][1]![0] = t - 600;
  assert.throws(() => parseClosedBars(duplicate, f.asset.instrument, f.now), /history_invalid/);
});
test("book costs account for available depth and refuse crossed or insufficient books", () => {
  const f = quantitativeFixture();
  const body = { error: [], result: { "NVDAx/USD": { asks: [["101", "20", 1]], bids: [["99", "20", 1]] } } };
  const book = parseBook(body, f.asset.instrument, new Date(f.now).toISOString());
  assert.ok(book.buy_impact_bps! > 99 && book.sell_impact_bps! > 99);
  const thin = structuredClone(body); thin.result["NVDAx/USD"].asks[0]![1] = "1";
  assert.equal(parseBook(thin, f.asset.instrument, new Date(f.now).toISOString()).buy_impact_bps, null);
  const crossed = structuredClone(body); crossed.result["NVDAx/USD"].bids[0]![0] = "102";
  assert.throws(() => parseBook(crossed, f.asset.instrument, ""), /book_crossed/);
});
test("beta uses pre-anchor returns and a broad proxy move is not an idiosyncratic residual", () => {
  const f = quantitativeFixture(), points = alignMarket(f.profile, f.snapshots, f.now);
  const fit = fitBefore(points, f.known - 30 * 60000)!;
  assert.ok(fit && fit.samples >= 60 && Math.abs(fit.beta - 1.2) < 0.2);
  const changed = points.map(point => point.time >= f.known ? { ...point, a: point.a + 0.2, b: point.b - 0.1 } : point);
  assert.deepEqual(fitBefore(changed, f.known - 30 * 60000), fit, "future prices must not alter the baseline");
  const pureProxy = points.map(point => ({ ...point, a: 2 * point.b }));
  const exact = fitBefore(pureProxy, f.known)!;
  assert.ok(Math.abs(exact.beta - 2) < 1e-10);
  const window = measureWindow(pureProxy, f.end - 30 * 60000, f.end, exact)!;
  assert.ok(Math.abs(window.residual_return!) < 1e-10);
});
test("gaps and flat proxies fail closed rather than inventing a baseline or filling prices", () => {
  const f = quantitativeFixture();
  f.benchmark.bars = f.benchmark.bars.filter(bar => bar.time !== f.end - 2 * I);
  const points = alignMarket(f.profile, f.snapshots, f.now);
  assert.equal(measureWindow(points, f.end - 30 * 60000, f.end, null), null);
  for (const bar of f.benchmark.bars) bar.close = 100;
  assert.equal(fitBefore(alignMarket(f.profile, f.snapshots, f.now), f.known), null);
});
test("fresh directional information, residual confirmation and participation can qualify a review alert", () => {
  const f = quantitativeFixture(), market = buildMarketContext(f.profile, f.snapshots, f.now);
  const decision = decideTiming(f.signal, null, f.base, market, f.profile, f.snapshots, f.now);
  assert.equal(decision.action, "review_now", JSON.stringify(decision));
  assert.equal(decision.phase, "developing"); assert.ok(decision.checks.every(check => check.passed));
  const output = applyTiming(f.base, decision, f.now);
  assert.equal(output.status, "alert"); assert.ok(output.checks.every(check => check.passed)); assert.equal(output.market_reaction.status, "observed");
  assert.equal(decision.alert_id, decideTiming(f.signal, null, f.base, market, f.profile, f.snapshots, f.now + 1000).alert_id);
});
test("a different context suppresses the same measured development", () => {
  const f = quantitativeFixture(), context = SIGNAL_CONTEXTS[1]!;
  const base = constructSignal(f.signal, context, { now: new Date(f.now).toISOString(), source_freshness: "fresh", analysis_ready: true, analysis_at: new Date(f.now).toISOString() });
  const decision = decideTiming(f.signal, null, base, buildMarketContext(f.profile, f.snapshots, f.now), f.profile, f.snapshots, f.now);
  assert.equal(decision.action, "no_alert"); assert.equal(decision.alert_id, null);
});
test("extended and opposing moves produce watch or reassessment, not a late directional alert", () => {
  for (const [impulse, phase] of [[0.003, "extended"], [-0.001, "diverging"]] as const) {
    const f = quantitativeFixture(undefined, impulse);
    const d = decideTiming(f.signal, null, f.base, buildMarketContext(f.profile, f.snapshots, f.now), f.profile, f.snapshots, f.now);
    assert.equal(d.phase, phase, JSON.stringify(d)); assert.equal(d.alert_id, null);
  }
});
test("stale series, sparse prints, expensive books and pending analysis block timing alerts", () => {
  for (const mode of ["stale", "sparse", "spread", "pending"] as const) {
    const f = quantitativeFixture();
    if (mode === "stale") f.asset.observed_at = new Date(f.now - 20 * 60000).toISOString();
    if (mode === "sparse") for (const bar of f.asset.bars.slice(-6)) { bar.trades = 0; bar.volume = 0; }
    if (mode === "spread") f.asset.book!.spread_bps = 100;
    const base = mode === "pending" ? constructSignal(f.signal, f.context, { now: new Date(f.now).toISOString(), source_freshness: "fresh", analysis_ready: false, analysis_at: new Date(f.now).toISOString() }) : f.base;
    const d = decideTiming(f.signal, null, base, buildMarketContext(f.profile, f.snapshots, f.now), f.profile, f.snapshots, f.now);
    assert.notEqual(d.action, "review_now", mode); assert.equal(d.alert_id, null);
  }
});
test("adding context to old news or repeating coverage is not a fresh information delta", () => {
  const f = quantitativeFixture(), previous = structuredClone(f.signal);
  delete previous.market_assessment; previous.version = 1;
  const current = { ...f.signal, version: 2, change_kind: "update" as const };
  assert.equal(informationDelta(current, previous).kind, "context_added"); assert.equal(informationDelta(current, previous).meaningful, false);
  assert.equal(informationDelta({ ...current, change_kind: "evidence_added" }, f.signal).meaningful, false);
  assert.equal(informationDelta({ ...f.signal, version: 9 }, null).meaningful, false, "a missing revision must not be assumed novel");
});
test("reads downgrade an earlier alert when source or market gates expire", () => {
  const f = quantitativeFixture(), d = decideTiming(f.signal, null, f.base, buildMarketContext(f.profile, f.snapshots, f.now), f.profile, f.snapshots, f.now);
  assert.equal(d.action, "review_now");
  assert.notEqual(applyTiming(f.base, d, f.now + 11 * 60000).action, "review_now");
  const pending = constructSignal(f.signal, f.context, { now: new Date(f.now).toISOString(), source_freshness: "fresh", analysis_ready: false, analysis_at: new Date(f.now).toISOString() });
  assert.equal(applyTiming(pending, d, f.now).action, "keep_watching");
  assert.equal(applyTiming(pending, d, f.now).alert_id, null);
});
test("forward outcomes wait for future closed traded bars and retain the decision's frozen reference model", () => {
  const f = quantitativeFixture(), d = decideTiming(f.signal, null, f.base, buildMarketContext(f.profile, f.snapshots, f.now), f.profile, f.snapshots, f.now);
  const record = beginEvaluation(f.signal, d, f.profile, f.snapshots, "all_constructions")!;
  assert.ok(record); assert.equal(record.reference_basis, "snapshot_mid");
  assert.ok(updateOutcomes(record, f.profile, f.snapshots, f.now + 14 * 60000).every(outcome => outcome.status === "pending"));
  const later = f.end + 25 * 60000;
  for (const snapshot of f.snapshots.values()) {
    const close = snapshot.instrument.id === f.profile.id ? record.reference_price * 1.01 : record.reference_benchmark_prices[snapshot.instrument.id]! * 1.005;
    snapshot.observed_at = new Date(later).toISOString();
    snapshot.bars.push({ time: f.end + 15 * 60000, open: close, high: close, low: close, close, trades: 2, volume: 10 });
  }
  const result = updateOutcomes(record, f.profile, f.snapshots, later);
  assert.equal(result[0]!.status, "observed"); assert.ok(Math.abs(result[0]!.asset_return! - 0.01) < 1e-10);
  assert.ok(Math.abs(result[0]!.benchmark_return! - 0.005) < 1e-10); assert.equal(result[1]!.status, "pending");
  assert.equal(record.outcomes[0]!.status, "pending", "the frozen decision record is not mutated");
  assert.equal(updateOutcomes(record, f.profile, new Map(), later + 4 * 3600000)[0]!.status, "expired", "unavailable inputs expire without fabricating an outcome");
});
