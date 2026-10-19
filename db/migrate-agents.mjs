import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL for the intended environment');
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
try {
  await sql.unsafe(await readFile(new URL('./migrations/20261019-agent-connectors.sql', import.meta.url), 'utf8'));
  const [result] = await sql`select to_regclass('public.usage_reservations') is not null and to_regclass('public.news_subscriptions') is not null and to_regclass('public.news_documents') is not null as ready`;
  if (!result.ready) throw new Error('Schema verification failed');
  console.log('Agent connector migration applied and verified.');
} finally { await sql.end({ timeout: 5 }); }
