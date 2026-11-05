import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../components/site/landing-lookup-data.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const module = { exports: {} };
let response;
const calls = [];
new Function("exports", "fetch", outputText)(module.exports, async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => response }; });
const { findAssets, readCoverage, coverageLabel } = module.exports;
const signal = new AbortController().signal;
const id = "b_bb964843350e";
const fresh = { status: "fresh", last_success_at: "2026-11-05T20:00:00Z" };
const report = { id: "1", beat_id: id, title: "Original reporting", source: "Publisher", url: "https://example.com/report", published_at: fresh.last_success_at };

test("search preserves distinct stock and crypto identities for an ambiguous ticker", async () => {
  response = { topics: [{ beat_id: "b_012345678901", ticker: "SUI", label: "Sun Communities", asset: "equity" }, { beat_id: "b_012345678902", ticker: "SUI", label: "Sui", asset: "crypto" }] };
  const results = await findAssets("/api", " SUI & partners ", signal);
  assert.equal(results.length, 2);
  assert.notEqual(results[0].beat_id, results[1].beat_id);
  assert.equal(calls.at(-1).url, "/api/v2/topics?q=SUI%20%26%20partners&limit=6");
  assert.equal(calls.at(-1).options.signal, signal);
});
test("empty coverage is a valid result, while a report for another company is rejected", async () => {
  response = { items: [], freshness: fresh };
  assert.deepEqual((await readCoverage("/api", id, signal)).items, []);
  response = { items: [{ ...report, beat_id: "b_012345678901" }], freshness: fresh };
  await assert.rejects(readCoverage("/api", id, signal), /Invalid coverage/);
});
test("publisher links must be web URLs and reports need publication dates", async () => {
  for (const bad of [{ ...report, url: "javascript:alert(1)" }, { ...report, published_at: "invalid" }]) {
    response = { items: [bad], freshness: fresh };
    await assert.rejects(readCoverage("/api", id, signal), /Invalid coverage/);
  }
  response = { items: [report], freshness: fresh };
  assert.equal((await readCoverage("/api", id, signal)).items[0].title, report.title);
});
test("a stale page or unavailable collection cannot claim to be up to date", () => {
  const readAt = Date.parse(fresh.last_success_at);
  assert.equal(coverageLabel({ freshness: fresh }, readAt, readAt + 60_000), "Collection up to date");
  assert.equal(coverageLabel({ freshness: fresh }, readAt, readAt + 120_001), "Refresh needed");
  assert.equal(coverageLabel({ freshness: { ...fresh, status: "stale" } }, readAt, readAt), "Collection delayed");
  assert.equal(coverageLabel({ freshness: { ...fresh, status: "unavailable" } }, readAt, readAt), "Collection unconfirmed");
  assert.equal(coverageLabel({ freshness: { ...fresh, last_success_at: null } }, readAt, readAt), "Collection unconfirmed");
});
