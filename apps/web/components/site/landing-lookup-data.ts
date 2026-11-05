export type LookupAsset = { beat_id: string; label: string; ticker: string; asset: string };
export type LookupArticle = { id: string; beat_id: string; title: string; source: string; url: string; published_at: string };
export type LookupNews = { items: LookupArticle[]; freshness: { status: "fresh" | "stale" | "unavailable"; last_success_at: string | null } };

export async function findAssets(base: string, query: string, signal: AbortSignal): Promise<LookupAsset[]> {
  const response = await fetch(`${base}/v2/topics?q=${encodeURIComponent(query.trim())}&limit=6`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Search unavailable");
  const data = await response.json();
  if (!Array.isArray(data.topics) || !data.topics.every((topic: LookupAsset) => topic && /^b_[a-f0-9]{12}$/.test(topic.beat_id) && [topic.label, topic.ticker, topic.asset].every(value => typeof value === "string"))) throw new Error("Invalid search response");
  return data.topics.slice(0, 6);
}

export async function readCoverage(base: string, beatId: string, signal: AbortSignal): Promise<LookupNews> {
  const response = await fetch(`${base}/v2/news?beat_id=${encodeURIComponent(beatId)}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Coverage unavailable");
  const data = await response.json();
  if (!Array.isArray(data.items) || !data.items.every((item: LookupArticle) => item && item.beat_id === beatId && [item.id, item.title, item.source, item.url, item.published_at].every(value => typeof value === "string") && /^https?:\/\//i.test(item.url) && Number.isFinite(Date.parse(item.published_at))) || !["fresh", "stale", "unavailable"].includes(data.freshness?.status) || !(data.freshness.last_success_at === null || typeof data.freshness.last_success_at === "string" && Number.isFinite(Date.parse(data.freshness.last_success_at)))) throw new Error("Invalid coverage response");
  return { items: data.items.slice(0, 8), freshness: data.freshness };
}

/** A successful collection check says nothing about how recent a headline is. */
export function coverageLabel(data: LookupNews, readAt: number, now: number) {
  if (now - readAt > 120_000) return "Refresh needed";
  if (data.freshness.status === "fresh" && data.freshness.last_success_at && Number.isFinite(Date.parse(data.freshness.last_success_at))) return "Collection up to date";
  return data.freshness.status === "stale" ? "Collection delayed" : "Collection unconfirmed";
}
