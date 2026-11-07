import { selectSummaryStories } from "./relevance.js";
import { stories } from "./news.js";

type Report = { id: string; title: string; url: string; source: string; published_at: string };
export type HeadlineSummaryItem = { story_id: string; text: string; reports: Report[] };
export type HeadlineSummary = {
  beat_id: string; ticker: string; label: string; generated_at: string;
  freshness: { status: string; last_success_at: string | null };
  basis: "headlines_only"; method: "generated" | "extractive";
  coverage_truncated: boolean; items: HeadlineSummaryItem[];
};

export function validateSummaries(value: unknown, items: HeadlineSummaryItem[]): string[] | null {
  if (!value || typeof value !== "object" || !Array.isArray((value as { items?: unknown }).items)) return null;
  const generated = (value as { items: unknown[] }).items;
  if (generated.length !== items.length) return null;
  const byId = new Map<string, unknown>();
  for (const entry of generated) {
    if (!entry || typeof entry !== "object") return null;
    const id = (entry as { story_id?: unknown }).story_id;
    if (typeof id !== "string" || byId.has(id)) return null;
    byId.set(id, entry);
  }
  const summaries: string[] = [];
  for (const [index, item] of items.entries()) {
    const entry = byId.get(item.story_id);
    if (!entry) return null;
    const { story_id, text } = entry as { story_id?: unknown; text?: unknown };
    if (story_id !== item.story_id || typeof text !== "string") return null;
    const sentence = text.trim();
    if (!sentence || sentence.length > 240 || /[\r\n<>]/.test(sentence)) return null;
    // A model cannot introduce a figure or date absent from every supplied headline.
    const evidence = item.reports.slice(0, 5).map(report => report.title).join(" ");
    const figures = (s: string): string[] => s.match(/\d+(?:[.,]\d+)*/g) ?? [];
    if (figures(sentence).some(number => !figures(evidence).includes(number))) return null;
    if (/\b(?:may|might|could|reportedly|expected|weighs|in talks|plans?)\b/i.test(evidence)
      && !/\b(?:may|might|could|reportedly|reported|expected|weighs|in talks|plans?|considering|potential)\b/i.test(sentence)) return null;
    if (evidence.includes("?") && !/[?]|\b(?:whether|asks|examines|discusses|explores)\b/i.test(sentence)) return null;
    summaries.push(sentence);
  }
  return summaries;
}

/** Legacy verbatim compatibility read. Model summarization has been retired. */
export async function headlineSummary(beatId: string, _oidcToken?: string | null): Promise<HeadlineSummary> {
  const snapshot = await stories(beatId, 200);
  const selected = selectSummaryStories(snapshot.stories.map(story => ({
    lead: story.lead, sources: story.sources, source_count: story.source_count,
    first_seen: story.first_seen, last_seen: story.last_seen, articles: story.reports,
  })), 3);
  const items: HeadlineSummaryItem[] = selected.map(story => ({
    story_id: story.articles[0]!.id,
    text: story.lead, // compatibility output is always verbatim
    reports: story.articles.map(report => ({ id: report.id, title: report.title,
      source: report.source, url: report.url, published_at: report.published_at })),
  }));
  return { beat_id: beatId, ticker: snapshot.ticker, label: snapshot.label,
    generated_at: new Date().toISOString(), freshness: snapshot.freshness,
    basis: "headlines_only", method: "extractive", coverage_truncated: snapshot.coverage_truncated, items };
}
