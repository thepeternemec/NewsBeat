import { randomUUID } from "node:crypto";
import { db, hasDatabaseEnv, type Sql } from "@newsbeat/db";
import {
  INTELLIGENCE_VERSION, QUANT_POLICY_VERSION, SIGNAL_CONTEXTS, SEED_BEATS, type IntelligenceSignal, type IntelligenceResponse,
  type MarketSnapshot, type MarketBar, type QuantBundle, type QuantEvaluationRecord, type SignalAlert,
} from "@newsbeat/contracts";
import { constructSignal } from "./signal-construction.js";
import { freshness } from "./news.js";
import { MARKET_PROFILES, fetchMarketSnapshots, type MarketRefresh, type MarketProfile } from "./quant-market.js";
import { buildMarketContext } from "./quant-engine.js";
import { applyTiming, beginEvaluation, decideTiming, updateOutcomes } from "./quant-decision.js";
import { QUANT_SCHEMA } from "./quant-schema.js";

const decode = <T>(value: unknown): T => (typeof value === "string" ? JSON.parse(value) : value) as T;
// postgres.js serializes inferred jsonb parameters; pass JSON values, never an encoded string.
const json = (value: unknown) => JSON.parse(JSON.stringify(value));
const iso = (value: unknown): string | null => value instanceof Date ? value.toISOString() : typeof value === "string" ? value : null;
function nextDue(record: QuantEvaluationRecord) {
  const pending = record.outcomes.filter(outcome => outcome.status === "pending").map(outcome => outcome.due_at).sort();
  return pending[0] ?? null;
}
async function loadSnapshots(sql: Sql, now: number): Promise<Map<string, MarketSnapshot>> {
  const sources = await sql.unsafe<Array<{ instrument_id: string; snapshot: unknown; last_error: string | null }>>("select instrument_id,snapshot,last_error from public.newsbeat_market_sources");
  const bars = await sql.unsafe<Array<{ instrument_id: string; started_at: unknown; open_price: number; high_price: number; low_price: number; close_price: number; volume: number; trades: number }>>(
    "select instrument_id,started_at,open_price,high_price,low_price,close_price,volume,trades from public.newsbeat_market_bars where started_at >= to_timestamp($1) order by instrument_id,started_at",
    [(now - 72 * 3600000) / 1000]);
  const grouped = new Map<string, MarketBar[]>();
  for (const row of bars) {
    const list = grouped.get(row.instrument_id) ?? [];
    list.push({ time: Date.parse(iso(row.started_at)!), open: row.open_price, high: row.high_price, low: row.low_price, close: row.close_price, volume: row.volume, trades: row.trades });
    grouped.set(row.instrument_id, list);
  }
  return new Map(sources.filter(row => row.snapshot).map(row => {
    const snapshot = decode<MarketSnapshot>(row.snapshot);
    return [row.instrument_id, { ...snapshot, bars: grouped.get(row.instrument_id) ?? [], error: row.last_error ?? snapshot.error }];
  }));
}
export async function readQuantBundle(beatId: string, contextId: string): Promise<{ bundle?: QuantBundle; alerts: SignalAlert[] }> {
  if (!hasDatabaseEnv()) return { alerts: [] };
  try {
    const sql = db();
    const [rows, alerts] = await Promise.all([
      sql.unsafe<Array<{ bundle: unknown }>>("select bundle from public.newsbeat_quant_contexts where beat_id=$1 and context_id=$2 and policy_version=$3", [beatId, contextId, QUANT_POLICY_VERSION]),
      sql.unsafe<Array<{ id: string; beat_id: string; source_signal_id: string; signal_version: number; context_id: SignalAlert["context_id"]; triggered_at: unknown; resolved_at: unknown; resolution: string | null; construction: unknown }>>(
        "select id,beat_id,event_id as source_signal_id,signal_version,context_id,triggered_at,resolved_at,resolution,construction from public.newsbeat_quant_alerts where beat_id=$1 and context_id=$2 and policy_version=$3 order by triggered_at desc limit 20", [beatId, contextId, QUANT_POLICY_VERSION]),
    ]);
    const bundle = rows[0] ? decode<QuantBundle>(rows[0].bundle) : undefined;
    if (bundle && Date.now() - Date.parse(bundle.computed_at) > 10 * 60000) bundle.market.status = "stale";
    return { ...(bundle ? { bundle } : {}), alerts: alerts.map(row => ({ ...row, triggered_at: iso(row.triggered_at)!, resolved_at: iso(row.resolved_at), construction: decode<SignalAlert["construction"]>(row.construction) })) };
  } catch (error) {
    if ((error as { code?: string }).code !== "42P01") console.warn("quantitative read unavailable");
    return { alerts: [] };
  }
}
export async function attachQuantitative(output: IntelligenceResponse): Promise<IntelligenceResponse> {
  const quant = await readQuantBundle(output.beat_id, output.context.id), now = Date.parse(output.generated_at);
  return { ...output, ...(quant.bundle ? { quantitative: quant.bundle } : {}),
    constructions: output.constructions.map(base => applyTiming(base, quant.bundle?.decisions.find(item => item.source_signal_id === base.source_signal_id && item.signal_version === base.version), now)),
    alerts: quant.alerts };
}
type WorkerDependencies = { fetchMarkets?: (now: number) => Promise<MarketRefresh[]>; now?: () => number };
/** Bounded scheduled I/O and deterministic math. No LLM calls, trading credentials or public writes. */
export async function runMarketIntelligence(dependencies: WorkerDependencies = {}) {
  if (!hasDatabaseEnv()) throw new Error("database_not_configured");
  const sql = db(), started = (dependencies.now ?? Date.now)(), token = randomUUID();
  await sql.begin(async tx => {
    await tx.unsafe("select pg_advisory_xact_lock(hashtext('newsbeat_quant_schema'))");
    await tx.unsafe(QUANT_SCHEMA);
  });
  const lease = await sql.unsafe<Array<{ id: string }>>(
    "insert into public.newsbeat_quant_worker(id,lease_token,lease_until,last_started_at) values('market-intelligence',$1,to_timestamp($2)+interval '3 minutes',to_timestamp($2)) on conflict(id) do update set lease_token=excluded.lease_token,lease_until=excluded.lease_until,last_started_at=excluded.last_started_at where newsbeat_quant_worker.lease_until is null or newsbeat_quant_worker.lease_until<to_timestamp($2) returning id", [token, started / 1000]);
  if (!lease.length) return { status: "leased", instruments: 0, constructions: 0, alerts: 0 };
  try {
    const refresh = await (dependencies.fetchMarkets ?? fetchMarketSnapshots)(started);
    const now = (dependencies.now ?? Date.now)(), nowIso = new Date(now).toISOString();
    let sources = 0, decisions = 0, newAlerts = 0;
    await sql.begin(async tx => {
      const owner = await tx.unsafe<Array<{ lease_token: string | null }>>("select lease_token from public.newsbeat_quant_worker where id='market-intelligence' for update");
      if (owner[0]?.lease_token !== token) throw new Error("lease_lost");
      for (const profile of MARKET_PROFILES) {
        const item = refresh.find(item => item.id === profile.id) ?? { id: profile.id, error: "market_source_missing" };
        if (!item.snapshot) {
          await tx.unsafe("insert into public.newsbeat_market_sources(instrument_id,last_attempt_at,last_error) values($1,$2,$3) on conflict(instrument_id) do update set last_attempt_at=excluded.last_attempt_at,last_error=excluded.last_error", [item.id, nowIso, item.error ?? "market_source_unavailable"]);
          continue;
        }
        const snapshot = item.snapshot;
        if (snapshot.instrument.id !== item.id || !Number.isFinite(Date.parse(snapshot.observed_at)) || Date.parse(snapshot.observed_at) > now + 5000) throw new Error("snapshot_invalid");
        const { bars, ...metadata } = snapshot;
        await tx.unsafe(
          "insert into public.newsbeat_market_bars(instrument_id,started_at,open_price,high_price,low_price,close_price,volume,trades,observed_at) select $1,to_timestamp(b.time/1000),b.open,b.high,b.low,b.close,b.volume,b.trades,$3::timestamptz from jsonb_to_recordset($2::jsonb) as b(time double precision,open double precision,high double precision,low double precision,close double precision,volume double precision,trades integer) where b.time+300000 <= extract(epoch from $3::timestamptz)*1000 on conflict(instrument_id,started_at) do nothing",
          [item.id, json(bars), snapshot.observed_at]);
        await tx.unsafe("insert into public.newsbeat_market_sources(instrument_id,snapshot,last_attempt_at,last_error) values($1,$2::jsonb,$3,$4) on conflict(instrument_id) do update set snapshot=excluded.snapshot,last_attempt_at=excluded.last_attempt_at,last_error=excluded.last_error", [item.id, json(metadata), nowIso, snapshot.error]);
        sources++;
      }
    });
    const snapshots = await loadSnapshots(sql, now);
    type SignalRow = { signal: unknown; current_revision: unknown; previous_revision: unknown; last_success_at: unknown; last_error: string | null; pipeline_version: string | null; pending: boolean; source_success: unknown };
    const rows = await sql.unsafe<SignalRow[]>(
      "select e.signal,c.signal as current_revision,p.signal as previous_revision,j.last_success_at,j.last_error,j.pipeline_version,(coalesce((select max(a.id) from public.news_articles a where a.beat_id=e.beat_id and a.published_at>to_timestamp($1)-interval '24 hours'),0)>coalesce(j.processed_article_id,0)) as pending,s.last_success_at as source_success from public.newsbeat_intelligence_events e left join public.newsbeat_intelligence_revisions c on c.event_id=e.id and c.version=e.version left join public.newsbeat_intelligence_revisions p on p.event_id=e.id and p.version=e.version-1 left join public.newsbeat_intelligence_jobs j on j.beat_id=e.beat_id left join public.news_ingestion_status s on s.beat_id=e.beat_id where e.evidence_updated_at>to_timestamp($1)-interval '7 days' order by e.event_changed_at desc limit 120", [now / 1000]);
    const records = await sql.unsafe<Array<{ id: string; beat_id: string; record: unknown }>>("select id,beat_id,record from public.newsbeat_quant_evaluations where next_due_at<=to_timestamp($1) order by next_due_at limit 200", [now / 1000]);
    for (const row of records) {
      const profile = MARKET_PROFILES.find(profile => profile.beat_id === row.beat_id);
      if (!profile) continue;
      const record = decode<QuantEvaluationRecord>(row.record), updated = { ...record, outcomes: updateOutcomes(record, profile, snapshots, now) };
      await sql.unsafe("update public.newsbeat_quant_evaluations set record=$2::jsonb,next_due_at=$3 where id=$1", [row.id, json(updated), nextDue(updated)]);
    }
    for (const profile of MARKET_PROFILES.filter((item): item is MarketProfile & { beat_id: string } => !!item.beat_id)) {
      const market = buildMarketContext(profile, snapshots, now), topic = SEED_BEATS.find(topic => topic.beat_id === profile.beat_id)!;
      const relevant = rows.filter(row => decode<IntelligenceSignal>(row.signal).beat_id === profile.beat_id).slice(0, 20);
      for (const context of SIGNAL_CONTEXTS) {
        const timing = relevant.map(row => {
          const current = decode<IntelligenceSignal>(row.signal), canonical = row.current_revision ? decode<IntelligenceSignal>(row.current_revision) : current;
          const previous = row.previous_revision ? decode<IntelligenceSignal>(row.previous_revision) : null;
          const base = constructSignal(current, context, { source_freshness: freshness(iso(row.source_success), topic.freshness_slo_minutes).status,
            analysis_ready: !!row.last_success_at && !row.pending && !row.last_error && row.pipeline_version === INTELLIGENCE_VERSION,
            analysis_at: iso(row.last_success_at), now: nowIso });
          const decision = decideTiming(canonical, previous, base, market, profile, snapshots, now);
          return { signal: current, decision, construction: applyTiming(base, decision, now) };
        });
        await sql.begin(async tx => {
          const owner = await tx.unsafe<Array<{ lease_token: string | null }>>("select lease_token from public.newsbeat_quant_worker where id='market-intelligence' for update");
          if (owner[0]?.lease_token !== token) throw new Error("lease_lost");
          const liveJob = await tx.unsafe<Array<{ pending: boolean; last_error: string | null; pipeline_version: string | null }>>(
            "select (coalesce((select max(a.id) from public.news_articles a where a.beat_id=j.beat_id and a.published_at>to_timestamp($2)-interval '24 hours'),0)>j.processed_article_id) as pending,j.last_error,j.pipeline_version from public.newsbeat_intelligence_jobs j where beat_id=$1 for share", [profile.beat_id, now / 1000]);
          const liveReady = !!liveJob[0] && !liveJob[0].pending && !liveJob[0].last_error && liveJob[0].pipeline_version === INTELLIGENCE_VERSION;
          for (const item of timing) {
            const liveEvent = await tx.unsafe<Array<{ version: number }>>("select version from public.newsbeat_intelligence_events where id=$1 for share", [item.signal.id]);
            if (liveEvent[0]?.version !== item.signal.version) continue;
            if (!liveReady && item.construction.action === "review_now") {
              item.decision = { ...item.decision, phase: "analysis_hold", action: "keep_watching", alert_id: null, reason: "New reporting or a changed analysis state arrived before persistence. The timing alert is held." };
              item.construction = { ...item.construction, action: "keep_watching", status: "watch", alert_id: null, quantitative: item.decision, explanation: item.decision.reason,
                checks: item.construction.checks.map(check => check.id === "freshness" || check.id === "market_timing" ? { ...check, passed: false } : check) };
            }
            decisions++;
            await tx.unsafe("update public.newsbeat_quant_alerts set resolved_at=$3,resolution='signal_revised' where event_id=$1 and signal_version<$2 and resolved_at is null", [item.signal.id, item.signal.version, nowIso]);
            for (const cohort of ["all_constructions", ...(item.construction.status === "alert" ? ["review_alert"] : [])] as QuantEvaluationRecord["cohort"][]) {
              const record = beginEvaluation(item.signal, item.decision, profile, snapshots, cohort);
              if (!record) continue;
              await tx.unsafe("insert into public.newsbeat_quant_evaluations(id,beat_id,event_id,signal_version,context_id,cohort,policy_version,decision_at,next_due_at,record) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) on conflict(event_id,signal_version,context_id,cohort,policy_version) do nothing", [record.id, profile.beat_id, item.signal.id, item.signal.version, context.id, cohort, QUANT_POLICY_VERSION, nowIso, nextDue(record), json(record)]);
            }
            if (item.construction.alert_id) {
              const inserted = await tx.unsafe<Array<{ id: string }>>("insert into public.newsbeat_quant_alerts(id,beat_id,event_id,signal_version,context_id,policy_version,triggered_at,construction) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb) on conflict(event_id,context_id,signal_version,policy_version) do nothing returning id", [item.construction.alert_id, profile.beat_id, item.signal.id, item.signal.version, context.id, QUANT_POLICY_VERSION, nowIso, json(item.construction)]);
              newAlerts += inserted.length;
            }
          }
        });
        const [recentRecords, stats] = await Promise.all([
          sql.unsafe<Array<{ record: unknown }>>("select record from public.newsbeat_quant_evaluations where beat_id=$1 and context_id=$2 and policy_version=$3 order by decision_at desc,id limit 8", [profile.beat_id, context.id, QUANT_POLICY_VERSION]),
          sql.unsafe<Array<{ cohort: string; minutes: number; total: string; observed: string; pending: string; mean_excess: number | null }>>(
            "select cohort,(o->>'horizon_minutes')::integer as minutes,count(*)::text as total,count(*) filter(where o->>'status'='observed')::text as observed,count(*) filter(where o->>'status'='pending')::text as pending,avg((o->>'asset_return')::double precision-(o->>'benchmark_return')::double precision) filter(where o->>'status'='observed') as mean_excess from public.newsbeat_quant_evaluations cross join lateral jsonb_array_elements(record->'outcomes') o where beat_id=$1 and context_id=$2 and policy_version=$3 and decision_at>to_timestamp($4)-interval '30 days' group by cohort,minutes", [profile.beat_id, context.id, QUANT_POLICY_VERSION, now / 1000]),
        ]);
        const first = stats.find(row => row.cohort === "all_constructions"), alerts = stats.find(row => row.cohort === "review_alert");
        const bundle: QuantBundle = { policy_version: QUANT_POLICY_VERSION, computed_at: nowIso, context_id: context.id, market,
          decisions: timing.map(item => item.decision), evaluations: recentRecords.map(row => decode<QuantEvaluationRecord>(row.record)),
          evaluation: { observations: Number(first?.total ?? 0), alerts: Number(alerts?.total ?? 0), horizons: [15, 60, 240].map(minutes => {
            const row = stats.find(row => row.cohort === "all_constructions" && row.minutes === minutes);
            return { minutes, observed: Number(row?.observed ?? 0), pending: Number(row?.pending ?? 0), mean_excess_return: row?.mean_excess ?? null };
          }), note: "Prospective first-snapshot observations across all constructions, including held cases. Snapshot-mid reference returns before fees; not executable P&L, a backtest or evidence of outperformance. Thirty-day cohort." } };
        await sql.unsafe("insert into public.newsbeat_quant_contexts(beat_id,context_id,policy_version,computed_at,bundle) values($1,$2,$3,$4,$5::jsonb) on conflict(beat_id,context_id) do update set policy_version=excluded.policy_version,computed_at=excluded.computed_at,bundle=excluded.bundle", [profile.beat_id, context.id, QUANT_POLICY_VERSION, nowIso, json(bundle)]);
      }
    }
    await sql.unsafe("delete from public.newsbeat_market_bars where started_at<to_timestamp($1)-interval '30 days'", [now / 1000]);
    await sql.unsafe("update public.newsbeat_quant_worker set lease_token=null,lease_until=null,last_success_at=$2,last_error=$3 where id='market-intelligence' and lease_token=$1", [token, nowIso, sources ? null : "market_sources_unavailable"]);
    return { status: sources ? "processed" : "sources_unavailable", instruments: sources, constructions: decisions, alerts: newAlerts };
  } catch (error) {
    console.error("market intelligence worker failed", error instanceof Error ? error.name : "unknown");
    await sql.unsafe("update public.newsbeat_quant_worker set lease_token=null,lease_until=null,last_error='processing_failed' where id='market-intelligence' and lease_token=$1", [token]);
    throw error;
  }
}
