import {
  QUANT_POLICY_VERSION, SignalContextIdSchema,
  type IntelligenceResponse, type SignalContextId,
} from "@newsbeat/contracts";
import { z } from "zod";
import { PILOT_BEATS, readIntelligence } from "./intelligence.js";
import { NewsError } from "./news.js";
import { bookCost } from "./quant-decision.js";
import { TIMING_POLICY } from "./quant-engine.js";
import { readCatalysts } from "./catalysts.js";

const inputSchema = z.object({
  context: SignalContextIdSchema.default("fundamentals"),
  limit: z.number().int().min(1).max(6).default(6),
}).strict();

function recent(value: string | null | undefined, now: number, maxAge: number) {
  const at = Date.parse(value ?? "");
  return Number.isFinite(at) && at <= now && now - at <= maxAge;
}

function candidatesFor(output: IntelligenceResponse, now: number) {
  const bundle = output.quantitative;
  const market = bundle?.market;
  const age = TIMING_POLICY.max_snapshot_age_ms;
  const marketCurrent = bundle?.policy_version === QUANT_POLICY_VERSION
    && market?.status === "ready" && !!market.instrument
    && recent(bundle.computed_at, now, age) && recent(market.observed_at, now, age)
    && recent(market.last_bar_at, now, age)
    && recent(market.last_trade_at, now, TIMING_POLICY.max_trade_age_ms);
  const coverage = {
    beat_id: output.beat_id,
    label: output.label,
    market: marketCurrent ? "current" as const : "held" as const,
    computed_at: bundle?.computed_at ?? null,
    analysis: output.status,
    source_freshness: output.freshness.status,
    review_cost_scenario: bundle?.evaluation.review_cost_scenario ?? null,
    holds: [
      ...(!marketCurrent ? ["Current market evidence is incomplete, stale or held."] : []),
      ...(output.status !== "ready" ? ["Stored analysis is " + output.status + "."] : []),
      ...(output.freshness.status !== "fresh" ? ["Reporting collection is " + output.freshness.status + "."] : []),
      ...output.constructions.flatMap(construction => construction.checks.filter(check => !check.passed).map(check => check.reason)),
      ...output.constructions.flatMap(construction => construction.quantitative?.checks.filter(check => !check.passed).map(check => check.reason) ?? []),
    ].filter((value, index, all) => all.indexOf(value) === index).slice(0, 8),
  };
  if (!marketCurrent || !market?.instrument) return { coverage };

  const asset = { beat_id: output.beat_id, label: output.label, instrument: market.instrument };
  const quote = recent(market.book?.observed_at, now, age) ? market.book : null;
  const cost = bookCost(quote);
  if (output.status === "ready" && output.freshness.status === "fresh" && quote && cost !== null) {
    const reviews = output.constructions.flatMap(construction => {
      const decision = construction.quantitative;
      if (construction.status !== "alert" || construction.action !== "review_now" || !construction.alert_id
        || !decision || decision.policy_version !== QUANT_POLICY_VERSION
        || decision.action !== "review_now" || decision.phase !== "developing"
        || decision.alert_id !== construction.alert_id || decision.signal_version !== construction.version
        || !decision.checks.length || !decision.checks.every(check => check.passed)
        || !recent(decision.evaluated_at, now, age)
        || !decision.delta.meaningful || !recent(decision.delta.known_at, now, TIMING_POLICY.information_window_ms)) return [];

      const alert = output.alerts.find(item => item.id === construction.alert_id
        && item.context_id === output.context.id && item.signal_version === construction.version
        && item.source_signal_id === construction.source_signal_id && item.resolved_at === null
        && recent(item.triggered_at, now, TIMING_POLICY.information_window_ms));
      const signal = output.signals.find(item => item.id === construction.source_signal_id && item.version === construction.version);
      if (!alert || !signal || !construction.assessment) return [];
      const triggerReport = signal.evidence.find(report => report.id === construction.assessment?.trigger.report_id);
      if (!triggerReport) return [];

      const marketEvidenceUntil = Math.min(
        Date.parse(decision.evaluated_at) + age,
        Date.parse(bundle.computed_at) + age,
        Date.parse(decision.delta.known_at) + TIMING_POLICY.information_window_ms,
        Date.parse(market.observed_at!) + age,
        Date.parse(market.last_bar_at!) + age,
        Date.parse(market.last_trade_at!) + TIMING_POLICY.max_trade_age_ms,
        Date.parse(quote.observed_at) + age,
      );
      if (marketEvidenceUntil <= now) return [];

      return [{
        ...asset,
        action: "review_now" as const,
        alert_id: alert.id,
        triggered_at: alert.triggered_at,
        market_evidence_until: new Date(marketEvidenceUntil).toISOString(),
        direction: decision.direction,
        what_changed: signal.what_changed,
        why_now: decision.reason,
        invalidation: construction.assessment.invalidation,
        next_check: signal.next_checks[0] ?? null,
        evidence: [triggerReport, ...signal.evidence.filter(report => report.id !== triggerReport.id).slice(0, 2)],
        estimated_book_cost_bps: cost,
        reference_notional_usd: quote.reference_notional_usd,
        residual_return: decision.recent_window?.residual_return ?? null,
        volume_ratio: decision.volume_ratio,
        review_cost_scenario: coverage.review_cost_scenario,
      }];
    });
    const review = reviews.sort((a, b) => b.triggered_at.localeCompare(a.triggered_at) || a.alert_id.localeCompare(b.alert_id))[0];
    if (review) return { coverage, review };
  }

  const scan = bundle?.research;
  const window = scan?.windows.find(item => item.minutes === 30 && item.status === "unusual");
  if (scan?.status !== "ready" || !recent(scan.scanned_at, now, age) || !window
    || !recent(window.end_at, now, age) || window.empirical_tail_fraction === null
    || !Number.isFinite(window.empirical_tail_fraction) || !window.checks.length
    || !window.checks.every(check => check.passed)) return { coverage };

  return {
    coverage,
    watch: {
      ...asset,
      action: "keep_watching" as const,
      direction: window.direction,
      end_at: window.end_at,
      minutes: window.minutes,
      residual_return: window.residual_return,
      historical_windows: window.historical_windows,
      empirical_tail_fraction: window.empirical_tail_fraction,
      reporting_status: output.status === "ready" && output.freshness.status === "fresh" ? scan.reporting.status : "pending",
      estimated_book_cost_bps: cost,
      next_check: "Check whether the relative move persists and whether fresh reporting explains what changed.",
    },
  };
}

export function buildOpportunityBrief(outputs: IntelligenceResponse[], context: SignalContextId, limit: number, now: number) {
  const candidates = outputs.map(output => candidatesFor(output, now));
  const reviews = candidates.flatMap(item => item.review ? [item.review] : [])
    .sort((a, b) => b.triggered_at.localeCompare(a.triggered_at)
      || a.estimated_book_cost_bps - b.estimated_book_cost_bps || a.beat_id.localeCompare(b.beat_id));
  const watches = candidates.flatMap(item => item.watch ? [item.watch] : [])
    .sort((a, b) => a.empirical_tail_fraction - b.empirical_tail_fraction
      || b.end_at.localeCompare(a.end_at) || a.beat_id.localeCompare(b.beat_id));
  const coverage = candidates.map(item => item.coverage);
  const current = coverage.filter(item => item.market === "current").length;

  return {
    generated_at: new Date(now).toISOString(),
    context,
    status: current === 0 ? "unavailable" : current < coverage.length ? "partial" : "ready",
    review: reviews.slice(0, limit),
    watch: watches.slice(0, limit),
    coverage,
    method: "One item per asset. Review ranks current recorded alerts by recency, then lower observed book cost. Watch ranks current 30-minute anomalies by historical rarity. Watch items never create review alerts. Ranking prioritizes investigation and does not estimate profit.",
  };
}

export async function readOpportunities(input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new NewsError("invalid_request", "Use a valid context and an integer limit from 1 to 6.", 400);
  const { context, limit } = parsed.data;
  const [outputs, catalysts] = await Promise.all([
    Promise.all(PILOT_BEATS.map(beat => readIntelligence(beat.beat_id, context))),
    readCatalysts({ limit }),
  ]);
  return { ...buildOpportunityBrief(outputs, context, limit, Date.now()), catalysts };
}

export type OpportunityBrief = Awaited<ReturnType<typeof readOpportunities>>;
