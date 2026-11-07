import type { QuantBundle, ResearchEvidence } from "@newsbeat/contracts";

export function researchFreshness(status: string, at: string | null, maxAge: number, now = Date.now()): ResearchEvidence["freshness"] {
  if (!at) return "unavailable";
  const age = now - Date.parse(at);
  return status === "fresh" && Number.isFinite(age) && age >= -60_000 && age <= maxAge ? "fresh" : "stale";
}

/** Reuse deterministic measurements; never turn a prior language-model hypothesis into a measured fact. */
export function quantitativeResearchEvidence(beatId: string, quant: Pick<QuantBundle, "market" | "research">, now = Date.now()): ResearchEvidence[] {
  const market = quant.market;
  if (!market.instrument) return [];
  const instrument = market.instrument;
  const status = researchFreshness(market.status === "ready" ? "fresh" : market.status, market.observed_at, 600_000, now);
  const pct = (value: number) => (value * 100).toFixed(4);
  const evidence: ResearchEvidence[] = market.windows.slice(-3).map(window => ({
    id: "market:" + beatId + ":" + window.minutes, beat_id: beatId, kind: "measurement",
    text: window.minutes + "-minute venue asset return: " + pct(window.asset_return) + "%; comparison return: " + pct(window.benchmark_return) + "%; excess return: " + pct(window.excess_return) + "%"
      + (window.residual_return === null ? "." : "; fitted residual return: " + pct(window.residual_return) + "%.")
      + " Window trades: " + window.trades + ".",
    source: "Kraken " + instrument.pair, url: instrument.source_url, observed_at: window.end_at,
    freshness: researchFreshness(status, window.end_at, 600_000, now),
  }));
  if (market.volume_ratio !== null) evidence.push({
    id: "participation:" + beatId, beat_id: beatId, kind: "measurement",
    text: "Observed venue volume relative to its comparison baseline: " + market.volume_ratio.toFixed(4) + " times. This is participation context, not an executable return.",
    source: "NewsBeat / Kraken " + instrument.pair, url: instrument.source_url,
    observed_at: market.last_bar_at ?? market.observed_at ?? "", freshness: researchFreshness(status, market.last_bar_at, 600_000, now),
  });
  const research = quant.research;
  if (research) {
    const discoveryStatus = researchFreshness(status === "fresh" && research.status === "ready" ? "fresh" : "stale", research.scanned_at, 600_000, now);
    for (const window of research.windows.slice(0, 3)) evidence.push({
      id: "discovery:" + beatId + ":" + window.minutes, beat_id: beatId, kind: "measurement",
      text: window.minutes + "-minute independent anomaly scan: " + window.status + "; direction: " + window.direction
        + "; historical comparison windows: " + window.historical_windows + "; regime: " + window.regime + "."
        + (window.empirical_tail_fraction === null ? " No usable historical rarity estimate." : " Descriptive historical tail fraction: " + window.empirical_tail_fraction.toFixed(4) + ".")
        + " Historical rarity is not a probability of future profit.",
      source: "NewsBeat deterministic discovery / Kraken " + instrument.pair,
      url: "https://www.newsbeat.dev/api/v2/intelligence?beat_id=" + beatId,
      observed_at: window.end_at, freshness: researchFreshness(discoveryStatus, window.end_at, 600_000, now),
    });
  }
  return evidence;
}
