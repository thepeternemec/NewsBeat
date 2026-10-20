/** Conservative headline grouping. Original reports are always retained. */
const STOPWORDS = new Set(`a an the and or but for with from into over after before as at by in of on to up is are was were be been being it its this that these those has have had will would can could may might says said report reports stock stocks shares share why what how who when where you your we our they their his her about than then them there here out off own same so some such only just also very amid`.split(/\s+/));
const FORMS: Record<string, string> = {
  launches: "launch", launched: "launch", launching: "launch",
  announces: "announce", announced: "announce", announcing: "announce",
  invests: "invest", invested: "invest", investing: "invest", investment: "invest",
  commits: "commit", committed: "commit", committing: "commit",
  rises: "rise", rose: "rise", rising: "rise", gains: "rise", gained: "rise", jumps: "rise", jumped: "rise", surges: "rise",
  falls: "fall", fell: "fall", falling: "fall", drops: "fall", dropped: "fall", plunges: "fall",
  succeeds: "success", succeeded: "success", successful: "success",
  fails: "failure", failed: "failure", aborted: "failure", aborts: "failure", cancelled: "failure", canceled: "failure",
  approves: "approve", approved: "approve", approval: "approve",
  rejects: "reject", rejected: "reject", rejection: "reject",
  beats: "beat", misses: "miss", missed: "miss",
};
const normalize = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[’'‘]/g, "").replace(/[^\p{L}\p{N}.]+/gu, " ").trim();
export function tokens(headline: string): Set<string> {
  return new Set((normalize(headline).match(/[\p{L}]+|\d+(?:\.\d+)?/gu) ?? [])
    .filter(w => !STOPWORDS.has(w)).map(w => FORMS[w] ?? w));
}
export function containment(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared++;
  return shared / Math.min(a.size, b.size);
}
export const STORY_THRESHOLD = 0.85;
export const STORY_WINDOW_MS = 24 * 3600_000;
const NEGATIVE = new Set(["not", "no", "never", "wont", "dont", "doesnt", "isnt", "cant", "cannot", "without"]);
const SPECULATIVE = new Set(["rumor", "rumors", "rumoured", "rumored", "reportedly", "could", "may", "might", "plans", "planned", "planning", "expected", "expects", "considering"]);
// Losing these distinctions can turn a new development into hidden coverage.
const PROTECTED = new Set(["success", "failure", "rise", "fall", "approve", "reject", "beat", "miss", "revenue", "profit", "loss", "earnings"]);
const signature = (words: Set<string>, selected: Set<string>) => [...words].filter(w => selected.has(w)).sort().join("|");

export interface Clusterable {
  title: string;
  source: string;
  published_at: string;
  url: string;
  id: string;
}
export interface Story<T extends Clusterable = Clusterable> {
  lead: string;
  sources: string[];
  source_count: number;
  first_seen: string;
  last_seen: string;
  articles: T[];
}

function features(article: Clusterable) {
  const words = tokens(article.title);
  const normalized = normalize(article.title);
  return {
    words,
    time: Date.parse(article.published_at),
    exact: article.title.normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim(),
    numbers: [...new Set((article.title.toLowerCase().match(/[-+]?\s*[$€£]?\s*\d+(?:[.,]\d+)*(?:\s*%|\s*(?:million|billion|trillion))?/g) ?? [])
      .map(n => n.replace(/[\s,]/g, "")))].sort().join("|"),
    negative: [...words].some(w => NEGATIVE.has(w)),
    speculative: normalized.split(/\s+/).some(w => SPECULATIVE.has(w)),
    question: article.title.includes("?"),
    protected: signature(words, PROTECTED),
  };
}
function matches(a: ReturnType<typeof features>, b: ReturnType<typeof features>): boolean {
  if (!Number.isFinite(a.time) || !Number.isFinite(b.time) || Math.abs(a.time - b.time) > STORY_WINDOW_MS) return false;
  if (a.exact === b.exact) return true;
  if (a.numbers !== b.numbers || a.negative !== b.negative || a.speculative !== b.speculative
    || a.question !== b.question || a.protected !== b.protected) return false;
  const x = a.words, y = b.words;
  let shared = 0;
  for (const w of x) if (y.has(w)) shared++;
  const min = Math.min(x.size, y.size), max = Math.max(x.size, y.size);
  if (shared < 4) return false;
  const overlap = shared / min;
  const jaccard = shared / (x.size + y.size - shared);
  return overlap >= STORY_THRESHOLD && (jaccard >= 0.65 || (overlap === 1 && min >= 5 && min / max >= 0.45));
}
/** Conservative lexical match; it is not a claim that two articles agree. */
export function sameStory(a: Clusterable, b: Clusterable): boolean {
  return matches(features(a), features(b));
}

const idOrder = (a: string, b: string) => /^\d+$/.test(a) && /^\d+$/.test(b)
  ? (BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0)
  : a.localeCompare(b);

export function clusterStories<T extends Clusterable>(articles: T[]): Array<Story<T>> {
  const stories: Array<Story<T>> = [];
  const prepared = new Map(articles.map(article => [article, features(article)]));
  // First indexed report is the lead. Input order must not change the grouping.
  const ordered = [...articles].sort((a, b) => idOrder(a.id, b.id) || a.url.localeCompare(b.url));
  for (const article of ordered) {
    // Compare every member: A~B and B~C is not sufficient evidence that A~C.
    const story = stories.find(s => s.articles.every(member => matches(prepared.get(article)!, prepared.get(member)!)));
    if (story) {
      story.articles.push(article);
      if (!story.sources.some(s => s.trim().toLowerCase() === article.source.trim().toLowerCase())) story.sources.push(article.source);
      story.source_count = story.sources.length;
      if (article.published_at < story.first_seen) story.first_seen = article.published_at;
      if (article.published_at > story.last_seen) story.last_seen = article.published_at;
    } else {
      stories.push({ lead: article.title, sources: [article.source], source_count: 1,
        first_seen: article.published_at, last_seen: article.published_at, articles: [article] });
    }
  }
  // A source count measures coverage, not credibility. Show the latest first.
  return stories.sort((a, b) => b.last_seen.localeCompare(a.last_seen) || idOrder(b.articles[0]!.id, a.articles[0]!.id));
}

/** Public snapshot: keep old summary fields and expose the underlying evidence. */
export function storyView<T extends Clusterable>(story: Story<T>) {
  const lead = story.articles[0]!;
  return { id: lead.id, lead: story.lead, sources: story.sources, source_count: story.source_count,
    first_seen: story.first_seen, last_seen: story.last_seen, url: lead.url,
    articles: story.articles.length, lead_article: lead, reports: story.articles };
}
