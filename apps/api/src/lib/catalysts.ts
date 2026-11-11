import { randomUUID } from "node:crypto";
import { db, hasDatabaseEnv } from "@newsbeat/db";
import { CatalystSnapshotSchema, type CatalystCoverage, type CatalystSnapshot, type ResearchEvidence } from "@newsbeat/contracts";
import { z } from "zod";
import { NewsError } from "./news.js";
import { buildCatalystRadar, compareReportedConcept, FINANCIAL_CONCEPTS, OFFICIAL_FRESH_MS, OFFICIAL_ISSUERS, parseFilings } from "./catalyst-core.js";

export const CATALYST_SCHEMA = `
create table if not exists public.newsbeat_official_evidence (
  beat_id text primary key,
  snapshot jsonb,
  checked_at timestamptz,
  last_attempt_at timestamptz,
  last_error text,
  lease_token text,
  lease_until timestamptz
);
`;
type StoredEvidence = {
  beat_id: string; snapshot: unknown; checked_at: Date | string | null;
  last_attempt_at: Date | string | null; last_error: string | null;
};
const iso = (value: Date | string | null) => value instanceof Date ? value.toISOString() : value;
const inputSchema = z.object({ beat_id: z.string().optional(), limit: z.number().int().min(1).max(12).default(6) }).strict();

/** Public reads use persisted snapshots, including explicit partial and failed-source states. */
export async function readCatalysts(input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new NewsError("invalid_request", "Use an optional supported beat_id and an integer limit from 1 to 12.", 400);
  const issuers = OFFICIAL_ISSUERS.filter(issuer => !parsed.data.beat_id || issuer.beat_id === parsed.data.beat_id);
  if (!issuers.length) return buildCatalystRadar([{
    beat_id: parsed.data.beat_id!, label: "Asset outside the official-filing pilot", status: "unsupported",
    checked_at: null, last_attempt_at: null, error: null, snapshot: null,
  }], parsed.data.limit, Date.now());
  let rows: StoredEvidence[] = [];
  let storageError = false;
  if (hasDatabaseEnv()) {
    try {
      const sql = db();
      rows = await sql<StoredEvidence[]>`select beat_id, snapshot, checked_at, last_attempt_at, last_error
        from public.newsbeat_official_evidence where beat_id in ${sql(issuers.map(issuer => issuer.beat_id))}`;
    } catch { storageError = true; }
  }
  const now = Date.now();
  const coverage: CatalystCoverage[] = issuers.map(issuer => {
    const row = rows.find(item => item.beat_id === issuer.beat_id);
    const result = CatalystSnapshotSchema.safeParse(typeof row?.snapshot === "string" ? safelyDecode(row.snapshot) : row?.snapshot);
    const snapshot = result.success && result.data.beat_id === issuer.beat_id && result.data.cik === issuer.cik ? result.data : null;
    const checked = snapshot ? Date.parse(snapshot.checked_at) : NaN;
    const fresh = !!snapshot && !row?.last_error && checked <= now && now - checked <= OFFICIAL_FRESH_MS;
    return { beat_id: issuer.beat_id, label: issuer.label,
      status: fresh ? "fresh" : snapshot ? "stale" : "unavailable",
      checked_at: snapshot?.checked_at ?? null, last_attempt_at: iso(row?.last_attempt_at ?? null),
      error: storageError ? "storage_unavailable" : row?.last_error ?? null, snapshot };
  });
  return buildCatalystRadar(coverage, parsed.data.limit, now);
}

function safelyDecode(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}

async function secJson(path: string, request: typeof fetch) {
  const response = await request("https://data.sec.gov/" + path, {
    headers: { "User-Agent": "Rarebird official evidence contact@newsbeat.dev", Accept: "application/json" },
    signal: AbortSignal.timeout(8_000), redirect: "error",
  });
  if (!response.ok) throw new Error(response.status === 429 ? "source_rate_limited" : "source_unavailable");
  const body = await response.text();
  if (body.length > 3_000_000) throw new Error("source_too_large");
  return JSON.parse(body) as unknown;
}

/** One leased issuer per existing scheduler tick. No API key, model call or public-read fetch. */
export async function runOfficialEvidence(request: typeof fetch = fetch) {
  const sql = db();
  await sql.unsafe(CATALYST_SCHEMA);
  for (const issuer of OFFICIAL_ISSUERS) {
    await sql`insert into public.newsbeat_official_evidence (beat_id) values (${issuer.beat_id}) on conflict do nothing`;
  }
  const token = randomUUID();
  const claimed = await sql<Array<{ beat_id: string }>>`update public.newsbeat_official_evidence
    set lease_token = ${token}, lease_until = now() + interval '2 minutes', last_attempt_at = now()
    where beat_id = (select beat_id from public.newsbeat_official_evidence
      where (lease_until is null or lease_until < now())
        and (last_attempt_at is null or last_attempt_at < now() - interval '15 minutes')
      order by checked_at asc nulls first, last_attempt_at asc nulls first, beat_id limit 1 for update skip locked)
    returning beat_id`;
  const issuer = OFFICIAL_ISSUERS.find(item => item.beat_id === claimed[0]?.beat_id);
  if (!issuer) return { claimed: 0, status: "idle" };
  try {
    const submissions = await secJson(`submissions/CIK${issuer.cik}.json`, request);
    const now = Date.now();
    const filings = parseFilings(submissions, issuer, now);
    const concepts = await Promise.allSettled(FINANCIAL_CONCEPTS.map(definition =>
      secJson(`api/xbrl/companyconcept/CIK${issuer.cik}/us-gaap/${definition.concept}.json`, request)));
    const comparisons: CatalystSnapshot["comparisons"] = [];
    const missing: string[] = [];
    for (let index = 0; index < FINANCIAL_CONCEPTS.length; index++) {
      const definition = FINANCIAL_CONCEPTS[index]!;
      const result = concepts[index]!;
      let comparison = null;
      try { if (result.status === "fulfilled") comparison = compareReportedConcept(result.value, issuer, definition, filings, now); }
      catch { /* An invalid concept cannot erase independently validated issuer filings. */ }
      if (comparison) comparisons.push(comparison);
      else missing.push(definition.concept);
    }
    const snapshot = CatalystSnapshotSchema.parse({ version: "official-evidence-v1", ...issuer,
      checked_at: new Date(now).toISOString(), filings, comparisons, missing_concepts: missing });
    const saved = await sql<Array<{ beat_id: string }>>`update public.newsbeat_official_evidence
      set snapshot = ${sql.json(snapshot)}, checked_at = ${snapshot.checked_at}, last_error = null, lease_token = null, lease_until = null
      where beat_id = ${issuer.beat_id} and lease_token = ${token} returning beat_id`;
    return { claimed: 1, beat_id: issuer.beat_id, status: saved.length ? "updated" : "lease_lost", filings: filings.length, comparisons: comparisons.length };
  } catch (error) {
    const reason = error instanceof Error && ["source_unavailable", "source_rate_limited", "source_too_large", "issuer_mismatch"].includes(error.message)
      ? error.message : "source_invalid_or_unavailable";
    await sql`update public.newsbeat_official_evidence set last_error = ${reason}, lease_token = null, lease_until = null
      where beat_id = ${issuer.beat_id} and lease_token = ${token}`;
    return { claimed: 1, beat_id: issuer.beat_id, status: reason };
  }
}

/** Official measurements keep their fiscal period and original filing provenance in model input. */
export function officialResearchEvidence(coverage: CatalystCoverage): ResearchEvidence[] {
  if (coverage.status !== "fresh" || !coverage.snapshot) return [];
  const snapshot = coverage.snapshot;
  const filings: ResearchEvidence[] = snapshot.filings.slice(0, 2).map(filing => ({
    id: filing.id, beat_id: snapshot.beat_id, kind: "report", source: "SEC EDGAR issuer record",
    text: `${snapshot.label} filed ${filing.form} on ${filing.filed_on}. Filing category: ${filing.description}. This verifies the issuer filing exists. Document contents and changes to guidance have not been extracted.`,
    url: filing.url, observed_at: filing.accepted_at, freshness: "fresh",
  }));
  const comparisons: ResearchEvidence[] = snapshot.comparisons.map(item => ({
    id: `${item.current.filing_id}:${item.metric}`, beat_id: snapshot.beat_id, kind: "measurement", source: "SEC EDGAR US-GAAP XBRL",
    text: `${snapshot.label} reported ${item.label.toLowerCase()} of USD ${item.current.value} for ${item.current.start} through ${item.current.end}, filed ${item.current.filed_on}. The comparable prior-year ${item.period}, ${item.previous.start} through ${item.previous.end}, originally reported USD ${item.previous.value}, filed ${item.previous.filed_on}. Change USD ${item.change}${item.change_percent === null ? "." : ` (${item.change_percent.toFixed(2)}%).`} These are reported historical results. Consensus, guidance changes and a current market reaction are unmeasured. Prior filing: ${item.previous.filing_id}.`,
    url: item.current.url, observed_at: `${item.current.filed_on}T00:00:00.000Z`, freshness: "fresh",
  }));
  return [...filings, ...comparisons];
}
