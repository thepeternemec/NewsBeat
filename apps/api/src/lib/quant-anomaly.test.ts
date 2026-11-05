import assert from "node:assert/strict";
import { test } from "node:test";
import { quantitativeFixture } from "./quant-fixtures.js";
import { buildMarketContext } from "./quant-engine.js";
import { discoverMarket, freezeAnomaly } from "./quant-anomaly.js";

const scan = (f: ReturnType<typeof quantitativeFixture>, ready = false) => discoverMarket(f.profile, f.snapshots, buildMarketContext(f.profile, f.snapshots, f.now), [], ready, f.now);
test("independent discovery detects a relative dislocation without a news thesis", () => {
  const f = quantitativeFixture(Date.now(), 0.003), research = scan(f);
  assert.equal(research.status, "ready");
  assert.ok(research.windows.some(w => w.status === "unusual" && w.direction === "up"));
  assert.equal(research.reporting.status, "pending");
  const quiet = scan(quantitativeFixture(f.now, 0));
  assert.ok(quiet.windows.every(w => w.status !== "unusual"), JSON.stringify(quiet.windows));
  const negative = scan(quantitativeFixture(f.now, -0.003));
  assert.ok(negative.windows.some(w => w.status === "unusual" && w.direction === "down"));
});
test("the current dislocation and future candles cannot enter its historical comparison", () => {
  const f = quantitativeFixture(Date.now(), 0), before = scan(f);
  const impulse = quantitativeFixture(f.now, 0.003), after = scan(impulse);
  const a = before.windows.find(w => w.minutes === 30)!, b = after.windows.find(w => w.minutes === 30)!;
  assert.deepEqual(a.fit, b.fit);
  assert.equal(a.historical_windows, b.historical_windows);
  assert.notEqual(a.residual_return, b.residual_return);
  for (const snapshot of impulse.snapshots.values()) snapshot.bars.push({ ...snapshot.bars.at(-1)!, time: f.end + 3600000, close: 999999 });
  assert.deepEqual(scan(impulse), after, "unclosed future bars are excluded");
});
test("a market-wide move is removed by the proxy rather than labeled an independent anomaly", () => {
  const f = quantitativeFixture(Date.now(), 0);
  for (const [snapshot, beta] of [[f.asset, 1.2], [f.benchmark, 1]] as const) for (let n = 354; n < 360; n++) {
    const bar = snapshot.bars[n]!, factor = Math.exp((n - 353) * 0.003 * beta);
    bar.close *= factor; bar.open *= Math.exp((n - 354) * 0.003 * beta); bar.high = Math.max(bar.open, bar.close); bar.low = Math.min(bar.open, bar.close);
  }
  assert.ok(scan(f).windows.every(w => w.status !== "unusual"));
});
test("thin history, missing peers and current gaps cannot produce anomaly candidates", () => {
  const f = quantitativeFixture(Date.now(), 0.003);
  for (const s of f.snapshots.values()) s.bars = s.bars.slice(-70);
  assert.ok(scan(f).windows.every(w => w.status === "insufficient"));
  const missing = quantitativeFixture(f.now, 0.003); missing.snapshots.delete(missing.benchmark.instrument.id);
  assert.equal(scan(missing).status, "data_hold");
  const gap = quantitativeFixture(f.now, 0.003); gap.asset.bars.splice(-2, 1);
  assert.ok(scan(gap).windows.every(w => w.status !== "unusual"));
});
test("frozen observations require current uncrossed quotes and preserve the first model", () => {
  const f = quantitativeFixture(Date.now(), 0.003), window = scan(f).windows.find(w => w.status === "unusual")!;
  const record = freezeAnomaly(window, f.profile, f.snapshots, f.now)!;
  assert.ok(record); assert.equal(record.reference_price, f.asset.book!.mid);
  assert.ok(record.outcomes.every(o => o.status === "pending"));
  f.asset.book!.observed_at = new Date(f.now - 180000).toISOString();
  assert.equal(freezeAnomaly(window, f.profile, f.snapshots, f.now), null);
  assert.equal(record.reference_at, new Date(f.now).toISOString());
});
