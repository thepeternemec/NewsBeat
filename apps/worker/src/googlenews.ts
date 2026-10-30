/**
 * Google News ingestion.
 *
 * Free and key-less: the RSS search endpoint the Python `gnews` package
 * wraps. No tokens, no quota, and `when:1d` gives the same last-day window the
 * paid provider was configured for.
 *
 * Two things it does not give you, both visible in the output:
 *
 *  - **No excerpt.** The RSS `<description>` is a link, not prose, so items
 *    carry a headline and nothing else. That is a real downgrade from the
 *    paid provider and the reason `excerpt` may be empty.
 *  - **A Google URL.** The `<link>` is a news.google.com redirect that resolves
 *    to the publisher, sometimes through a consent interstitial. We try to
 *    recover the publisher's own URL from the article id, and fall back to the
 *    redirect when we cannot. `source` is always the publisher.
 */
import type { ProviderArticle } from "./newsapi.js";
import { scoreHeadline } from "./sentiment.js";

const ENDPOINT = "https://news.google.com/rss/search";
const USER_AGENT = "Mozilla/5.0 (compatible; Black Sheep/0.1; +https://blacksheep.vercel.app)";

/** Google's article ids are base64 of a protobuf that usually contains the URL. */
function publisherUrlFromId(id: string): string | null {
  try {
    const padded = id.replace(/-/g, "+").replace(/_/g, "/");
    const raw = Buffer.from(padded, "base64").toString("binary");
    // The URL is stored as a length-prefixed ASCII string inside the blob.
    const match = raw.match(/https?:\/\/[^\s"\\\x00-\x1f]{12,500}/);
    if (!match) return null;
    const url = match[0].replace(/[^\x20-\x7e]/g, "");
    const parsed = new URL(url);
    // news.google.com links are the redirect we are trying to avoid.
    if (parsed.hostname.endsWith("google.com")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

const decode = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m?.[1] ? decode(m[1]) : "";
}

/**
 * Google appends " - Publisher" to every headline.
 *
 * The separator is not always spaced. One topic stored the same row 599 times with
 * the title "| Benalla Ensign": the separator had no space before it, so none of the
 * spaced suffixes matched and what remained was the publisher's name dressed as a
 * headline. It was re-fetched every fifteen minutes for a week because Google mints
 * a new URL for the same item each cycle — which is why URL-level dedupe never saw it.
 */
function stripPublisherSuffix(title: string, publisher: string): string {
  const suffixes = [
    ` - ${publisher}`, ` – ${publisher}`, ` | ${publisher}`, ` — ${publisher}`,
    `-${publisher}`, `|${publisher}`, `–${publisher}`,
  ];
  let out = title.trim();
  for (const suffix of suffixes) {
    if (out.toLowerCase().endsWith(suffix.toLowerCase())) {
      out = out.slice(0, -suffix.length).trim();
      break;
    }
  }
  // Separators left dangling by a partial strip.
  return out.replace(/^[\s|–—-]+/, "").replace(/[\s|–—-]+$/, "").trim();
}

/**
 * A headline with no words is not a headline.
 *
 * True for the residue that survives a strip: empty, punctuation only, or the
 * publisher's own name. Storing those produces rows that render as a blank line and
 * cluster with each other, which is what "duplicates in the feed" looked like.
 */
export function isDegenerateTitle(title: string, publisher = ""): boolean {
  const trimmed = title.trim();
  if (!/[A-Za-z]{2}/.test(trimmed)) return true;
  if (trimmed.length < 12) return true;
  if (publisher) {
    // Compared with punctuation removed, so "| Benalla Ensign" is recognised as the
    // publisher's name and not as a headline that happens to contain a pipe.
    const bare = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (bare(trimmed) === bare(publisher)) return true;
    // A headline that is the publisher's name plus nothing else is also residue.
    if (bare(publisher).length > 4 && bare(trimmed) === bare(publisher)) return true;
  }
  return false;
}

export interface GoogleNewsOptions {
  /** Google's relative window operator, e.g. `1d`, `7d`. */
  when?: string;
  hl?: string;
  gl?: string;
  ceid?: string;
}

/**
 * One query, one topic. Google has no OR-batching across topics, so a catalog
 * of N costs N requests — but they are free, which is the whole point.
 */
export async function searchGoogleNews(
  keywords: string[],
  options: GoogleNewsOptions = {},
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderArticle[]> {
  const when = options.when ?? "1d";
  // Quoted so a multi-word name is matched as a phrase.
  const query = `${keywords.map((k) => `"${k}"`).join(" OR ")} when:${when}`;
  const url = `${ENDPOINT}?q=${encodeURIComponent(query)}&hl=${options.hl ?? "en-US"}&gl=${options.gl ?? "US"}&ceid=${options.ceid ?? "US:en"}`;

  // Google rate-limits (429) under load, and a 5xx is usually transient. Retry
  // rather than dropping a topic for the whole cycle — a silently skipped topic
  // looks identical to a topic with no news.
  const attempts = 3;
  let response: Response | undefined;
  let lastError = "";
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
    try {
      const res = await fetchImpl(url, {
        headers: { "user-agent": USER_AGENT, accept: "application/rss+xml, application/xml" },
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        response = res;
        break;
      }
      lastError = `HTTP ${res.status}`;
      if (res.status !== 429 && res.status < 500) break;
    } catch (error) {
      lastError = (error as Error).message;
    }
  }
  if (!response) throw new Error(`google news failed: ${lastError}`);
  const xml = await response.text();

  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].flatMap((match) => {
    const block = match[1] ?? "";
    const publisher = tag(block, "source") || tag(block, "author") || "";
    const sourceMatch = block.match(/<source[^>]*url="([^"]*)"/);
    const link = tag(block, "link");
    const guid = tag(block, "guid");
    const rawTitle = tag(block, "title");
    const published = tag(block, "pubDate");
    if (!link || !rawTitle) return [];

    const id = guid || link.split("/").pop() || "";
    const url = publisherUrlFromId(id) ?? link;
    const date = new Date(published);

    // A headline that is only the publisher's name is not a headline.
    const headline = stripPublisherSuffix(rawTitle, publisher);
    if (isDegenerateTitle(headline, publisher)) return [];

    return [
      {
        uri: id,
        url,
        title: headline,
        /* Google returns no sentiment; the paid provider does. The schema has
           the field, so leaving it undefined made Google-sourced rows a special
           case for every consumer. */
        sentiment: scoreHeadline(headline).sentiment,
        // The feed carries no prose, only a link. Better an empty excerpt than
        // a duplicated headline pretending to be one.
        body: "",
        dateTime: Number.isFinite(date.getTime()) ? date.toISOString() : "",
        lang: "eng",
        source: { title: publisher, uri: sourceMatch?.[1] ?? "" },
      } as ProviderArticle,
    ];
  });
}
