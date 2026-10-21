import { test } from "node:test";
import assert from "node:assert/strict";
import {
  atomFeed,
  ingestionComponent,
  overall,
  statusDocument,
  MONITOR_STALE_MS,
} from "./operations-policy.js";
import type { OperationSnapshot } from "@newsbeat/contracts";
const now = Date.parse("2026-10-22T10:00:00Z");
const good: OperationSnapshot = {
  checked_at: new Date(now).toISOString(),
  status: "operational",
  components: [
    {
      id: "api",
      name: "News API",
      status: "operational",
      detail: "A valid response.",
    },
  ],
};
test("missing and delayed checks never imply current uptime", () => {
  assert.equal(statusDocument([], now).monitoring, "starting");
  assert.equal(statusDocument([], now).status, "unknown");
  assert.equal(
    statusDocument([good], now + MONITOR_STALE_MS + 1).status,
    "unknown",
  );
  assert.equal(
    statusDocument([good], now + MONITOR_STALE_MS + 1).monitoring,
    "delayed",
  );
  assert.equal(statusDocument([good], now - 120000).status, "unknown");
  assert.equal(statusDocument([good], now, false).monitoring, "unavailable");
  assert.equal(statusDocument([good], now).status, "operational");
});
test("ingestion measures every catalog topic against its own window", () => {
  const report = ingestionComponent(
    [
      { beat_id: "a", freshness_slo_minutes: 30 },
      { beat_id: "b", freshness_slo_minutes: 10 },
      { beat_id: "c", freshness_slo_minutes: 30 },
    ],
    [
      {
        beat_id: "a",
        last_success_at: new Date(now - 20 * 60000),
        last_checked_at: new Date(now - 20 * 60000),
      },
      {
        beat_id: "b",
        last_success_at: new Date(now - 20 * 60000),
        last_checked_at: new Date(now - 60000),
      },
    ],
    now,
  );
  assert.deepEqual(report.coverage, {
    total: 3,
    fresh: 1,
    stale: 1,
    unavailable: 1,
    failed_last_check: 1,
    last_success_at: new Date(now - 20 * 60000).toISOString(),
  });
  assert.equal(report.status, "degraded");
  assert.equal(
    ingestionComponent([{ beat_id: "a", freshness_slo_minutes: 30 }], [], now)
      .status,
    "outage",
  );
  assert.equal(
    ingestionComponent(
      [{ beat_id: "a", freshness_slo_minutes: 30 }],
      [{ beat_id: "a", last_success_at: "invalid", last_checked_at: null }],
      now,
    ).status,
    "outage",
  );
});
test("mixed component failures cannot become an all-clear", () => {
  const api = good.components[0]!;
  assert.equal(
    overall([api, { ...api, id: "mcp", status: "outage" }]),
    "degraded",
  );
  assert.equal(overall([{ ...api, status: "outage" }]), "outage");
  assert.equal(overall([]), "unknown");
});
test("Atom preserves observation timestamps and escapes publisher-facing text", () => {
  const report = {
    ...good,
    components: [
      { ...good.components[0]!, detail: '<script>"bad" & unsafe</script>' },
    ],
  };
  const feed = atomFeed(statusDocument([report], now + 1000));
  assert(
    feed.includes("&lt;script&gt;&quot;bad&quot; &amp; unsafe&lt;/script&gt;"),
  );
  assert(!feed.includes("<script>"));
  assert(feed.includes(`<updated>${good.checked_at}</updated>`));
  assert(!atomFeed(statusDocument([], now)).includes("<entry>"));
});
