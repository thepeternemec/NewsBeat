/**
 * The batch watch.
 *
 * Its whole value is that a caller can send fifty topics and act on the ones that
 * moved. That only works if one bad entry cannot sink the call — an expired cursor
 * is the *normal* state of a long-running watch, not an exceptional one, so a batch
 * that failed wholesale because one topic rotated would be unusable for exactly the
 * case batches exist for.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { hasDatabaseEnv } from "@newsbeat/db";
import { NEWS_TOOLS } from "@newsbeat/contracts";
import { WATCH_LIMIT, newsPage, watchMany } from "./news.js";

const NVDA = "b_bb964843350e";
const SPCX = "b_7883c6d63df4";

test("a bad entry fails only itself", async (t) => {
  if (!hasDatabaseEnv()) {
    t.skip("no DATABASE_URL — the shape assertions above need a database");
    return;
  }
  const a = await newsPage(NVDA);
  const out = await watchMany([
    { beat_id: NVDA, cursor: a.cursor }, // valid
    { beat_id: NVDA, cursor: "not-a-cursor" }, // expired or forged
    { beat_id: "b_ffffffffffff", cursor: "" }, // not a topic
  ]);

  assert.equal(out.checked, 3);
  assert.equal(out.failed, 2, "two entries are bad");

  assert.equal(out.results[0]!.error, null);
  assert.ok(out.results[0]!.cursor, "a valid watch gets a fresh cursor back");

  assert.equal(out.results[1]!.error?.code, "invalid_cursor");
  assert.equal(out.results[1]!.cursor, null);

  assert.equal(out.results[2]!.error?.code, "unknown_topic");

  // The valid entry is unaffected by the two failures around it.
  assert.equal(out.results[0]!.moved, false);
  assert.deepEqual(out.results[0]!.items, []);
});

test("a batch reports how much needed attention", async (t) => {
  if (!hasDatabaseEnv()) {
    t.skip("no DATABASE_URL");
    return;
  }
  const a = await newsPage(NVDA);
  const b = await newsPage(SPCX);
  const out = await watchMany([
    { beat_id: NVDA, cursor: a.cursor },
    { beat_id: SPCX, cursor: b.cursor },
  ]);
  assert.equal(out.checked, 2);
  assert.equal(out.failed, 0);
  // Baselines taken immediately before the call should have nothing behind them.
  assert.equal(out.moved, 0);
  assert.equal(out.results.every((r) => r.cursor), true);
});

test("the batch is capped", async (t) => {
  if (!hasDatabaseEnv()) {
    t.skip("no DATABASE_URL");
    return;
  }
  const many = Array.from({ length: WATCH_LIMIT + 10 }, () => ({ beat_id: NVDA, cursor: "" }));
  const out = await watchMany(many);
  assert.equal(out.checked, WATCH_LIMIT, `expected at most ${WATCH_LIMIT} watches to be checked`);
});

test("the advertised schema matches the enforced cap", () => {
  // This one needs no database, which matters: every other test in this file is
  // skipped without one, and a file that skips entirely reads as coverage. This
  // asserts the number an agent is told and the number the server enforces are
  // the same number.
  const tool = NEWS_TOOLS.find((t) => t.name === "newsbeat_watch");
  assert.ok(tool, "newsbeat_watch must be in NEWS_TOOLS");

  const watches = (tool.inputSchema as { properties?: { watches?: { maxItems?: number } } })
    .properties?.watches;
  assert.equal(watches?.maxItems, WATCH_LIMIT, "the schema's maxItems must equal the enforced limit");

  // Every tool rejects unknown arguments, so a typo is an error rather than a
  // silently ignored field.
  for (const t of NEWS_TOOLS) {
    assert.equal(
      (t.inputSchema as { additionalProperties?: boolean }).additionalProperties,
      false,
      `${t.name} should reject unknown arguments`,
    );
  }
});
