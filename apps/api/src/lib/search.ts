import { createHash } from "node:crypto";
import { db, consumeRateLimit } from "@newsgraph/db";
import { searchGoogleNews } from "newsgraph-worker/dist/googlenews.js";
import { normalizeArticles } from "newsgraph-worker/dist/ingest-news.js";
import { NewsError, signCursor, readCursor, freshness } from "./news.js";
export interface SearchInput {
  query: string;
  language: string;
  country: string;
  since?: string;
  until?: string;
  source?: string;
  limit: number;
  cursor?: string;
  before?: string;
}
export const storyId = (url: string) =>
  createHash("sha256").update(url).digest("hex");
export function queryId(a: SearchInput) {
  return storyId(
    JSON.stringify([
      a.query.trim().toLowerCase(),
      a.language,
      a.country,
      a.since ?? "",
      a.until ?? "",
      a.source?.toLowerCase() ?? "",
    ]),
  );
}
const iso = (v: any) => (v instanceof Date ? v.toISOString() : String(v));
export async function searchNews(
  a: SearchInput,
  deps = { database: db, provider: searchGoogleNews },
) {
  const sql = deps.database(),
    qid = queryId(a),
    history = !!a.before;
  const sequence =
    a.cursor || a.before
      ? await readCursor(
          (a.cursor ?? a.before)!,
          qid,
          history ? "history" : "changes",
        )
      : null;
  await sql`insert into news_queries(id) values (${qid}) on conflict do nothing`;
  let [state] =
    await sql`select last_success_at from news_queries where id=${qid}`;
  let providerError = false;
  if (
    !state?.last_success_at ||
    Date.now() - new Date(state.last_success_at).getTime() > 15 * 60000
  ) {
    const claim =
      await sql`update news_queries set last_attempt_at=now() where id=${qid} and (last_attempt_at is null or last_attempt_at < now()-interval '1 minute') returning id`;
    if (claim.length) {
      try {
        const budget = await consumeRateLimit(
          sql,
          "provider:general-search",
          120,
        );
        if (!budget.allowed) throw new Error("Search provider budget reached");
        const articles = await deps.provider([], {
          queryText: a.query,
          when: "30d",
          hl: `${a.language}-${a.country}`,
          gl: a.country,
          ceid: `${a.country}:${a.language}`,
        });
        const rows = normalizeArticles(articles).filter(
          (r) =>
            (!a.since || Date.parse(r.published_at) >= Date.parse(a.since)) &&
            (!a.until || Date.parse(r.published_at) <= Date.parse(a.until)) &&
            (!a.source ||
              r.source.toLowerCase().includes(a.source.toLowerCase())),
        );
        await sql.begin(async (tx) => {
          for (const row of rows) {
            const id = storyId(row.url);
            await tx`insert into news_documents(id,title,url,source,published_at) values (${id},${row.title},${row.url},${row.source},${row.published_at}) on conflict(id) do update set title=excluded.title,updated_at=now()`;
            await tx`insert into news_query_items(query_id,document_id) values (${qid},${id}) on conflict do nothing`;
          }
          await tx`update news_queries set last_success_at=now() where id=${qid}`;
        });
      } catch {
        providerError = true;
      }
    }
    [state] =
      await sql`select last_success_at from news_queries where id=${qid}`;
  }
  if (!state?.last_success_at)
    throw new NewsError(
      "search_unavailable",
      "Search is refreshing or the provider is unavailable. Retry after one minute.",
      503,
    );
  const ascending = !!a.cursor;
  const boundary = sequence
    ? history
      ? sql`and i.id < ${sequence}::bigint`
      : sql`and i.id > ${sequence}::bigint`
    : sql``;
  const rows =
    await sql`select i.id::text as sequence,d.* from news_query_items i join news_documents d on d.id=i.document_id where i.query_id=${qid} and d.published_at>=now()-interval '30 days' ${boundary} order by i.id ${ascending ? sql`asc` : sql`desc`} limit ${a.limit + 1}`;
  const selected = rows.slice(0, a.limit);
  const items = selected.map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    source: r.source,
    published_at: iso(r.published_at),
    first_indexed_at: iso(r.first_indexed_at),
    updated_at: iso(r.updated_at),
  }));
  const end = ascending
    ? (selected.at(-1)?.sequence ?? sequence ?? "0")
    : (rows[0]?.sequence ?? "0");
  return {
    items,
    query: a.query,
    cursor: await signCursor(qid, end),
    history_cursor: await signCursor(
      qid,
      selected.at(-1)?.sequence ?? sequence ?? "0",
      "history",
    ),
    has_more: rows.length > a.limit,
    freshness: providerError
      ? { status: "stale", last_success_at: iso(state.last_success_at) }
      : freshness(iso(state.last_success_at), 30),
    estimated_tokens: Math.ceil(JSON.stringify(items).length / 3),
    coverage: {
      provider: "Google News RSS",
      requested_language: a.language,
      requested_country: a.country,
      window_days: 30,
      complete: false,
      note: "Provider-limited headline search; filters apply to retrieved results. Empty results do not establish that no event occurred.",
    },
  };
}
export async function getStory(id: string, sql = db()) {
  const [row] =
    await sql`select * from news_documents where id=${id} and published_at>=now()-interval '35 days'`;
  if (!row)
    throw new NewsError(
      "story_not_found",
      "This story ID is unknown or outside retention. Search again.",
      404,
    );
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    source: row.source,
    published_at: iso(row.published_at),
    first_indexed_at: iso(row.first_indexed_at),
    updated_at: iso(row.updated_at),
    citations: [{ url: row.url, source: row.source }],
    content_type: "headline_metadata",
  };
}
