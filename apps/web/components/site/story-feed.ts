/** Public grouped-feed shape. Raw cursor pages remain separate. */
export interface FeedReport {
  id: string;
  title: string;
  source: string;
  url: string;
  published_at: string;
  first_indexed_at: string;
}
export interface FeedItem extends FeedReport {
  beat_id: string;
  source_count: number;
  reports: FeedReport[];
}
export interface StorySnapshot {
  stories: Array<{ id: string; lead_article: FeedReport; source_count: number; reports: FeedReport[] }>;
  coverage_truncated: boolean;
  freshness: { status: string; last_success_at: string | null };
}
export async function loadStoryFeed(base: string, beatId: string, limit = 200) {
  const response = await fetch(`${base}/v2/stories?beat_id=${encodeURIComponent(beatId)}&limit=${limit}`, { cache: "no-store" });
  if (!response.ok) throw new Error("News coverage could not be loaded. Please try again.");
  const page = await response.json() as StorySnapshot;
  return {
    items: page.stories.map(story => ({ ...story.lead_article, id: story.id, beat_id: beatId,
      source_count: story.source_count, reports: story.reports })),
    coverage_truncated: page.coverage_truncated,
    freshness: page.freshness,
  };
}
