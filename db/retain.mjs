#!/usr/bin/env node
/**
 * Delete articles older than the retention window.
 *
 *   DATABASE_URL="postgres://…" npm run db:retain
 *
 * The API serves a 30-day window (`published_at >= now() - 30 days`), so anything
 * older is unreachable — but nothing deleted it, and the table reached 1.27 GB at
 * roughly 24,000 rows a day. The default window is 35 days, deliberately a few
 * days past the API's own cut-off so a retention run can never remove a row that
 * a request in flight could still reach.
 *
 * Destructive by design and therefore separate from ingestion: fetching news and
 * forgetting news are different jobs, and this one should be easy to see and easy
 * to disable.
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("missing DATABASE_URL");
  process.exit(2);
}

const days = Math.max(31, Number(process.env.NEWSGRAPH_RETENTION_DAYS ?? 35));
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

try {
  const [before] = await sql`select count(*)::int n from public.news_articles`;
  const removed = await sql`
    delete from public.news_articles
    where published_at < now() - (${days} || ' days')::interval
    returning 1`;
  const [after] = await sql`select count(*)::int n from public.news_articles`;
  const [size] = await sql`select pg_size_pretty(pg_total_relation_size('public.news_articles')) s`;

  console.log(`  retention ${days} days — removed ${removed.length}, ${before.n} -> ${after.n} rows, table ${size.s}`);
  if (removed.length > 0) {
    // Reclaim the space the rows occupied; without this the file grows anyway.
    await sql`vacuum (analyze) public.news_articles`;
    console.log("  vacuumed");
  }
} catch (error) {
  console.error("retention failed:", error.message);
  process.exit(1);
} finally {
  await sql.end({ timeout: 2 });
}
