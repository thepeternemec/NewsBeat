import { MARKET_INTERVAL_MS as BAR, type ForecastIndicators, type MarketBar, type MarketForecast } from "@newsbeat/contracts";

export const FORECAST_VERSION = "spot-hourly-v1";
export const FORECAST_HOUR = 60 * 60_000;
export const FORECAST_ISSUE_WINDOW = 8 * 60_000;
export const FORECAST_LOOKBACK_DAYS = 30;
export const FORECAST_MISSING_AFTER_HOURS = 6;
export const FORECAST_MARKETS = [
  { id: "kraken:XBTUSD", ticker: "BTC", pair: "BTC/USD", url: "https://pro.kraken.com/app/trade/btc-usd" },
  { id: "kraken:ETHUSD", ticker: "ETH", pair: "ETH/USD", url: "https://pro.kraken.com/app/trade/eth-usd" },
] as const;

const FEATURE_BARS = 54;
const HOUR_BARS = FORECAST_HOUR / BAR;
const MIN_WINDOWS = 36;
const MIN_MATCHES = 12;
const MAX_MATCHES = 24;
const PRIOR_WEIGHT = 20;
const iso = (time: number) => new Date(time).toISOString();

function indicatorWindow(byTime: Map<number, MarketBar>, end: number): ForecastIndicators | null {
  const rows: MarketBar[] = [];
  for (let time = end - FEATURE_BARS * BAR; time < end; time += BAR) {
    const row = byTime.get(time);
    if (!row || !Number.isFinite(row.close) || row.close <= 0 || !Number.isFinite(row.volume) || row.volume < 0
      || !Number.isFinite(row.high) || !Number.isFinite(row.low) || row.high < row.close || row.low <= 0 || row.low > row.close) return null;
    if (rows.length && Math.abs(Math.log(row.close / rows.at(-1)!.close)) > 0.4) return null;
    rows.push(row);
  }
  const last = rows.at(-1)!, seed = rows.slice(0, 20).reduce((sum, row) => sum + row.close, 0) / 20;
  const ema = rows.slice(20).reduce((prior, row) => prior + (2 / 21) * (row.close - prior), seed);
  let gain = 0, loss = 0, trueRange = 0;
  for (let index = rows.length - 14; index < rows.length; index++) {
    const row = rows[index]!, prior = rows[index - 1]!.close, change = row.close - prior;
    gain += Math.max(change, 0);
    loss += Math.max(-change, 0);
    trueRange += Math.max(row.high - row.low, Math.abs(row.high - prior), Math.abs(row.low - prior));
  }
  const volumes = Array.from({ length: 9 }, (_, index) => rows.slice(index * 6, index * 6 + 6).reduce((sum, row) => sum + row.volume, 0));
  const median = volumes.slice(0, -1).sort((a, b) => a - b);
  const baselineVolume = (median[3]! + median[4]!) / 2;
  if (baselineVolume <= 0 || volumes.at(-1)! <= 0 || last.trades <= 0
    || rows.slice(-HOUR_BARS).filter(row => row.trades > 0).length < 9) return null;
  return {
    rsi_14: gain + loss ? 100 * gain / (gain + loss) : 50,
    trend_vs_ema_20: last.close / ema - 1,
    momentum_30m: last.close / rows[rows.length - 7]!.close - 1,
    atr_14_fraction: trueRange / 14 / last.close,
    relative_volume_30m: volumes.at(-1)! / baselineVolume,
  };
}

function distance(a: ForecastIndicators, b: ForecastIndicators): number {
  const normalized = [
    (a.rsi_14 - b.rsi_14) / 20,
    a.trend_vs_ema_20 / Math.max(a.atr_14_fraction, 0.0001) / 3 - b.trend_vs_ema_20 / Math.max(b.atr_14_fraction, 0.0001) / 3,
    a.momentum_30m / Math.max(a.atr_14_fraction, 0.0001) / 3 - b.momentum_30m / Math.max(b.atr_14_fraction, 0.0001) / 3,
    Math.log(Math.max(a.atr_14_fraction, 0.0001) / Math.max(b.atr_14_fraction, 0.0001)),
    Math.log(a.relative_volume_30m / b.relative_volume_30m),
  ];
  return Math.sqrt(normalized.reduce((sum, value) => sum + value ** 2, 0) / normalized.length);
}

/** Hour-aligned, non-overlapping labels. The live reference is never a training label from the future. */
export function buildHourlyForecast(bars: MarketBar[], reference: number, issued: number, url: string): MarketForecast | null {
  if (reference % FORECAST_HOUR !== 0 || issued < reference || issued > reference + FORECAST_ISSUE_WINDOW) return null;
  const byTime = new Map(bars.filter(bar => bar.time + BAR <= reference).map(bar => [bar.time, bar]));
  const current = indicatorWindow(byTime, reference);
  if (!current) return null;
  const history: Array<{ at: number; change: number; distance: number }> = [];
  const oldest = reference - FORECAST_LOOKBACK_DAYS * 24 * FORECAST_HOUR;
  for (let end = reference - FORECAST_HOUR; end >= oldest; end -= FORECAST_HOUR) {
    const features = indicatorWindow(byTime, end);
    if (!features) continue;
    const forward = Array.from({ length: HOUR_BARS }, (_, index) => byTime.get(end + BAR * index));
    if (forward.some(row => !row || !Number.isFinite(row.close) || row.close <= 0) || !forward.at(-1)!.trades) continue;
    const start = byTime.get(end - BAR)!.close;
    if (forward.some((row, index) => Math.abs(Math.log(row!.close / (index ? forward[index - 1]!.close : start))) > 0.4)) continue;
    history.push({ at: end, change: forward.at(-1)!.close / start - 1, distance: distance(current, features) });
  }
  if (history.length < MIN_WINDOWS) return null;
  const matches = history.filter(row => row.distance <= 1.75)
    .sort((a, b) => a.distance - b.distance || b.at - a.at).slice(0, MAX_MATCHES);
  if (matches.length < MIN_MATCHES) return null;
  const prior = (history.filter(row => row.change > 0).length + 1) / (history.length + 2);
  const up = matches.filter(row => row.change > 0).length;
  const changes = matches.map(row => row.change).sort((a, b) => a - b);
  const percentile = (p: number) => changes[Math.round((changes.length - 1) * p)]!;
  return {
    issued_at: iso(issued), reference_at: iso(reference), target_at: iso(reference + FORECAST_HOUR),
    reference_price_usd: byTime.get(reference - BAR)!.close,
    probability_above: Math.round(100 * (up + PRIOR_WEIGHT * prior) / (matches.length + PRIOR_WEIGHT)) / 100,
    baseline_probability: Math.round(100 * prior) / 100,
    indicators: current,
    history: { windows: history.length, matched: matches.length, matched_above: up,
      earliest_reference_at: iso(history.at(-1)!.at), latest_reference_at: iso(history[0]!.at),
      return_10th: percentile(0.10), return_50th: percentile(0.5), return_90th: percentile(0.90) },
    source: { name: "Kraken spot", url, observed_at: iso(reference) },
  };
}
