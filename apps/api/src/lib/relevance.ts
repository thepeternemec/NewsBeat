import { tokens, type Clusterable, type Story } from "./cluster.js";

/** An editorial ranking of headline metadata, never a claim about article content. */
const OWNERSHIP = /\b(?:acquires? new (?:holdings|position)|buys? new position|buys? [\d,]+ shares? (?:of|in)|makes? new investment in|(?:grows?|reduces?) (?:its? )?stake|shares? (?:of|in) .{0,80} (?:bought|sold|acquired)|(?:stock|shares?) (?:purchased|sold|bought) by|(?:holdings|position|stake) in .{0,80} (?:llc|advisors|management|capital|partners))\b/i;
const OPINION = /\b(?:should you (?:buy|pick)|is .{1,40} (?:a buy|stock (?:a buy|worth buying))|prediction:|price target|best stocks? to buy|what (?:buyers|investors) (?:should|need) (?:know|consider))\b/i;
const SHOPPING = /\b(?:save \$\d+|discount|on sale|deal of the day|best price|shop now|coupon)\b/i;
const EVENT = /\b(?:announces?|unveils?|launches?|releases?|introduces?|completes?|signs?|agrees?|partners?|selects?|approves?|rejects?|acquires?|invests?|commits?|sues?|settles?|raises?|cuts?|halts?|expands?|opens?|closes?|joins?|simulates?|reports? (?:earnings|revenue|results)|recalls?|files? for|in talks to|names? .{1,50} partners?)\b/i;
const SPECULATION = /\b(?:could|may|might|rumou?red|reportedly|expected|weighs|in talks|plans?)\b/i;
const INSTITUTION = /\b(?:llc|advisors?|management|capital|partners|bank|investments?|wealth|financial group)\b/i;
const HOLDING = /\b(?:shares?|stock|position|holdings|stake|investment)\b/i;

export function relevanceScore<T extends Clusterable>(story: Story<T>, now = Date.now()): number {
  const title = story.lead;
  const age = (now - Date.parse(story.last_seen)) / 3600_000;
  // Invalid or future dates cannot earn a recency boost.
  const recency = Number.isFinite(age) && age >= 0 ? Math.max(0, 4 - age / 6) : 0;
  const coverage = Math.min(3, Math.max(0, story.source_count - 1)) * 1.5;
  let score = recency + coverage;
  if (EVENT.test(title)) score += 5;
  if (SPECULATION.test(title)) score -= 1.5;
  if (OPINION.test(title) || title.includes("?")) score -= 3;
  if (SHOPPING.test(title)) score -= 5;
  if (OWNERSHIP.test(title) || (INSTITUTION.test(title) && HOLDING.test(title))) score -= 14;
  if (/\bstocks? (?:falls?|rises?|jumps?|surges?|dips?)\b/i.test(title)) score -= 3;
  if (title.length < 52) score -= 2;
  // Frequent near-identical notices from a single publisher should not crowd
  // out different events merely because they were indexed in one burst.
  return score;
}

export function rankStories<T extends Clusterable>(stories: Array<Story<T>>, now = Date.now()): Array<Story<T>> {
  return [...stories].sort((a, b) => relevanceScore(b, now) - relevanceScore(a, now)
    || b.last_seen.localeCompare(a.last_seen)
    || a.articles[0]!.id.localeCompare(b.articles[0]!.id));
}

/** A brief should cover distinct developments, even when their headlines differ. */
export function selectBriefStories<T extends Clusterable>(stories: Array<Story<T>>, count = 3, now = Date.now()): Array<Story<T>> {
  const ordered = rankStories(stories, now);
  const selected: Array<Story<T>> = [];
  const frequency = new Map<string, number>();
  for (const story of stories) for (const word of tokens(story.lead)) frequency.set(word, (frequency.get(word) ?? 0) + 1);
  const generic = new Set("million billion trillion invest investment partner announce launch stock market company business growth report support cloud data shares funds finance technology iphone iphones ipad ipads mac macs".split(" "));
  const similar = (a: string, b: string) => {
    const x = tokens(a), y = tokens(b);
    let shared = 0;
    for (const word of x) if (y.has(word)) shared++;
    if (shared >= 3 && shared / (x.size + y.size - shared) >= 0.35) return true;
    // An unusual name shared by two different phrasings can identify the same
    // development even when their overall token overlap is small.
    return [...x].some(word => word.length >= 5 && y.has(word) && !generic.has(word)
      && (frequency.get(word) ?? 0) <= Math.max(2, Math.floor(stories.length * 0.15)));
  };
  for (const story of ordered) {
    if (selected.every(existing => !similar(existing.lead, story.lead))) selected.push(story);
    if (selected.length === count) return selected;
  }
  return selected;
}

/** Short digests prioritize concrete developments; the full feed stays intact. */
export function selectSummaryStories<T extends Clusterable>(stories: Array<Story<T>>, count = 3, now = Date.now()): Array<Story<T>> {
  const developments = stories.filter(story => !/\blooks? back\b/i.test(story.lead) && (EVENT.test(story.lead)
    || /\b(?:upgrades?|downgrades?|rating cut|rating raise|beats? estimates|misses? estimates)\b/i.test(story.lead)));
  return selectBriefStories(developments.length ? developments : stories, count, now);
}
