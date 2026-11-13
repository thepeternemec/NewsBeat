import { SEED_BEATS, type MarketBriefing, type PricesPayload, type Sourced } from "@newsbeat/contracts";
import { readIntelligence, PILOT_BEATS } from "./intelligence.js";
import { DEFAULT_PRICE_IDS, prices } from "./market.js";
import { stories } from "./news.js";
import { buildOpportunityBrief } from "./opportunities.js";
import { qualifiesReport } from "./research-core.js";
import { TIMING_POLICY } from "./quant-engine.js";
import { readMarketForecasts } from "./forecast-store.js";

const NEWS_TICKERS = ["BTC", "ETH", "SOL"];
const newsAssets = SEED_BEATS.filter(beat => beat.asset === "crypto" && NEWS_TICKERS.includes(beat.ticker));
const measuredAssets = PILOT_BEATS;

function current(value: string | null | undefined, now: number, maxAge: number) {
  const age = now - Date.parse(value ?? "");
  return age >= -60_000 && age <= maxAge;
}

export function briefingMarket(reading: Sourced<PricesPayload> | null, now: number): MarketBriefing["market"] {
  if (!reading) return null;
  const eligible = new Set<string>(DEFAULT_PRICE_IDS);
  const assets = reading.data.assets.flatMap(asset => {
    if (!eligible.delete(asset.id) || !current(asset.observed_at, now, 10 * 60_000)
      || typeof asset.change_24h !== "number" || !Number.isFinite(asset.change_24h)) return [];
    return [{ ...asset, change_24h: asset.change_24h }];
  });
  const [leader] = assets.sort((a, b) => Math.abs(b.change_24h) - Math.abs(a.change_24h) || a.id.localeCompare(b.id));
  if (!leader) return null;
  const up = assets.filter(asset => asset.change_24h > 0).length;
  const down = assets.filter(asset => asset.change_24h < 0).length;
  const source = { name: "CoinGecko", url: reading.source_url, observed_at: assets.reduce(
    (oldest, asset) => Date.parse(asset.observed_at) < Date.parse(oldest) ? asset.observed_at : oldest, leader.observed_at) };
  return { tracked: DEFAULT_PRICE_IDS.length, up, down, flat: assets.length - up - down, source,
    leader: { name: leader.name, ticker: leader.symbol, change_24h: leader.change_24h,
      source: { ...source, observed_at: leader.observed_at, url: "https://www.coingecko.com/en/coins/" + encodeURIComponent(leader.id) } } };
}

export async function readMarketBriefing(): Promise<MarketBriefing> {
  const [market, reporting, intelligence, forecasts] = await Promise.all([
    prices().catch(() => null),
    Promise.allSettled(newsAssets.map(asset => stories(asset.beat_id, 5, 100))),
    Promise.allSettled(measuredAssets.map(asset => readIntelligence(asset.beat_id))),
    readMarketForecasts(),
  ]);
  const now = Date.now();
  const currentNews = reporting.flatMap((result, index) => {
    const asset = newsAssets[index];
    if (!asset || result.status !== "fulfilled" || result.value.freshness.status !== "fresh"
      || !current(result.value.freshness.last_success_at, now, asset.freshness_slo_minutes * 60_000)) return [];
    return [{ asset, stories: result.value.stories }];
  });
  const latest = currentNews.flatMap(({ asset, stories: items }) => items.flatMap(({ lead_article: article }) => {
    if (!current(article.published_at, now, 24 * 60 * 60_000) || !/^https?:\/\//.test(article.url)
      || !qualifiesReport(article.title, asset)) return [];
    return [{ asset: asset.label, title: article.title, source: { name: article.source, url: article.url, observed_at: article.published_at } }];
  })).sort((a, b) => Date.parse(b.source.observed_at) - Date.parse(a.source.observed_at))[0];

  const checks = buildOpportunityBrief(intelligence.flatMap(result => result.status === "fulfilled" ? [result.value] : []), "fundamentals", 1, now);
  const [review] = checks.review;
  const [anomaly] = checks.watch;
  const lead: MarketBriefing["watch"]["lead"] = review ? {
    kind: "review", asset: review.label, ticker: review.instrument.symbol,
    detail: review.what_changed, why_now: review.why_now,
    next_check: review.next_check ?? "Check the recorded review and its invalidation.", invalidation: review.invalidation,
    source: { name: review.evidence[0]?.source ?? "Rarebird", url: review.evidence[0]?.url ?? review.instrument.source_url, observed_at: review.evidence[0]?.published_at ?? review.triggered_at },
    market_url: review.instrument.source_url, valid_until: review.market_evidence_until,
  } : anomaly ? {
    kind: "anomaly", asset: anomaly.label, ticker: anomaly.instrument.symbol,
    detail: "Rarebird detected an unusual " + anomaly.minutes + "-minute relative move.",
    why_now: "The move passed the historical rarity and market-data checks.",
    next_check: anomaly.next_check, source: { name: "Kraken", url: anomaly.instrument.source_url, observed_at: anomaly.end_at },
    invalidation: null, market_url: anomaly.instrument.source_url,
    valid_until: new Date(Date.parse(anomaly.end_at) + TIMING_POLICY.max_snapshot_age_ms).toISOString(),
  } : null;

  return {
    generated_at: new Date(now).toISOString(),
    forecasts,
    market: briefingMarket(market, now),
    reporting: { checked: currentNews.length, total: newsAssets.length, lead: latest ?? null },
    watch: { checked: checks.coverage.filter(item => item.market === "current").length, total: measuredAssets.length, lead },
  };
}
