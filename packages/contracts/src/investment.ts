import { z } from "zod";
import type { ResearchResponse } from "./research.js";

export const InvestmentTickerSchema = z.string().trim().regex(/^\$?[A-Za-z0-9][A-Za-z0-9.-]{0,19}$/).transform(value => value.replace(/^\$/, "").toUpperCase());
export const InvestmentRequestSchema = z.object({
  ticker: InvestmentTickerSchema,
  beat_id: z.string().regex(/^b_[0-9a-f]{12}$/).optional(),
}).strict();

export interface InvestmentBrief {
  ticker: string;
  generated_at: string;
  research: ResearchResponse;
  stance: {
    state: "wait" | "consider" | "caution";
    label: string;
    reason: string;
    valid_until: string | null;
  } | null;
  timing: {
    market: "current" | "held" | "outside_pilot";
    analysis: string;
    trigger: { source: string; title: string; url: string; published_at: string } | null;
    invalidation: string | null;
  } | null;
}
