/** Measured venue data and point-in-time signal decisions. Returns are fractions; costs are basis points. */
export const QUANT_POLICY_VERSION = "market-timing-v1";
export const MARKET_INTERVAL_MS = 300_000;
export interface MarketInstrument {
  id: string; symbol: string; underlying_ticker: string; kind: "tokenized_equity" | "crypto";
  venue: "kraken"; pair: string; base: string; quote: "USD"; status: string;
  source_url: string; mapping_url: string; verified_at: string;
}
export interface MarketBar {
  time: number; open: number; high: number; low: number; close: number; volume: number; trades: number;
}
export interface MarketBook {
  observed_at: string; bid: number; ask: number; mid: number; spread_bps: number;
  bid_depth_usd: number; ask_depth_usd: number; imbalance: number;
  reference_notional_usd: number; buy_impact_bps: number | null; sell_impact_bps: number | null;
}
export interface MarketSnapshot {
  instrument: MarketInstrument; observed_at: string; bars: MarketBar[]; book: MarketBook | null;
  error: string | null;
}
export interface MarketWindow {
  minutes: number; start_at: string; end_at: string; asset_return: number; benchmark_return: number;
  excess_return: number; residual_return: number | null; residual_z: number | null;
  active_fraction: number; trades: number; volume: number;
}
export interface MarketFit {
  beta: number; intercept: number; residual_sigma: number; r_squared: number;
  samples: number; start_at: string; end_at: string;
}
export interface MarketContext {
  policy_version: string; status: "ready" | "pending" | "unavailable" | "stale";
  observed_at: string | null; instrument: MarketInstrument | null;
  benchmark: { label: string; methodology: string; components: Array<{ instrument_id: string; weight: number }> };
  last_trade_at: string | null; last_bar_at: string | null; book: MarketBook | null;
  windows: MarketWindow[]; fit: MarketFit | null; volume_ratio: number | null;
  return_acceleration: number | null;
  curve: Array<{ at: string; asset_return: number; benchmark_return: number }>;
  quality: Array<{ id: string; passed: boolean; reason: string }>;
  limitations: string[];
}
export interface InformationDelta {
  kind: "new_development" | "thesis_changed" | "new_reporting" | "context_added" | "coverage_only" | "unchanged";
  previous_version: number | null; current_version: number; known_at: string;
  new_report_count: number; changed_fields: string[]; meaningful: boolean; description: string;
}
export interface QuantSignalDecision {
  policy_version: string; source_signal_id: string; signal_version: number; context_id: string; evaluated_at: string;
  phase: "data_hold" | "analysis_hold" | "inactive" | "liquidity_hold" | "old_information" | "unconfirmed" | "developing" | "extended" | "fading" | "diverging" | "invalidated";
  action: "review_now" | "keep_watching" | "no_alert" | "reassess";
  direction: "supportive" | "adverse" | "mixed" | "unclear";
  reason: string; delta: InformationDelta; anchor_at: string; event_window: MarketWindow | null; recent_window: MarketWindow | null;
  fit: MarketFit | null; volume_ratio: number | null; pre_information_window: MarketWindow | null;
  checks: Array<{ id: string; passed: boolean; reason: string }>;
  alert_id: string | null;
}
export interface ForwardOutcome {
  horizon_minutes: number; status: "pending" | "observed" | "expired";
  due_at: string; observed_at: string | null; market_at: string | null; asset_return: number | null;
  benchmark_return: number | null; residual_return: number | null;
}
export interface QuantEvaluationRecord {
  id: string; source_signal_id: string; signal_version: number; context_id: string;
  cohort: "all_constructions" | "review_alert"; policy_version: string;
  decision_at: string; reference_at: string; reference_basis: "snapshot_mid"; reference_price: number;
  reference_quotes_at: Record<string, string>;
  reference_benchmark_prices: Record<string, number>; frozen_beta: number | null;
  frozen_intercept: number | null; decision: QuantSignalDecision; outcomes: ForwardOutcome[];
  reference_book_cost_bps?: number | null;
}
export interface QuantEvaluationSummary {
  observations: number; alerts: number;
  horizons: QuantHorizonSummary[]; review_horizons: QuantHorizonSummary[];
  note: string;
  review_cost_scenario?: ReviewCostScenario;
}
export interface ReviewCostScenario {
  status: "collecting" | "descriptive";
  horizon_minutes: 60;
  lookback_days: 30;
  reference_notional_usd: 1000;
  assumed_fee_bps_per_side: 25;
  eligible: number;
  scored: number;
  missing_cost: number;
  missing_outcome: number;
  pending: number;
  overlapping: number;
  truncated: boolean;
  mean_adjusted_return_bps: number | null;
  positive_fraction: number | null;
  note: string;
}
export interface QuantHorizonSummary {
  minutes: number; observed: number; pending: number; expired: number;
  mean_excess_return: number | null; mean_directional_excess_return: number | null;
}
export interface QuantBundle {
  policy_version: string; computed_at: string; context_id: string; market: MarketContext;
  decisions: QuantSignalDecision[]; evaluations: QuantEvaluationRecord[]; evaluation: QuantEvaluationSummary;
  research?: MarketResearch;
}

/** Independent market discovery. Ranks describe observed history, not future-return probabilities. */
export interface MarketAnomalyWindow {
  minutes: number; status: "unusual" | "usual" | "insufficient";
  start_at: string; end_at: string; direction: "up" | "down" | "flat";
  residual_return: number | null; residual_z: number | null;
  historical_windows: number; historical_exceedances: number;
  empirical_tail_fraction: number | null; volume_ratio: number | null;
  fit: MarketFit | null; regime: "quiet" | "stable" | "volatile" | "unknown";
  volatility_ratio: number | null; checks: Array<{ id: string; passed: boolean; reason: string }>;
}
export interface MarketAnomalyRecord {
  id: string; instrument_id: string; detector_version: string;
  opened_at: string; closed_at: string | null; window: MarketAnomalyWindow;
  reference_at: string; reference_price: number; reference_quotes_at: Record<string, string>;
  reference_benchmark_prices: Record<string, number>; frozen_beta: number; frozen_intercept: number;
  estimated_book_cost_bps: number | null; outcomes: ForwardOutcome[];
}
export interface MarketResearch {
  detector_version: string; scanned_at: string;
  status: "ready" | "warming_up" | "data_hold";
  headline: string; explanation: string;
  windows: MarketAnomalyWindow[];
  reporting: { status: "aligned" | "opposing" | "mixed" | "unmatched" | "pending"; signal_ids: string[]; note: string };
  records: MarketAnomalyRecord[];
  note: string;
}
