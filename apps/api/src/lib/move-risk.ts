import { MARKET_INTERVAL_MS as BAR, type MarketBar, type MoveRiskForecast } from "@newsbeat/contracts";
import { FORECAST_HOUR as HOUR, FORECAST_ISSUE_WINDOW, FORECAST_LOOKBACK_DAYS } from "./forecast.js";

export const MOVE_RISK_VERSION = "spot-range-hourly-v1";
export const MOVE_THRESHOLD = 0.01;
const MIN_WINDOWS = 240;
const PRIOR_WEIGHT = 20;
const BUCKET_CUTOFFS = [0.003, 0.005, 0.008, 0.012];
const LOOKBACK = FORECAST_LOOKBACK_DAYS * 24 * HOUR;
const iso = (time: number) => new Date(time).toISOString();

function volatility(bars: Map<number, MarketBar>, at: number): number | null {
  const start = bars.get(at - HOUR - BAR);
  if (!start || start.trades <= 0 || !Number.isFinite(start.close) || start.close <= 0) return null;
  let prior = start.close;
  let sum = 0;
  for (let t = at - HOUR; t < at; t += BAR) {
    const bar = bars.get(t);
    if (!bar || bar.trades <= 0 || !Number.isFinite(bar.close) || bar.close <= 0) return null;
    const change = Math.log(bar.close / prior);
    if (Math.abs(change) > 0.4) return null;
    sum += change ** 2;
    prior = bar.close;
  }
  return Math.sqrt(sum);
}

export function isLargeMove(reference: number, target: number): boolean {
  // Round away floating-point error at the exact price threshold.
  return Math.abs(target - reference) / reference >= MOVE_THRESHOLD - 1e-12;
}

export function moveRiskHistory(bars: MarketBar[]) {
  const byTime = new Map(bars.map(bar => [bar.time, bar]));
  const first = bars[0]?.time, last = bars.at(-1)?.time;
  const samples = new Map<number, { volatility: number; bucket: number; price: number }>();
  if (first !== undefined && last !== undefined) {
    for (let at = Math.ceil((first + HOUR + BAR) / HOUR) * HOUR; at <= last + BAR; at += HOUR) {
      const measured = volatility(byTime, at);
      if (measured === null) continue;
      samples.set(at, { volatility: measured, bucket: BUCKET_CUTOFFS.filter(cutoff => measured >= cutoff).length, price: byTime.get(at - BAR)!.close });
    }
  }
  return { byTime, samples };
}

/** Only earlier hourly windows with an observable target contribute to probability. */
export function buildMoveRisk(history: ReturnType<typeof moveRiskHistory>, reference: number, issued: number, url: string): MoveRiskForecast | null {
  if (reference % HOUR !== 0 || issued < reference || issued > reference + FORECAST_ISSUE_WINDOW) return null;
  const current = history.samples.get(reference);
  if (!current) return null;
  let total = 0, moves = 0, matched = 0, matchedMoves = 0;
  for (let at = reference - HOUR; at >= reference - LOOKBACK; at -= HOUR) {
    const features = history.samples.get(at), target = history.byTime.get(at + HOUR - BAR);
    if (!features || !target || target.trades <= 0 || !Number.isFinite(target.close) || target.close <= 0
      || Math.abs(Math.log(target.close / features.price)) > 0.4) continue;
    const moved = Number(isLargeMove(features.price, target.close));
    total++;
    moves += moved;
    if (features.bucket === current.bucket) {
      matched++;
      matchedMoves += moved;
    }
  }
  if (total < MIN_WINDOWS) return null;
  const baseline = (moves + 1) / (total + 2);
  const probability = (matchedMoves + PRIOR_WEIGHT * baseline) / (matched + PRIOR_WEIGHT);
  return {
    issued_at: iso(issued), reference_at: iso(reference), target_at: iso(reference + HOUR),
    reference_price_usd: current.price, threshold_fraction: MOVE_THRESHOLD,
    probability: Number(probability.toFixed(4)), baseline_probability: Number(baseline.toFixed(4)),
    realized_volatility_1h: current.volatility,
    sample_size: total, matched_windows: matched, matched_moves: matchedMoves,
    source: { name: "Kraken spot", url, observed_at: iso(reference) },
  };
}
