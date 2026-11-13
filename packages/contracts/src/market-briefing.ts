export interface BriefingSource {
  name: string;
  url: string;
  observed_at: string;
}

export interface ForecastIndicators {
  rsi_14: number;
  trend_vs_ema_20: number;
  momentum_30m: number;
  atr_14_fraction: number;
  relative_volume_30m: number;
}

export interface MarketForecast {
  issued_at: string;
  reference_at: string;
  target_at: string;
  reference_price_usd: number;
  probability_above: number;
  baseline_probability: number;
  indicators: ForecastIndicators;
  history: {
    windows: number;
    matched: number;
    matched_above: number;
    earliest_reference_at: string;
    latest_reference_at: string;
    return_10th: number;
    return_50th: number;
    return_90th: number;
  };
  source: BriefingSource;
}

export interface MoveRiskForecast {
  issued_at: string;
  reference_at: string;
  target_at: string;
  reference_price_usd: number;
  threshold_fraction: number;
  probability: number;
  baseline_probability: number;
  realized_volatility_1h: number;
  sample_size: number;
  matched_windows: number;
  matched_moves: number;
  source: BriefingSource;
}

export interface ForecastScorecard {
  issued: number;
  pending: number;
  scored: number;
  missing: number;
  model_brier: number | null;
  baseline_brier: number | null;
}

export interface MarketForecasts {
  generated_at: string;
  status: "ready" | "warming_up" | "unavailable";
  model_version: string;
  horizon_minutes: 60;
  scorecard_days: 30;
  assets: Array<{
    ticker: string;
    pair: string;
    forecast: MarketForecast | null;
    scorecard: ForecastScorecard;
    move_risk?: {
      model_version: string;
      forecast: MoveRiskForecast | null;
      scorecard: ForecastScorecard;
    };
    recent: Array<Pick<MarketForecast, "target_at" | "probability_above" | "reference_price_usd"> & {
      outcome: "above" | "at_or_below" | "missing";
      target_price_usd: number | null;
    }>;
  }>;
}

export interface MarketBriefing {
  generated_at: string;
  forecasts?: MarketForecasts;
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
