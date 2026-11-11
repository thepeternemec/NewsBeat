import { SEED_BEATS, ResearchRequestSchema, type Beat, type ResearchAsset, type ResearchEvidence, type ResearchResponse } from "@newsbeat/contracts";
import { NewsError, stories } from "./news.js";
import { readIntelligence } from "./intelligence.js";
import { prices } from "./market.js";
import { assetView, qualifiesReport, researchIntent, resolveResearchAssets } from "./research-core.js";
import { reasonAboutQuestion } from "./research-model.js";
import { isReferenceQuoteQuestion, referenceQuoteAnswer } from "./research-quote.js";
import { quantitativeResearchEvidence, researchFreshness as fresh } from "./research-market.js";
import { officialResearchEvidence, readCatalysts } from "./catalysts.js";

const PRICE_IDS: Record<string, string> = { BTC: "bitcoin", ETH: "ethereum", SOL: "solana" };
export const priceIdsForAsset = (asset: Pick<Beat, "ticker" | "asset"> | null) =>
  asset?.asset === "crypto" && PRICE_IDS[asset.ticker] ? [PRICE_IDS[asset.ticker]!] : [];

async function gather(asset: Beat, question: string, context: "fundamentals" | "liquidity" | "risk", intelligenceRead: typeof readIntelligence) {
  const meta: ResearchAsset = { ...assetView(asset), news_status: "unavailable", market_status: "unavailable", reports_scanned: 0, coverage_truncated: false, limitations: [] };
  const evidence: ResearchEvidence[] = [];
  const [news, intelligence, quote, official] = await Promise.allSettled([
    stories(asset.beat_id, 40, 200),
    intelligenceRead(asset.beat_id, context),
    priceIdsForAsset(asset).length ? prices(priceIdsForAsset(asset)) : Promise.resolve(null),
    readCatalysts({ beat_id: asset.beat_id }),
  ]);
  const issuer = official.status === "fulfilled" ? official.value.coverage[0] : undefined;
  if (issuer?.status === "fresh") {
    evidence.push(...officialResearchEvidence(issuer));
    meta.limitations.push("SEC evidence covers filing metadata and any comparable reported figures shown. Guidance changes and consensus surprise require separate evidence.");
    if (issuer.snapshot?.missing_concepts.length) meta.limitations.push("Some financial concepts have no validated comparable prior-year period.");
  } else if (issuer?.status !== "unsupported") meta.limitations.push("Current official issuer evidence is unavailable or stale.");
  if (news.status === "fulfilled") {
    meta.news_status = news.value.freshness.status;
    meta.reports_scanned = news.value.articles_read;
    meta.coverage_truncated = news.value.coverage_truncated;
    const status = fresh(meta.news_status, news.value.freshness.last_success_at, asset.freshness_slo_minutes * 60_000);
    meta.news_status = status;
    const terms = question.toLowerCase().match(/[a-z]{4,}/g) ?? [];
    const ranked = news.value.stories.filter(s => qualifiesReport(s.lead_article.title, asset))
      .map((s, order) => ({ s, order, relevance: terms.filter(t => s.lead.toLowerCase().includes(t)).length }))
      .sort((a, b) => b.relevance - a.relevance || a.order - b.order).slice(0, 8);
    for (const { s } of ranked) {
      const r = s.lead_article;
      evidence.push({ id: "news:" + asset.beat_id + ":" + r.id, beat_id: asset.beat_id, kind: "report",
        text: r.title, source: r.source, url: r.url, observed_at: r.published_at, freshness: fresh(status, r.published_at, 24 * 60 * 60_000) });
    }
    if (!ranked.length) meta.limitations.push("No entity-qualified reporting was found in the current bounded news window.");
    if (meta.coverage_truncated) meta.limitations.push("The current news window is truncated; this is not exhaustive coverage.");
  } else meta.limitations.push("News storage could not be read for this asset.");

  const quant = intelligence.status === "fulfilled" ? intelligence.value.quantitative : undefined;
  if (quant?.market.instrument) {
    const market = quant.market;
    const measured = quantitativeResearchEvidence(asset.beat_id, quant);
    evidence.push(...measured);
    meta.market_status = measured.some(item => item.freshness === "fresh") ? "fresh" : "stale";
    meta.limitations.push(...market.limitations.slice(0, 3));
    if (!quant.research || quant.research.status !== "ready") meta.limitations.push("Independent anomaly comparison is not ready; current returns alone do not establish an unusual move.");
    if (market.instrument!.kind === "tokenized_equity") meta.limitations.push("Stock measurements are identified tokenized-equity venue prices, not a consolidated underlying-share tape.");
  }
  if (quote.status === "fulfilled" && quote.value) {
    const data = quote.value;
    const assetQuote = data.data.assets.find(a => a.id === PRICE_IDS[asset.ticker]);
    if (assetQuote) {
      const status = fresh(data.freshness.status, assetQuote.observed_at, 10 * 60_000);
      meta.market_status = status;
      evidence.push({ id: "quote:" + asset.beat_id, beat_id: asset.beat_id, kind: "measurement",
        text: assetQuote.name + " reference price: USD " + assetQuote.price_usd + (assetQuote.change_24h === undefined ? "." : "; reported daily change: " + (assetQuote.change_24h * 100).toFixed(4) + "%."),
        source: data.source, url: data.source_url, observed_at: assetQuote.observed_at, freshness: status });
      meta.limitations.push("A reference quote does not supply an anomaly baseline, executable price or timing confirmation.");
    }
  }
  if (meta.news_status !== "fresh") meta.limitations.push("News freshness is " + meta.news_status + "; old coverage cannot establish what is happening now.");
  if (meta.market_status !== "fresh") meta.limitations.push("Current asset-specific market measurements are unavailable or stale; price reaction, anomalies and timing cannot be established.");
  return { asset: meta, evidence };
}

/** Question -> identity -> relevant reporting + measured context -> reasoning -> next check. */
export async function researchQuestion(raw: unknown, oidcToken?: string | null, intelligenceRead = readIntelligence): Promise<ResearchResponse> {
  const parsed = ResearchRequestSchema.safeParse(raw);
  if (!parsed.success) throw new NewsError("invalid_request", "Provide a question of 3–600 characters and optionally one to three supported beat_ids.", 400);
  const input = parsed.data;
  const resolved = resolveResearchAssets(input.question, input.beat_ids);
  const base: ResearchResponse = { version: "question-research-v1", question: input.question, generated_at: new Date().toISOString(),
    status: "needs_clarification", method: "evidence_only", context: input.context, answer: null,
    message: resolved.issue, generation_error: null, assets: [], candidates: resolved.candidates, evidence: [], limitations: [],
    flow: [{ step: "Resolve assets", status: resolved.issue ? "limited" : "complete" }] };
  if (resolved.issue) return base;
  const gathered = await Promise.all(resolved.assets.map(asset => gather(asset, input.question, input.context, intelligenceRead)));
  base.assets = gathered.map(g => g.asset);
  base.evidence = gathered.flatMap(g => g.evidence);
  base.limitations = [...new Set(gathered.flatMap(g => g.asset.limitations))];
  base.limitations.push("Evidence covers a bounded latest-day headline window, available issuer records and identified measurements. Causal claims require event-specific evidence.");
  base.flow.push({ step: "Retrieve question-relevant evidence", status: base.assets.every(a => a.news_status === "fresh") ? "complete" : "limited" },
    { step: "Check asset-specific market context", status: base.assets.every(a => a.market_status === "fresh") ? "complete" : "limited" });
  const usable = base.evidence.filter(e => e.freshness === "fresh");
  if (isReferenceQuoteQuestion(input.question, base.assets)) {
    base.answer = referenceQuoteAnswer(base.assets, usable);
    base.method = base.answer ? "measured" : "evidence_only";
    const quoted = new Set(usable.filter(item => /^(?:quote:|venue-quote:)/.test(item.id)).map(item => item.beat_id));
    base.status = base.answer ? (base.assets.every(asset => quoted.has(asset.beat_id)) ? "ready" : "partial") : "unavailable";
    base.message = base.answer ? null : "No fresh, identified reference quote is available for the requested asset. News headlines cannot substitute for a current price.";
    base.flow.push({ step: "Read identified reference quotes", status: base.answer ? "complete" : "limited" });
    return base;
  }
  if (!usable.length) {
    base.status = "unavailable";
    base.message = "There is not enough fresh evidence to answer this question reliably. The attached coverage states explain what is missing.";
    base.flow.push({ step: "Reason and identify the next check", status: "skipped" });
    return base;
  }
  const answer = await reasonAboutQuestion({ question: input.question, intent: researchIntent(input.question), context: input.context,
    assets: base.assets, evidence: usable, limitations: base.limitations }, oidcToken, undefined, reason => { base.generation_error = reason; });
  base.answer = answer;
  base.method = answer ? "reasoned" : "evidence_only";
  base.status = answer && base.assets.every(a => a.news_status === "fresh" && a.market_status === "fresh") ? "ready" : "partial";
  base.message = answer ? null : "The evidence is available, but Rarebird could not validate an answer. Check the sources and try again.";
  base.flow.push({ step: "Reason and identify the next check", status: answer ? "complete" : "limited" });
  return base;
}

export const researchCoverage = { catalog_assets: SEED_BEATS.length, maximum_assets_per_question: 3, measured_market_pilot: 6 };
