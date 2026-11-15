import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { closeDb, db } from "@newsbeat/db";
import { readDiscovery, runDiscovery } from "./discovery.js";

const connection = process.env.NEWSBEAT_INTELLIGENCE_TEST_DATABASE_URL;
if (connection) {
  const url = new URL(connection);
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/newsbeat_intelligence_test") throw new Error("Discovery tests require the dedicated localhost database.");
}

test("scheduled discovery persists first observations, includes non-pilot assets and never journals on a public read", { skip: !connection, timeout: 20000 }, async () => {
  process.env.DATABASE_URL = connection!;
  const sql = db();
  try {
    await sql.unsafe(readFileSync(new URL("../../../../db/schema.sql", import.meta.url), "utf8"));
    await sql.unsafe("truncate public.newsbeat_discovery_observations, public.newsbeat_discovery_scans, public.news_articles, public.news_ingestion_status, public.newsbeat_official_evidence");
    const stamp = new Date(Date.now() - 5 * 60_000).toISOString();
    const original = await readDiscovery({});
    assert.equal(original.status, "warming_up");
    await sql.unsafe(`insert into public.news_articles(beat_id,provider_uri,title,excerpt,url,source,published_at,first_indexed_at) values
      ('b_7d5acdda6186','apple1','Apple Blossom Festival raises $1 million for local schools','','https://example.com/festival','Other',$1,$1),
      ('b_ea0efdf6c421','sol1','Solana activates new mainnet upgrade','','https://example.com/sol','Publisher',$1,$1),
      ('b_bb964843350e','nvda1','Nvidia cuts full-year revenue outlook','','https://example.com/nvda','Publisher',$1,$1)`, [stamp]);
    await sql.unsafe("insert into public.news_ingestion_status(beat_id,last_success_at,last_checked_at) values('b_7d5acdda6186',$1,$1)", [stamp]);
    assert.equal((await readDiscovery({})).events.length, 0);
    const first = await runDiscovery();
    assert.equal(first.inserted, 2);
    const journal = await readDiscovery({});
    assert.equal(journal.status, "partial");
    assert.equal(journal.coverage.fresh_news_feeds, 1);
    assert.deepEqual(new Set(journal.events.flatMap(event => event.assets.map(asset => asset.ticker))), new Set(["SOL", "NVDA"]));
    const firstTimes = journal.events.map(event => [event.id, event.first_recorded_at]).sort();
    assert.equal((await runDiscovery()).inserted, 0);
    assert.deepEqual((await readDiscovery({})).events.map(event => [event.id, event.first_recorded_at]).sort(), firstTimes);
    assert.deepEqual((await readDiscovery({ asset: "crypto" })).events.map(event => event.assets[0]?.ticker), ["SOL"]);
  } finally { await closeDb(); }
});
