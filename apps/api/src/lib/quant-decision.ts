import {
  MARKET_INTERVAL_MS as INTERVAL, QUANT_POLICY_VERSION, type ConstructedSignal, type IntelligenceSignal,
  type MarketContext, type MarketSnapshot, type QuantSignalDecision, type QuantEvaluationRecord, type ForwardOutcome,
} from "@newsbeat/contracts";
import { hash } from "./intelligence-core.js";
import { alignMarket, fitBefore, informationDelta, measureWindow, relativeVolume, TIMING_POLICY as POLICY } from "./quant-engine.js";
import { benchmarkFor, type MarketProfile } from "./quant-market.js";

const iso = (time: number) => new Date(time).toISOString();
const display = (value: number | null, digits = 2) => value === null || !Number.isFinite(value) ? "unavailable" : value.toFixed(digits);
export function decideTiming(signal: IntelligenceSignal, previous: IntelligenceSignal | null, base: ConstructedSignal,
  market: MarketContext, profile: MarketProfile, snapshots: Map<string, MarketSnapshot>, now: number): QuantSignalDecision {
  const delta = informationDelta(signal, previous), known = Date.parse(delta.known_at);
  const beforeKnown = Math.floor(known / INTERVAL) * INTERVAL;
  // A response window starts at the first full bucket after the thesis was known.
  const anchor = Math.ceil(known / INTERVAL) * INTERVAL;
  const points = alignMarket(profile, snapshots, now), end = points.at(-1) ? points.at(-1)!.time + INTERVAL : null;
  const fit = Number.isFinite(known) ? fitBefore(points, beforeKnown - 30 * 60000) : null;
  const event = end && anchor < end ? measureWindow(points, anchor, end, fit) : null;
  const recent = end ? measureWindow(points, end - 30 * 60000, end, fit) : null;
  const lastFive = end ? measureWindow(points, end - INTERVAL, end, fit) : null;
  const before = Number.isFinite(known) ? measureWindow(points, beforeKnown - 30 * 60000, beforeKnown, fit) : null;
  const volume = end && Number.isFinite(known) ? relativeVolume(points, beforeKnown - 30 * 60000, end) : null;
  const assessment = base.assessment;
  const sign = assessment?.direction === "supportive" ? 1 : assessment?.direction === "adverse" ? -1 : 0;
  const z = recent?.residual_z !== null && recent?.residual_z !== undefined ? sign * recent.residual_z : null;
  const preZ = before?.residual_z !== null && before?.residual_z !== undefined ? sign * before.residual_z : null;
  const residualBps = recent?.residual_return !== null && recent?.residual_return !== undefined ? sign * recent.residual_return * 10000 : null;
  const cost = market.book?.buy_impact_bps !== null && market.book?.buy_impact_bps !== undefined && market.book.sell_impact_bps !== null
    ? market.book.buy_impact_bps + market.book.sell_impact_bps : null;
  const basePassed = (id: string) => base.checks.find(check => check.id === id)?.passed ?? false;
  const marketPassed = (id: string) => market.quality.find(check => check.id === id)?.passed ?? false;
  const checks: QuantSignalDecision["checks"] = [
    { id: "context", passed: basePassed("context"), reason: "The market channel must match the selected decision context." },
    { id: "analysis_current", passed: basePassed("freshness"), reason: "Source coverage and completed analysis must be current; pending news blocks new alerts." },
    { id: "reported_trigger", passed: basePassed("trigger") && basePassed("state") && basePassed("window"), reason: "A supported recent reported trigger is required. Plans, allegations and contradictions cannot confirm it." },
    { id: "information_delta", passed: delta.meaningful && Number.isFinite(known) && known <= now + 5000 && now - known <= POLICY.information_window_ms,
      reason: delta.description + " Timing alerts require a substantive delta known within sixty minutes." },
    { id: "economic_materiality", passed: !!assessment && ["medium", "high"].includes(assessment.materiality) && sign !== 0, reason: "At least medium qualitative materiality and a directional hypothesis are required alongside measured confirmation." },
    { id: "market_data", passed: ["mapped", "snapshot", "closed_bars", "price_integrity"].every(marketPassed) && !!fit,
      reason: "Verified instruments, recent complete candles and a pre-information regression baseline are required." },
    { id: "active_trading", passed: marketPassed("active_trading") && !!recent && recent.active_fraction >= POLICY.minimum_active_fraction && recent.trades >= 3,
      reason: "The latest thirty minutes need trades in at least half the buckets; quotes alone cannot confirm activity." },
    { id: "liquidity", passed: marketPassed("book") && market.book!.spread_bps <= POLICY.maximum_spread_bps && cost !== null && cost <= POLICY.maximum_book_cost_bps,
      reason: "Spread " + display(market.book?.spread_bps ?? null) + " bp; estimated $1,000 two-sided book impact " + display(cost) + " bp. Limits are 35 bp and 75 bp, before fees." },
    { id: "post_information_response", passed: !!event && event.residual_return !== null && sign * event.residual_return > 0,
      reason: "At least one full post-information candle must move in the thesis direction after proxy adjustment." },
    { id: "relative_confirmation", passed: z !== null && z >= POLICY.confirmation_z && z < POLICY.extended_z && residualBps !== null && residualBps >= POLICY.minimum_residual_bps && cost !== null && residualBps >= cost * 2,
      reason: "Directional thirty-minute residual " + display(residualBps) + " bp / " + display(z) + " residual σ. Require 1.25–3 σ, at least 20 bp and twice the estimated book cost." },
    { id: "participation", passed: volume !== null && volume >= POLICY.minimum_volume_ratio,
      reason: "Thirty-minute volume is " + display(volume) + "× the pre-information median; require at least 1.5×." },
    { id: "not_already_extended", passed: preZ !== null && preZ < 2 && z !== null && z < POLICY.extended_z,
      reason: "A large move before the thesis was known, or a current move above three residual σ, stays on watch." },
  ];
  const passed = (id: string) => checks.find(check => check.id === id)!.passed;
  let phase: QuantSignalDecision["phase"] = "unconfirmed", action: QuantSignalDecision["action"] = "keep_watching";
  let reason = checks.filter(check => !check.passed)[0]?.reason ?? "The timing conditions are not yet met.";
  if (["denied", "disputed"].includes(signal.event_state) || assessment?.trigger.status === "contradicted") {
    phase = "invalidated"; action = "reassess"; reason = "Reported evidence contradicts the premise. Reassess the thesis.";
  } else if (!passed("context")) {
    action = "no_alert"; reason = "This transmission channel does not belong to the selected context.";
  } else if (!passed("market_data")) {
    phase = "data_hold"; reason = "Market confirmation is on hold: a current verified series or pre-information baseline is missing or invalid.";
  } else if (!passed("active_trading")) {
    phase = "inactive"; reason = "Recent prints are too old or sparse to establish market timing. Quoted liquidity does not establish traded demand.";
  } else if (!passed("liquidity")) {
    phase = "liquidity_hold"; reason = checks.find(check => check.id === "liquidity")!.reason;
  } else if (!passed("analysis_current")) {
    phase = "analysis_hold"; reason = "New source information is awaiting analysis. Market measurements remain visible; review alerts are held.";
  } else if (!passed("information_delta")) {
    phase = "old_information"; reason = delta.description + " No fresh source-grounded information edge is established.";
  } else if (z !== null && z <= -POLICY.confirmation_z) {
    phase = "diverging"; action = "reassess"; reason = "The proxy-adjusted move opposes the directional hypothesis. Inspect the divergence before relying on it.";
  } else if (z !== null && z >= POLICY.extended_z || preZ !== null && preZ >= 2) {
    phase = "extended"; reason = preZ !== null && preZ >= 2 ? "The directional move was already evident before this thesis entered memory. Do not treat it as a fresh timing signal." : "The move is extended relative to its pre-information baseline. Wait for new evidence or a reset.";
  } else if (lastFive?.residual_return !== null && lastFive?.residual_return !== undefined && sign * lastFive.residual_return < 0 && z !== null && z >= POLICY.confirmation_z) {
    phase = "fading"; reason = "The latest five-minute residual reversed against the broader directional move. Confirmation is weakening.";
  } else if (checks.every(check => check.passed)) {
    phase = "developing"; action = "review_now"; reason = "A fresh thesis delta has post-information price confirmation, unusual participation and acceptable observed liquidity. Review the evidence and risk now.";
  } else {
    reason = checks.filter(check => !check.passed).map(check => check.reason).slice(0, 2).join(" ");
  }
  return { policy_version: QUANT_POLICY_VERSION, source_signal_id: signal.id, signal_version: signal.version, context_id: base.context_id,
    evaluated_at: iso(now), phase, action, direction: assessment?.direction ?? "unclear", reason, delta,
    anchor_at: Number.isFinite(anchor) ? iso(anchor) : signal.updated_at, event_window: event, recent_window: recent, fit, volume_ratio: volume, pre_information_window: before, checks,
    alert_id: action === "review_now" ? "qalert_" + hash([signal.id, signal.version, base.context_id, QUANT_POLICY_VERSION]).slice(0, 24) : null };
}
/** Re-read safety checks can only downgrade a stored timing decision, never create a new alert. */
export function applyTiming(base: ConstructedSignal, decision: QuantSignalDecision | undefined, now: number): ConstructedSignal {
  const current = decision && decision.signal_version === base.version && decision.context_id === base.context_id &&
    now - Date.parse(decision.evaluated_at) >= -5000 && now - Date.parse(decision.evaluated_at) <= POLICY.max_snapshot_age_ms;
  const analysisReady = base.checks.find(check => check.id === "freshness")?.passed ?? false;
  const hardReady = base.checks.filter(check => !["materiality", "novelty"].includes(check.id)).every(check => check.passed);
  const invalidated = base.status === "invalidated";
  const marketCheck = { id: "market_timing", label: "Measured market timing", passed: !!current && decision.action === "review_now" && hardReady,
    reason: current ? decision.reason : "Waiting for current quantitative context. Headline interpretation alone cannot raise a timing alert." };
  const canReview = marketCheck.passed && !invalidated;
  const action = invalidated ? "reassess" : base.status === "suppressed" ? "no_alert" : current && hardReady ? decision.action : "keep_watching";
  const checks = [...base.checks.map(check => check.id === "materiality" ? { ...check, passed: !!current && decision.checks.find(item => item.id === "economic_materiality")?.passed === true,
    reason: "The timing policy accepts medium or high materiality only with measured price, participation and liquidity confirmation." }
    : check.id === "novelty" ? { ...check, passed: !!current && decision.delta.meaningful, reason: current ? decision.delta.description : check.reason } : check), marketCheck];
  return { ...base, action: canReview ? "review_now" : action, status: invalidated || action === "reassess" ? "invalidated" : canReview ? "alert" : action === "no_alert" ? "suppressed" : "watch",
    explanation: invalidated ? base.explanation : !analysisReady && current ? "New source information is waiting for analysis. Timing alerts are on hold." : marketCheck.reason,
    checks, alert_id: canReview ? decision!.alert_id : null, ...(current ? { quantitative: hardReady || invalidated || base.status === "suppressed" ? decision : {
      ...decision, phase: "analysis_hold", action: "keep_watching", alert_id: null, reason: "Current source and analysis gates are not met; the stored timing result is held." } } : {}),
    market_reaction: current && decision.event_window ? { status: "observed", reason: "Coincident venue-price response after the recorded thesis anchor; proxy adjustment is descriptive and does not establish causality.",
      asset_return: decision.event_window.asset_return, benchmark_return: decision.event_window.benchmark_return,
      residual_return: decision.event_window.residual_return, start_at: decision.event_window.start_at, end_at: decision.event_window.end_at } : base.market_reaction };
}

export function beginEvaluation(signal: IntelligenceSignal, decision: QuantSignalDecision, profile: MarketProfile, snapshots: Map<string, MarketSnapshot>, cohort: QuantEvaluationRecord["cohort"]): QuantEvaluationRecord | null {
  const asset = snapshots.get(profile.id), benchmark = benchmarkFor(profile);
  if (!asset?.book || benchmark.components.some(part => !snapshots.get(part.instrument_id)?.book)) return null;
  const decisionAt = Date.parse(decision.evaluated_at);
  const required = [profile.id, ...benchmark.components.map(part => part.instrument_id)];
  if (required.some(id => { const item = snapshots.get(id)!; return decisionAt - Date.parse(item.book!.observed_at) > 120000 || Date.parse(item.book!.observed_at) > decisionAt; })) return null;
  return { id: "qeval_" + hash([signal.id, signal.version, decision.context_id, cohort, QUANT_POLICY_VERSION]).slice(0, 24),
    source_signal_id: signal.id, signal_version: signal.version, context_id: decision.context_id, cohort, policy_version: QUANT_POLICY_VERSION,
    decision_at: decision.evaluated_at, reference_at: decision.evaluated_at, reference_basis: "snapshot_mid", reference_price: asset.book.mid,
    reference_quotes_at: Object.fromEntries(required.map(id => [id, snapshots.get(id)!.book!.observed_at])),
    reference_benchmark_prices: Object.fromEntries(benchmark.components.map(part => [part.instrument_id, snapshots.get(part.instrument_id)!.book!.mid])),
    frozen_beta: decision.fit?.beta ?? null, frozen_intercept: decision.fit?.intercept ?? null, decision,
    outcomes: [15, 60, 240].map(minutes => ({ horizon_minutes: minutes, status: "pending", due_at: iso(decisionAt + minutes * 60000),
      observed_at: null, asset_return: null, benchmark_return: null, residual_return: null })) };
}
export function updateOutcomes(record: QuantEvaluationRecord, profile: MarketProfile, snapshots: Map<string, MarketSnapshot>, now: number): ForwardOutcome[] {
  const asset = snapshots.get(profile.id), benchmark = benchmarkFor(profile);
  return record.outcomes.map(outcome => {
    if (outcome.status !== "pending" || now < Date.parse(outcome.due_at)) return outcome;
    const due = Date.parse(outcome.due_at);
    if (!asset) return now > due + 10 * 60000 ? { ...outcome, status: "expired", observed_at: iso(now) } : outcome;
    const candidates = asset.bars.filter(bar => bar.time + INTERVAL >= due && bar.time + INTERVAL <= Math.min(now, due + 10 * 60000, Date.parse(asset.observed_at)) && bar.trades > 0).sort((a, b) => a.time - b.time);
    for (const bar of candidates) {
      let benchmarkReturn = 0, complete = true;
      for (const part of benchmark.components) {
        const snapshot = snapshots.get(part.instrument_id), reference = record.reference_benchmark_prices[part.instrument_id];
        const peer = snapshot?.bars.find(item => item.time === bar.time && item.time + INTERVAL <= Date.parse(snapshot.observed_at) && item.trades > 0);
        if (!peer || !reference || reference <= 0) { complete = false; break; }
        benchmarkReturn += part.weight * (peer.close / reference - 1);
      }
      if (!complete || record.reference_price <= 0) continue;
      const assetReturn = bar.close / record.reference_price - 1, periods = (bar.time + INTERVAL - Date.parse(record.reference_at)) / INTERVAL;
      const residual = record.frozen_beta === null || record.frozen_intercept === null ? null : Math.expm1(Math.log1p(assetReturn) - record.frozen_beta * Math.log1p(benchmarkReturn) - record.frozen_intercept * periods);
      return { ...outcome, status: "observed", observed_at: iso(now), asset_return: assetReturn, benchmark_return: benchmarkReturn, residual_return: residual };
    }
    return now > due + 10 * 60000 ? { ...outcome, status: "expired", observed_at: iso(now) } : outcome;
  });
}
