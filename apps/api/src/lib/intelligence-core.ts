import { createHash } from "node:crypto";
import { IntelligenceDraftSchema, INTELLIGENCE_VERSION, type IntelligenceEventDraft, type IntelligenceEvidence, type IntelligenceSignal } from "@newsbeat/contracts";

export const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fold = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const figures = (value: string) => value.match(/\d+(?:[.,]\d+)*/g) ?? [];
const unsafePrediction = /\b(?:guaranteed|buy now|sell now|will (?:rise|fall|surge|crash)|price target)\b/i;

export const quoteMatches = (title: string, quote: string) => fold(quote).length >= 16 && fold(quote).split(" ").length >= 3 && fold(title).includes(fold(quote));

/** Ground facts in exact source headlines; interpretation is separately labeled. */
export function inspectIntelligence(value: unknown, evidence: IntelligenceEvidence[], previous: IntelligenceSignal[]): { events: IntelligenceEventDraft[] | null; error: string | null } {
  const parsed = IntelligenceDraftSchema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = [...(issue?.path ?? []), issue?.code ?? "invalid"].join("_").toLowerCase().replace(/[^a-z_]/g, "");
    return { events: null, error: ("schema_" + field).slice(0, 60) };
  }
  const byId = new Map(evidence.map(report => [report.id, report]));
  const prior = new Map(previous.map(signal => [signal.id, signal]));
  const used = new Set<string>();
  const revised = new Set<string>();
  const accepted: IntelligenceEventDraft[] = [];
  for (const event of parsed.data.events) {
    let redundant = false;
    if (new Set(event.evidence_ids).size !== event.evidence_ids.length) return { events: null, error: "duplicate_evidence" };
    if (event.evidence_ids.some(id => !byId.has(id) || used.has(id))) return { events: null, error: "unknown_evidence" };
    event.evidence_ids.forEach(id => used.add(id));
    if (event.existing_event_id && (!prior.has(event.existing_event_id) || revised.has(event.existing_event_id))) return { events: null, error: "unknown_event" };
    if (event.existing_event_id) {
      revised.add(event.existing_event_id);
      const old = prior.get(event.existing_event_id)!;
      if (event.change_kind === "new") return { events: null, error: "invalid_new_kind" };
      const firstConstruction = !old.market_assessment && !!event.market_assessment;
      const knownEvidence = event.evidence_ids.every(id => old.evidence.some(report => report.id === id));
      redundant = !!old.market_assessment && knownEvidence && event.event_state === old.event_state;
      if (event.change_kind === "update" && !firstConstruction && knownEvidence && !redundant) return { events: null, error: "missing_new_evidence" };
      if (event.change_kind === "evidence_only" && event.event_state !== old.event_state) return { events: null, error: "changed_evidence_only" };
    }
    if (!event.existing_event_id && event.change_kind !== "new") return { events: null, error: "invalid_new_kind" };
    const reports = event.evidence_ids.map(id => byId.get(id)!);
    if (reports.some(report => /\bden(?:y|ies|ied)\b/i.test(report.title)) && !["denied", "disputed"].includes(event.event_state)) return { events: null, error: "denial_state" };
    const words = fold(reports.map(report => report.title).join(" "));
    if (event.affected_entities.some(entity => !(" " + words + " ").includes(" " + fold(entity) + " "))) return { events: null, error: "unsupported_entity" };
    const numbers = new Set(figures(reports.map(report => report.title).join(" ")));
    const interpretation = [event.attention_reason, event.change_reason, ...event.unknowns, ...event.next_checks,
      ...event.implications.flatMap(item => [item.hypothesis, item.mechanism, item.watch_for]),
      ...(event.market_assessment ? [event.market_assessment.market_relevance, event.market_assessment.why_it_may_not_move, event.market_assessment.invalidation, event.market_assessment.trigger.condition] : [])].join(" ");
    if (figures(interpretation).some(number => !numbers.has(number)) || unsafePrediction.test(interpretation)) return { events: null, error: "unsupported_number_or_prediction" };
    for (const implication of event.implications) {
      if (implication.evidence_ids.some(id => !event.evidence_ids.includes(id))) return { events: null, error: "implication_evidence" };
      if (!/\b(?:could|may|might|if|potential|risk)\b/i.test(implication.hypothesis)) return { events: null, error: "unconditional_hypothesis" };
    }
    if (event.market_assessment) {
      const trigger = event.market_assessment.trigger;
      if (trigger.status === "not_observed") {
        if (trigger.report_id !== null || trigger.headline_quote !== null) return { events: null, error: "unexpected_trigger_evidence" };
      } else {
        if (!trigger.report_id || !event.evidence_ids.includes(trigger.report_id) || !trigger.headline_quote) return { events: null, error: "ungrounded_trigger" };
        if (!quoteMatches(byId.get(trigger.report_id)!.title, trigger.headline_quote)) return { events: null, error: "unsupported_trigger_quote" };
      }
    }
    // Unchanged reporting cannot refresh a thesis or replace its interpretation.
    if (!redundant) accepted.push(event);
  }
  return { events: accepted, error: null };
}

export function validateIntelligence(value: unknown, evidence: IntelligenceEvidence[], previous: IntelligenceSignal[]): IntelligenceEventDraft[] | null {
  return inspectIntelligence(value, evidence, previous).events;
}

function meaning(signal: Pick<IntelligenceSignal, "category" | "event_state" | "what_changed" | "affected_entities" | "attention" | "attention_reason" | "implications" | "unknowns" | "next_checks" | "market_assessment">) {
  const assessment = signal.market_assessment;
  return { category: signal.category, event_state: signal.event_state, what_changed: signal.what_changed,
    affected_entities: [...signal.affected_entities].sort(), attention: signal.attention, attention_reason: signal.attention_reason,
    implications: signal.implications.map(({ evidence_ids, ...item }) => item), unknowns: signal.unknowns, next_checks: signal.next_checks,
    market_assessment: assessment ? { ...assessment, trigger: { ...assessment.trigger, report_id: undefined } } : undefined };
}

/** Repeated reporting adds evidence without inventing a new event or meaning revision. */
export function reconcileSignal(beatId: string, draft: IntelligenceEventDraft, evidence: IntelligenceEvidence[], previous: IntelligenceSignal[], now: string, model: string): IntelligenceSignal {
  const reports = draft.evidence_ids.map(id => evidence.find(report => report.id === id)!);
  const explicit = previous.find(signal => signal.id === draft.existing_event_id && signal.beat_id === beatId);
  const overlap = previous.find(signal => signal.beat_id === beatId && signal.evidence.some(report => draft.evidence_ids.includes(report.id)));
  const prior = explicit ?? overlap;
  const pinned = new Set([...draft.evidence_ids, ...(prior ? [prior.evidence.find(report => report.title === prior.what_changed)?.id, ...prior.implications.flatMap(item => item.evidence_ids)] : [])]);
  const combined = [...new Map([...(prior?.evidence ?? []), ...reports].map(report => [report.id, report])).values()]
    .sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)) || b.published_at.localeCompare(a.published_at)).slice(0, 30);
  if (prior && draft.change_kind === "evidence_only") {
    return { ...prior, evidence: combined, evidence_updated_at: now, change_kind: "evidence_added" };
  }
  const candidate: IntelligenceSignal = {
    id: prior?.id ?? "sig_" + hash([beatId, draft.category, reports[0]!.id]).slice(0, 24),
    beat_id: beatId, category: draft.category, event_state: draft.event_state,
    what_changed: reports[0]!.title, affected_entities: draft.affected_entities,
    attention: draft.attention, attention_reason: draft.attention_reason,
    implications: draft.implications.map(item => ({ ...item, basis: "inference" as const })),
    unknowns: draft.unknowns, next_checks: draft.next_checks, evidence: combined,
    version: prior ? prior.version + 1 : 1, change_kind: prior ? "update" : "new",
    change_reason: draft.change_reason, first_detected_at: prior?.first_detected_at ?? now,
    updated_at: now, evidence_updated_at: now, basis: "headline_metadata", interpretation: "model_inference",
    model, pipeline_version: INTELLIGENCE_VERSION,
    ...(draft.market_assessment ? { market_assessment: draft.market_assessment } : {}),
  };
  if (prior && hash(meaning(candidate)) === hash(meaning(prior))) {
    return { ...prior, evidence: combined, evidence_updated_at: now, change_kind: "evidence_added" };
  }
  return candidate;
}

/** Reserve evidence slots for new reporting, including contradictions that a digest may omit. */
export function selectIntelligenceEvidence(groups: Array<{ reports: IntelligenceEvidence[] }>, processedArticleId: string, limit = 24): IntelligenceEvidence[] {
  const reports = [...new Map(groups.flatMap(group => group.reports).map(report => [report.id, report])).values()];
  const watermark = BigInt(processedArticleId);
  const recent = reports.filter(report => /^\d+$/.test(report.id) && BigInt(report.id) > watermark)
    .sort((a, b) => b.published_at.localeCompare(a.published_at) || (BigInt(a.id) > BigInt(b.id) ? -1 : 1));
  const selected = new Map<string, IntelligenceEvidence>();
  const add = (report: IntelligenceEvidence | undefined) => { if (report && selected.size < limit) selected.set(report.id, report); };
  const contradiction = /\b(?:den(?:y|ies|ied)|withdraws?|retracts?|reverses?|cancels?|rejects?|suspends?|halts?)\b/i;
  for (const report of recent.filter(report => contradiction.test(report.title)).slice(0, Math.min(8, limit))) add(report);
  const recentSlots = Math.min(12, limit);
  for (const report of recent) { if (selected.size >= recentSlots) break; add(report); }
  // The remaining slots retain ranked context across different stories.
  for (const group of groups) add(group.reports[0]);
  for (const report of reports) add(report);
  return [...selected.values()];
}
