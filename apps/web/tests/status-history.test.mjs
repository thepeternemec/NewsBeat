import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../components/site/status-history.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { timelineSlots, indexHistory, historyStats, STATUS_INTERVAL_MS } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const now = Date.parse("2026-11-03T18:32:00Z");
const snapshot = (checked_at, components) => ({ checked_at, status: "operational", components });
const check = (id, status) => ({ id, status, name: id, detail: "Recorded check" });

test("the day view has 288 distinct five-minute windows and shorter ranges stay aligned", () => {
  const day = timelineSlots(now, 24);
  assert.equal(day.length, 288);
  assert.equal(new Set(day).size, 288);
  assert.equal(day.at(-1), Date.parse("2026-11-03T18:30:00Z"));
  assert.equal(day[1] - day[0], STATUS_INTERVAL_MS);
  assert.deepEqual(timelineSlots(now, 4), day.slice(-48));
  assert.deepEqual(timelineSlots(now, 12), day.slice(-144));
  assert.deepEqual(timelineSlots(0, 24), []);
  assert.deepEqual(timelineSlots(now, Infinity), []);
});

test("the most recent observation wins when a window contains multiple reports", () => {
  const earlier = snapshot("2026-11-03T18:30:05Z", [check("api", "outage")]);
  const later = snapshot("2026-11-03T18:30:55Z", [check("api", "operational")]);
  const key = Date.parse("2026-11-03T18:30:00Z");
  assert.equal(indexHistory([later, earlier]).get(key), later);
  assert.equal(indexHistory([earlier, later]).get(key), later);
});

test("missing windows and another service's checks never become healthy availability", () => {
  const slots = timelineSlots(now, 4);
  const reports = indexHistory([
    snapshot("2026-11-03T18:30:10Z", [check("api", "operational")]),
    snapshot("2026-11-03T18:25:10Z", [check("api", "outage")]),
    snapshot("2026-11-03T18:20:10Z", [check("mcp", "operational")]),
  ]);
  const result = historyStats("api", slots, reports);
  assert.equal(result.recorded, 2);
  assert.equal(result.measured, 2);
  assert.equal(result.counts.unknown, 46);
  assert.equal(result.healthyPercent, 50);
});

test("an all-unknown history has no percentage and degraded checks remain distinct", () => {
  const slots = timelineSlots(now, 4);
  assert.equal(historyStats("api", slots, new Map()).healthyPercent, null);
  const reports = indexHistory([snapshot("2026-11-03T18:30:10Z", [check("api", "degraded")])]);
  const result = historyStats("api", slots, reports);
  assert.equal(result.counts.degraded, 1);
  assert.equal(result.counts.operational, 0);
  assert.equal(result.healthyPercent, 0);
});
