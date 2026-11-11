import { z } from "zod";
import {
  parseTokenAsset, SEED_BEATS, TOKEN_ADDRESS_ERROR, TOKEN_CHAINS, TOKENIZED_EQUITIES,
  type TokenChain, type TokenIntelligence,
} from "@newsbeat/contracts";
import { upstreamCache } from "./market-cache.js";
import { NewsError, stories } from "./news.js";

const TTL_MS = 60_000;
const tokenLabel = z.object({ address: z.string(), name: z.string().max(160), symbol: z.string().max(80) });
const pairSchema = z.object({
  chainId: z.string(),
  dexId: z.string().min(1).max(80),
  pairAddress: z.string().regex(/^[a-z0-9]{20,100}$/i),
  baseToken: tokenLabel,
  quoteToken: z.object({ symbol: z.string().max(80) }),
  priceUsd: z.string().max(64).nullable().optional(),
  liquidity: z.object({ usd: z.number().finite().nonnegative().optional() }).nullish(),
  volume: z.object({ h24: z.number().finite().nonnegative().optional() }).nullish(),
  priceChange: z.object({ h24: z.number().finite().optional() }).nullish(),
});

export function matchTokenPools(chain: TokenChain, address: string, raw: unknown) {
  if (!Array.isArray(raw)) throw new Error("Invalid pool response");
  const matches = new Map<string, z.infer<typeof pairSchema>>();
  const normalize = (value: string) => chain === "solana" ? value : value.toLowerCase();
  for (const row of raw) {
    const parsed = pairSchema.safeParse(row);
    if (!parsed.success || parsed.data.chainId !== chain || normalize(parsed.data.baseToken.address) !== address) continue;
    const key = normalize(parsed.data.pairAddress);
    const existing = matches.get(key);
    if (!existing || (parsed.data.liquidity?.usd ?? -1) > (existing.liquidity?.usd ?? -1)) matches.set(key, parsed.data);
  }
  const ranked = [...matches.values()].sort((a, b) => (b.liquidity?.usd ?? -1) - (a.liquidity?.usd ?? -1));
  return {
    name: ranked[0]?.baseToken.name || null,
    symbol: ranked[0]?.baseToken.symbol || null,
    matching_pools: ranked.length,
    pools: ranked.slice(0, 4).map(pair => {
      const price = Number(pair.priceUsd);
      return {
        id: pair.pairAddress,
        dex: pair.dexId,
        quote_symbol: pair.quoteToken.symbol,
        price_usd: Number.isFinite(price) && price > 0 ? price : null,
        liquidity_usd: pair.liquidity?.usd ?? null,
        volume_24h_usd: pair.volume?.h24 ?? null,
        change_24h_pct: pair.priceChange?.h24 ?? null,
        url: "https://dexscreener.com/" + chain + "/" + pair.pairAddress,
      };
    }),
  };
}

function matchIssuer(chain: TokenChain, address: string) {
  if (chain === "base") return undefined;
  return TOKENIZED_EQUITIES.find(item => item.addresses[chain] === address);
}

export async function readTokenIntelligence(input: string): Promise<TokenIntelligence> {
  const asset = parseTokenAsset(input);
  if (!asset) throw new NewsError("invalid_request", TOKEN_ADDRESS_ERROR, 400);
  const { chain, address } = asset;
  const issuer = matchIssuer(chain, address);
  const company = issuer && SEED_BEATS.find(beat => beat.ticker === issuer.ticker && beat.asset !== "crypto");
  const source_url = "https://api.dexscreener.com/token-pairs/v1/" + chain + "/" + address;
  const [marketRead, newsRead] = await Promise.allSettled([
    upstreamCache.read("token-pools:" + chain + ":" + address, TTL_MS, async () => {
      const response = await fetch(source_url, { signal: AbortSignal.timeout(5_000), redirect: "error" });
      if (!response.ok) throw new Error("Pool source unavailable");
      return matchTokenPools(chain, address, await response.json());
    }, { noStale: true }),
    company ? stories(company.beat_id, 4, 100) : Promise.resolve(null),
  ]);
  const market = marketRead.status === "fulfilled" ? marketRead.value : null;
  const marketStatus = !market ? "unavailable" : Date.now() - market.fetchedAt >= TTL_MS ? "stale"
    : market.value.matching_pools ? "fresh" : "no_pools";
  const reporting = newsRead.status === "fulfilled" ? newsRead.value : null;
  const newsStatus = reporting?.freshness.status;
  return {
    asset: { ...asset, explorer_url: TOKEN_CHAINS[chain].explorer + address,
      name: issuer?.name ?? market?.value.name ?? null, symbol: issuer?.symbol ?? market?.value.symbol ?? null },
    registry: issuer ? { issuer: "Backed Assets (JE) Limited", ticker: issuer.ticker, isin: issuer.isin,
      source_url: "https://api.xstocks.fi/api/v2/public/assets/" + issuer.symbol, checked_on: "2026-11-11" } : null,
    market: { status: marketStatus, source: "DEX Screener", source_url,
      fetched_at: market ? new Date(market.fetchedAt).toISOString() : null,
      matching_pools: market?.value.matching_pools ?? 0, pools: market?.value.pools ?? [] },
    underlying_news: company ? {
      status: newsStatus === "fresh" || newsStatus === "stale" ? newsStatus : "unavailable",
      last_success_at: reporting?.freshness.last_success_at ?? null, beat_id: company.beat_id,
      items: reporting?.stories.map(({ lead_article: item }) => ({
        title: item.title, url: item.url, source: item.source, published_at: item.published_at,
      })) ?? [],
    } : null,
    limitations: [
      "Pool figures are DEX Screener readings for this contract as the base token. The fetch time describes when Rarebird read the feed.",
      "Pool prices and liquidity can vary by venue. They do not establish an executable quote or the price of the underlying security.",
      issuer ? "The issuer record establishes the deployment and underlying ticker. Company headlines are context for the underlying security."
        : "This contract has no match in the Rarebird issuer pilot. Names and symbols in the pool feed are venue metadata.",
    ],
  };
}
