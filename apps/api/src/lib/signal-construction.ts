import { MarketAssessmentSchema, type IntelligenceSignal, type SignalContext, type ConstructedSignal } from "@newsbeat/contracts";
import { hash, quoteMatches } from "./intelligence-core.js";

export interface SignalConditions { source_freshness: string; analysis_ready: boolean; analysis_at: string | null; now: string }

/** Deterministic alert policy around a model hypothesis. No price move is inferred. */
export function constructSignal(signal: IntelligenceSignal, context: SignalContext, conditions: SignalConditions): ConstructedSignal {
  const parsed = MarketAssessmentSchema.safeParse(signal.market_assessment);
  const assessment = parsed.success ? parsed.data : null;
  const observation = assessment?.trigger;
  const report = signal.evidence.find(item => item.id === observation?.report_id);
  const age = report ? Date.parse(conditions.now) - Date.parse(report.published_at) : NaN;
  const analysisAge = conditions.analysis_at ? Date.parse(conditions.now) - Date.parse(conditions.analysis_at) : NaN;
  const invalidated = ["denied", "disputed"].includes(signal.event_state) || observation?.status === "contradicted";
  const checks: ConstructedSignal["checks"] = [
    { id: "assessment", label: "Market hypothesis constructed", passed: !!assessment, reason: assessment ? "A market channel, trigger and invalidation are recorded." : "Waiting for a market-context construction; an older explanation is not promoted to a signal." },
    { id: "context", label: "Matches this context", passed: !!assessment && context.channels.includes(assessment.channel), reason: assessment && context.channels.includes(assessment.channel) ? assessment.market_relevance : "The proposed market channel does not match this context." },
    { id: "freshness", label: "Coverage and analysis are current", passed: conditions.source_freshness === "fresh" && conditions.analysis_ready && Number.isFinite(analysisAge) && analysisAge >= -300000 && analysisAge <= 90 * 60000, reason: "Alerts require fresh collection, no pending analysis and a successful analysis within 90 minutes." },
    { id: "materiality", label: "Material enough for review", passed: assessment?.materiality === "high" && assessment.direction !== "unclear", reason: "The pilot requires a high-materiality model hypothesis with an identified transmission direction; this is not a calibrated probability." },
    { id: "trigger", label: "Observable trigger is reported", passed: observation?.status === "reported" && !!report && !!observation.headline_quote && quoteMatches(report.title, observation.headline_quote), reason: observation?.status === "reported" ? "The trigger is bound to a quoted headline, not independently verified." : observation?.condition ?? "No grounded trigger has been constructed." },
    { id: "window", label: "Trigger is inside the context window", passed: Number.isFinite(age) && age >= -300000 && age <= context.max_report_age_minutes * 60000, reason: "The cited trigger report must be within " + context.max_report_age_minutes + " minutes." },
    { id: "novelty", label: "A substantive interpretation changed", passed: signal.change_kind !== "evidence_added", reason: signal.change_kind === "evidence_added" ? "Repeated coverage alone cannot create a new alert." : "A new construction or substantive revision is available." },
    { id: "state", label: "Reporting has not invalidated the premise", passed: !invalidated && signal.event_state === "reported", reason: invalidated ? "The premise is denied, disputed or contradicted; reassess it." : signal.event_state === "reported" ? "A development is reported; plans and allegations do not pass this gate." : "A planned or alleged development remains on watch." },
  ];
  const matched = checks.find(item => item.id === "context")!.passed;
  const status = invalidated ? "invalidated" : assessment && !matched ? "suppressed" : checks.every(item => item.passed) ? "alert" : "watch";
  const action = status === "alert" ? "review_now" : status === "invalidated" ? "reassess" : status === "suppressed" ? "no_alert" : "keep_watching";
  return {
    id: "ctx_" + hash([signal.id, context.id]).slice(0, 24), source_signal_id: signal.id, beat_id: signal.beat_id,
    version: signal.version, context_id: context.id, status, action, assessment, checks,
    explanation: status === "alert" ? "Context and reported trigger pass the review-alert policy. Investigate the evidence and market response." : status === "invalidated" ? "The premise needs reassessment before it can support an alert." : checks.filter(item => !item.passed).map(item => item.reason).join(" "),
    evaluated_at: conditions.now,
    market_reaction: { status: "unmeasured", reason: "Price and benchmark response are not connected in this pilot; causal market impact is unverified." },
    alert_id: status === "alert" ? "alert_" + hash([signal.id, context.id, signal.version]).slice(0, 24) : null,
  };
}
