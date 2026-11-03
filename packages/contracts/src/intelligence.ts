import { z } from "zod";

export const INTELLIGENCE_VERSION = "event-intelligence-v1";
export const EventCategorySchema = z.enum(["guidance", "earnings", "regulation", "legal", "deal", "product", "operations", "security", "leadership", "financing", "macro", "other"]);
export const EventStateSchema = z.enum(["reported", "planned", "alleged", "denied", "disputed"]);
const text = (max: number) => z.string().trim().min(1).max(max).refine(value => !/[<>\r\n]/.test(value));
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
  }).strict()).max(4),
}).strict();
export type IntelligenceDraft = z.infer<typeof IntelligenceDraftSchema>;
export type IntelligenceEventDraft = IntelligenceDraft["events"][number];
export interface IntelligenceEvidence { id: string; title: string; source: string; url: string; published_at: string }
export interface IntelligenceSignal {
  id: string; beat_id: string; category: z.infer<typeof EventCategorySchema>;
  event_state: z.infer<typeof EventStateSchema>; what_changed: string;
  affected_entities: string[]; attention: "watch" | "review" | "priority"; attention_reason: string;
  implications: Array<{ hypothesis: string; mechanism: string; watch_for: string; evidence_ids: string[]; basis: "inference" }>;
  unknowns: string[]; next_checks: string[]; evidence: IntelligenceEvidence[];
  version: number; change_kind: "new" | "update" | "evidence_added";
  change_reason: string; first_detected_at: string; updated_at: string; evidence_updated_at: string;
  basis: "headline_metadata"; interpretation: "model_inference"; model: string; pipeline_version: string;
}
export interface IntelligenceResponse {
  beat_id: string; label: string; generated_at: string; pilot: boolean;
  status: "ready" | "pending" | "unavailable" | "not_in_pilot";
  freshness: { status: string; last_success_at: string | null };
  analysis: { last_success_at: string | null; last_attempt_at: string | null; error: string | null; coverage_truncated: boolean };
  signals: IntelligenceSignal[];
}
