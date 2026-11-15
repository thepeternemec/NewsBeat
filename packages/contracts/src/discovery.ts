import { z } from "zod";

export const DiscoveryQuerySchema = z.object({
  asset: z.enum(["equity", "crypto"]).optional(),
  beat_id: z.string().min(1).max(60).optional(),
  limit: z.number().int().min(1).max(20).default(10),
}).strict();

export type DiscoveryKind = "earnings" | "guidance" | "deal" | "regulation" | "leadership" | "operations" | "protocol" | "financing" | "filing";

export interface DiscoveryAsset {
  beat_id: string;
  ticker: string;
  label: string;
  asset: "equity" | "crypto";
}

export interface DiscoveryEvidence {
  type: "press" | "official_filing";
  source: string;
  url: string;
  title: string;
  published_at: string;
  indexed_at: string;
  recorded_at: string;
}

export interface DiscoveryEvent {
  id: string;
  kind: DiscoveryKind;
  label: string;
  title: string;
  assets: DiscoveryAsset[];
  first_recorded_at: string;
  last_recorded_at: string;
  evidence: DiscoveryEvidence[];
  next_check: string;
}

export interface DiscoveryFeed {
  generated_at: string;
  status: "ready" | "partial" | "warming_up" | "unavailable";
  coverage: {
    catalog_total: number;
    fresh_news_feeds: number;
    official_issuer_total: number;
    fresh_official_issuers: number;
    scanned_at: string | null;
    truncated: boolean;
  };
  events: DiscoveryEvent[];
}
