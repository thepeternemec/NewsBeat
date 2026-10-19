#!/usr/bin/env node
/**
 * Remove duplicate articles that are already stored.
 *
 *   DATABASE_URL="postgres://…" npm run db:dedupe            # report only
 *   DATABASE_URL="postgres://…" npm run db:dedupe -- --apply  # delete them
 *
 * Ingestion now refuses a headline it already holds for a topic from the same
 * publisher, but everything stored before that check existed is still there — 57,067
 * redundant rows, 8.6% of the table, and the reason the feed looked duplicated.
 *
 * Keeps the earliest row of each group: it is the one whose `first_indexed_at` is
 * closest to the event, and the one a cursor has probably already passed.
 *
 * Deliberately dry by default. This deletes rows, and a count is what you want to
 * see before you mean it.
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
const apply = process.argv.includes("--apply");
if (!url) {
  console.error("missing DATABASE_URL");
  process.exit(2);
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

try {
  const [before] = await sql`select count(*)::int n from public.news_articles`;

  const [groups] = await sql`
    with g as (
      select beat_id, lower(trim(title)) t, lower(trim(source)) s
      from public.news_articles
      group by 1, 2, 3 having count(*) > 1
    )
    select count(*)::int n, coalesce(sum(c - 1), 0)::int redundant from (
      select beat_id, lower(trim(title)) t, lower(trim(source)) s, count(*) c
      from public.news_articles group by 1, 2, 3 having count(*) > 1
    ) g`;

  console.log(`  rows          : ${before.n.toLocaleString()}`);
  console.log(`  duplicate sets: ${groups.n.toLocaleString()}`);
  console.log(`  redundant rows: ${groups.redundant.toLocaleString()} (${((100 * groups.redundant) / before.n).toFixed(1)}%)`);

  if (!apply) {
    console.log("\n  dry run — pass --apply to delete them\n");
    process.exit(0);
  }

  // Keep the lowest id in each group; delete the rest.
  const deleted = await sql`
    delete from public.news_articles a
    using public.news_articles b
    where a.beat_id = b.beat_id
      and lower(trim(a.title)) = lower(trim(b.title))
      and lower(trim(a.source)) = lower(trim(b.source))
      and a.id > b.id
    returning 1`;

  const [after] = await sql`select count(*)::int n from public.news_articles`;
  console.log(`\n  removed ${deleted.length.toLocaleString()}; ${after.n.toLocaleString()} remain\n`);
} catch (error) {
  console.error("dedupe failed:", error.message);
  process.exit(1);
} finally {
  await sql.end({ timeout: 2 });
}
