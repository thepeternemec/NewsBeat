import { db, hasDatabaseEnv } from "@newsbeat/db";
import { CatalystSnapshotSchema, DiscoveryQuerySchema, SEED_BEATS, type DiscoveryFeed } from "@newsbeat/contracts";
import { NewsError } from "./news.js";
import { OFFICIAL_FRESH_MS, OFFICIAL_ISSUERS } from "./catalyst-core.js";
import {
  DISCOVERY_FILING_HOURS, DISCOVERY_PRESS_HOURS, discoveryBeat, filingDiscovery, pressDiscovery, rankDiscovery,
  type DiscoveryObservation, type StoredDiscovery,
} from "./discovery-core.js";

export const DISCOVERY_SCHEMA = `create table if not exists public.newsbeat_discovery_observations (
  id text primary key,
  beat_id text not null,
  asset text not null check (asset in ('equity','crypto')),
  published_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  evidence_type text not null check (evidence_type in ('press','official_filing')),
  observation jsonb not null
);
create index if not exists newsbeat_discovery_published_idx on public.newsbeat_discovery_observations(published_at desc);
create table if not exists public.newsbeat_discovery_scans (
  id text primary key,
  cursor_at timestamptz not null,
  cursor_id bigint not null,
  scanned_at timestamptz not null,
  backlog boolean not null
);`;
const HOUR = 3600_000;
const MINUTE = 60_000;
const BATCH_SIZE = 4000;
const READ_LIMIT = 1000;
const key = "catalog-v1";
const iso = (value: string | Date) => value instanceof Date ? value.toISOString() : new Date(value).toISOString();
type Scan = { cursor_at: string; cursor_id: string; scanned_at: Date | string; backlog: boolean };
type Article = { id: string; beat_id: string; title: string; url: string; source: string; published_at: Date | string; indexed_at: Date | string; cursor_at: string };
type FilingRow = { beat_id: string; snapshot: unknown; checked_at: Date | string };
const officialIds: string[] = OFFICIAL_ISSUERS.map(issuer => issuer.beat_id);

/** A transaction finishes the batch and advances the cursor together. Public reads never write. */
export async function runDiscovery() {
  return db().begin(async tx => {
    const [lease] = await tx<{ claimed: boolean }[]>`select pg_try_advisory_xact_lock(hashtext('newsbeat_catalog_discovery')) as claimed`;
    if (!lease?.claimed) return { status: "leased" };
    await tx.unsafe(DISCOVERY_SCHEMA);
    const [clock] = await tx<{ at: Date | string; exact: string }[]>`select now() as at,now()::text as exact`;
    const scanAt = iso(clock!.at);
    const now = Date.parse(scanAt);
    const [previous] = await tx<Scan[]>`select cursor_at::text, cursor_id::text, scanned_at, backlog
      from public.newsbeat_discovery_scans where id=${key}`;
    const floor = now - DISCOVERY_PRESS_HOURS * HOUR;
    const continuation = previous?.backlog && Date.parse(previous.cursor_at) >= floor ? previous : null;
    // The regular scan overlaps recently committed writes. A bounded backlog resumes at its exact DB timestamp and ID.
    const since = continuation ? continuation.cursor_at
      : new Date(previous ? Math.max(floor, Date.parse(previous.cursor_at) - 3 * MINUTE) : floor).toISOString();
    const articles = await tx<Article[]>`select id::text, beat_id, title, url, source, published_at, first_indexed_at as indexed_at, first_indexed_at::text as cursor_at
      from public.news_articles
      where published_at between ${new Date(floor).toISOString()}::timestamptz and ${scanAt}::timestamptz
        and first_indexed_at <= ${scanAt}::timestamptz
        and (first_indexed_at, id) > (${since}::timestamptz, ${continuation?.cursor_id ?? "0"}::bigint)
      order by first_indexed_at,news_articles.id limit ${BATCH_SIZE + 1}`;
    const filings = await tx<FilingRow[]>`select beat_id,snapshot,checked_at from public.newsbeat_official_evidence
      where beat_id in ${tx(officialIds)} and last_error is null
        and checked_at between ${new Date(now - OFFICIAL_FRESH_MS).toISOString()}::timestamptz and ${scanAt}::timestamptz`;
    const observations: DiscoveryObservation[] = [];
    for (const article of articles.slice(0, BATCH_SIZE)) {
      const observation = pressDiscovery({ ...article, published_at: iso(article.published_at), indexed_at: iso(article.indexed_at) });
      if (observation) observations.push(observation);
    }
    for (const row of filings) {
      const parsed = CatalystSnapshotSchema.safeParse(row.snapshot), issuer = OFFICIAL_ISSUERS.find(value => value.beat_id === row.beat_id);
      if (!parsed.success || !issuer || parsed.data.beat_id !== issuer.beat_id || parsed.data.cik !== issuer.cik) continue;
      for (const filing of parsed.data.filings) {
        const accepted = Date.parse(filing.accepted_at);
        if (accepted > now || accepted < now - DISCOVERY_FILING_HOURS * HOUR || accepted > Date.parse(iso(row.checked_at))) continue;
        const observation = filingDiscovery(row.beat_id, filing, iso(row.checked_at));
        if (observation) observations.push(observation);
      }
    }
    let inserted = 0;
    if (observations.length) {
      const payload = JSON.parse(JSON.stringify(observations));
      const result = await tx`insert into public.newsbeat_discovery_observations (id,beat_id,asset,published_at,evidence_type,observation)
        select item->>'id',item->'asset'->>'beat_id',item->'asset'->>'asset',(item->'evidence'->>'published_at')::timestamptz,
          item->'evidence'->>'type',item
        from jsonb_array_elements(${tx.json(payload)}::jsonb) item on conflict (id) do nothing`;
      inserted = result.count;
    }
    const backlog = articles.length > BATCH_SIZE;
    const tail = backlog ? articles[BATCH_SIZE - 1]! : undefined;
    await tx`insert into public.newsbeat_discovery_scans(id,cursor_at,cursor_id,scanned_at,backlog)
      values (${key},${tail?.cursor_at ?? clock!.exact}::timestamptz,${tail?.id ?? "0"}::bigint,${scanAt}::timestamptz,${backlog})
      on conflict(id) do update set cursor_at=excluded.cursor_at,cursor_id=excluded.cursor_id,scanned_at=excluded.scanned_at,backlog=excluded.backlog`;
    await tx`delete from public.newsbeat_discovery_observations where published_at < ${new Date(now - 7 * 24 * HOUR).toISOString()}::timestamptz`;
    return { status: backlog ? "catching_up" : "processed", classified: observations.length, inserted, scanned: Math.min(BATCH_SIZE, articles.length) };
  });
}

export async function readDiscovery(input: unknown, now = Date.now()): Promise<DiscoveryFeed> {
  const parsed = DiscoveryQuerySchema.safeParse(input);
  if (!parsed.success) throw new NewsError("invalid_request", "Use an optional asset, beat_id and integer limit from 1 to 20.", 400);
  const { asset, beat_id: beatId, limit } = parsed.data;
  if (beatId && !discoveryBeat(beatId)) throw new NewsError("unknown_topic", "Choose an asset from the Rarebird catalog.", 404);
  const output: DiscoveryFeed = {
    generated_at: new Date(now).toISOString(), status: "unavailable",
    coverage: { catalog_total: SEED_BEATS.length, fresh_news_feeds: 0,
      official_issuer_total: officialIds.length, fresh_official_issuers: 0, scanned_at: null, truncated: false },
    events: [],
  };
  if (!hasDatabaseEnv()) return output;
  const sql = db();
  try {
    const [scans, states, filings, rows] = await Promise.all([
      sql<Scan[]>`select scanned_at, backlog from public.newsbeat_discovery_scans where id=${key}`,
      sql<{ beat_id: string; last_success_at: Date | string | null }[]>`select beat_id,last_success_at from public.news_ingestion_status where last_success_at is not null`,
      sql<{ count: number }[]>`select count(*)::int as count from public.newsbeat_official_evidence
        where beat_id in ${sql(officialIds)} and snapshot is not null and last_error is null
          and checked_at between ${new Date(now - OFFICIAL_FRESH_MS).toISOString()}::timestamptz and ${output.generated_at}::timestamptz`,
      sql<{ observation: DiscoveryObservation; recorded_at: Date | string }[]>`select observation,recorded_at
        from public.newsbeat_discovery_observations
        where published_at <= ${output.generated_at}::timestamptz and recorded_at <= ${output.generated_at}::timestamptz
          and ((evidence_type='press' and published_at >= ${new Date(now - DISCOVERY_PRESS_HOURS * HOUR).toISOString()}::timestamptz)
            or (evidence_type='official_filing' and published_at >= ${new Date(now - DISCOVERY_FILING_HOURS * HOUR).toISOString()}::timestamptz))
          and (${asset ?? null}::text is null or asset=${asset ?? null})
          and (${beatId ?? null}::text is null or beat_id=${beatId ?? null})
        order by published_at desc,id limit ${READ_LIMIT + 1}`,
    ]);
    const scan = scans[0];
    const fresh = states.filter(state => {
      const topic = discoveryBeat(state.beat_id);
      if (!topic || !state.last_success_at) return false;
      const age = now - Date.parse(iso(state.last_success_at));
      return age >= 0 && age <= topic.freshness_slo_minutes * MINUTE;
    }).length;
    const truncated = !!scan?.backlog || rows.length > READ_LIMIT;
    output.coverage = { ...output.coverage, fresh_news_feeds: fresh, fresh_official_issuers: filings[0]?.count ?? 0,
      scanned_at: scan ? iso(scan.scanned_at) : null, truncated };
    if (!scan) output.status = "warming_up";
    else {
      const age = now - Date.parse(iso(scan.scanned_at));
      output.status = age < 0 || age > 5 * MINUTE || truncated || fresh !== SEED_BEATS.length ? "partial" : "ready";
    }
    output.events = rankDiscovery(rows.slice(0, READ_LIMIT).map(row => ({ ...row.observation, recorded_at: iso(row.recorded_at) } satisfies StoredDiscovery)), now, limit);
  } catch (error) {
    if ((error as { code?: string }).code === "42P01") output.status = "warming_up";
    else console.warn("catalog discovery read unavailable");
  }
  return output;
}
