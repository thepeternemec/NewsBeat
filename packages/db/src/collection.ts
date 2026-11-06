import { createHash, randomBytes, randomUUID } from "node:crypto";
import { PRIORITY_BEAT_IDS, type CollectionStatus, type CollectionResult } from "@newsbeat/contracts";
import { db } from "./client.js";

export const FAST_COLLECTION_SCHEMA = "create table if not exists public.newsbeat_fast_collection (beat_id text primary key,token_hash text not null,requested_at timestamptz not null,expires_at timestamptz not null,lease_token text,lease_until timestamptz,last_attempt_at timestamptz,last_success_at timestamptz,last_error text)";
type Row = { beat_id: string; expires_at: Date | string; last_attempt_at: Date | string | null; last_success_at: Date | string | null; last_error: string | null };
const iso = (value: Date | string | null) => value === null ? null : new Date(value).toISOString();
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
function status(beatId: string, row: Row | undefined, now: number): CollectionStatus {
  return { beat_id: beatId, active: !!row && new Date(row.expires_at).getTime() > now, interval_seconds: 60, catalog_interval_seconds: 600,
    duration_minutes: 15, expires_at: row ? iso(row.expires_at) : null, last_attempt_at: iso(row?.last_attempt_at ?? null),
    last_success_at: iso(row?.last_success_at ?? null), last_error: row?.last_error ?? null };
}
export async function readCollection(beatId: string, now = Date.now()): Promise<CollectionStatus> {
  try { const rows = await db().unsafe<Row[]>("select beat_id,expires_at,last_attempt_at,last_success_at,last_error from public.newsbeat_fast_collection where beat_id=$1", [beatId]); return status(beatId, rows[0], now); }
  catch (error) { if ((error as { code?: string }).code === "42P01") return status(beatId, undefined, now); throw error; }
}
/** Explicit start only. One shared asset lease cannot be renewed or multiplied by duplicate requests. */
export async function startCollection(beatId: string, now = Date.now()): Promise<CollectionResult> {
  if (!(PRIORITY_BEAT_IDS as readonly string[]).includes(beatId)) throw new Error("unsupported_priority_asset");
  const sql = db(), token = randomBytes(32).toString("hex"), at = new Date(now).toISOString();
  await sql.unsafe(FAST_COLLECTION_SCHEMA);
  const rows = await sql.unsafe<Row[]>("insert into public.newsbeat_fast_collection(beat_id,token_hash,requested_at,expires_at) values($1,$2,$3::timestamptz,$3::timestamptz+interval '15 minutes') on conflict(beat_id) do update set token_hash=excluded.token_hash,requested_at=excluded.requested_at,expires_at=excluded.expires_at,last_error=null where newsbeat_fast_collection.expires_at<=$3::timestamptz returning beat_id,expires_at,last_attempt_at,last_success_at,last_error", [beatId, digest(token), at]);
  return rows[0] ? { ...status(beatId, rows[0], now), started: true, session_token: token } : { ...(await readCollection(beatId, now)), started: false };
}
export async function stopCollection(beatId: string, token: string, now = Date.now()): Promise<CollectionResult> {
  const sql = db();
  const rows = await sql.unsafe<Row[]>("update public.newsbeat_fast_collection set expires_at=$3 where beat_id=$1 and token_hash=$2 and expires_at>$3 returning beat_id,expires_at,last_attempt_at,last_success_at,last_error", [beatId, digest(token), new Date(now).toISOString()]);
  return { ...(rows[0] ? status(beatId, rows[0], now) : await readCollection(beatId, now)), stopped: rows.length > 0 };
}
export async function claimCollection(now = Date.now()): Promise<Array<{ beat_id: string; lease_token: string }>> {
  const sql = db(); await sql.unsafe(FAST_COLLECTION_SCHEMA);
  return sql.unsafe("update public.newsbeat_fast_collection set lease_token=$1,lease_until=to_timestamp($2)+interval '90 seconds',last_attempt_at=to_timestamp($2) where beat_id=any($3::text[]) and expires_at>to_timestamp($2) and (last_attempt_at is null or last_attempt_at<=to_timestamp($2)-interval '55 seconds') and (lease_until is null or lease_until<=to_timestamp($2)) returning beat_id,lease_token", [randomUUID(), now / 1000, [...PRIORITY_BEAT_IDS]]);
}
export async function finishCollection(beatId: string, lease: string, error: string | null, now = Date.now()) {
  await db().unsafe("update public.newsbeat_fast_collection set lease_token=null,lease_until=null,last_success_at=case when $3::text is null then to_timestamp($4) else last_success_at end,last_error=$3 where beat_id=$1 and lease_token=$2", [beatId, lease, error, now / 1000]);
}
