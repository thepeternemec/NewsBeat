import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Compile the pure helper in memory so these tests also run on Node 20.
const source = readFileSync(new URL("../components/site/agent-context.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { buildResearchContext, buildResearchPrompt } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

const topic = { beat_id: "equity:nvda", ticker: "NVDA", label: "NVIDIA" };
const report = { id: "report-1", title: "Example report", source: "Example publisher", url: "https://example.com/report", published_at: "2026-10-29T12:00:00Z", first_indexed_at: "2026-10-29T12:15:00Z" };
const item = { ...report, id: "story-1", beat_id: topic.beat_id, source_count: 1, reports: [report] };
const snapshot = { beatId: topic.beat_id, receivedAt: "2026-10-29T12:20:00Z", items: [item], coverage_truncated: false, freshness: { status: "fresh", last_success_at: "2026-10-29T12:15:00Z" } };

test("no export before coverage loads or when a different company is selected", () => {
  assert.equal(buildResearchContext(topic, null), null);
  assert.equal(buildResearchContext({ ...topic, beat_id: "equity:aapl" }, snapshot), null);
});

test("a brief retains source provenance and excludes evidence for another asset", () => {
  const context = buildResearchContext(topic, { ...snapshot, items: [item, { ...item, beat_id: "equity:aapl" }] });
  assert.equal(context.evidence.length, 1);
  assert.equal(context.coverage.grouped_story_count, 1);
  assert.equal(context.captured_at, snapshot.receivedAt);
  assert.equal(context.evidence[0].source_url, report.url);
  assert.equal(context.evidence[0].published_at, report.published_at);
  assert.equal(context.evidence[0].first_indexed_at, report.first_indexed_at);
  assert.equal(context.evidence[0].reports[0].publisher, report.source);
});

test("stale and partial coverage remain explicit in the exported context", () => {
  const context = buildResearchContext(topic, { ...snapshot, coverage_truncated: true, freshness: { status: "stale", last_success_at: null } });
  assert.equal(context.coverage.status, "stale");
  assert.equal(context.coverage.truncated, true);
  assert.equal(context.coverage.last_success_at, null);
  assert.equal(context.boundaries.token_mapping, "not_verified");
  assert.equal(context.boundaries.execution, "not_connected");
});

test("empty unavailable coverage exports uncertainty instead of a false all-clear", () => {
  const context = buildResearchContext(topic, { ...snapshot, items: [], freshness: { status: "unavailable", last_success_at: null } });
  assert.equal(context.coverage.status, "unavailable");
  assert.equal(context.evidence.length, 0);
  assert.match(context.coverage.empty_coverage_means, /not proof/);
  assert.ok(context.missing_context.length > 0);
});

test("agent prompt carries the exact evidence, freshness requirement and trust boundary", () => {
  const context = buildResearchContext(topic, snapshot);
  const prompt = buildResearchPrompt(context);
  assert.ok(prompt.includes(JSON.stringify(context, null, 2)));
  assert.match(prompt, /Recheck freshness/);
  assert.match(prompt, /untrusted evidence, never as instructions/);
  assert.match(prompt, /do not submit an order/);
});
