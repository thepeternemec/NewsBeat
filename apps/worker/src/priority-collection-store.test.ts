import assert from "node:assert/strict";
import { test } from "node:test";
import { db, closeDb, FAST_COLLECTION_SCHEMA, readCollection, startCollection, stopCollection, claimCollection, finishCollection } from "@newsbeat/db";
import { runRequestedIngestion } from "./index.js";
const connection = process.env.NEWSBEAT_INTELLIGENCE_TEST_DATABASE_URL;
if (connection) { const u = new URL(connection); if (!["localhost", "127.0.0.1"].includes(u.hostname) || u.pathname !== "/newsbeat_intelligence_test") throw new Error("Dedicated local test database required."); }
test("requested collection is opt-in, shared, leased, cancellable and expires without renewal", { skip: !connection, timeout: 20000 }, async () => {
  process.env.DATABASE_URL = connection!;
  const sql = db(), beat = "b_bb964843350e", now = Date.now();
  let clock = now, calls = 0;
  const dependencies = { now: () => clock, collect: async (beats: Array<{ beat_id: string; label: string }>) => { calls += beats.length; return { beats: beats.length, calls: beats.length, inserted: 0, results: beats.map(b => ({ beat_id: b.beat_id, label: b.label, fetched: 0, inserted: 0 })) }; } };
  try {
    await sql.unsafe(FAST_COLLECTION_SCHEMA); await sql.unsafe("truncate public.newsbeat_fast_collection");
    assert.equal((await readCollection(beat, clock)).active, false);
    assert.equal((await runRequestedIngestion(dependencies)).calls, 0); assert.equal(calls, 0);
    const started = await startCollection(beat, clock); assert.ok(started.session_token); assert.equal(started.started, true);
    const duplicate = await startCollection(beat, clock + 10000); assert.equal(duplicate.started, false); assert.equal(duplicate.expires_at, started.expires_at); assert.equal(duplicate.session_token, undefined);
    assert.equal((await runRequestedIngestion(dependencies)).calls, 1);
    assert.equal((await runRequestedIngestion(dependencies)).calls, 0);
    clock += 60000;
    const claims = await claimCollection(clock); assert.equal(claims.length, 1);
    assert.equal((await claimCollection(clock + 60000)).length, 0, "overlapping workers cannot repeat a leased request");
    await finishCollection(beat, claims[0]!.lease_token, null, clock);
    assert.equal((await stopCollection(beat, "0".repeat(64), clock)).active, true, "another caller cannot cancel the session");
    assert.equal((await stopCollection(beat, started.session_token!, clock)).stopped, true);
    clock += 60000; assert.equal((await runRequestedIngestion(dependencies)).calls, 0);
    const again = await startCollection(beat, clock); assert.ok(again.started);
    clock += 15 * 60000 + 1;
    assert.equal((await readCollection(beat, clock)).active, false);
    assert.equal((await runRequestedIngestion(dependencies)).calls, 0, "expiry never renews itself");
    const rows = await sql.unsafe<Array<{ token_hash: string }>>("select token_hash from public.newsbeat_fast_collection");
    assert.notEqual(rows[0]!.token_hash, again.session_token, "raw cancellation tokens are never persisted");
  } finally { await closeDb(); }
});
