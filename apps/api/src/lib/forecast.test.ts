import assert from "node:assert/strict";
import { test } from "node:test";
import { MARKET_INTERVAL_MS as BAR, type MarketBar } from "@newsbeat/contracts";
import { buildHourlyForecast, FORECAST_HOUR as HOUR } from "./forecast.js";

const end = Date.UTC(2026, 10, 13, 13);
const source = "https://pro.kraken.com/app/trade/btc-usd";

function history(hours: number, until = end): MarketBar[] {
  return Array.from({ length: hours * 12 }, (_, index) => {
    const close = 100 + index * 0.01 + 0.3 * Math.sin(index / 5);
    return { time: until - hours * HOUR + index * BAR, open: close, close, high: close + 0.05, low: close - 0.05, trades: 10, volume: 20 };
  });
}

test("uses only completed observations through the reference and freezes a reproducible target", () => {
  const bars = history(60);
  const forecast = buildHourlyForecast(bars, end, end + BAR, source);
  assert.ok(forecast);
  const future = history(2, end + 2 * HOUR).map(bar => ({ ...bar, close: 5_000 }));
  assert.deepEqual(buildHourlyForecast([...bars, ...future], end, end + BAR, source), forecast);
  assert.equal(forecast.target_at, new Date(end + HOUR).toISOString());
  assert.equal(forecast.history.latest_reference_at, new Date(end - HOUR).toISOString());
  assert.equal(forecast.reference_price_usd, bars.at(-1)!.close);
  assert.equal(forecast.indicators.relative_volume_30m, 1);
  assert.ok(forecast.indicators.rsi_14 >= 0 && forecast.indicators.rsi_14 <= 100);
  assert.ok(forecast.probability_above >= 0 && forecast.probability_above <= 1);
  assert.ok(forecast.history.return_10th <= forecast.history.return_50th);
  assert.ok(forecast.history.return_50th <= forecast.history.return_90th);
});

test("holds calls with missing data, untraded reference candles, or a missed issuance window", () => {
  const bars = history(60);
  assert.equal(buildHourlyForecast(bars, end, end + 9 * 60_000, source), null);
  assert.equal(buildHourlyForecast(bars, end, end - BAR, source), null);
  assert.equal(buildHourlyForecast(bars.slice(0, -1), end, end + BAR, source), null);
  assert.equal(buildHourlyForecast(history(30), end, end + BAR, source), null);
  bars.at(-1)!.trades = 0;
  assert.equal(buildHourlyForecast(bars, end, end + BAR, source), null);
});
