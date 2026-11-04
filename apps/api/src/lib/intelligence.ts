import { randomUUID } from "node:crypto";
import { db, hasDatabaseEnv } from "@newsbeat/db";
import { SEED_BEATS, INTELLIGENCE_VERSION, SIGNAL_CONTEXTS, type SignalContextId, type IntelligenceResponse, type IntelligenceSignal, type IntelligenceEvidence } from "@newsbeat/contracts";
import { stories, topicById, freshness } from "./news.js";
import { hash, reconcileSignal, selectIntelligenceEvidence } from "./intelligence-core.js";
import { generateIntelligence, INTELLIGENCE_MODEL } from "./intelligence-model.js";
import { attachQuantitative } from "./quant-store.js";

export const INTELLIGENCE_SCHEMA = "-- Durable interpretation jobs and event memory. Applied only by the authenticated worker.\ncreate table if not exists public.newsbeat_intelligence_jobs (\n  beat_id text primary key,\n  requested_article_id bigint not null default 0,\n  processed_article_id bigint not null default 0,\n  input_hash text,\n  lease_token text,\n  lease_until timestamptz,\n  next_attempt_at timestamptz not null default now(),\n  last_attempt_at timestamptz,\n  last_success_at timestamptz,\n  last_error text,\n  coverage_truncated boolean not null default false\n);\ncreate table if not exists public.newsbeat_intelligence_events (\n  id text primary key,\n  beat_id text not null,\n  version integer not null check (version > 0),\n  event_changed_at timestamptz not null,\n  evidence_updated_at timestamptz not null,\n  signal jsonb not null\n);\ncreate index if not exists newsbeat_intelligence_events_asset_time_idx\n  on public.newsbeat_intelligence_events (beat_id, evidence_updated_at desc);\ncreate table if not exists public.newsbeat_intelligence_revisions (\n  event_id text not null references public.newsbeat_intelligence_events(id),\n  version integer not null,\n  recorded_at timestamptz not null default now(),\n  signal jsonb not null,\n  primary key (event_id, version)\n);\n\n-- Contextual signal construction and idempotent review-alert journal.\nalter table public.newsbeat_intelligence_jobs add column if not exists pipeline_version text;\nalter table public.newsbeat_intelligence_jobs add column if not exists last_attempt_version text;\ncreate table if not exists public.newsbeat_signal_alerts (\n  id text primary key,\n  beat_id text not null,\n  event_id text not null references public.newsbeat_intelligence_events(id),\n  signal_version integer not null check (signal_version > 0),\n  context_id text not null check (context_id in ('fundamentals', 'liquidity', 'risk')),\n  triggered_at timestamptz not null default now(),\n  resolved_at timestamptz,\n  resolution text,\n  construction jsonb not null,\n  unique (event_id, context_id, signal_version)\n);\ncreate index if not exists newsbeat_signal_alerts_asset_context_time_idx\n  on public.newsbeat_signal_alerts (beat_id, context_id, triggered_at desc);\n";
import { constructSignal } from "./signal-construction.js";

const PILOT_TICKERS = ["NVDA", "AAPL", "MSFT", "GOOGL", "BTC", "ETH"];
export const PILOT_BEATS = PILOT_TICKERS.map(ticker => SEED_BEATS.find(beat => beat.ticker === ticker && (["BTC", "ETH"].includes(ticker) ? beat.asset === "crypto" : beat.asset !== "crypto"))!).filter(Boolean);
type Job = { beat_id: string; requested_article_id: string; processed_article_id: string; input_hash: string | null; lease_token: string | null; last_success_at: string | null; last_attempt_at: string | null; last_error: string | null; coverage_truncated: boolean; pipeline_version: string | null; newest_article_id?: string | null };
const iso = (value: unknown): string | null => value instanceof Date ? value.toISOString() : typeof value === "string" ? value : null;
const decode = <T = IntelligenceSignal>(value: unknown): T => (typeof value === "string" ? JSON.parse(value) : value) as T;

export async function readIntelligence(beatId: string, contextId: SignalContextId = "fundamentals"): Promise<IntelligenceResponse> {
  const topic = topicById(beatId);
  const context = SIGNAL_CONTEXTS.find(item => item.id === contextId)!;
  const pilot = PILOT_BEATS.some(beat => beat.beat_id === beatId);
  const output: IntelligenceResponse = { beat_id: beatId, label: topic.label, generated_at: new Date().toISOString(), pilot,
    status: pilot ? "pending" : "not_in_pilot", freshness: { status: "unavailable", last_success_at: null },
    analysis: { last_success_at: null, last_attempt_at: null, error: null, coverage_truncated: false }, signals: [], context, constructions: [], alerts: [] };
  if (!pilot) return output;
  if (!hasDatabaseEnv()) return { ...output, status: "unavailable" };
  try {
    const sql = db();
    const [jobs, rows, source] = await Promise.all([
      sql<Job[]>`select j.*, (select coalesce(max(a.id),0)::text from public.news_articles a where a.beat_id=j.beat_id and a.published_at>now()-interval '24 hours') as newest_article_id from public.newsbeat_intelligence_jobs j where j.beat_id = ${beatId}`,
      sql<Array<{ signal: unknown }>>`select signal from public.newsbeat_intelligence_events where beat_id = ${beatId} and evidence_updated_at > now() - interval '7 days' order by event_changed_at desc, id limit 20`,
      sql<Array<{ last_success_at: unknown }>>`select last_success_at from public.news_ingestion_status where beat_id = ${beatId}`,
    ]);
    const job = jobs[0];
    output.freshness = freshness(iso(source[0]?.last_success_at), topic.freshness_slo_minutes);
    output.signals = rows.map(row => decode(row.signal));
    if (job) {
      output.analysis = { last_success_at: iso(job.last_success_at), last_attempt_at: iso(job.last_attempt_at), error: job.last_error, coverage_truncated: job.coverage_truncated, pipeline_version: job.pipeline_version };
      output.status = job.last_error ? "unavailable" : !job.last_success_at || job.pipeline_version !== INTELLIGENCE_VERSION || BigInt(job.newest_article_id ?? job.requested_article_id) > BigInt(job.processed_article_id) ? "pending" : "ready";
    }
    output.constructions = output.signals.map(signal => constructSignal(signal, context, { source_freshness: output.freshness.status, analysis_ready: output.status === "ready", analysis_at: output.analysis.last_success_at, now: output.generated_at }));
    return await attachQuantitative(output);
  } catch (error) {
    if ((error as { code?: string }).code === "42P01") return output;
    console.warn("intelligence read unavailable");
    return { ...output, status: "unavailable" };
  }
}

/** One authenticated run: six-asset pilot, two claimed jobs, no generation on public reads. */
export async function runIntelligence(oidcToken?: string | null, generate: typeof generateIntelligence = generateIntelligence) {
  const sql = db();
  await sql.unsafe(INTELLIGENCE_SCHEMA);
  for (const beat of PILOT_BEATS) {
    await sql`insert into public.newsbeat_intelligence_jobs (beat_id, requested_article_id)
      select ${beat.beat_id}, coalesce(max(id), 0) from public.news_articles where beat_id = ${beat.beat_id} and published_at > now() - interval '24 hours'
      on conflict (beat_id) do update set requested_article_id = greatest(newsbeat_intelligence_jobs.requested_article_id, excluded.requested_article_id)`;
  }
  const token = randomUUID();
  const jobs = await sql<Job[]>`update public.newsbeat_intelligence_jobs set lease_token = ${token},
    lease_until = now() + interval '2 minutes', last_attempt_at = now(), last_attempt_version = ${INTELLIGENCE_VERSION}
    where beat_id in (select beat_id from public.newsbeat_intelligence_jobs
      where requested_article_id > 0 and (requested_article_id > processed_article_id or pipeline_version is distinct from ${INTELLIGENCE_VERSION})
        and (next_attempt_at <= now() or last_attempt_version is distinct from ${INTELLIGENCE_VERSION})
        and (lease_until is null or lease_until < now())
      order by case when pipeline_version is distinct from ${INTELLIGENCE_VERSION} then 0 else 1 end,
        case when beat_id = ${PILOT_BEATS[0]!.beat_id} then 0 else 1 end, last_success_at asc nulls first, beat_id limit 2 for update skip locked)
    returning *`;
  const results = await Promise.all(jobs.map(async job => {
    try {
      const topic = topicById(job.beat_id);
      const [snapshot, oldRows] = await Promise.all([
        stories(job.beat_id, 200),
        sql<Array<{ signal: unknown }>>`select signal from public.newsbeat_intelligence_events where beat_id = ${job.beat_id}
          and evidence_updated_at > now() - interval '7 days' order by evidence_updated_at desc limit 12`,
      ]);
      if (snapshot.freshness.status !== "fresh") throw new Error("source_stale");
      const previous = oldRows.map(row => decode(row.signal));
      const evidence = selectIntelligenceEvidence(snapshot.stories, String(job.processed_article_id));
      const fingerprint = hash([INTELLIGENCE_VERSION, INTELLIGENCE_MODEL, evidence.map(report => [report.id, report.title])]);
      const drafts = job.input_hash === fingerprint || !evidence.length ? [] : await generate(evidence, previous, topic, oidcToken);
      const now = new Date().toISOString();
      const signals = drafts.map(draft => reconcileSignal(job.beat_id, draft, evidence, previous, now, INTELLIGENCE_MODEL));
      if (new Set(signals.map(signal => signal.id)).size !== signals.length) throw new Error("invalid_analysis");
      await sql.begin(async tx => {
        const owner = await tx<Array<{ lease_token: string | null; requested_article_id: string }>>`select lease_token, requested_article_id from public.newsbeat_intelligence_jobs where beat_id = ${job.beat_id} for update`;
        if (owner[0]?.lease_token !== token) throw new Error("lease_lost");
        for (const signal of signals) {
          await tx`insert into public.newsbeat_intelligence_events (id, beat_id, version, event_changed_at, evidence_updated_at, signal)
            values (${signal.id}, ${signal.beat_id}, ${signal.version}, ${signal.updated_at}, ${signal.evidence_updated_at}, ${tx.json(JSON.parse(JSON.stringify(signal)))})
            on conflict (id) do update set version = excluded.version, event_changed_at = excluded.event_changed_at,
              evidence_updated_at = excluded.evidence_updated_at, signal = excluded.signal`;
          await tx`insert into public.newsbeat_intelligence_revisions (event_id, version, signal)
            values (${signal.id}, ${signal.version}, ${tx.json(JSON.parse(JSON.stringify(signal)))}) on conflict (event_id, version) do nothing`;
          await tx`update public.newsbeat_signal_alerts set resolved_at = now(), resolution = 'signal_revised'
            where event_id = ${signal.id} and signal_version < ${signal.version} and resolved_at is null`;

        }
        await tx`update public.newsbeat_intelligence_jobs set processed_article_id = greatest(processed_article_id, ${job.requested_article_id}::bigint),
          input_hash = ${fingerprint}, pipeline_version = ${INTELLIGENCE_VERSION}, last_success_at = now(), last_error = null, coverage_truncated = ${snapshot.coverage_truncated || snapshot.articles_read > evidence.length},
          lease_token = null, lease_until = null, next_attempt_at = now() where beat_id = ${job.beat_id} and lease_token = ${token}`;
      });
      return { beat_id: job.beat_id, status: "processed", signals: signals.length, alerts: 0, reused: job.input_hash === fingerprint };
    } catch (error) {
      const reason = error instanceof Error && (["source_stale", "invalid_analysis", "model_unavailable", "lease_lost"].includes(error.message) || /^invalid_analysis_[a-z_]{1,60}$/.test(error.message)) ? error.message : "processing_failed";
      await sql`update public.newsbeat_intelligence_jobs set last_error = ${reason}, lease_token = null, lease_until = null,
        next_attempt_at = now() + interval '15 minutes' where beat_id = ${job.beat_id} and lease_token = ${token}`;
      return { beat_id: job.beat_id, status: reason, signals: 0 };
    }
  }));
  return { pilot: PILOT_BEATS.map(beat => beat.ticker), claimed: jobs.length, results };
}
