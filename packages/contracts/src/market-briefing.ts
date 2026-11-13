export interface BriefingSource {
  name: string;
  url: string;
  observed_at: string;
}

export interface MarketBriefing {
  generated_at: string;
  market: {
    tracked: number;
    up: number;
    down: number;
    flat: number;
    source: BriefingSource;
    leader: { name: string; ticker: string; change_24h: number; source: BriefingSource };
  } | null;
  reporting: {
    checked: number;
    total: number;
    lead: { asset: string; title: string; source: BriefingSource } | null;
  };
  watch: {
    checked: number;
    total: number;
    lead: {
      kind: "review" | "anomaly";
      asset: string;
      ticker: string;
      detail: string;
      why_now: string;
      next_check: string;
      invalidation: string | null;
      source: BriefingSource;
      market_url: string;
      valid_until: string;
    } | null;
  };
}
