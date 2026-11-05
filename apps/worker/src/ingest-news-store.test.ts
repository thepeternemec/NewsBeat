import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { db, closeDb } from "@newsbeat/db";
import { persistNews } from "./ingest-news.js";

const connection = process.env.NEWSBEAT_INTELLIGENCE_TEST_DATABASE_URL;
if (connection) {
  const url = new URL(connection);
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/newsbeat_intelligence_test") throw new Error("Ingestion regression requires the dedicated localhost test database.");
}
test("a long emoji headline persists with its batch and advances real collection freshness", { skip: !connection, timeout: 15000 }, async () => {
  process.env.DATABASE_URL = connection!;
  const sql = db(), beat = "ingestion_unicode_regression";
  const article = { uri: "unicode-article", title: "x".repeat(239) + "📷 details", body: "x".repeat(319) + "📷 details", lang: "eng", url: "https://example.com/unicode-regression", dateTime: new Date().toISOString(), source: { title: "x".repeat(119) + "📷 details" } };
  try {
    await sql.unsafe(readFileSync(new URL("../../../db/schema.sql", import.meta.url), "utf8"));
    const legacy = [{ provider_uri: article.uri, title: article.title.slice(0, 240), excerpt: "", url: article.url, source: "Publisher", published_at: article.dateTime }];
    await assert.rejects(sql`select public.append_news_articles(${beat}, ${sql.json(legacy)})`, error => (error as { code?: string }).code === "22P02");
    const result = await persistNews(beat, [article, { ...article, uri: "second", title: "A second valid company headline", url: "https://example.com/second-regression" }]);
    assert.equal(result.inserted, 2, "one long headline must not discard valid reports in the same batch");
    const rows = await sql<Array<{ title: string; excerpt: string; source: string }>>`select title,excerpt,source from public.news_articles where beat_id=${beat} and provider_uri=${article.uri}`;
    assert.equal(rows.length, 1);
    for (const field of ["title", "excerpt", "source"] as const) assert.ok(rows[0]![field].endsWith("📷"));
    const status = await sql<Array<{ last_success_at: Date | null; last_checked_at: Date | null; last_article_count: number }>>`select last_success_at,last_checked_at,last_article_count from public.news_ingestion_status where beat_id=${beat}`;
    assert.ok(status[0]!.last_success_at); assert.equal(status[0]!.last_article_count, 2);
    assert.equal(status[0]!.last_success_at!.getTime(), status[0]!.last_checked_at!.getTime());
  } finally {
    await sql`delete from public.news_articles where beat_id=${beat}`;
    await sql`delete from public.news_ingestion_status where beat_id=${beat}`;
    await closeDb();
  }
});
