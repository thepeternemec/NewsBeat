import postgres, { type Sql } from "postgres";

/**
 * Database access.
 *
 * Plain Postgres over a connection string — no SDK and no query builder in the
 * path, so the SQL is readable and portable and there is one runtime to reason
 * about.
 */

export function env(name: string): string | undefined {
  // The variable names have been NEWSGRAPH_*, NEWSBEAT_*, BLACKSHEEP_* and back to
  // NEWSBEAT_*. Every name that has ever been deployed still resolves, so a deployment
  // never depends on the rename landing at the same instant as the code. The current
  // name wins, then the other two in the order they were introduced.
  const direct = process.env[name];
  if (direct !== undefined) return direct;
  if (name.startsWith("NEWSBEAT_")) {
    const suffix = name.slice("NEWSBEAT_".length);
    return process.env[`BLACKSHEEP_${suffix}`] ?? process.env[`NEWSGRAPH_${suffix}`];
  }
  return undefined;
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
