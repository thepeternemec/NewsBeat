/**
 * API keys and rate limiting.
 *
 * A key is a bearer token with no meaning beyond "this caller may go faster".
 * Only its SHA-256 is stored, so a database leak does not yield working keys,
 * and the plaintext is shown once at issue time and never again.
 */
import type { Sql } from "./client.js";

const KEY_PREFIX = "ng_";

/** 32 random bytes, hex. Long enough that guessing is not a threat model. */
export function newSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return KEY_PREFIX + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashKey(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface ResolvedKey {
  keyHash: string;
  label: string;
}

/** Null for an unknown or revoked key — the caller is treated as anonymous. */
export async function resolveKey(sql: Sql, secret: string): Promise<ResolvedKey | null> {
  const keyHash = await hashKey(secret);
  const rows = await sql<Array<{ key_hash: string; label: string }>>`
    select key_hash, label from public.api_keys
    where key_hash = ${keyHash} and revoked_at is null
    limit 1`;
  const row = rows[0];
  if (!row) return null;
  // Fire-and-forget: a failed touch must never fail the request it rode in on.
  sql`update public.api_keys set last_used_at = now() where key_hash = ${keyHash}`.catch(() => {});
  return { keyHash: row.key_hash, label: row.label };
}

export async function createKey(sql: Sql, label: string, accountId?: string): Promise<string> {
  const secret = newSecret();
  await sql`insert into public.api_keys (key_hash, label, account_id) values (${await hashKey(secret)}, ${label}, ${accountId ?? null})`;
  return secret;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window rolls over. */
  resetSeconds: number;
}

/**
 * Count one request against a bucket, and say whether it is allowed.
 *
 * The upsert does the increment and the read in one round trip, so concurrent
 * requests serialise on the primary key rather than racing on a select-then-set.
 */
export async function consumeRateLimit(sql: Sql, bucket: string, limit: number): Promise<RateLimitResult> {
  const rows = await sql<Array<{ count: number; window_start: Date }>>`
    insert into public.api_usage (bucket, window_start, count)
    values (${bucket}, date_trunc('minute', now()), 1)
    on conflict (bucket, window_start) do update set count = public.api_usage.count + 1
    returning count, window_start`;
  const row = rows[0];
  const count = row?.count ?? 1;
  const started = row?.window_start ? new Date(row.window_start).getTime() : Date.now();
  const resetSeconds = Math.max(1, Math.ceil((started + 60_000 - Date.now()) / 1000));
  return { allowed: count <= limit, limit, remaining: Math.max(0, limit - count), resetSeconds };
}

/** Drop windows that can no longer be counted against. Run from the cron. */
export async function sweepUsage(sql: Sql): Promise<number> {
  const rows = await sql<Array<{ deleted: number }>>`
    with gone as (delete from public.api_usage where window_start < now() - interval '1 hour' returning 1)
    select count(*)::int as deleted from gone`;
  return rows[0]?.deleted ?? 0;
}

/**
 * A GitHub identity, as this service needs it.
 *
 * Login is the display name; email is optional on GitHub and frequently hidden, so
 * it cannot be the identity. The numeric id is stable across renames and is what
 * an account is keyed on.
 */
export interface GithubIdentity {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
}

export interface Account {
  accountId: string;
  login: string | null;
  email: string | null;
}

/**
 * Find or create the account for a GitHub user.
 *
 * Idempotent: signing in twice returns the same account rather than creating a
 * second one, which matters because the second sign-in is the common case and a
 * duplicate account would issue a duplicate key with a separate rate-limit
 * allowance.
 */
export async function findOrCreateAccount(sql: Sql, identity: GithubIdentity): Promise<Account> {
  const githubId = String(identity.id);
  const rows = await sql<Array<{ account_id: string; github_login: string | null; email: string | null }>>`
    insert into public.accounts (github_user_id, github_login, email, display_name)
    values (${githubId}, ${identity.login}, ${identity.email}, ${identity.name ?? identity.login})
    on conflict (github_user_id) do update
      set github_login = excluded.github_login,
          display_name = coalesce(excluded.display_name, public.accounts.display_name)
    returning account_id, github_login, email`;
  const row = rows[0]!;
  return { accountId: row.account_id, login: row.github_login, email: row.email };
}

/**
 * Issue a key belonging to an account.
 *
 * A second call **revokes the account's previous key** in the same transaction.
 * Rotating silently is friendlier than accumulating: an account with five live
 * keys has five times the allowance whether it needs it or not, and the earlier
 * ones are the ones nobody remembers holding.
 */
export async function issueKeyForAccount(sql: Sql, accountId: string, label = "self-serve"): Promise<string> {
  const secret = newSecret();
  const keyHash = await hashKey(secret);
  await sql.begin(async (tx) => {
    await tx`update public.api_keys set revoked_at = now()
             where account_id = ${accountId} and revoked_at is null`;
    await tx`insert into public.api_keys (key_hash, label, account_id)
             values (${keyHash}, ${label}, ${accountId})`;
  });
  return secret;
}

/** The account's live key, described without ever revealing the secret. */
export async function describeKeyForAccount(sql: Sql, accountId: string) {
  const rows = await sql<Array<{ label: string; created_at: Date; last_used_at: Date | null }>>`
    select label, created_at, last_used_at
    from public.api_keys
    where account_id = ${accountId} and revoked_at is null
    order by created_at desc limit 1`;
  const row = rows[0];
  if (!row) return null;
  return { label: row.label, createdAt: new Date(row.created_at).toISOString(), lastUsedAt: row.last_used_at ? new Date(row.last_used_at).toISOString() : null };
}
