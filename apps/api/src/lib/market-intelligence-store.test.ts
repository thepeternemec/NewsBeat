import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { db, closeDb } from "@newsbeat/db";
import { INTELLIGENCE_VERSION, MARKET_INTERVAL_MS, type IntelligenceSignal, type MarketSnapshot, type QuantEvaluationRecord, type MarketAnomalyRecord } from "@newsbeat/contracts";
import { quantitativeFixture } from "./quant-fixtures.js";
import { runMarketIntelligence } from "./quant-store.js";
import { readIntelligence } from "./intelligence.js";
import { readOpportunities } from "./opportunities.js";
import { readMarketForecasts } from "./forecast-store.js";
import { FORECAST_HOUR } from "./forecast.js";

const connection = process.env.NEWSBEAT_INTELLIGENCE_TEST_DATABASE_URL;
if (connection) {
  const url = new URL(connection);
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/newsbeat_intelligence_test") throw new Error("Quantitative tests require the dedicated localhost database.");
}
const truncate = "truncate public.newsbeat_market_forecasts,public.newsbeat_market_anomalies,public.newsbeat_quant_alerts,public.newsbeat_quant_evaluations,public.newsbeat_quant_contexts,public.newsbeat_quant_worker,public.newsbeat_market_bars,public.newsbeat_market_sources,public.newsbeat_signal_alerts,public.newsbeat_intelligence_revisions,public.newsbeat_intelligence_events,public.newsbeat_intelligence_jobs,public.news_articles,public.news_ingestion_status restart identity";

test("market discovery persists without news, deduplicates active episodes and scores frozen future observations", { skip: !connection, timeout: 45000 }, async () => {
  process.env.DATABASE_URL = connection!;
  const sql = db(), f = quantitativeFixture(Date.now(), 0.003);
  let clock = f.now, markets = [f.asset, f.benchmark], fetches = 0;
  try {
    await sql.unsafe(readFileSync(new URL("../../../../db/schema.sql", import.meta.url), "utf8"));
    await sql.unsafe(truncate);
    const deps = { now: () => clock, fetchMarkets: async () => { fetches++; return markets.map(snapshot => ({ id: snapshot.instrument.id, snapshot: structuredClone(snapshot) })); } };
    await runMarketIntelligence(deps);
    let response = await readIntelligence(f.profile.beat_id!);
    assert.equal(response.signals.length, 0);
    assert.ok(response.quantitative?.research?.windows.some(w => w.status === "unusual"));
    const initial = await sql.unsafe<Array<{ record: MarketAnomalyRecord }>>("select record from public.newsbeat_market_anomalies order by id");
    assert.ok(initial.length > 0);
    const frozen = initial[0]!.record;
    await runMarketIntelligence(deps);
    const repeated = await sql.unsafe<Array<{ record: MarketAnomalyRecord }>>("select record from public.newsbeat_market_anomalies order by id");
    assert.deepEqual(repeated, initial, "same episode cannot reset the reference or inflate sample counts");
    const previousFetches = fetches;
    await readIntelligence(f.profile.beat_id!);
    assert.equal(fetches, previousFetches, "public reads only load stored research");
    clock = f.end + 25 * 60000;
    markets = markets.map(s => { const copy = structuredClone(s), close = copy.book!.mid * (s.instrument.id === f.profile.id ? 1.01 : 1.005);
      copy.observed_at = new Date(clock).toISOString(); copy.book!.observed_at = copy.observed_at;
      copy.bars.push({ time: f.end + 15 * 60000, open: close, high: close, low: close, close, volume: 10, trades: 2 }); return copy; });
    await runMarketIntelligence(deps);
    const [updated] = await sql.unsafe<Array<{ record: MarketAnomalyRecord }>>("select record from public.newsbeat_market_anomalies where id=$1", [frozen.id]);
    assert.equal(updated!.record.outcomes[0]!.status, "observed");
    assert.deepEqual(updated!.record.window, frozen.window);
    assert.equal(updated!.record.reference_price, frozen.reference_price);
    assert.equal(updated!.record.closed_at, null, "a gap is not evidence that the anomaly cleared");
  } finally { await closeDb(); }
});

test("Postgres persists measured timing, immutable forward snapshots, alert idempotency and revised-premise closure", { skip: !connection, timeout: 45000 }, async () => {
  process.env.DATABASE_URL = connection!;
  const sql = db(), f = quantitativeFixture();
  let clock = f.now, fetches = 0;
  try {
    await sql.unsafe(readFileSync(new URL("../../../../db/schema.sql", import.meta.url), "utf8"));
    await sql.unsafe(truncate);
    const addReport = async (title: string, source: string) => {
      const rows = await sql.unsafe<Array<{ id: string }>>("insert into public.news_articles(beat_id,provider_uri,title,excerpt,url,source,published_at) values($1,$2,$3,'',$4,$2,$5) returning id::text", [f.profile.beat_id!, source, title, "https://example.com/" + source, new Date(f.known - 60000).toISOString()]);
      return rows[0]!.id;
    };
    const saveSignal = async (signal: IntelligenceSignal) => {
      await sql.unsafe("insert into public.newsbeat_intelligence_events(id,beat_id,version,event_changed_at,evidence_updated_at,signal) values($1,$2,$3,$4,$4,$5::jsonb) on conflict(id) do update set version=excluded.version,event_changed_at=excluded.event_changed_at,evidence_updated_at=excluded.evidence_updated_at,signal=excluded.signal", [signal.id, signal.beat_id, signal.version, signal.updated_at, JSON.parse(JSON.stringify(signal))]);
      await sql.unsafe("insert into public.newsbeat_intelligence_revisions(event_id,version,signal) values($1,$2,$3::jsonb) on conflict(event_id,version) do nothing", [signal.id, signal.version, JSON.parse(JSON.stringify(signal))]);
    };
    const firstId = await addReport(f.signal.what_changed, "first");
    f.signal.evidence[0]!.id = firstId; f.signal.implications[0]!.evidence_ids = [firstId]; f.signal.market_assessment!.trigger.report_id = firstId;
    await sql.unsafe("insert into public.news_ingestion_status(beat_id,last_success_at,last_checked_at) values($1,now(),now())", [f.profile.beat_id!]);
    await sql.unsafe("insert into public.newsbeat_intelligence_jobs(beat_id,requested_article_id,processed_article_id,pipeline_version,last_success_at) values($1,$2,$2,$3,$4)", [f.profile.beat_id!, firstId, INTELLIGENCE_VERSION, new Date(f.now).toISOString()]);
    await saveSignal(f.signal);
    let markets = [f.asset, f.benchmark];
    const dependencies = { now: () => clock, fetchMarkets: async () => { fetches++; return markets.map(snapshot => ({ id: snapshot.instrument.id, snapshot: structuredClone(snapshot) })); } };
    const first = await runMarketIntelligence(dependencies);
    assert.equal(first.status, "processed"); assert.equal(first.alerts, 1);
    let response = await readIntelligence(f.profile.beat_id!);
    assert.equal(response.quantitative?.market.instrument?.kind, "tokenized_equity");
    assert.equal(response.constructions[0]!.action, "review_now", JSON.stringify(response.constructions));
    assert.equal(response.constructions[0]!.market_reaction.status, "observed");
    assert.equal(response.alerts.length, 1); const alertId = response.alerts[0]!.id;
    const brief = await readOpportunities({});
    assert.equal(brief.status, "partial");
    assert.equal(brief.review[0]?.alert_id, alertId);
    assert.equal(brief.review[0]?.evidence[0]?.id, firstId);
    assert.equal(brief.review[0]?.review_cost_scenario?.pending, 1);
    assert.equal((await readIntelligence(f.profile.beat_id!, "liquidity")).constructions[0]!.action, "no_alert");
    assert.equal((await readIntelligence(f.profile.beat_id!, "liquidity")).alerts.length, 0);
    const observations = await sql.unsafe<Array<{ record: QuantEvaluationRecord }>>("select record from public.newsbeat_quant_evaluations where context_id='fundamentals' and cohort='all_constructions'");
    const frozen = observations[0]!.record;
    assert.equal(frozen.reference_book_cost_bps, 2);
    assert.ok(frozen.outcomes.every(row => row.status === "pending"));
    const beforeReads = fetches;
    await readIntelligence(f.profile.beat_id!); await readIntelligence(f.profile.beat_id!);
    assert.equal(fetches, beforeReads, "public reads never collect or generate");
    assert.equal((await runMarketIntelligence(dependencies)).alerts, 0);
    assert.equal((await readIntelligence(f.profile.beat_id!)).alerts[0]!.id, alertId);
    const repeatedRecord = await sql.unsafe<Array<{ record: QuantEvaluationRecord }>>("select record from public.newsbeat_quant_evaluations where id=$1", [frozen.id]);
    assert.equal(repeatedRecord[0]!.record.reference_price, frozen.reference_price);
    assert.equal(repeatedRecord[0]!.record.decision_at, frozen.decision_at);

    const duplicateId = await addReport(f.signal.what_changed, "repeated");
    response = await readIntelligence(f.profile.beat_id!);
    assert.equal(response.status, "pending", "new unprocessed rows are detected before the model scheduler updates its watermark");
    assert.notEqual(response.constructions[0]!.action, "review_now");
    assert.equal((await readOpportunities({})).review.length, 0);
    assert.equal((await runMarketIntelligence(dependencies)).alerts, 0);
    await sql.unsafe("update public.newsbeat_intelligence_jobs set processed_article_id=$2,requested_article_id=$2 where beat_id=$1", [f.profile.beat_id!, duplicateId]);

    const denialId = await addReport("Nvidia denies a revenue guidance increase", "denial");
    const denied = structuredClone(f.signal); denied.version = 2; denied.change_kind = "update"; denied.event_state = "denied";
    denied.evidence.push({ ...denied.evidence[0]!, id: denialId, title: "Nvidia denies a revenue guidance increase" });
    denied.what_changed = "Nvidia denies a revenue guidance increase"; denied.market_assessment!.trigger = { condition: "A guidance increase is reported.", status: "contradicted", report_id: denialId, headline_quote: denied.what_changed };
    await saveSignal(denied);
    await sql.unsafe("update public.newsbeat_intelligence_jobs set processed_article_id=$2,requested_article_id=$2 where beat_id=$1", [f.profile.beat_id!, denialId]);
    await runMarketIntelligence(dependencies);
    response = await readIntelligence(f.profile.beat_id!);
    assert.equal(response.constructions[0]!.action, "reassess"); assert.ok(response.alerts[0]!.resolved_at);

    const renewedId = await addReport("Nvidia raises revenue guidance after renewed customer orders", "renewed");
    const renewed = structuredClone(f.signal); renewed.version = 3; renewed.change_kind = "update";
    renewed.evidence = [...denied.evidence, { ...f.signal.evidence[0]!, id: renewedId, title: "Nvidia raises revenue guidance after renewed customer orders" }];
    renewed.what_changed = renewed.evidence.at(-1)!.title; renewed.market_assessment!.trigger = { condition: "A guidance increase is reported.", status: "reported", report_id: renewedId, headline_quote: renewed.what_changed };
    await saveSignal(renewed);
    await sql.unsafe("update public.newsbeat_intelligence_jobs set processed_article_id=$2,requested_article_id=$2 where beat_id=$1", [f.profile.beat_id!, renewedId]);
    assert.equal((await runMarketIntelligence(dependencies)).alerts, 1);
    response = await readIntelligence(f.profile.beat_id!);
    assert.equal(response.alerts.length, 2); assert.notEqual(response.alerts[0]!.id, alertId);

    clock = f.end + 25 * 60000;
    markets = markets.map(snapshot => {
      const copy = structuredClone(snapshot), last = snapshot.bars.at(-1)!.close, close = last * (snapshot.instrument.id === f.profile.id ? 1.01 : 1.005);
      copy.observed_at = new Date(clock).toISOString(); copy.book!.observed_at = copy.observed_at;
      copy.bars.push({ time: f.end + 15 * 60000, open: close, high: close, low: close, close, volume: 10, trades: 2 });
      return copy;
    });
    await runMarketIntelligence(dependencies);
    const outcomes = await sql.unsafe<Array<{ record: QuantEvaluationRecord }>>("select record from public.newsbeat_quant_evaluations where id=$1", [frozen.id]);
    assert.equal(outcomes[0]!.record.outcomes[0]!.status, "observed");
    assert.equal(outcomes[0]!.record.outcomes[0]!.market_at, new Date(f.end + 20 * 60000).toISOString());
    assert.ok(Math.abs(outcomes[0]!.record.outcomes[0]!.asset_return! - 0.01) < 1e-9);
    assert.equal(outcomes[0]!.record.outcomes[1]!.status, "pending");
    assert.deepEqual(outcomes[0]!.record.decision, frozen.decision, "outcome updates cannot rewrite the recorded thesis or model");

    const original = await sql.unsafe<Array<{ close_price: number }>>("select close_price from public.newsbeat_market_bars where instrument_id=$1 and started_at=$2", [f.profile.id, new Date(f.asset.bars.at(-1)!.time).toISOString()]);
    markets[0]!.bars[markets[0]!.bars.length - 2]!.close *= 2;
    await runMarketIntelligence(dependencies);
    const retained = await sql.unsafe<Array<{ close_price: number }>>("select close_price from public.newsbeat_market_bars where instrument_id=$1 and started_at=$2", [f.profile.id, new Date(f.asset.bars.at(-1)!.time).toISOString()]);
    assert.equal(retained[0]!.close_price, original[0]!.close_price, "first-observed closed prices remain immutable");
    const failed = await runMarketIntelligence({ now: () => clock, fetchMarkets: async () => [] });
    assert.equal(failed.status, "sources_unavailable"); assert.equal(failed.alerts, 0);
    const preserved = await sql.unsafe<Array<{ snapshot: { observed_at: string }; last_error: string }>>("select snapshot,last_error from public.newsbeat_market_sources where instrument_id=$1", [f.profile.id]);
    assert.equal(preserved[0]!.snapshot.observed_at, new Date(clock).toISOString()); assert.equal(preserved[0]!.last_error, "market_source_missing");
  } finally { await closeDb(); }
});

test("a concurrent market collector cannot bypass the active lease", { skip: !connection, timeout: 15000 }, async () => {
  process.env.DATABASE_URL = connection!;
  const sql = db();
  try {
    await sql.unsafe(readFileSync(new URL("../../../../db/schema.sql", import.meta.url), "utf8"));
    await sql.unsafe(truncate);
    let entered!: () => void, release!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
    const running = runMarketIntelligence({ fetchMarkets: async () => { entered(); await gate; return []; } });
    await started;
    try {
      let called = false;
      const second = await runMarketIntelligence({ fetchMarkets: async () => { called = true; return []; } });
      assert.equal(second.status, "leased"); assert.equal(called, false);
    } finally { release(); await running; }
  } finally { await closeDb(); }
});

test("hourly forecast is issued once and scored from only the exact closed target candle", { skip: !connection, timeout: 45000 }, async () => {
  process.env.DATABASE_URL = connection!;
  const sql = db(), reference = Date.UTC(2026, 10, 13, 13), target = reference + FORECAST_HOUR;
  let clock = reference + 120_000;
  const source = structuredClone(quantitativeFixture().asset);
  source.instrument = { ...source.instrument, id: "kraken:XBTUSD", symbol: "BTC/USD", pair: "XBTUSD", base: "BTC", underlying_ticker: "BTC", kind: "crypto" };
  source.book = null;
  source.error = "market_book_unavailable";
  const count = 260 * 12;
  source.bars = Array.from({ length: count }, (_, index) => {
    const close = 100 + index * 0.002 + 0.3 * Math.sin(index / 5);
    return { time: reference - (count - index) * MARKET_INTERVAL_MS, open: close, close, high: close + 0.05, low: close - 0.05, trades: 10, volume: 20 };
  });
  const deps = { now: () => clock, fetchMarkets: async () => [{ id: source.instrument.id, snapshot: { ...source, observed_at: new Date(clock).toISOString() } }] };
  try {
    await sql.unsafe(readFileSync(new URL("../../../../db/schema.sql", import.meta.url), "utf8"));
    await sql.unsafe(truncate);
    await sql.unsafe("alter table public.newsbeat_market_forecasts drop constraint newsbeat_market_forecasts_version_pkey, add constraint newsbeat_market_forecasts_pkey primary key(instrument_id,reference_at)");
    await runMarketIntelligence(deps);
    const initial = (await readMarketForecasts(clock)).assets[0]!;
    assert.ok(initial.forecast);
    assert.equal(initial.scorecard.issued, 1);
    assert.equal(initial.scorecard.pending, 1);
    const risk = initial.move_risk?.forecast;
    assert.ok(risk);
    assert.equal(initial.move_risk?.scorecard.pending, 1);
    await runMarketIntelligence(deps);
    assert.deepEqual((await readMarketForecasts(clock)).assets[0], initial);

    const last = source.bars.at(-1)!;
    clock = target + 2 * MARKET_INTERVAL_MS;
    source.bars.push({ ...last, time: target, close: last.close * 0.99 });
    await runMarketIntelligence(deps);
    const pending = (await readMarketForecasts(clock)).assets[0]!;
    assert.equal(pending.forecast, null);
    assert.equal(pending.move_risk?.forecast, null);
    assert.equal(pending.move_risk?.scorecard.scored, 0);
    assert.equal(pending.scorecard.scored, 0, "a later candle cannot substitute for the target");
    const close = last.close * 0.98;
    source.bars.splice(-1, 0, { ...last, time: target - MARKET_INTERVAL_MS, open: close, high: close, low: close, close });
    await runMarketIntelligence(deps);
    const settled = (await readMarketForecasts(clock)).assets[0]!;
    assert.equal(settled.scorecard.issued, 1);
    assert.equal(settled.scorecard.pending, 0);
    assert.equal(settled.scorecard.scored, 1);
    assert.equal(settled.scorecard.model_brier, initial.forecast.probability_above ** 2);
    assert.equal(settled.scorecard.baseline_brier, initial.forecast.baseline_probability ** 2);
    assert.equal(settled.move_risk?.scorecard.scored, 1);
    assert.equal(settled.move_risk?.scorecard.model_brier, (1 - risk.probability) ** 2);
    assert.equal(settled.move_risk?.scorecard.baseline_brier, (1 - risk.baseline_probability) ** 2);
    assert.equal(settled.move_risk?.recent[0]?.outcome, "moved");
    assert.equal(settled.move_risk?.recent[0]?.target_price_usd, close);
    assert.equal(settled.recent[0]?.outcome, "at_or_below");
    assert.equal(settled.recent[0]?.target_price_usd, close);
  } finally { await closeDb(); }
});
