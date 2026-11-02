import assert from "node:assert/strict";
import { test } from "node:test";
import { UpstreamCache } from "./market-cache.js";

/** A clock we control, so TTL behaviour is tested rather than waited for. */
function clock(start = 1_000_000) {
  let now = start;
  return { now: () => now, advance: (ms: number) => { now += ms; } };
}

test("a fresh value is served without calling upstream again", async () => {
  const time = clock();
  const cache = new UpstreamCache(time.now);
  let calls = 0;
  const load = async () => { calls += 1; return "value"; };

  assert.equal((await cache.read("k", 1000, load)).value, "value");
  time.advance(500);
  assert.equal((await cache.read("k", 1000, load)).value, "value");
  assert.equal(calls, 1, "second read inside the TTL must not reach upstream");
});

test("a value just past its TTL is served stale while it refreshes", async () => {
  const time = clock();
  const cache = new UpstreamCache(time.now);
  let calls = 0;
  const load = async () => { calls += 1; return `v${calls}`; };

  assert.equal((await cache.read("k", 1000, load)).value, "v1");
  time.advance(1500);
  const second = await cache.read("k", 1000, load);
  // Inside the grace window the caller gets the old value immediately, not a wait.
  assert.equal(second.value, "v1");
  assert.equal(second.stale, true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const third = await cache.read("k", 1000, load);
  assert.equal(third.value, "v2", "the background refresh should have landed by now");
  assert.equal(calls, 2);
});

test("a stale value is served immediately while the refresh runs behind it", async () => {
  const time = clock();
  const cache = new UpstreamCache(time.now);
  let calls = 0;
  const gate: { release?: () => void } = {};
  const load = async () => {
    calls += 1;
    if (calls === 1) return "old";
    // The second load hangs until we release it, which is the slow-upstream case.
    await new Promise<void>((resolve) => { gate.release = resolve; });
    return "new";
  };

  assert.equal((await cache.read("k", 1000, load)).value, "old");
  time.advance(1500);

  // Stale but inside the grace window: answer now, refresh in the background.
  const stale = await cache.read("k", 1000, load);
  assert.equal(stale.value, "old");
  assert.equal(stale.stale, true, "a value past its TTL must be marked stale");

  gate.release?.();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const after = await cache.read("k", 1000, load);
  assert.equal(after.value, "new", "the background refresh should have landed");
});

test("concurrent callers on a cold cache share one upstream request", async () => {
  const time = clock();
  const cache = new UpstreamCache(time.now);
  let calls = 0;
  const load = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return "value";
  };

  // Ten callers arrive together with nothing cached. Without single-flight this is ten
  // requests to a rate-limited upstream, which is exactly how a free tier gets blocked.
  const results = await Promise.all(Array.from({ length: 10 }, () => cache.read("k", 1000, load)));
  assert.equal(calls, 1, "concurrent cold reads must collapse into one upstream call");
  assert.ok(results.every((result) => result.value === "value"));
});

test("a failed refresh keeps the last good value instead of erroring", async () => {
  const time = clock();
  const cache = new UpstreamCache(time.now);
  let calls = 0;
  const load = async () => {
    calls += 1;
    if (calls === 1) return "good";
    throw new Error("upstream is down");
  };

  assert.equal((await cache.read("k", 1000, load)).value, "good");
  time.advance(1500);
  const afterFailure = await cache.read("k", 1000, load);
  assert.equal(afterFailure.value, "good", "a blip must not turn a cached value into an error");
});

test("a cold failure propagates, because there is nothing to serve", async () => {
  const time = clock();
  const cache = new UpstreamCache(time.now);
  await assert.rejects(
    () => cache.read("k", 1000, async () => { throw new Error("nope"); }),
    /nope/,
  );
});

test("a value far past its grace window is not served", async () => {
  const time = clock();
  const cache = new UpstreamCache(time.now);
  let calls = 0;
  const load = async () => { calls += 1; return `v${calls}`; };

  await cache.read("k", 1000, load);
  // Well past TTL * 12: this is a cache that has not refreshed in hours.
  time.advance(1000 * 13 + 1);
  const result = await cache.read("k", 1000, load);
  assert.equal(result.value, "v2");
  assert.equal(calls, 2);
});

test("keys are independent", async () => {
  const time = clock();
  const cache = new UpstreamCache(time.now);
  const a = await cache.read("a", 1000, async () => "A");
  const b = await cache.read("b", 1000, async () => "B");
  assert.equal(a.value, "A");
  assert.equal(b.value, "B");
});
