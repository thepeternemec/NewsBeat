/**
 * Market and sentiment data, shaped like the news layer.
 *
 * The point of a shared envelope is that an agent writes one handler for every source.
 * It should not need to know that fear-and-greed comes from a different host, uses
 * epoch seconds instead of ISO dates and never paginates, while CoinGecko takes a list
 * of ids and DefiLlama returns floats with sixteen decimal places.
 *
 * Every payload carries where it came from, when we fetched it, and how fresh it is.
 * That is the difference between a data feed and a scraper: a consumer can always tell
 * whether it is looking at a number from four seconds ago or four hours ago.
 */

/** Where a number came from, and how much to trust its currency. */
export interface SourceAttribution {
  /** Machine name of the upstream, for caching and for saying "not our number". */
  source: "defillama" | "coingecko" | "alternative.me" | "mixed";
  /** The public home of the data, so a consumer can check it independently. */
  source_url: string;
  /** When this server fetched it, ISO 8601 UTC. */
  fetched_at: string;
  /** How long the value is considered good for, in seconds. */
  ttl_seconds: number;
}

/**
 * Freshness is separate from `fetched_at`, because serving a cached value that is
 * slightly older than its TTL is fine while serving one that is well past it is a bug.
 */
export interface Freshness {
  status: "fresh" | "stale" | "unavailable";
  /** Seconds since the upstream was last read successfully. */
  age_seconds: number;
  /** Seconds until this server will read upstream again. */
  refresh_in_seconds: number;
  /** How often the source itself updates, where it is known. */
  upstream_cadence?: string;
}

export interface Sourced<T> extends SourceAttribution {
  freshness: Freshness;
  data: T;
}

export interface FearGreedPoint {
  /** 0–100, where 0 is extreme fear. */
  value: number;
  classification: string;
  /** The date the index describes, ISO 8601 UTC. */
  observed_at: string;
  /** Change in the index versus the previous day, when we have it. */
  change?: number;
}

export interface FearGreedPayload {
  current: FearGreedPoint;
  history: FearGreedPoint[];
}

export interface ChainTvl {
  name: string;
  /** Total value locked in USD. */
  tvl_usd: number;
  /** Change since the previous cached reading, as a fraction (0.012 is +1.2%). */
  change?: number;
  token_symbol?: string;
}

export interface TvlPayload {
  /** Sum across every chain DefiLlama reports. */
  total_usd: number;
  /** Sum across the chains below, which is what an agent usually means. */
  listed_usd: number;
  chains: ChainTvl[];
  change?: number;
}

export interface AssetMarket {
  id: string;
  symbol: string;
  name: string;
  price_usd: number;
  market_cap_usd: number;
  volume_24h_usd: number;
  change_24h?: number;
  /** ISO 8601 UTC of the last upstream update. */
  observed_at: string;
}

export interface PricesPayload {
  assets: AssetMarket[];
  /** Ids the caller asked for that CoinGecko does not know. */
  unsupported: string[];
}

/** One call, one screen: everything a dashboard needs, each part attributed separately. */
export interface MarketOverview {
  fear_greed: Sourced<FearGreedPayload> | Unavailable;
  tvl: Sourced<TvlPayload> | Unavailable;
  prices: Sourced<PricesPayload> | Unavailable;
  /** The oldest successful fetch, so a caller can judge the whole payload at once. */
  oldest_fetch_seconds: number;
}

export interface Unavailable {
  freshness: Freshness & { status: "unavailable" };
  /** Why, in plain language, so an agent can say what is missing instead of guessing. */
  error: string;
}
