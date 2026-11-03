/**
 * Signals: positioning, liquidity and dry powder, from free public endpoints.
 *
 * Three questions that a news feed cannot answer and a price chart only implies:
 *
 *  - **Who is paying to hold a position?** Binance publishes funding rates without a key.
 *    Positive means longs pay shorts, which is leverage leaning long. It is a fact about
 *    positioning, not a forecast, and it is the single most useful number here.
 *  - **Where did liquidity actually move?** DefiLlama aggregates DEX volume across chains,
 *    including tokenized-asset venues, so a caller can see whether a quiet headline day
 *    was also a quiet trading day.
 *  - **How much dry powder is there?** Stablecoin supply is the closest free proxy for
 *    capital waiting rather than deployed.
 *
 * Each is attributed and cached on its own cadence: funding moves continuously, a 24-hour
 * volume aggregate does not, and stablecoin supply moves slowest of all.
 */

import type {
  DexVolumePayload,
  DexVenue,
  FundingRate,
  SignalsPayload,
  Sourced,
  StablecoinPayload,
  Unavailable,
} from "@blacksheep/contracts";
import { upstreamCache } from "./market-cache.js";

const TIMEOUT_MS = 8_000;

export const SIGNAL_TTL = {
  /** Funding settles every eight hours but the rate is live; two minutes is ample. */
  funding: 2 * 60_000,
  /** A rolling 24-hour aggregate does not need to be read every minute. */
  dexVolume: 10 * 60_000,
  stablecoins: 30 * 60_000,
} as const;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json", "user-agent": "blacksheep/0.3" },
  });
  if (!response.ok) throw new Error(`${new URL(url).host} responded ${response.status}`);
  return (await response.json()) as T;
}

function freshness(fetchedAt: number, ttlMs: number, cadence: string) {
  const ageSeconds = Math.max(0, Math.round((Date.now() - fetchedAt) / 1000));
  return {
    status: (ageSeconds * 1000 > ttlMs ? "stale" : "fresh") as "fresh" | "stale",
    age_seconds: ageSeconds,
    refresh_in_seconds: Math.max(0, Math.round(ttlMs / 1000) - ageSeconds),
    upstream_cadence: cadence,
  };
}

/** Funding runs every eight hours on both venues, so three settlements a day. */
const SETTLEMENTS_PER_DAY = 3;

const PAIRS = [
  { symbol: "BTCUSDT", okx: "BTC-USDT-SWAP" },
  { symbol: "ETHUSDT", okx: "ETH-USDT-SWAP" },
  { symbol: "SOLUSDT", okx: "SOL-USDT-SWAP" },
] as const;

interface RawPremium {
  markPrice: string;
  lastFundingRate: string;
  nextFundingTime: number;
}

interface RawInterest {
  openInterest: string;
}

interface OkxEnvelope<T> {
  data: T[];
}

interface OkxFunding {
  fundingRate: string;
  nextFundingTime: string;
}

interface OkxMark {
  markPx: string;
}

/**
 * Binance first, OKX second.
 *
 * Binance blocks some hosting regions and Vercel runs in one of them: the endpoint answers
 * 200 from a European laptop and refused from the deployment, so funding came back
 * unavailable in production while passing every local test. A single venue is a single
 * point of failure for a whole signal, so the second provider is not a nicety.
 */
async function fundingFromBinance(): Promise<FundingRate[]> {
  const rates: FundingRate[] = [];
  for (const pair of PAIRS) {
    try {
      const premium = await getJson<RawPremium>(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${pair.symbol}`);
      const rate = Number(premium.lastFundingRate);
      let openInterest: number | undefined;
      try {
        const interest = await getJson<RawInterest>(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${pair.symbol}`);
        openInterest = Number(interest.openInterest);
      } catch {
        // Open interest is a bonus; the rate is the signal.
      }
      rates.push({
        symbol: pair.symbol,
        rate,
        annualised: rate * SETTLEMENTS_PER_DAY * 365,
        mark_price: Number(premium.markPrice),
        next_funding_at: new Date(premium.nextFundingTime).toISOString(),
        ...(openInterest === undefined ? {} : { open_interest: openInterest }),
      });
    } catch {
      // One symbol failing should not empty the list.
    }
  }
  if (rates.length === 0) throw new Error("binance funding unavailable");
  return rates;
}

async function fundingFromOkx(): Promise<FundingRate[]> {
  const rates: FundingRate[] = [];
  for (const pair of PAIRS) {
    try {
      const [funding, mark] = await Promise.allSettled([
        getJson<OkxEnvelope<OkxFunding>>(`https://www.okx.com/api/v5/public/funding-rate?instId=${pair.okx}`),
        getJson<OkxEnvelope<OkxMark>>(`https://www.okx.com/api/v5/public/mark-price?instType=SWAP&instId=${pair.okx}`),
      ]);
      if (funding.status === "rejected" || !funding.value.data[0]) continue;
      const rate = Number(funding.value.data[0].fundingRate);
      const markPrice = mark.status === "fulfilled" ? Number(mark.value.data[0]?.markPx ?? 0) : 0;
      rates.push({
        symbol: pair.symbol,
        rate,
        annualised: rate * SETTLEMENTS_PER_DAY * 365,
        mark_price: markPrice,
        next_funding_at: new Date(Number(funding.value.data[0].nextFundingTime)).toISOString(),
      });
    } catch {
      // Keep going.
    }
  }
  if (rates.length === 0) throw new Error("okx funding unavailable");
  return rates;
}

export async function fundingRates(): Promise<Sourced<FundingRate[]>> {
  const cached = await upstreamCache.read("signals:funding", SIGNAL_TTL.funding, async () => {
    // The provider travels with the data. Labelling an OKX reading as Binance would be a
    // lie about attribution, which is the one thing this API claims to get right.
    try {
      return { rates: await fundingFromBinance(), provider: "binance" as const };
    } catch {
      return { rates: await fundingFromOkx(), provider: "okx" as const };
    }
  });

  const provider = cached.value.provider;
  return {
    source: provider === "binance" ? "binance" : "okx",
    source_url:
      provider === "binance"
        ? "https://www.binance.com/en/futures/funding-history/perpetual/real-time-funding-rate"
        : "https://www.okx.com/trade-swap/btc-usdt-swap",
    fetched_at: new Date(cached.fetchedAt).toISOString(),
    ttl_seconds: Math.round(SIGNAL_TTL.funding / 1000),
    freshness: freshness(cached.fetchedAt, SIGNAL_TTL.funding, "continuous, settled every eight hours"),
    data: cached.value.rates,
  };
}

interface RawDex {
  total24h?: number;
  change_1d?: number;
  protocols?: { name?: string; total24h?: number }[];
}

export async function dexVolume(): Promise<Sourced<DexVolumePayload>> {
  const cached = await upstreamCache.read("signals:dex", SIGNAL_TTL.dexVolume, async () => {
    const raw = await getJson<RawDex>(
      "https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true",
    );
    const venues: DexVenue[] = (raw.protocols ?? [])
      .filter((venue) => typeof venue.total24h === "number" && venue.total24h > 0)
      .map((venue) => ({ name: venue.name ?? "unknown", volume_24h_usd: Math.round(venue.total24h ?? 0) }))
      .sort((a, b) => b.volume_24h_usd - a.volume_24h_usd)
      .slice(0, 5);

    return {
      total_24h_usd: Math.round(raw.total24h ?? 0),
      ...(typeof raw.change_1d === "number" ? { change_24h: raw.change_1d / 100 } : {}),
      top_venues: venues,
    } satisfies DexVolumePayload;
  });

  return {
    source: "defillama",
    source_url: "https://defillama.com/dexs",
    fetched_at: new Date(cached.fetchedAt).toISOString(),
    ttl_seconds: Math.round(SIGNAL_TTL.dexVolume / 1000),
    freshness: freshness(cached.fetchedAt, SIGNAL_TTL.dexVolume, "daily aggregate, updated continuously"),
    data: cached.value,
  };
}

interface RawStable {
  peggedAssets?: { symbol?: string; circulating?: { peggedUSD?: number } }[];
}

export async function stablecoinSupply(): Promise<Sourced<StablecoinPayload>> {
  const cached = await upstreamCache.read("signals:stables", SIGNAL_TTL.stablecoins, async () => {
    const raw = await getJson<RawStable>("https://stablecoins.llama.fi/stablecoins?includePrices=false");
    const assets = raw.peggedAssets ?? [];
    const sized = assets
      .map((asset) => ({ symbol: asset.symbol ?? "?", circulating_usd: asset.circulating?.peggedUSD ?? 0 }))
      .filter((asset) => asset.circulating_usd > 0)
      .sort((a, b) => b.circulating_usd - a.circulating_usd);

    if (sized.length === 0) throw new Error("no stablecoin supply reported");
    return {
      circulating_usd: Math.round(sized.reduce((sum, asset) => sum + asset.circulating_usd, 0)),
      assets_tracked: sized.length,
      top: sized.slice(0, 5).map((asset) => ({ ...asset, circulating_usd: Math.round(asset.circulating_usd) })),
    } satisfies StablecoinPayload;
  });

  return {
    source: "defillama",
    source_url: "https://defillama.com/stablecoins",
    fetched_at: new Date(cached.fetchedAt).toISOString(),
    ttl_seconds: Math.round(SIGNAL_TTL.stablecoins / 1000),
    freshness: freshness(cached.fetchedAt, SIGNAL_TTL.stablecoins, "hourly"),
    data: cached.value,
  };
}

/** All three together, each failing on its own so one dead upstream is not a dead panel. */
export async function signals(): Promise<SignalsPayload> {
  const [funding, dex, stables] = await Promise.allSettled([fundingRates(), dexVolume(), stablecoinSupply()]);

  const part = <T>(result: PromiseSettledResult<Sourced<T>>): Sourced<T> | Unavailable =>
    result.status === "fulfilled"
      ? result.value
      : {
          freshness: { status: "unavailable", age_seconds: 0, refresh_in_seconds: 0 },
          error: result.reason instanceof Error ? result.reason.message : "unavailable",
        };

  return {
    funding: part(funding),
    dex_volume: part(dex),
    stablecoins: part(stables),
  };
}
