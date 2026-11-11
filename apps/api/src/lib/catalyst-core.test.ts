import assert from "node:assert/strict";
import { test } from "node:test";
import type { CatalystCoverage, FilingEvidence } from "@newsbeat/contracts";
import { buildCatalystRadar, compareReportedConcept, FINANCIAL_CONCEPTS, filingUrl, OFFICIAL_ISSUERS, parseFilings } from "./catalyst-core.js";
import { officialResearchEvidence, readCatalysts } from "./catalysts.js";

const issuer = OFFICIAL_ISSUERS[0];
const now = Date.parse("2026-11-10T19:00:00Z");
const accession = "0001045810-26-000100";
const previousAccession = "0001045810-25-000100";
const filing: FilingEvidence = {
  id: `sec:${issuer.cik}:${accession}`, accession, form: "10-Q", accepted_at: "2026-11-10T17:00:00.000Z",
  filed_on: "2026-11-10", report_date: "2026-10-25", items: [], description: "Quarterly financial report",
  url: filingUrl(issuer.cik, accession),
};
const submission = () => ({ cik: Number(issuer.cik), filings: { recent: {
  accessionNumber: [accession], form: ["10-Q"], acceptanceDateTime: [filing.accepted_at],
  filingDate: [filing.filed_on], reportDate: [filing.report_date], primaryDocument: ["nvda-20261025.htm"], items: [""],
} } });
const fact = (value: number, start = "2026-07-27", end = "2026-10-25", filed = "2026-11-10", accn = accession) => ({
  val: value, start, end, filed, accn, form: "10-Q",
});
const concept = (facts: unknown[], unit = "USD") => ({ cik: Number(issuer.cik), taxonomy: "us-gaap",
  tag: FINANCIAL_CONCEPTS[0].concept, units: { [unit]: facts } });
const prior = (value = 100) => fact(value, "2025-07-28", "2025-10-26", "2025-11-10", previousAccession);

test("issuer filings preserve exact identities and acceptance time, exclude future and ownership filings", () => {
  const raw = submission();
  raw.filings.recent.accessionNumber.push("0001045810-26-000101", "0001045810-26-000102");
  raw.filings.recent.form.push("4", "8-K");
  raw.filings.recent.acceptanceDateTime.push("2026-11-10T18:00:00Z", "2026-11-11T00:00:00Z");
  const result = parseFilings(raw, issuer, now);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, filing.id);
  assert.ok(result[0]?.url.endsWith("/nvda-20261025.htm"));
  assert.throws(() => parseFilings({ ...raw, cik: 320193 }, issuer, now), /issuer_mismatch/);
});

test("filing links cannot traverse paths or leave the SEC origin", () => {
  assert.equal(new URL(filingUrl(issuer.cik, accession, "../../evil.htm")).hostname, "www.sec.gov");
  assert.ok(filingUrl(issuer.cik, accession, "https://evil.test/a.htm").endsWith("-index.html"));
  assert.throws(() => filingUrl(issuer.cik, "../../elsewhere"));
  const raw = submission();
  raw.filings.recent.acceptanceDateTime[0] = "2026-11-10T17:00:00";
  assert.deepEqual(parseFilings(raw, issuer, now), [], "ambiguous local times cannot become precise timestamps");
});

test("comparable reported figures use original prior-year values and exclude future revisions", () => {
  const revised = fact(40, "2025-07-28", "2025-10-26", "2026-12-01", "0001045810-26-000200");
  const reprinted = fact(50, "2025-07-28", "2025-10-26", "2026-11-10", accession);
  const result = compareReportedConcept(concept([fact(125), revised, reprinted, prior()]), issuer, FINANCIAL_CONCEPTS[0], [filing], now);
  assert.equal(result?.current.value, 125);
  assert.equal(result?.previous.value, 100);
  assert.equal(result?.change_percent, 25);
  assert.equal(result?.previous.filing_id, `sec:${issuer.cik}:${previousAccession}`);
});

test("incomparable currencies, durations, missing periods and nonpositive bases cannot manufacture growth", () => {
  assert.equal(compareReportedConcept(concept([fact(125), prior()], "EUR"), issuer, FINANCIAL_CONCEPTS[0], [filing], now), null);
  const ytd = fact(100, "2025-01-27", "2025-10-26", "2025-11-10", previousAccession);
  assert.equal(compareReportedConcept(concept([fact(125), ytd]), issuer, FINANCIAL_CONCEPTS[0], [filing], now), null);
  const loss = compareReportedConcept(concept([fact(25), prior(-10)]), issuer, FINANCIAL_CONCEPTS[0], [filing], now);
  assert.equal(loss?.change, 35);
  assert.equal(loss?.change_percent, null);
  assert.equal(compareReportedConcept(concept([fact(125)]), issuer, FINANCIAL_CONCEPTS[0], [filing], now), null);
});

const coverage = (status: CatalystCoverage["status"] = "fresh"): CatalystCoverage => ({
  ...issuer, status, checked_at: new Date(now).toISOString(), last_attempt_at: new Date(now).toISOString(), error: null,
  snapshot: { version: "official-evidence-v1", ...issuer, checked_at: new Date(now).toISOString(),
    filings: [filing], comparisons: [], missing_concepts: [] },
});

test("filing radar expires old events and excludes stale or unavailable source snapshots", () => {
  assert.equal(buildCatalystRadar([coverage()], 6, now).items.length, 1);
  assert.equal(buildCatalystRadar([coverage("stale")], 6, now).items.length, 0);
  assert.equal(buildCatalystRadar([coverage()], 6, now + 4 * 86_400_000).items.length, 0);
  assert.equal(buildCatalystRadar([coverage("unavailable")], 6, now).status, "unavailable");
  assert.equal(officialResearchEvidence(coverage("stale")).length, 0);
  assert.match(officialResearchEvidence(coverage())[0]!.text, /contents and changes to guidance have not been extracted/);
});

test("public catalyst reads validate input and disclose unsupported crypto coverage", async () => {
  await assert.rejects(() => readCatalysts({ limit: 0 }), /integer limit/);
  const result = await readCatalysts({ beat_id: "b_06c91290de1c" });
  assert.equal(result.coverage[0]?.status, "unsupported");
  assert.deepEqual(result.items, []);
});
