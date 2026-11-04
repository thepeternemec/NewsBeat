import { z } from "zod";
import type { QuantBundle, QuantSignalDecision } from "./quantitative.js";

export const INTELLIGENCE_VERSION = "contextual-signals-v2";
export const EventCategorySchema = z.enum(["guidance", "earnings", "regulation", "legal", "deal", "product", "operations", "security", "leadership", "financing", "macro", "other"]);
export const EventStateSchema = z.enum(["reported", "planned", "alleged", "denied", "disputed"]);
const text = (max: number) => z.string().trim().min(1).max(max).refine(value => !/[<>\r\n]/.test(value));
export const MarketChannelSchema = z.enum(["revenue", "demand", "margins", "supply", "capital_cost", "liquidity", "adoption", "policy", "security", "none", "unclear"]);
export const MarketAssessmentSchema = z.object({
  channel: MarketChannelSchema, direction: z.enum(["supportive", "adverse", "mixed", "unclear"]),
  materiality: z.enum(["low", "medium", "high", "unknown"]), horizon: z.enum(["hours", "days", "weeks", "unspecified"]),
  market_relevance: text(400), why_it_may_not_move: text(400), invalidation: text(400),
  trigger: z.object({ condition: text(350), status: z.enum(["reported", "not_observed", "contradicted"]),
    report_id: z.string().min(1).max(80).nullable(), headline_quote: text(240).nullable() }).strict(),
}).strict();
export type MarketAssessment = z.infer<typeof MarketAssessmentSchema>;
export const IntelligenceDraftSchema = z.object({
  events: z.array(z.object({
    existing_event_id: z.string().max(100).nullable(),
    change_kind: z.enum(["new", "update", "evidence_only"]),
    category: EventCategorySchema,
    event_state: EventStateSchema,
    evidence_ids: z.array(z.string().min(1).max(80)).min(1).max(5),
    affected_entities: z.array(text(100)).min(1).max(5),
    attention: z.enum(["watch", "review", "priority"]),
    attention_reason: text(400),
    change_reason: text(400),
    implications: z.array(z.object({
      hypothesis: text(400), mechanism: text(500), watch_for: text(300),
      evidence_ids: z.array(z.string().min(1).max(80)).min(1).max(5),
    }).strict()).min(1).max(2),
    unknowns: z.array(text(300)).min(1).max(4),
    next_checks: z.array(text(300)).min(1).max(4),
    market_assessment: MarketAssessmentSchema.optional(),
  }).strict()).max(4),
}).strict();
export type IntelligenceDraft = z.infer<typeof IntelligenceDraftSchema>;
export type IntelligenceEventDraft = IntelligenceDraft["events"][number];
export interface IntelligenceEvidence { id: string; title: string; source: string; url: string; published_at: string; first_indexed_at?: string }
export interface IntelligenceSignal {
  id: string; beat_id: string; category: z.infer<typeof EventCategorySchema>;
  event_state: z.infer<typeof EventStateSchema>; what_changed: string;
  affected_entities: string[]; attention: "watch" | "review" | "priority"; attention_reason: string;
  implications: Array<{ hypothesis: string; mechanism: string; watch_for: string; evidence_ids: string[]; basis: "inference" }>;
  unknowns: string[]; next_checks: string[]; evidence: IntelligenceEvidence[];
  version: number; change_kind: "new" | "update" | "evidence_added";
  change_reason: string; first_detected_at: string; updated_at: string; evidence_updated_at: string;
  basis: "headline_metadata"; interpretation: "model_inference"; model: string; pipeline_version: string;
  market_assessment?: MarketAssessment;
}
export const SignalContextIdSchema = z.enum(["fundamentals", "liquidity", "risk"]);
export type SignalContextId = z.infer<typeof SignalContextIdSchema>;
export interface SignalContext {
  id: SignalContextId; label: string; objective: string;
  channels: Array<z.infer<typeof MarketChannelSchema>>; max_report_age_minutes: number;
}
export const SIGNAL_CONTEXTS: SignalContext[] = [
  { id: "fundamentals", label: "Business fundamentals", objective: "Changes to revenue, demand, margins or access to supply.", channels: ["revenue", "demand", "margins", "supply"], max_report_age_minutes: 180 },
  { id: "liquidity", label: "Liquidity & capital", objective: "Changes to liquidity, financing conditions or the cost of capital.", channels: ["liquidity", "capital_cost", "supply"], max_report_age_minutes: 120 },
  { id: "risk", label: "Adoption & risk", objective: "Changes to adoption, policy exposure or operational security.", channels: ["adoption", "policy", "security"], max_report_age_minutes: 180 },
];
export interface ConstructedSignal {
  id: string; source_signal_id: string; beat_id: string; version: number; context_id: SignalContextId;
  status: "alert" | "watch" | "suppressed" | "invalidated";
  action: "review_now" | "keep_watching" | "no_alert" | "reassess";
  assessment: MarketAssessment | null;
  checks: Array<{ id: string; label: string; passed: boolean; reason: string }>;
  explanation: string; evaluated_at: string;
  market_reaction: { status: "unmeasured" | "observed"; reason: string; asset_return?: number; benchmark_return?: number; residual_return?: number | null; start_at?: string; end_at?: string }; alert_id: string | null;
  quantitative?: QuantSignalDecision;
}
export interface SignalAlert {
  id: string; beat_id: string; source_signal_id: string; signal_version: number; context_id: SignalContextId;
  triggered_at: string; resolved_at: string | null; resolution: string | null; construction: ConstructedSignal;
}
export interface IntelligenceResponse {
  beat_id: string; label: string; generated_at: string; pilot: boolean;
  status: "ready" | "pending" | "unavailable" | "not_in_pilot";
  freshness: { status: string; last_success_at: string | null };
  analysis: { last_success_at: string | null; last_attempt_at: string | null; error: string | null; coverage_truncated: boolean; pipeline_version?: string | null };
  signals: IntelligenceSignal[];
  context: SignalContext; constructions: ConstructedSignal[]; alerts: SignalAlert[];
  quantitative?: QuantBundle;
}
