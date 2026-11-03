import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { db, closeDb } from "@newsbeat/db";
import type { IntelligenceEventDraft } from "@newsbeat/contracts";
import { runIntelligence, readIntelligence, PILOT_BEATS } from "./intelligence.js";

const connection = process.env.NEWSBEAT_INTELLIGENCE_TEST_DATABASE_URL;
if (connection) {
  const url = new URL(connection);
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/newsbeat_intelligence_test") {
    throw new Error("Intelligence integration tests require the dedicated localhost test database.");
  }
}
test("Postgres pipeline persists event memory, skips unchanged inputs, revises events and retains state on failure", { skip: !connection, timeout: 45000 }, async () => {
  process.env.DATABASE_URL = connection!;
  const sql = db();
  try {
    await sql.unsafe(readFileSync(new URL("../../../../db/schema.sql", import.meta.url), "utf8"));
    await sql`truncate public.newsbeat_intelligence_revisions, public.newsbeat_intelligence_events, public.newsbeat_intelligence_jobs, public.news_articles, public.news_ingestion_status restart identity`;
    const beat = PILOT_BEATS.find(item => item.ticker === "NVDA")!;
    const insert = async (title: string, source: string) => {
      await sql`insert into public.news_articles (beat_id, provider_uri, title, excerpt, url, source, published_at)
        values (${beat.beat_id}, ${source}, ${title}, '', ${"https://example.com/" + source}, ${source}, now())`;
      await sql`insert into public.news_ingestion_status (beat_id, last_success_at, last_checked_at) values (${beat.beat_id}, now(), now())
        on conflict (beat_id) do update set last_success_at=now(), last_checked_at=now()`;
    };
    let calls = 0;
    const generate: Parameters<typeof runIntelligence>[1] = async (evidence, previous) => {
      calls++;
      const denial = evidence.find(item => item.title.includes("denies"));
      const selected = denial ?? evidence[0]!;
      const prior = previous[0];
      const event: IntelligenceEventDraft = {
        existing_event_id: prior?.id ?? null,
        change_kind: prior ? denial ? "update" : "evidence_only" : "new",
        category: "operations", event_state: denial ? "denied" : "planned",
        evidence_ids: [selected.id], affected_entities: ["Nvidia"], attention: "review",
        attention_reason: "Reported access changes could matter to customers.",
        change_reason: denial ? "New reporting denies the earlier plan." : "A reported plan needs investigation.",
        implications: [{ hypothesis: "If access changes, customers could need alternatives.", mechanism: "Restrictions could narrow buyer access.", watch_for: "Official terms.", evidence_ids: [selected.id] }],
        unknowns: ["Whether the reporting is complete."], next_checks: ["Read official terms."],
      };
      return [event];
    };
    await insert("Nvidia plans new supply restrictions", "source-a");
    const firstRun = await runIntelligence(null, generate);
    assert.equal(firstRun.claimed, 1);
    let response = await readIntelligence(beat.beat_id);
    assert.equal(response.status, "ready");
    assert.equal(response.signals.length, 1);
    const id = response.signals[0]!.id;
    assert.equal(response.signals[0]!.version, 1);
    assert.equal(calls, 1);
    assert.equal((await runIntelligence(null, generate)).claimed, 0);
    assert.equal(calls, 1, "reading or checking unchanged input does not generate again");

    await insert("Nvidia plans new supply restrictions", "source-b");
    await runIntelligence(null, generate);
    response = await readIntelligence(beat.beat_id);
    assert.equal(response.signals[0]!.id, id);
    assert.equal(response.signals[0]!.version, 1);
    assert.equal(response.signals[0]!.evidence.length, 2);

    await insert("Nvidia denies planned supply restrictions", "source-c");
    await runIntelligence(null, generate);
    response = await readIntelligence(beat.beat_id);
    assert.equal(response.signals[0]!.id, id);
    assert.equal(response.signals[0]!.version, 2);
    assert.equal(response.signals[0]!.event_state, "denied");
    const revisions = await sql<Array<{ version: number }>>`select version from public.newsbeat_intelligence_revisions where event_id=${id} order by version`;
    assert.deepEqual(revisions.map(item => item.version), [1, 2]);

    await insert("Nvidia announces a new product", "source-d");
    await runIntelligence(null, async () => { throw new Error("model_unavailable"); });
    response = await readIntelligence(beat.beat_id);
    assert.equal(response.status, "unavailable");
    assert.equal(response.analysis.error, "model_unavailable");
    assert.equal(response.signals[0]!.version, 2, "failed generation does not overwrite prior intelligence");
    assert.equal((await runIntelligence(null, generate)).claimed, 0, "failure has a bounded retry delay");

    await sql`update public.newsbeat_intelligence_jobs set next_attempt_at=now() where beat_id=${beat.beat_id}`;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let entered = false;
    const running = runIntelligence(null, async (...args) => { entered = true; await gate; return generate!(...args); });
    const deadline = Date.now() + 5000;
    while (!entered && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(entered, true);
    try {
      assert.equal((await runIntelligence(null, generate)).claimed, 0, "a concurrent worker cannot claim the leased asset");
    } finally { release(); await running; }

    await insert("Nvidia considers another supply policy", "source-e");
    await sql`update public.news_ingestion_status set last_success_at=now()-interval '2 hours' where beat_id=${beat.beat_id}`;
    const before = calls;
    const stale = await runIntelligence(null, generate);
    assert.equal(stale.results[0]!.status, "source_stale");
    assert.equal(calls, before, "stale source coverage never produces a new interpretation");
    const unsupported = PILOT_BEATS.every(item => item.ticker !== "TSLA");
    assert.equal(unsupported, true);
  } finally { await closeDb(); }
});
