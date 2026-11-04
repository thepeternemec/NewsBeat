import {
  MARKET_INTERVAL_MS as INTERVAL, QUANT_POLICY_VERSION, type ConstructedSignal, type IntelligenceSignal,
  type InformationDelta, type MarketContext, type MarketFit, type MarketSnapshot, type MarketWindow,
  type QuantSignalDecision, type QuantEvaluationRecord, type ForwardOutcome,
} from "@newsbeat/contracts";
import { hash } from "./intelligence-core.js";
import { benchmarkFor, type MarketProfile } from "./quant-market.js";

export const TIMING_POLICY = {
  baseline_samples: 240, minimum_samples: 60, max_snapshot_age_ms: 10 * 60000,
  max_trade_age_ms: 15 * 60000, information_window_ms: 60 * 60000,
  maximum_spread_bps: 35, maximum_book_cost_bps: 75,
  minimum_residual_bps: 20, confirmation_z: 1.25, extended_z: 3,
  minimum_volume_ratio: 1.5, minimum_active_fraction: 0.5,
  residual_sigma_floor: 0.00005,
} as const;
interface Frame {
  time: number; a: number; b: number; close: number; previous_close: number; volume: number; trades: number;
}
const iso = (time: number) => new Date(time).toISOString();
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const median = (values: number[]) => { const rows = [...values].sort((a, b) => a - b); return rows.length % 2 ? rows[Math.floor(rows.length / 2)]! : (rows[rows.length / 2 - 1]! + rows[rows.length / 2]!) / 2; };
const finiteDate = (value: string) => Number.isFinite(Date.parse(value));
function closed(snapshot: MarketSnapshot, now: number) {
  const available = Math.min(now, Date.parse(snapshot.observed_at));
  return snapshot.bars.filter(bar => bar.time + INTERVAL <= available && bar.close > 0 && Number.isFinite(bar.close)).sort((a, b) => a.time - b.time);
}
/** Exact-time joins only. Missing buckets and uncommitted candles are never forward-filled. */
export function alignMarket(profile: MarketProfile, snapshots: Map<string, MarketSnapshot>, now: number): Frame[] {
  const asset = snapshots.get(profile.id), benchmark = benchmarkFor(profile);
  if (!asset || benchmark.components.some(item => !snapshots.has(item.instrument_id))) return [];
  const assetBars = closed(asset, now);
  const peers = benchmark.components.map(component => ({
    weight: component.weight, bars: new Map(closed(snapshots.get(component.instrument_id)!, now).map(bar => [bar.time, bar])),
  }));
  const points: Frame[] = [];
  for (let index = 1; index < assetBars.length; index++) {
    const bar = assetBars[index]!, previous = assetBars[index - 1]!;
    if (bar.time - previous.time !== INTERVAL) continue;
    let peerReturn = 0, complete = true;
    for (const peer of peers) {
      const current = peer.bars.get(bar.time), before = peer.bars.get(bar.time - INTERVAL);
      if (!current || !before) { complete = false; break; }
      peerReturn += peer.weight * (current.close / before.close - 1);
    }
    if (!complete || peerReturn <= -1) continue;
    points.push({ time: bar.time, a: Math.log(bar.close / previous.close), b: Math.log1p(peerReturn),
      close: bar.close, previous_close: previous.close, volume: bar.volume, trades: bar.trades });
  }
  return points;
}
/** An intercept-bearing OLS fit using only buckets closed before the decision anchor. */
export function fitBefore(points: Frame[], anchor: number): MarketFit | null {
  const rows = points.filter(point => point.time + INTERVAL <= anchor).slice(-TIMING_POLICY.baseline_samples);
  if (rows.length < TIMING_POLICY.minimum_samples || rows.some(row => !Number.isFinite(row.a) || !Number.isFinite(row.b))) return null;
  const x = mean(rows.map(row => row.b)), y = mean(rows.map(row => row.a));
  const xx = rows.reduce((sum, row) => sum + (row.b - x) ** 2, 0);
  if (xx / rows.length < 1e-12) return null;
  const beta = rows.reduce((sum, row) => sum + (row.b - x) * (row.a - y), 0) / xx;
  if (!Number.isFinite(beta) || Math.abs(beta) > 5) return null;
  const intercept = y - beta * x;
  const rss = rows.reduce((sum, row) => sum + (row.a - intercept - beta * row.b) ** 2, 0);
  const tss = rows.reduce((sum, row) => sum + (row.a - y) ** 2, 0);
  return { beta, intercept, residual_sigma: Math.sqrt(rss / Math.max(1, rows.length - 2)),
    r_squared: tss > 0 ? Math.max(0, Math.min(1, 1 - rss / tss)) : 0,
    samples: rows.length, start_at: iso(rows[0]!.time), end_at: iso(rows.at(-1)!.time + INTERVAL) };
}
export function measureWindow(points: Frame[], start: number, end: number, fit: MarketFit | null): MarketWindow | null {
  const expected = Math.round((end - start) / INTERVAL);
  if (expected < 1 || end - start !== expected * INTERVAL) return null;
  const rows = points.filter(point => point.time >= start && point.time + INTERVAL <= end);
  if (rows.length !== expected || rows.some((row, index) => row.time !== start + index * INTERVAL)) return null;
  const a = rows.reduce((sum, row) => sum + row.a, 0), b = rows.reduce((sum, row) => sum + row.b, 0);
  const residual = fit ? a - fit.intercept * rows.length - fit.beta * b : null;
  return { minutes: expected * 5, start_at: iso(start), end_at: iso(end), asset_return: Math.expm1(a),
    benchmark_return: Math.expm1(b), excess_return: Math.expm1(a) - Math.expm1(b),
    residual_return: residual === null ? null : Math.expm1(residual),
    residual_z: residual === null ? null : residual / (Math.max(fit!.residual_sigma, TIMING_POLICY.residual_sigma_floor) * Math.sqrt(rows.length)),
    active_fraction: rows.filter(row => row.trades > 0).length / rows.length,
    trades: rows.reduce((sum, row) => sum + row.trades, 0), volume: rows.reduce((sum, row) => sum + row.volume, 0) };
}
export function relativeVolume(points: Frame[], anchor: number, end: number): number | null {
  const current = measureWindow(points, end - 30 * 60000, end, null);
  if (!current) return null;
  const before = points.filter(point => point.time + INTERVAL <= anchor).slice(-240);
  const volumes: number[] = [];
  for (let i = 0; i + 6 <= before.length; i += 6) {
    const slice = before.slice(i, i + 6);
    if (slice.every((row, index) => row.time === slice[0]!.time + index * INTERVAL)) volumes.push(slice.reduce((sum, row) => sum + row.volume, 0));
  }
  if (volumes.length < 10) return null;
  const baseline = median(volumes);
  return baseline > 0 ? current.volume / baseline : null;
}
export function buildMarketContext(profile: MarketProfile, snapshots: Map<string, MarketSnapshot>, now: number): MarketContext {
  const asset = snapshots.get(profile.id), benchmark = benchmarkFor(profile);
  const points = alignMarket(profile, snapshots, now);
  const end = points.at(-1) ? points.at(-1)!.time + INTERVAL : null;
  const fit = end ? fitBefore(points, end - 60 * 60000) : null;
  const required = [profile.id, ...benchmark.components.map(item => item.instrument_id)];
  const latestTrade = (snapshot: MarketSnapshot | undefined) => snapshot ? closed(snapshot, now).filter(bar => bar.trades > 0).at(-1)?.time : undefined;
  const tradeTime = latestTrade(asset);
  const quote = asset?.book ?? null;
  const quality = [
    { id: "mapped", passed: !!asset && asset.instrument.status === "online", reason: "The venue directory must verify the exact base, USD quote and asset class." },
    { id: "snapshot", passed: required.every(id => { const row = snapshots.get(id); return !!row && now - Date.parse(row.observed_at) >= -5000 && now - Date.parse(row.observed_at) <= TIMING_POLICY.max_snapshot_age_ms && !row.error; }), reason: "Asset and proxy snapshots must be current and the latest collection must succeed." },
    { id: "closed_bars", passed: end !== null && now - end <= 10 * 60000 && now >= end, reason: "A complete aligned five-minute bucket must have closed within ten minutes." },
    { id: "active_trading", passed: required.every(id => { const time = latestTrade(snapshots.get(id)); return time !== undefined && now - (time + INTERVAL) <= TIMING_POLICY.max_trade_age_ms; }), reason: "Asset and proxy need an actual trade within fifteen minutes; a fresh quote is not a fresh print." },
    { id: "baseline", passed: !!fit, reason: "The market model needs at least sixty aligned returns and a non-flat proxy." },
    { id: "price_integrity", passed: points.slice(-240).every(point => Math.abs(point.a) < (profile.kind === "tokenized_equity" ? 0.22 : 0.4)), reason: "Large discontinuities need validation for a split, rebase, bad print or exceptional move." },
    { id: "book", passed: !!quote && now - Date.parse(quote.observed_at) <= TIMING_POLICY.max_snapshot_age_ms && quote.ask > quote.bid, reason: "A valid uncrossed order-book snapshot is required for cost checks." },
  ];
  const windows = end ? [5, 30, 60, 1440].map(minutes => measureWindow(points, end - minutes * 60000, end, minutes === 1440 ? null : fit)).filter((row): row is MarketWindow => row !== null) : [];
  let curveRows = points.slice(-72);
  for (let i = curveRows.length - 1; i > 0; i--) if (curveRows[i]!.time - curveRows[i - 1]!.time !== INTERVAL) { curveRows = curveRows.slice(i); break; }
  let benchmarkLog = 0;
  const curve = curveRows.map(row => { benchmarkLog += row.b; return { at: iso(row.time + INTERVAL), asset_return: row.close / curveRows[0]!.previous_close - 1, benchmark_return: Math.expm1(benchmarkLog) }; });
  const previous = end ? measureWindow(points, end - 10 * 60000, end - 5 * 60000, fit) : null;
  const current = windows.find(row => row.minutes === 5);
  const stale = asset && now - Date.parse(asset.observed_at) > TIMING_POLICY.max_snapshot_age_ms;
  return { policy_version: QUANT_POLICY_VERSION, status: !asset ? "pending" : stale ? "stale" : points.length ? "ready" : "unavailable",
    observed_at: asset?.observed_at ?? null, instrument: asset?.instrument ?? null, benchmark,
    last_trade_at: tradeTime === undefined ? null : iso(tradeTime + INTERVAL), last_bar_at: end ? iso(end) : null,
    book: quote, windows, fit, volume_ratio: end ? relativeVolume(points, end - 60 * 60000, end) : null,
    return_acceleration: current?.residual_return !== null && current?.residual_return !== undefined && previous?.residual_return !== null && previous?.residual_return !== undefined ? current.residual_return - previous.residual_return : null,
    curve, quality, limitations: [
      profile.kind === "tokenized_equity" ? "Prices describe the identified xStock venue market, not the underlying consolidated stock tape. Token NAV, redemption terms and cross-venue basis are not measured." : "Prices and liquidity describe one spot venue and a narrow peer proxy.",
      "Beta and residual deviations are short-window descriptive estimates, not causal attribution or calibrated probabilities.",
      "Five-minute research cadence. Book impact excludes fees, market movement, hidden liquidity and execution latency.",
    ] };
}
const fold = (text: string) => text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function informationDelta(current: IntelligenceSignal, previous: IntelligenceSignal | null): InformationDelta {
  const newReports = current.evidence.filter(report => !previous?.evidence.some(old => old.id === report.id));
  const dates = [current.updated_at, ...newReports.map(report => report.first_indexed_at)].filter((date): date is string => !!date && finiteDate(date));
  const known = dates.length ? iso(Math.max(...dates.map(Date.parse))) : current.updated_at;
  const output = (kind: InformationDelta["kind"], meaningful: boolean, description: string, fields: string[] = []): InformationDelta =>
    ({ kind, meaningful, description, changed_fields: fields, previous_version: previous?.version ?? null, current_version: current.version, known_at: known, new_report_count: newReports.length });
  if (!previous) return current.version === 1 ? output("new_development", true, "A new reported development entered signal memory.") : output("unchanged", false, "The preceding revision is unavailable; novelty cannot be established.");
  if (!previous.market_assessment && current.market_assessment) return output("context_added", false, "A first market construction was added to existing reporting; this is not new news.");
  if (current.change_kind === "evidence_added") return output("coverage_only", false, "Coverage was added without a new interpretation.");
  const fields: string[] = [];
  if (fold(current.what_changed) !== fold(previous.what_changed)) fields.push("reported_change");
  if (current.event_state !== previous.event_state) fields.push("reporting_state");
  if (current.market_assessment?.channel !== previous.market_assessment?.channel) fields.push("market_channel");
  if (current.market_assessment?.direction !== previous.market_assessment?.direction) fields.push("direction");
  if (current.market_assessment?.trigger.status !== previous.market_assessment?.trigger.status) fields.push("trigger_state");
  if (current.market_assessment?.materiality !== previous.market_assessment?.materiality) fields.push("materiality");
  const meaningful = newReports.length > 0 && fields.some(field => field !== "materiality");
  return output(meaningful ? fields.some(field => ["reporting_state", "direction", "trigger_state"].includes(field)) ? "thesis_changed" : "new_reporting" : "unchanged",
    meaningful, meaningful ? "New cited reporting changed the recorded thesis or reported development." : "No substantive source-grounded delta was established.", fields);
}
