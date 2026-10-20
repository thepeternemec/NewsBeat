import postgres, { type Sql } from "postgres";

/**
 * Database access.
 *
 * Plain Postgres over a connection string — no SDK and no query builder in the
 * path, so the SQL is readable and portable and there is one runtime to reason
 * about.
 */

export function env(name: string): string | undefined {
  // Accept deployed legacy variable names during the brand migration.
  return process.env[name] ?? (name.startsWith("NEWSBEAT_")
    ? process.env[name.replace(/^NEWSBEAT_/, "NEWSGRAPH_")] : undefined);
}

export function hasDatabaseEnv(): boolean {
  return Boolean(env("DATABASE_URL"));
}

let client: Sql | null = null;

/**
 * A single pooled client for the process.
 *
 * `prepare: false` is required behind a transaction pooler (pgBouncer, which is
 * what most managed Postgres hands you): prepared statements are per-session
 * and the pooler will route successive queries to different backends.
 */
export function db(): Sql {
  const url = env("DATABASE_URL");
  if (!url) throw new Error("DATABASE_URL is not set");
  // The site asks for a dozen things at once (catalog, feed, ten clusters). With
  // a pool of one those serialise and the slowest query sets the page's latency.
  const max = Math.max(1, Number(env("NEWSBEAT_DB_POOL") ?? 5));
  client ??= postgres(url, { max, idle_timeout: 20, prepare: false });
  return client;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.end({ timeout: 2 });
    client = null;
  }
}

export type { Sql };
