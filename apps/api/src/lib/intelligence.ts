import { randomUUID } from "node:crypto";
import { db, env, hasDatabaseEnv } from "@newsbeat/db";
import { SEED_BEATS, INTELLIGENCE_VERSION, type IntelligenceResponse, type IntelligenceSignal, type IntelligenceEvidence } from "@newsbeat/contracts";
import { stories, topicById, freshness } from "./news.js";
import { selectSummaryStories } from "./relevance.js";
import { hash, reconcileSignal } from "./intelligence-core.js";
import { generateIntelligence, INTELLIGENCE_MODEL } from "./intelligence-model.js";

export const INTELLIGENCE_SCHEMA = "-- Durable interpretation jobs and event memory. Applied only by the authenticated worker.\ncreate table if not exists public.newsbeat_intelligence_jobs (\n  beat_id text primary key,\n  requested_article_id bigint not null default 0,\n  processed_article_id bigint not null default 0,\n  input_hash text,\n  lease_token text,\n  lease_until timestamptz,\n  next_attempt_at timestamptz not null default now(),\n  last_attempt_at timestamptz,\n  last_success_at timestamptz,\n  last_error text,\n  coverage_truncated boolean not null default false\n);\ncreate table if not exists public.newsbeat_intelligence_events (\n  id text primary key,\n  beat_id text not null,\n  version integer not null check (version > 0),\n  event_changed_at timestamptz not null,\n  evidence_updated_at timestamptz not null,\n  signal jsonb not null\n);\ncreate index if not exists newsbeat_intelligence_events_asset_time_idx\n  on public.newsbeat_intelligence_events (beat_id, evidence_updated_at desc);\ncreate table if not exists public.newsbeat_intelligence_revisions (\n  event_id text not null references public.newsbeat_intelligence_events(id),\n  version integer not null,\n  recorded_at timestamptz not null default now(),\n  signal jsonb not null,\n  primary key (event_id, version)\n);\n";
const PILOT_TICKERS = ["NVDA", "AAPL", "MSFT", "GOOGL", "BTC", "ETH"];
export const PILOT_BEATS = PILOT_TICKERS.map(ticker => SEED_BEATS.find(beat => beat.ticker === ticker && (["BTC", "ETH"].includes(ticker) ? beat.asset === "crypto" : beat.asset !== "crypto"))!).filter(Boolean);
type Job = { beat_id: string; requested_article_id: string; processed_article_id: string; input_hash: string | null; lease_token: string | null; last_success_at: string | null; last_attempt_at: string | null; last_error: string | null; coverage_truncated: boolean };
const iso = (value: unknown): string | null => value instanceof Date ? value.toISOString() : typeof value === "string" ? value : null;
const decode = (value: unknown): IntelligenceSignal => (typeof value === "string" ? JSON.parse(value) : value) as IntelligenceSignal;

export async function readIntelligence(beatId: string): Promise<IntelligenceResponse> {
  const topic = topicById(beatId);
  const pilot = PILOT_BEATS.some(beat => beat.beat_id === beatId);
  const output: IntelligenceResponse = { beat_id: beatId, label: topic.label, generated_at: new Date().toISOString(), pilot,
    status: pilot ? "pending" : "not_in_pilot", freshness: { status: "unavailable", last_success_at: null },
    analysis: { last_success_at: null, last_attempt_at: null, error: null, coverage_truncated: false }, signals: [] };
  if (!pilot) return output;
  if (!hasDatabaseEnv()) return { ...output, status: "unavailable" };
  try {
    const sql = db();
    const [jobs, rows, source] = await Promise.all([
      sql<Job[]>`select * from public.newsbeat_intelligence_jobs where beat_id = ${beatId}`,
      sql<Array<{ signal: unknown }>>`select signal from public.newsbeat_intelligence_events where beat_id = ${beatId} and evidence_updated_at > now() - interval '7 days' order by event_changed_at desc, id limit 20`,
      sql<Array<{ last_success_at: unknown }>>`select last_success_at from public.news_ingestion_status where beat_id = ${beatId}`,
    ]);
    const job = jobs[0];
    output.freshness = freshness(iso(source[0]?.last_success_at), topic.freshness_slo_minutes);
    output.signals = rows.map(row => decode(row.signal));
    if (job) {
      output.analysis = { last_success_at: iso(job.last_success_at), last_attempt_at: iso(job.last_attempt_at), error: job.last_error, coverage_truncated: job.coverage_truncated };
      output.status = job.last_error ? "unavailable" : !job.last_success_at || BigInt(job.requested_article_id) > BigInt(job.processed_article_id) ? "pending" : "ready";
    }
    return output;
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
    lease_until = now() + interval '2 minutes', last_attempt_at = now()
    where beat_id in (select beat_id from public.newsbeat_intelligence_jobs
      where requested_article_id > processed_article_id and next_attempt_at <= now()
        and (lease_until is null or lease_until < now())
      order by last_success_at asc nulls first, case when beat_id = ${PILOT_BEATS[0]!.beat_id} then 0 else 1 end, beat_id limit 2 for update skip locked)
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
      const selected = selectSummaryStories(snapshot.stories.map(story => ({
        lead: story.lead, sources: story.sources, source_count: story.source_count,
        first_seen: story.first_seen, last_seen: story.last_seen, articles: story.reports,
      })), 8);
      const evidence: IntelligenceEvidence[] = selected.flatMap(story => story.articles.slice(0, 3).map(report => ({
        id: report.id, title: report.title, source: report.source, url: report.url, published_at: report.published_at,
      })));
      const previous = oldRows.map(row => decode(row.signal));
      const fingerprint = hash([INTELLIGENCE_VERSION, INTELLIGENCE_MODEL, evidence.map(report => [report.id, report.title])]);
      const drafts = job.input_hash === fingerprint || !evidence.length ? [] : await generate(evidence, previous, topic, oidcToken);
      const now = new Date().toISOString();
      const signals = drafts.map(draft => reconcileSignal(job.beat_id, draft, evidence, previous, now, INTELLIGENCE_MODEL));
      if (new Set(signals.map(signal => signal.id)).size !== signals.length) throw new Error("invalid_analysis");
      await sql.begin(async tx => {
        const owner = await tx<Array<{ lease_token: string | null }>>`select lease_token from public.newsbeat_intelligence_jobs where beat_id = ${job.beat_id} for update`;
        if (owner[0]?.lease_token !== token) throw new Error("lease_lost");
        for (const signal of signals) {
          await tx`insert into public.newsbeat_intelligence_events (id, beat_id, version, event_changed_at, evidence_updated_at, signal)
            values (${signal.id}, ${signal.beat_id}, ${signal.version}, ${signal.updated_at}, ${signal.evidence_updated_at}, ${tx.json(JSON.parse(JSON.stringify(signal)))})
            on conflict (id) do update set version = excluded.version, event_changed_at = excluded.event_changed_at,
              evidence_updated_at = excluded.evidence_updated_at, signal = excluded.signal`;
          await tx`insert into public.newsbeat_intelligence_revisions (event_id, version, signal)
            values (${signal.id}, ${signal.version}, ${tx.json(JSON.parse(JSON.stringify(signal)))}) on conflict (event_id, version) do nothing`;
        }
        await tx`update public.newsbeat_intelligence_jobs set processed_article_id = greatest(processed_article_id, ${job.requested_article_id}::bigint),
          input_hash = ${fingerprint}, last_success_at = now(), last_error = null, coverage_truncated = ${snapshot.coverage_truncated || snapshot.stories.length > selected.length},
          lease_token = null, lease_until = null, next_attempt_at = now() where beat_id = ${job.beat_id} and lease_token = ${token}`;
      });
      return { beat_id: job.beat_id, status: "processed", signals: signals.length, reused: job.input_hash === fingerprint };
    } catch (error) {
      const reason = error instanceof Error && ["source_stale", "invalid_analysis", "model_unavailable", "lease_lost"].includes(error.message) ? error.message : "processing_failed";
      await sql`update public.newsbeat_intelligence_jobs set last_error = ${reason}, lease_token = null, lease_until = null,
        next_attempt_at = now() + interval '15 minutes' where beat_id = ${job.beat_id} and lease_token = ${token}`;
      return { beat_id: job.beat_id, status: reason, signals: 0 };
    }
  }));
  return { pilot: PILOT_BEATS.map(beat => beat.ticker), claimed: jobs.length, results };
}
