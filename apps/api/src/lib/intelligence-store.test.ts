import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { db, closeDb } from "@newsbeat/db";
import { INTELLIGENCE_VERSION, type IntelligenceEventDraft } from "@newsbeat/contracts";
import { runIntelligence, readIntelligence, PILOT_BEATS } from "./intelligence.js";
import { validateIntelligence } from "./intelligence-core.js";

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
    await sql`truncate public.newsbeat_signal_alerts, public.newsbeat_intelligence_revisions, public.newsbeat_intelligence_events, public.newsbeat_intelligence_jobs, public.news_articles, public.news_ingestion_status restart identity`;
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
      const prior = previous[0];
      const denial = evidence.find(item => item.title.includes("denies"));
      const selected = denial ?? evidence.find(item => !prior?.evidence.some(old => old.id === item.id)) ?? evidence[0]!;
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
    const repeated = await runIntelligence(null, generate);
    assert.equal(repeated.results[0]?.status, "processed");
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

test("Postgres requires quantitative confirmation while preserving context revisions and upgrades", { skip: !connection, timeout: 45000 }, async () => {
  process.env.DATABASE_URL = connection!;
  const sql = db();
  try {
    await sql.unsafe(readFileSync(new URL("../../../../db/schema.sql", import.meta.url), "utf8"));
    await sql`truncate public.newsbeat_signal_alerts, public.newsbeat_intelligence_revisions, public.newsbeat_intelligence_events, public.newsbeat_intelligence_jobs, public.news_articles, public.news_ingestion_status restart identity`;
    const beat = PILOT_BEATS.find(item => item.ticker === "NVDA")!;
    const insert = async (title: string, source: string) => {
      await sql`insert into public.news_articles (beat_id, provider_uri, title, excerpt, url, source, published_at)
        values (${beat.beat_id}, ${source}, ${title}, '', ${"https://example.com/" + source}, ${source}, now())`;
      await sql`insert into public.news_ingestion_status (beat_id, last_success_at, last_checked_at) values (${beat.beat_id}, now(), now())
        on conflict (beat_id) do update set last_success_at=now(), last_checked_at=now()`;
    };
    let mode: "new" | "repeat" | "denial" | "revision" = "new";
    let calls = 0;
    const generate: Parameters<typeof runIntelligence>[1] = async (evidence, previous) => {
      calls++;
      const prior = previous[0];
      const report = evidence.find(item => !prior?.evidence.some(old => old.id === item.id)) ?? evidence.find(item => item.title === prior?.what_changed) ?? evidence[0]!;
      const denied = mode === "denial";
      const draft: IntelligenceEventDraft = {
        existing_event_id: prior?.id ?? null, change_kind: prior ? mode === "repeat" ? "evidence_only" : "update" : "new",
        category: "guidance", event_state: denied ? "denied" : "reported", evidence_ids: [report.id], affected_entities: ["Nvidia"], attention: "priority",
        attention_reason: "A guidance revision could affect revenue expectations.", change_reason: denied ? "A denial changes the premise." : "A reported guidance change needs review.",
        implications: [{ hypothesis: "Guidance could alter revenue expectations.", mechanism: "Orders may translate into revenue.", watch_for: "Official guidance.", evidence_ids: [report.id] }],
        unknowns: ["The commercial terms."], next_checks: ["Read official guidance."],
        market_assessment: { channel: "revenue", direction: "supportive", materiality: "high", horizon: "days", market_relevance: "Guidance could alter revenue expectations.", why_it_may_not_move: "The revision may be offset by costs.", invalidation: "Withdrawal would weaken the premise.",
          trigger: { condition: "Nvidia reports a guidance increase.", status: denied ? "contradicted" : "reported", report_id: report.id, headline_quote: report.title } },
      };
      assert.ok(validateIntelligence({ events: [draft] }, evidence, previous));
      return [draft];
    };
    await insert("Nvidia raises revenue guidance after new orders", "guidance-a");
    assert.equal((await runIntelligence(null, generate)).results[0]!.status, "processed");
    let response = await readIntelligence(beat.beat_id, "fundamentals");
    assert.equal(response.analysis.pipeline_version, INTELLIGENCE_VERSION);
    assert.equal(response.constructions[0]!.action, "keep_watching"); assert.equal(response.alerts.length, 0);
    assert.equal((await readIntelligence(beat.beat_id, "liquidity")).constructions[0]!.action, "no_alert");
    assert.equal((await readIntelligence(beat.beat_id, "liquidity")).alerts.length, 0);
    await readIntelligence(beat.beat_id);
    assert.equal((await runIntelligence(null, generate)).claimed, 0);
    assert.equal((await readIntelligence(beat.beat_id)).alerts.length, 0);
    mode = "repeat";
    await insert("Nvidia raises revenue guidance after new orders", "guidance-b");
    await runIntelligence(null, generate);
    response = await readIntelligence(beat.beat_id);
    assert.equal(response.signals[0]!.version, 1); assert.equal(response.constructions[0]!.action, "keep_watching");
    assert.equal(response.alerts.length, 0);
    mode = "denial";
    await insert("Nvidia denies a revenue guidance increase", "guidance-c");
    const deniedRun = await runIntelligence(null, generate);
    assert.equal(deniedRun.results[0]?.status, "processed", JSON.stringify(deniedRun));
    response = await readIntelligence(beat.beat_id);
    assert.equal(response.signals[0]!.version, 2, "denial revises the premise"); assert.equal(response.constructions[0]!.action, "reassess");
    assert.equal(response.alerts.length, 0);
    mode = "revision";
    await insert("Nvidia raises revenue guidance following renewed customer orders", "guidance-d");
    const revisionRun = await runIntelligence(null, generate);
    assert.equal(revisionRun.results[0]?.status, "processed", JSON.stringify(revisionRun));
    response = await readIntelligence(beat.beat_id);
    assert.equal(response.signals[0]!.version, 3, "new guidance revises the denial"); assert.equal(response.alerts.length, 0, "qualitative revisions alone cannot create a timing alert");
    mode = "repeat";
    const before = calls;
    await sql`update public.newsbeat_intelligence_jobs set pipeline_version='old-version', input_hash='old-fingerprint' where beat_id=${beat.beat_id}`;
    assert.equal((await readIntelligence(beat.beat_id)).status, "pending");
    assert.equal((await runIntelligence(null, generate)).claimed, 1);
    assert.equal(calls, before + 1);
    assert.equal((await readIntelligence(beat.beat_id)).analysis.pipeline_version, INTELLIGENCE_VERSION);
    assert.equal((await readIntelligence(beat.beat_id)).alerts.length, 0);
    assert.equal((await runIntelligence(null, generate)).claimed, 0);
  } finally { await closeDb(); }
});

test("Postgres retries a revised generator once despite old backoff and gives all pilot assets a turn", { skip: !connection, timeout: 45000 }, async () => {
  process.env.DATABASE_URL = connection!;
  const sql = db();
  try {
    await sql.unsafe(readFileSync(new URL("../../../../db/schema.sql", import.meta.url), "utf8"));
    await runIntelligence(null, async () => []);
    await sql`truncate public.newsbeat_signal_alerts, public.newsbeat_intelligence_revisions, public.newsbeat_intelligence_events, public.newsbeat_intelligence_jobs, public.news_articles, public.news_ingestion_status restart identity`;
    const ordered = [...PILOT_BEATS.filter(beat => beat.ticker !== "NVDA"), PILOT_BEATS.find(beat => beat.ticker === "NVDA")!];
    for (const [index, beat] of ordered.entries()) {
      await sql`insert into public.news_articles(beat_id,provider_uri,title,excerpt,url,source,published_at)
        values(${beat.beat_id},${"fair-" + beat.ticker},${beat.label + " reports an update"},'','https://example.com/report','Publisher',now())`;
      await sql`insert into public.news_ingestion_status(beat_id,last_success_at,last_checked_at) values(${beat.beat_id},now(),now())`;
      await sql`insert into public.newsbeat_intelligence_jobs(beat_id,pipeline_version,last_attempt_version,last_attempt_at,next_attempt_at,last_error)
        values(${beat.beat_id},${INTELLIGENCE_VERSION},'previous-generator',${new Date(Date.now() - (ordered.length - index) * 60_000).toISOString()},now()+interval '1 hour','invalid_analysis_schema_events__evidence_ids_too_big')`;
    }
    const seen: string[] = [];
    const generate: Parameters<typeof runIntelligence>[1] = async (_reports, _prior, asset) => { seen.push(asset.ticker); return []; };
    for (let run = 0; run < 3; run++) {
      const before = seen.length;
      assert.equal((await runIntelligence(null, generate)).claimed, 2);
      assert.deepEqual(new Set(seen.slice(before)), new Set(ordered.slice(run * 2, run * 2 + 2).map(beat => beat.ticker)));
    }
    assert.equal(new Set(seen).size, 6);
    assert.equal((await runIntelligence(null, generate)).claimed, 0);
    for (const beat of ordered) assert.equal((await readIntelligence(beat.beat_id)).analysis.error, null);
  } finally { await closeDb(); }
});
