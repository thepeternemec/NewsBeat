import { z } from "zod";

export const FilingEvidenceSchema = z.object({
  id: z.string(),
  accession: z.string(),
  form: z.string(),
  accepted_at: z.string().datetime(),
  filed_on: z.string(),
  report_date: z.string().nullable(),
  items: z.array(z.string()),
  description: z.string(),
  url: z.string().url(),
});
export type FilingEvidence = z.infer<typeof FilingEvidenceSchema>;

export const ReportedComparisonSchema = z.object({
  metric: z.enum(["revenue", "net_income", "operating_income"]),
  label: z.string(),
  concept: z.string(),
  unit: z.literal("USD"),
  period: z.enum(["quarter", "year"]),
  current: z.object({ start: z.string(), end: z.string(), value: z.number().finite(), filing_id: z.string(), url: z.string().url(), filed_on: z.string() }),
  previous: z.object({ start: z.string(), end: z.string(), value: z.number().finite(), filing_id: z.string(), url: z.string().url(), filed_on: z.string() }),
  change: z.number().finite(),
  change_percent: z.number().finite().nullable(),
  method: z.literal("same_concept_prior_year_as_known_at_filing"),
});
export type ReportedComparison = z.infer<typeof ReportedComparisonSchema>;

export const CatalystSnapshotSchema = z.object({
  version: z.literal("official-evidence-v1"),
  beat_id: z.string(),
  label: z.string(),
  cik: z.string(),
  checked_at: z.string().datetime(),
  filings: z.array(FilingEvidenceSchema).max(12),
  comparisons: z.array(ReportedComparisonSchema).max(3),
  missing_concepts: z.array(z.string()),
});
export type CatalystSnapshot = z.infer<typeof CatalystSnapshotSchema>;

export interface CatalystCoverage {
  beat_id: string;
  label: string;
  status: "fresh" | "stale" | "unavailable" | "unsupported";
  checked_at: string | null;
  last_attempt_at: string | null;
  error: string | null;
  snapshot: CatalystSnapshot | null;
}

export interface CatalystRadar {
  generated_at: string;
  status: "ready" | "partial" | "unavailable";
  items: Array<FilingEvidence & {
    beat_id: string;
    label: string;
    action: "investigate_filing";
    reported_revenue: ReportedComparison | null;
    next_check: string;
  }>;
  coverage: CatalystCoverage[];
  method: string;
}
