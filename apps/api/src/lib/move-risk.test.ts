import assert from "node:assert/strict";
import { test } from "node:test";
import { MARKET_INTERVAL_MS as BAR, type MarketBar } from "@newsbeat/contracts";
import { FORECAST_HOUR as HOUR } from "./forecast.js";
import { buildMoveRisk, isLargeMove, moveRiskHistory } from "./move-risk.js";

const end = Date.UTC(2026, 9, 1);
const source = "https://pro.kraken.com/app/trade/btc-usd";

function candles(hours: number): MarketBar[] {
  return Array.from({ length: hours * 12 }, (_, i) => {
    const close = 100 + Math.sin(i / 10);
    return { time: end - hours * HOUR + i * BAR, open: close, close, high: close, low: close, trades: 5, volume: 10 };
  });
}

test("move risk forecasts freeze from past closes and score either direction at the threshold", () => {
  const bars = candles(260);
  const call = buildMoveRisk(moveRiskHistory(bars), end, end + BAR, source);
  assert.ok(call);
  assert.equal(call.target_at, new Date(end + HOUR).toISOString());
  assert.ok(call.matched_windows > 0 && call.matched_windows <= call.sample_size);
  assert.deepEqual(buildMoveRisk(moveRiskHistory([...bars, ...candles(1).map(bar => ({ ...bar, time: bar.time + HOUR, close: 250 }))]), end, end + BAR, source), call);
  assert.equal(isLargeMove(100, 99), true);
  assert.equal(isLargeMove(100, 101), true);
  assert.equal(isLargeMove(100, 100.99), false);
});

test("move risk holds when the reference hour is stale, has a gap or has too little history", () => {
  const bars = candles(260);
  assert.equal(buildMoveRisk(moveRiskHistory(bars), end, end + 9 * 60_000, source), null);
  assert.equal(buildMoveRisk(moveRiskHistory(candles(150)), end, end + BAR, source), null);
  assert.equal(buildMoveRisk(moveRiskHistory(bars.filter(bar => bar.time !== end - 2 * BAR)), end, end + BAR, source), null);
  bars[bars.length - 13]!.trades = 0;
  assert.equal(buildMoveRisk(moveRiskHistory(bars), end, end + BAR, source), null);
});
