import { z } from "zod";
import { SignalContextIdSchema } from "./intelligence.js";

export const ResearchRequestSchema = z.object({
  question: z.string().trim().min(3).max(600),
  beat_ids: z.array(z.string().regex(/^b_[0-9a-f]{12}$/)).min(1).max(3).optional(),
  context: SignalContextIdSchema.default("fundamentals"),
}).strict();
export type ResearchRequest = z.infer<typeof ResearchRequestSchema>;
export interface ResearchEvidence {
  id: string; beat_id: string; kind: "report" | "measurement"; text: string;
  source: string; url: string; observed_at: string; freshness: "fresh" | "stale" | "unavailable";
}
export const ResearchAnswerSchema = z.object({
  answer: z.string().min(1).max(900),
  reasoning: z.array(z.object({
    kind: z.enum(["observation", "interpretation"]),
    claim: z.string().min(1).max(500),
    evidence_ids: z.array(z.string()).min(1).max(6),
  }).strict()).min(1).max(5),
  unknowns: z.array(z.string().min(1).max(300)).max(6),
  next_checks: z.array(z.string().min(1).max(300)).min(1).max(4),
}).strict();
export type ResearchAnswer = z.infer<typeof ResearchAnswerSchema>;
export interface ResearchAsset {
  beat_id: string; ticker: string; label: string; asset: "equity" | "crypto";
  news_status: string; market_status: string; coverage_truncated: boolean; reports_scanned: number;
  limitations: string[];
}
export interface ResearchResponse {
  version: "question-research-v1"; question: string; generated_at: string;
  status: "ready" | "partial" | "needs_clarification" | "unavailable";
  method: "reasoned" | "evidence_only"; context: string;
  answer: ResearchAnswer | null; message: string | null;
  assets: ResearchAsset[]; candidates: Array<{ beat_id: string; ticker: string; label: string; asset: string }>;
  evidence: ResearchEvidence[]; limitations: string[];
  flow: Array<{ step: string; status: "complete" | "limited" | "skipped" }>;
}
