/**
 * Free-tier market and sentiment sources, normalised into one shape.
 *
 * Four upstreams, four vocabularies, four update cadences:
 *
 *   DefiLlama      chain TVL and its history          floats, epoch seconds
 *   CoinGecko      prices and market caps             ids, percent-fractions, rate limited
 *   alternative.me fear and greed, daily              string-typed numbers, epoch seconds
 *
 * Each one is read through `upstreamCache`, so a burst of traffic costs one upstream call.
 * TTLs are chosen from how often the source actually changes, not from how often we
 * could call it: fear-and-greed updates once a day and gets thirty minutes, because
 * refetching it every minute would be rude and would not make the number newer.
 */

import type {
  AssetMarket,
  ChainTvl,
  FearGreedPayload,
  FearGreedPoint,
  Freshness,
  MarketOverview,
  PricesPayload,
  Sourced,
  TvlPayload,
  Unavailable,
} from "@newsbeat/contracts";
import { upstreamCache } from "./market-cache.js";

const TIMEOUT_MS = 8_000;

/** How long each value is good for, in milliseconds. */
export const TTL = {
  fearGreed: 30 * 60_000,
  chainTvl: 5 * 60_000,
  totalTvlHistory: 15 * 60_000,
  prices: 90_000,
} as const;

const SOURCE_URL = {
  defillama: "https://defillama.com/chains",
  coingecko: "https://www.coingecko.com",
  alternativeMe: "https://alternative.me/crypto/fear-and-greed-index/",
} as const;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json", "user-agent": "newsbeat/0.3" },
  });
  if (!response.ok) throw new Error(`${new URL(url).host} responded ${response.status}`);
  return (await response.json()) as T;
}

function freshness(fetchedAt: number, ttlMs: number, upstreamCadence: string, now = Date.now()): Freshness {
  const ageSeconds = Math.max(0, Math.round((now - fetchedAt) / 1000));
  return {
    status: ageSeconds * 1000 > ttlMs ? "stale" : "fresh",
    age_seconds: ageSeconds,
    refresh_in_seconds: Math.max(0, Math.round(ttlMs / 1000) - ageSeconds),
    upstream_cadence: upstreamCadence,
  };
}

// ── Fear and greed ──────────────────────────────────────────────────────

interface RawFng {
  data: { value: string; value_classification: string; timestamp: string }[];
}

export async function fearGreed(limit = 7): Promise<Sourced<FearGreedPayload>> {
  const wanted = Math.min(Math.max(limit, 1), 30);
  const cached = await upstreamCache.read(`fng:${wanted}`, TTL.fearGreed, async () => {
    const raw = await getJson<RawFng>(`https://api.alternative.me/fng/?limit=${wanted}`);
    const points: FearGreedPoint[] = raw.data.map((entry) => ({
      value: Number(entry.value),
      classification: entry.value_classification,
      observed_at: new Date(Number(entry.timestamp) * 1000).toISOString(),
    }));
    // alternative.me documents the newest first; the delta only means something if we
    // compare it to the day before it, so sort descending by date rather than trusting it.
    points.sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at));
    // Destructured rather than indexed: with noUncheckedIndexedAccess a length check
    // does not narrow `points[0]`, and an empty series is an upstream fault rather than
    // a reading of zero.
    const [first, ...rest] = points;
    if (!first) throw new Error("alternative.me returned no readings");
    return { current: first, history: rest } satisfies FearGreedPayload;
  });

  const { current, history } = cached.value;
  const previous = history[0];
  const withChange: FearGreedPoint = previous
    ? { ...current, change: current.value - previous.value }
    : current;
  const payload: FearGreedPayload = { current: withChange, history };

  return {
    source: "alternative.me",
    source_url: SOURCE_URL.alternativeMe,
    fetched_at: new Date(cached.fetchedAt).toISOString(),
    ttl_seconds: Math.round(TTL.fearGreed / 1000),
    freshness: freshness(cached.fetchedAt, TTL.fearGreed, "daily"),
    data: payload,
  };
}

// ── Chain TVL ───────────────────────────────────────────────────────────

interface RawChain {
  name: string;
  tvl: number;
  tokenSymbol?: string;
}

interface RawTvlPoint {
  date: number;
  tvl: number;
}

export async function chainTvl(limit = 12): Promise<Sourced<TvlPayload>> {
  const wanted = Math.min(Math.max(limit, 1), 100);

  const chains = await upstreamCache.read(`chains`, TTL.chainTvl, () =>
    getJson<RawChain[]>("https://api.llama.fi/v2/chains"),
  );

  // A second, slower cache for the total, only to say whether it moved in 24 hours.
  // It is 120KB of daily points, which is why it is not refetched with the chain list.
  let change: number | undefined;
  let totalHistoryUnavailable = false;
  try {
    const history = await upstreamCache.read(`tvl-history`, TTL.totalTvlHistory, () =>
      getJson<RawTvlPoint[]>("https://api.llama.fi/v2/historicalChainTvl"),
    );
    const points = history.value;
    const latest = points[points.length - 1];
    const dayAgo = points[points.length - 2];
    if (latest && dayAgo && dayAgo.tvl > 0) {
      change = (latest.tvl - dayAgo.tvl) / dayAgo.tvl;
    }
  } catch {
    // The delta is a nice-to-have; the chain list is the payload. Do not fail for it.
    totalHistoryUnavailable = true;
  }

  const sorted = [...chains.value].filter((chain) => chain.tvl > 0).sort((a, b) => b.tvl - a.tvl);
  const listed: ChainTvl[] = sorted.slice(0, wanted).map((chain) => ({
    name: chain.name,
    tvl_usd: Math.round(chain.tvl),
    ...(chain.tokenSymbol ? { token_symbol: chain.tokenSymbol } : {}),
  }));

  const payload: TvlPayload = {
    total_usd: Math.round(sorted.reduce((sum, chain) => sum + chain.tvl, 0)),
    listed_usd: Math.round(listed.reduce((sum, chain) => sum + chain.tvl_usd, 0)),
    chains: listed,
    ...(change === undefined ? {} : { change }),
  };

  return {
    source: "defillama",
    source_url: SOURCE_URL.defillama,
    fetched_at: new Date(chains.fetchedAt).toISOString(),
    ttl_seconds: Math.round(TTL.chainTvl / 1000),
    freshness: freshness(chains.fetchedAt, TTL.chainTvl, totalHistoryUnavailable ? "hourly" : "hourly, daily totals"),
    data: payload,
  };
}

// ── Prices ──────────────────────────────────────────────────────────────

interface RawCoin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number | null;
  last_updated: string;
}

/**
 * One basket, fetched once, served to everybody.
 *
 * The first version keyed the cache by the requested id list, so [bitcoin] and
 * [bitcoin, ethereum] were two upstream calls, and a page asking for three assets in
 * three shapes spent three of a thirty-a-minute budget. CoinGecko answered with 429
 * within a minute of testing. Caching a single basket and filtering it for the caller
 * means the cost is one call per TTL however the requests arrive.
 */
export const DEFAULT_PRICE_IDS = [
  "bitcoin", "ethereum", "solana", "binancecoin", "ripple", "cardano",
  "dogecoin", "chainlink", "avalanche-2", "tron", "sui", "arbitrum",
] as const;

const BASKET = new Set<string>(DEFAULT_PRICE_IDS);

export async function prices(ids: string[] = [...DEFAULT_PRICE_IDS]): Promise<Sourced<PricesPayload>> {
  const wanted = [...new Set(ids.map((id) => id.trim().toLowerCase()).filter(Boolean))].slice(0, 20);
  if (wanted.length === 0) throw new Error("no asset ids requested");

  // Everything asked for is normally in the basket, so serve from the single cached call.
  // Only ids outside it need their own request, which keeps the common case free.
  const outside = wanted.filter((id) => !BASKET.has(id));

  const cached = await upstreamCache.read("prices:basket", TTL.prices, () =>
    getJson<RawCoin[]>(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&price_change_percentage=24h&ids=" +
        encodeURIComponent([...DEFAULT_PRICE_IDS].join(",")),
    ),
  );

  let extra: RawCoin[] = [];
  if (outside.length > 0) {
    const extraCached = await upstreamCache.read(`prices:extra:${[...outside].sort().join(",")}`, TTL.prices, () =>
      getJson<RawCoin[]>(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&price_change_percentage=24h&ids=" +
          encodeURIComponent(outside.join(",")),
      ),
    );
    extra = extraCached.value;
  }

  const found = new Map([...cached.value, ...extra].map((coin) => [coin.id, coin]));
  const assets: AssetMarket[] = [];
  const unsupported: string[] = [];

  for (const id of wanted) {
    const coin = found.get(id);
    if (!coin) {
      unsupported.push(id);
      continue;
    }
    assets.push({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price_usd: coin.current_price,
      market_cap_usd: coin.market_cap,
      volume_24h_usd: coin.total_volume,
      ...(coin.price_change_percentage_24h === null ? {} : { change_24h: coin.price_change_percentage_24h / 100 }),
      observed_at: new Date(coin.last_updated).toISOString(),
    });
  }

  return {
    source: "coingecko",
    source_url: SOURCE_URL.coingecko,
    fetched_at: new Date(cached.fetchedAt).toISOString(),
    ttl_seconds: Math.round(TTL.prices / 1000),
    freshness: freshness(cached.fetchedAt, TTL.prices, "about once a minute"),
    data: { assets, unsupported },
  };
}

// ── Overview ────────────────────────────────────────────────────────────

function unavailable(error: string): Unavailable {
  return {
    freshness: { status: "unavailable", age_seconds: 0, refresh_in_seconds: 0 },
    error,
  };
}

/**
 * Everything a dashboard needs in one request. Each part fails independently: an agent
 * should get the prices it asked for even when DefiLlama is having a bad afternoon, and
 * should be told what is missing rather than being handed a total with a hole in it.
 */
export async function overview(): Promise<MarketOverview> {
  const [fear, tvl, price] = await Promise.allSettled([
    fearGreed(7),
    chainTvl(10),
    prices(["bitcoin", "ethereum", "solana"]),
  ]);

  const part = <T>(result: PromiseSettledResult<Sourced<T>>): Sourced<T> | Unavailable =>
    result.status === "fulfilled" ? result.value : unavailable(result.reason instanceof Error ? result.reason.message : "upstream failed");

  const fetchTimes: number[] = [];
  for (const result of [fear, tvl, price]) {
    if (result.status === "fulfilled") fetchTimes.push(Date.parse(result.value.fetched_at));
  }
  const oldest = fetchTimes.sort((a, b) => a - b)[0];

  return {
    fear_greed: part(fear),
    tvl: part(tvl),
    prices: part(price),
    oldest_fetch_seconds:
      oldest === undefined ? 0 : Math.max(0, Math.round((Date.now() - oldest) / 1000)),
  };
}
