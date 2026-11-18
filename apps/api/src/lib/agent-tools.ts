import {
  SEED_BEATS, type AgentTool, type Beat, type MarketForecasts, type ResearchAnswer,
  type ResearchAsset, type ResearchEvidence, type SignalContextId, parseTokenAsset,
} from "@rarebird/contracts";
import { gatherResearchEvidence } from "./research.js";
import { assetView } from "./research-core.js";
import { readDiscovery } from "./discovery.js";
import { readOpportunities } from "./opportunities.js";
import { readMarketForecasts } from "./forecast-store.js";
import { overview, cryptoMarkets } from "./market.js";
import { signals } from "./signals.js";
import { chainPulse } from "./chain.js";
import { readTokenIntelligence } from "./token-intelligence.js";
import { officialResearchEvidence, readCatalysts } from "./catalysts.js";
import { readInvestmentBrief } from "./investment.js";
import { stories } from "./news.js";

export interface AgentToolInput {
  question: string;
  assets: Beat[];
  context: SignalContextId;
  oidcToken?: string | null;
  tokenAsset?: string;
  market?: "equity" | "crypto";
}
export interface AgentToolReading {
  evidence: ResearchEvidence[];
  assets: ResearchAsset[];
  limitations: string[];
  suggestions: string[];
  forecasts?: MarketForecasts;
  answer?: ResearchAnswer | null;
  limited?: boolean;
}
const blank = (): AgentToolReading => ({ evidence: [], assets: [], limitations: [], suggestions: [] });
const ORIGIN = "https://www.rarebird.network";

export function extractAgentContract(question: string): string | undefined {
  const exact = question.match(/\b(ethereum|arbitrum|base|solana):([a-zA-Z0-9]+)/i);
  if (exact) {
    const parsed = parseTokenAsset(exact[1]!.toLowerCase() + ":" + exact[2]);
    return parsed ? parsed.chain + ":" + parsed.address : undefined;
  }
  const chain = question.match(/\b(ethereum|arbitrum|base|solana)\b/i)?.[1]?.toLowerCase();
  const address = question.match(/\b0x[a-f0-9]{40}\b/i)?.[0]
    ?? (chain === "solana" ? question.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/)?.[0] : undefined);
  const parsed = chain && address ? parseTokenAsset(chain + ":" + address) : null;
  return parsed ? parsed.chain + ":" + parsed.address : undefined;
}

function currency(at: string, milliseconds: number): ResearchEvidence["freshness"] {
  const age = Date.now() - Date.parse(at);
  return age >= -60_000 && age <= milliseconds ? "fresh" : "stale";
}
function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

/** Keep source field names and exact values together, including observation dates. */
function facts(value: unknown, prefix = "", depth = 0): string[] {
  if (value === null || value === undefined || depth > 4) return [];
  if (Array.isArray(value)) return value.slice(0, 4).flatMap((item, index) => facts(item, prefix + " " + (index + 1), depth + 1));
  const object = record(value);
  if (object) return Object.entries(object).filter(([key]) => !/url|sparkline|history|recent|icon/i.test(key))
    .slice(0, 14).flatMap(([key, item]) => facts(item, (prefix + " " + key.replaceAll("_", " ")).trim(), depth + 1));
  return [prefix + ": " + String(value).slice(0, 400)];
}

export function sourcedEvidence(tool: AgentTool, payload: unknown): ResearchEvidence[] {
  const root = record(payload);
  if (!root) return [];
  const parts: Record<string, unknown>[] = "data" in root ? [root]
    : Object.values(root).map(record).filter((value): value is Record<string, unknown> => value !== null);
  return parts.flatMap((part, index) => {
    if (typeof part.source_url !== "string" || !/^https?:\/\//.test(part.source_url)
      || typeof part.fetched_at !== "string" || !("data" in part)) return [];
    const status = record(part.freshness)?.status;
    const freshness = status === "fresh" ? "fresh" : status === "stale" ? "stale" : "unavailable";
    const data = record(part.data);
    const entries = Array.isArray(data?.assets) ? data.assets.slice(0, 4) : [part.data];
    return entries.flatMap((entry, item) => {
      const values = facts(entry).slice(0, 18);
      if (!values.length) return [];
      const observed = record(entry)?.observed_at;
      const at = typeof observed === "string" ? observed : part.fetched_at as string;
      return [{ id: `agent:${tool}:${part.source_url}:${index}:${item}`, beat_id: "market", kind: "measurement" as const,
        text: values.join(". "), source: String(part.source ?? tool), url: part.source_url as string,
        observed_at: at, freshness: freshness === "fresh" && typeof observed === "string"
          ? currency(at, 10 * 60_000) : freshness }];
    });
  });
}

export function forecastEvidence(data: MarketForecasts, assets: Beat[], now = Date.now()): ResearchEvidence[] {
  return data.assets.filter(item => !assets.length || assets.some(asset => asset.ticker === item.ticker)).flatMap(item => {
    const evidence: ResearchEvidence[] = [];
    const forecast = item.move_risk?.forecast;
    const direction = item.forecast;
    if (forecast) evidence.push({ id: "agent:forecast:move:" + item.ticker, beat_id: SEED_BEATS.find(asset => asset.ticker === item.ticker && asset.asset === "crypto")?.beat_id ?? "market", kind: "measurement",
      text: `${item.ticker} experimental hourly move-risk forecast. Target ${forecast.target_at}. Chance of a move at least ${(forecast.threshold_fraction * 100).toFixed(1)}% in either direction: ${(forecast.probability * 100).toFixed(1)}%. Historical baseline: ${(forecast.baseline_probability * 100).toFixed(1)}%. Matching windows: ${forecast.matched_windows}. This does not predict direction.`,
      source: forecast.source.name, url: forecast.source.url, observed_at: forecast.issued_at,
      freshness: data.status === "ready" && Date.parse(forecast.target_at) > now && Date.parse(forecast.target_at) <= now + 3_600_000 && Date.parse(forecast.issued_at) <= now && now - Date.parse(forecast.issued_at) <= 3_600_000 ? "fresh" : "stale" });
    if (direction) evidence.push({ id: "agent:forecast:direction:" + item.ticker, beat_id: "market", kind: "measurement",
      text: `${item.ticker} experimental hourly directional forecast. Target ${direction.target_at}. Chance of closing above the reference: ${(direction.probability_above * 100).toFixed(1)}%. Baseline: ${(direction.baseline_probability * 100).toFixed(1)}%. Scored forecasts: ${item.scorecard.scored}. Model Brier score: ${item.scorecard.model_brier ?? "unavailable"}. Baseline Brier score: ${item.scorecard.baseline_brier ?? "unavailable"}.`,
      source: direction.source.name, url: direction.source.url, observed_at: direction.issued_at,
      freshness: data.status === "ready" && Date.parse(direction.target_at) > now && Date.parse(direction.target_at) <= now + 3_600_000 && Date.parse(direction.issued_at) <= now && now - Date.parse(direction.issued_at) <= 3_600_000 ? "fresh" : "stale" });
    for (const [name, score] of [["direction", item.scorecard], ["move risk", item.move_risk?.scorecard]] as const) {
      if (!score?.scored) continue;
      evidence.push({ id: "agent:scorecard:" + item.ticker + ":" + name, beat_id: "market", kind: "measurement",
        text: `${item.ticker} ${name} historical scorecard over ${data.scorecard_days} days. Scored calls ${score.scored}. Pending ${score.pending}. Missing ${score.missing}. Model Brier ${score.model_brier ?? "unavailable"}. Baseline Brier ${score.baseline_brier ?? "unavailable"}. Lower Brier is better. Historical scores do not establish future performance.`,
        source: "Rarebird forecast journal", url: ORIGIN + "/app/forecasts", observed_at: data.generated_at,
        freshness: data.status === "ready" && now - Date.parse(data.generated_at) >= 0 && now - Date.parse(data.generated_at) < 300_000 ? "fresh" : "stale" });
    }
    return evidence;
  });
}

export async function readAgentTool(tool: AgentTool, input: AgentToolInput): Promise<AgentToolReading> {
  const output = blank();
  const singleAsset = input.assets.length === 1 ? input.assets[0] : undefined;
  if (tool === "research") {
    const readings = await Promise.all(input.assets.map(asset => gatherResearchEvidence(asset, input.question, input.context)));
    output.assets = readings.map(item => item.asset);
    output.evidence = readings.flatMap(item => item.evidence);
    output.limitations = readings.flatMap(item => item.asset.limitations);
    output.limited = readings.some(item => item.asset.news_status !== "fresh" || item.asset.market_status !== "fresh");
  } else if (tool === "discovery") {
    const data = await readDiscovery({ limit: 6, ...(input.market ? { asset: input.market } : {}), ...(singleAsset ? { beat_id: singleAsset.beat_id } : {}) });
    output.evidence = data.events.flatMap(event => event.evidence.slice(0, 1).map(source => ({
      id: "agent:discovery:" + event.id, beat_id: event.assets[0]?.beat_id ?? "market", kind: "report" as const,
      text: event.assets.map(asset => asset.label).join(", ") + ". " + event.title + ". Next check: " + event.next_check,
      source: source.source, url: source.url, observed_at: source.published_at,
      freshness: currency(source.published_at, 24 * 60 * 60_000),
    })));
    output.limitations.push("Catalog development coverage is " + data.status + ". News coverage does not establish market impact.");
    const focus = output.evidence.find(item => item.freshness === "fresh");
    const asset = focus && SEED_BEATS.find(item => item.beat_id === focus.beat_id);
    if (asset) output.assets = [{ ...assetView(asset), news_status: "unconfirmed", market_status: "unconfirmed", reports_scanned: 1, coverage_truncated: data.coverage.truncated, limitations: [] }];
    output.limited = data.status !== "ready";
  } else if (tool === "reporting") {
    const readings = await Promise.all(input.assets.map(async asset => ({ asset, data: await stories(asset.beat_id, 6, 100) })));
    output.evidence = readings.flatMap(({ asset, data }) => data.stories.map(({ lead_article: report }) => ({
      id: "agent:report:" + asset.beat_id + ":" + report.id, beat_id: asset.beat_id, kind: "report" as const,
      text: report.title, source: report.source, url: report.url, observed_at: report.published_at,
      freshness: data.freshness.status === "fresh" ? currency(report.published_at, 24 * 60 * 60_000) : "stale" as const,
    })));
    output.assets = readings.map(({ asset, data }) => ({ ...assetView(asset), news_status: data.freshness.status,
      market_status: "not_checked", reports_scanned: data.articles_read, coverage_truncated: data.coverage_truncated, limitations: [] }));
    output.limited = readings.some(({ data }) => data.freshness.status !== "fresh" || data.coverage_truncated);
    output.limitations.push("Reporting is a bounded headline window with original source links.");
  } else if (tool === "forecasts") {
    output.forecasts = await readMarketForecasts();
    if (input.assets.length) output.forecasts = { ...output.forecasts, assets: output.forecasts.assets.filter(item => input.assets.some(asset => asset.ticker === item.ticker)) };
    output.evidence = forecastEvidence(output.forecasts, input.assets);
    output.assets = SEED_BEATS.filter(asset => asset.asset === "crypto" && output.forecasts!.assets.some(item => item.ticker === asset.ticker))
      .map(asset => ({ ...assetView(asset), news_status: "not_checked", market_status: output.forecasts!.status === "ready" ? "fresh" : "unavailable", reports_scanned: 0, coverage_truncated: false, limitations: [] }));
    output.limitations.push("Experimental hourly forecasts cover Bitcoin and Ethereum. Forecasts and historical scorecards do not establish future returns or the best investment.");
    output.limited = output.forecasts.status !== "ready" || !output.forecasts.assets.length;
    output.suggestions.push("How have these forecasts performed against the baseline?");
  } else if (tool === "opportunities") {
    const data = await readOpportunities({ context: input.context, limit: 3 });
    const inScope = (beatId: string) => (!input.assets.length || input.assets.some(asset => asset.beat_id === beatId))
      && (!input.market || SEED_BEATS.some(asset => asset.beat_id === beatId && (asset.asset ?? "equity") === input.market));
    for (const review of data.review.filter(item => inScope(item.beat_id) && Date.parse(item.market_evidence_until) > Date.now())) {
      const source = review.evidence[0];
      output.evidence.push({ id: "agent:review:" + review.beat_id, beat_id: review.beat_id, kind: "report",
        text: `${review.label} passed the current review checks. ${review.what_changed} Why now: ${review.why_now} Invalidation: ${review.invalidation} Next check: ${review.next_check ?? "Inspect the review evidence."} Market evidence expires ${review.market_evidence_until}. This is a research review, not an instruction to trade.`,
        source: "Rarebird review", url: source?.url ?? review.instrument.source_url, observed_at: review.triggered_at, freshness: "fresh" });
    }
    for (const watch of data.watch.filter(item => inScope(item.beat_id))) output.evidence.push({ id: "agent:watch:" + watch.beat_id, beat_id: watch.beat_id, kind: "measurement",
      text: `${watch.label} has an independently detected unusual relative move over ${watch.minutes} minutes. It is an anomaly watch. Next check: ${watch.next_check}`,
      source: "Rarebird / Kraken", url: watch.instrument.source_url, observed_at: watch.end_at, freshness: currency(watch.end_at, 10 * 60_000) });
    const focus = output.evidence.find(item => item.freshness === "fresh");
    const asset = focus && SEED_BEATS.find(item => item.beat_id === focus.beat_id);
    if (asset) {
      const coverage = data.coverage.find(item => item.beat_id === asset.beat_id);
      output.assets = [{ ...assetView(asset), news_status: coverage?.source_freshness ?? "unavailable", market_status: coverage?.market === "current" ? "fresh" : "unavailable", reports_scanned: 0, coverage_truncated: false, limitations: [] }];
      output.suggestions.push("Explain the evidence and risks for " + asset.label + ".");
    }
    const coverage = data.coverage.filter(item => inScope(item.beat_id));
    const complete = coverage.length > 0 && coverage.every(item => item.market === "current" && item.analysis === "ready" && item.source_freshness === "fresh");
    output.limitations.push("Review and anomaly checks cover the six-asset pilot. Current coverage is " + (complete ? "complete." : "partial or held. Some assets cannot be assessed."));
    output.limited = !complete;
    if (!output.evidence.length) output.limitations.push(complete ? "No current review or anomaly watch qualified." : "An empty shortlist cannot establish an all-clear while coverage is incomplete.");
  } else if (tool === "market") {
    if (input.assets.length) {
      const readings = await Promise.all(input.assets.map(asset => gatherResearchEvidence(asset, input.question, input.context)));
      output.evidence = readings.flatMap(item => item.evidence.filter(evidence => evidence.kind === "measurement"));
      output.assets = readings.map(item => item.asset);
      output.limitations = readings.flatMap(item => item.asset.limitations);
      output.limited = readings.some(item => item.asset.market_status !== "fresh");
      return output;
    }
    const results = await Promise.allSettled([overview(), cryptoMarkets()]);
    output.evidence = results.flatMap(result => result.status === "fulfilled" ? sourcedEvidence(tool, result.value) : []);
    output.limited = results.some(result => result.status === "rejected" || (record(result.value) && Object.values(result.value).some(part => record(record(part)?.freshness)?.status === "unavailable")));
    output.limitations.push("Market overview includes crypto reference data and sentiment. It is not consolidated stock pricing or portfolio advice.");
  } else if (tool === "indicators") {
    const data = await signals();
    output.evidence = sourcedEvidence(tool, data);
    output.limited = Object.values(data).some(part => part.freshness.status !== "fresh");
    output.limitations.push("Funding, DEX activity and stablecoin supply are supporting market observations, not standalone entry signals.");
  } else if (tool === "chain") {
    const data = await chainPulse();
    output.evidence = sourcedEvidence(tool, { ethereum: { ...data, source: "Ethereum public RPC", data: data.data.ethereum },
      solana: { ...data, source: "Solana public RPC", source_url: "https://api.mainnet-beta.solana.com", data: data.data.solana } });
    output.limited = !data.data.ethereum || !data.data.solana || data.freshness.status !== "fresh";
    output.limitations.push("Chain readings cover public block, gas and slot data. They do not read a user's wallet or execute transactions.");
  } else if (tool === "token") {
    const contract = input.tokenAsset;
    if (!contract) { output.limitations.push("Contract research needs the explicit chain:address so the token is identified correctly."); return output; }
    const data = await readTokenIntelligence(contract);
    const at = data.market.fetched_at;
    if (at) output.evidence.push({ id: "agent:token:" + data.asset.address, beat_id: data.underlying_news?.beat_id ?? "market", kind: "measurement",
      text: `${data.asset.chain} contract ${data.asset.address}. Market status ${data.market.status}. Matching pools ${data.market.matching_pools}. ` + facts(data.market.pools).slice(0, 28).join(". "),
      source: data.market.source, url: data.market.source_url, observed_at: at, freshness: data.market.status === "fresh" || data.market.status === "no_pools" ? currency(at, 60_000) : "unavailable" });
    output.limitations.push(...data.limitations);
    if (data.underlying_news) {
      const underlying = data.underlying_news;
      output.evidence.push(...underlying.items.map((item, index) => ({ id: "agent:underlying:" + underlying.beat_id + ":" + index,
        beat_id: underlying.beat_id, kind: "report" as const, text: "Underlying company reporting, separate from this token's pool evidence: " + item.title,
        source: item.source, url: item.url, observed_at: item.published_at,
        freshness: underlying.status === "fresh" ? currency(item.published_at, 24 * 60 * 60_000) : "stale" as const })));
    }
    output.limited = data.market.status !== "fresh";
  } else if (tool === "filings") {
    const data = await readCatalysts(singleAsset ? { beat_id: singleAsset.beat_id } : {});
    output.evidence = data.coverage.flatMap(officialResearchEvidence);
    output.assets = input.assets.map(asset => ({ ...assetView(asset), news_status: data.coverage.find(item => item.beat_id === asset.beat_id)?.status ?? "unavailable",
      market_status: "not_checked", reports_scanned: 0, coverage_truncated: false, limitations: [] }));
    output.limited = data.coverage.some(item => item.status !== "fresh");
    output.limitations.push("Official issuer coverage is a four-company pilot. Filing records and reported figures do not establish consensus surprise.");
  } else if (tool === "investment") {
    const asset = input.assets[0];
    if (asset) {
      const data = await readInvestmentBrief({ ticker: asset.ticker, beat_id: asset.beat_id }, input.oidcToken);
      output.evidence = data.research.evidence;
      output.assets = data.research.assets;
      output.limitations = data.research.limitations;
      output.answer = data.research.answer;
    }
  } else if (tool === "connections") {
    output.evidence = [{ id: "agent:connections", beat_id: "product", kind: "report",
      text: "Rarebird exposes stock and crypto reporting and research through MCP and REST. Configure an MCP client using the quickstart. Configured Telegram groups can request a ticker brief with /ask BTC. Portfolio risk and position sizing based on existing exposure remain in development. Trade execution is not connected.",
      source: "Rarebird documentation", url: ORIGIN + "/docs/quickstart", observed_at: new Date().toISOString(), freshness: "fresh" }];
  }
  return output;
}
