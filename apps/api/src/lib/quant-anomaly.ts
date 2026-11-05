import { MARKET_INTERVAL_MS as I, type IntelligenceSignal, type MarketAnomalyRecord, type MarketAnomalyWindow,
  type MarketContext, type MarketResearch, type MarketSnapshot } from "@newsbeat/contracts";
import { alignMarket, fitBefore, measureWindow, TIMING_POLICY } from "./quant-engine.js";
import { benchmarkFor, type MarketProfile } from "./quant-market.js";
import { hash } from "./intelligence-core.js";

export const ANOMALY_VERSION = "market-discovery-v1";
const MIN_HISTORY = 24, MAX_HISTORY = 96;
const iso = (n: number) => new Date(n).toISOString();
const median = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return a.length ? (a[Math.floor((a.length - 1) / 2)]! + a[Math.floor(a.length / 2)]!) / 2 : 0; };

/** Each comparison is out of sample: fit before its window, then score the next closed window.
 * Historical test windows never overlap each other or the current test window. */
export function discoverMarket(profile: MarketProfile, snapshots: Map<string, MarketSnapshot>, market: MarketContext,
  signals: IntelligenceSignal[], analysisReady: boolean, now: number): MarketResearch {
  const points = alignMarket(profile, snapshots, now), end = points.at(-1) ? points.at(-1)!.time + I : Math.floor(now / I) * I;
  const reliable = ["mapped", "snapshot", "closed_bars", "active_trading", "price_integrity"].every(id => market.quality.find(q => q.id === id)?.passed);
  const windows = [15, 30, 60].map((minutes): MarketAnomalyWindow => {
    const width = minutes * 60000, start = end - width, fit = fitBefore(points, start);
    const current = measureWindow(points, start, end, fit);
    const history: Array<{ z: number; volume: number }> = [];
    // Cap work per instrument and horizon. Missing/inactive blocks are excluded, not filled with zeros.
    for (let pastEnd = start, visited = 0; visited < MAX_HISTORY && pastEnd - width >= (points[0]?.time ?? end); pastEnd -= width, visited++) {
      const pastFit = fitBefore(points, pastEnd - width);
      const past = pastFit && measureWindow(points, pastEnd - width, pastEnd, pastFit);
      if (past && past.residual_z !== null && Number.isFinite(past.residual_z) && past.active_fraction >= 0.5 && past.trades >= 3) history.push({ z: Math.abs(past.residual_z), volume: past.volume });
    }
    const z = current?.residual_z ?? null;
    const exceedances = z === null ? 0 : history.filter(past => past.z >= Math.abs(z)).length;
    // Add-one rank avoids a zero tail estimate. It is descriptive, not a calibrated p-value.
    const tail = z === null || history.length < MIN_HISTORY ? null : (1 + exceedances) / (1 + history.length);
    const volumeMedian = median(history.map(row => row.volume));
    const pre = fit && measureWindow(points, start - 60 * 60000, start, fit);
    const preRows = points.filter(p => p.time >= start - 60 * 60000 && p.time + I <= start);
    const volatility = pre && fit ? Math.sqrt(preRows.reduce((sum, p) => sum + (p.a - fit.intercept - fit.beta * p.b) ** 2, 0) / preRows.length) / Math.max(fit.residual_sigma, TIMING_POLICY.residual_sigma_floor) : null;
    const checks = [
      { id: "reliable_market", passed: reliable, reason: "Verified, current, traded venue observations and complete aligned candles are required." },
      { id: "history", passed: !!fit && history.length >= MIN_HISTORY, reason: "At least 24 earlier non-overlapping scored windows and a separate pre-window fit are required." },
      { id: "current_window", passed: !!current && current.active_fraction >= 0.5 && current.trades >= 3, reason: "The complete current window must contain actual trades in at least half its buckets." },
      { id: "unusual_residual", passed: z !== null && Math.abs(z) >= 2.5 && tail !== null && tail <= 0.05 && Math.abs(current?.residual_return ?? 0) >= 0.002,
        reason: "The relative move must exceed 2.5 baseline deviations, 20 basis points and at least 95% of the earlier scored magnitudes." },
    ];
    const usable = checks.slice(0, 3).every(q => q.passed);
    return { minutes, start_at: iso(start), end_at: iso(end), status: !usable ? "insufficient" : checks[3]!.passed ? "unusual" : "usual",
      direction: (current?.residual_return ?? 0) > 0 ? "up" : (current?.residual_return ?? 0) < 0 ? "down" : "flat",
      residual_return: current?.residual_return ?? null, residual_z: z, historical_windows: history.length, historical_exceedances: exceedances,
      empirical_tail_fraction: tail, volume_ratio: current && volumeMedian > 0 ? current.volume / volumeMedian : null,
      fit, regime: volatility === null ? "unknown" : volatility > 1.8 ? "volatile" : volatility < 0.6 ? "quiet" : "stable", volatility_ratio: volatility, checks };
  });
  const unusual = windows.filter(w => w.status === "unusual");
  const focus = [...unusual].sort((a, b) => (a.empirical_tail_fraction ?? 1) - (b.empirical_tail_fraction ?? 1) || b.minutes - a.minutes)[0];
  const linked = !analysisReady || !focus ? [] : signals.filter(signal => signal.event_state === "reported" && signal.market_assessment &&
    ["supportive", "adverse"].includes(signal.market_assessment.direction) && Date.parse(signal.updated_at) <= now && now - Date.parse(signal.updated_at) <= 3 * 3600000 &&
    signal.evidence.some(report => Date.parse(report.published_at) <= end && end - Date.parse(report.published_at) <= 3 * 3600000));
  const aligned = linked.filter(s => (s.market_assessment!.direction === "supportive") === (focus?.direction === "up"));
  const opposing = linked.filter(s => !aligned.includes(s));
  const reporting: MarketResearch["reporting"] = { status: !analysisReady ? "pending" : aligned.length && opposing.length ? "mixed" : aligned.length ? "aligned" : opposing.length ? "opposing" : "unmatched",
    signal_ids: linked.map(s => s.id), note: !analysisReady ? "Reporting is still being checked; no explanation is asserted." : linked.length ? "Recent headline interpretations are linked by direction only; this does not establish the cause of a move." : "No matching checked interpretation was found; this does not mean there is no relevant news." };
  const status = !reliable ? "data_hold" : windows.every(w => w.status === "insufficient") ? "warming_up" : "ready";
  return { detector_version: ANOMALY_VERSION, scanned_at: iso(now), status, windows, reporting, records: [],
    headline: status === "data_hold" ? "The independent scan needs fresher market evidence." : status === "warming_up" ? "Building a comparison with earlier market behavior." : focus ? "An unusual relative move deserves investigation." : "No unusual relative move stands out.",
    explanation: focus ? "The " + focus.minutes + "-minute move differs from both its market proxy and earlier scored windows. Check whether it persists, fades or reflects a change in volatility before treating it as an opportunity."
      : "NewsBeat scans market behavior independently of headlines. It compares new moves with earlier observations instead of requiring a news story to start the analysis.",
    note: "Three exploratory horizons share data and are not independent tests. Historical ranks are not return probabilities. Regime and venue effects can explain an anomaly; no directional edge or market outperformance is established." };
}

export function freezeAnomaly(window: MarketAnomalyWindow, profile: MarketProfile, snapshots: Map<string, MarketSnapshot>, now: number): MarketAnomalyRecord | null {
  if (window.status !== "unusual" || !window.fit) return null;
  const ids = [profile.id, ...benchmarkFor(profile).components.map(c => c.instrument_id)];
  if (ids.some(id => { const s = snapshots.get(id), q = s?.book; return !q || !!s?.error || !Number.isFinite(q.mid) || q.mid <= 0 || q.ask <= q.bid || !Number.isFinite(Date.parse(q.observed_at)) || now - Date.parse(q.observed_at) < 0 || now - Date.parse(q.observed_at) > 120000; })) return null;
  const book = snapshots.get(profile.id)!.book!, reference = iso(now);
  return { id: "anomaly_" + hash([profile.id, ANOMALY_VERSION, window.minutes, window.direction, window.end_at]).slice(0, 24),
    instrument_id: profile.id, detector_version: ANOMALY_VERSION, opened_at: reference, closed_at: null, window,
    reference_at: reference, reference_price: book.mid, reference_quotes_at: Object.fromEntries(ids.map(id => [id, snapshots.get(id)!.book!.observed_at])),
    reference_benchmark_prices: Object.fromEntries(ids.slice(1).map(id => [id, snapshots.get(id)!.book!.mid])), frozen_beta: window.fit.beta, frozen_intercept: window.fit.intercept,
    estimated_book_cost_bps: book.buy_impact_bps !== null && book.sell_impact_bps !== null ? book.buy_impact_bps + book.sell_impact_bps : null,
    outcomes: [15, 60, 240].map(minutes => ({ horizon_minutes: minutes, status: "pending", due_at: iso(now + minutes * 60000), observed_at: null, market_at: null, asset_return: null, benchmark_return: null, residual_return: null })) };
}
