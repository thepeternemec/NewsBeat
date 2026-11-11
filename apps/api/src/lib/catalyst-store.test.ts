import assert from "node:assert/strict";
import { test } from "node:test";
import { closeDb, db } from "@newsbeat/db";
import { CATALYST_SCHEMA, readCatalysts, runOfficialEvidence } from "./catalysts.js";
import { readOpportunities } from "./opportunities.js";

const connection = process.env.NEWSBEAT_INTELLIGENCE_TEST_DATABASE_URL;
if (connection) {
  const url = new URL(connection);
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/newsbeat_intelligence_test") {
    throw new Error("Official evidence tests require the dedicated localhost database.");
  }
}

test("scheduler persists evidence, public reads reuse it, and refresh failures hold candidates", { skip: !connection, timeout: 45_000 }, async () => {
  process.env.DATABASE_URL = connection!;
  const sql = db();
  try {
    await sql.unsafe(CATALYST_SCHEMA);
    await sql`truncate public.newsbeat_official_evidence`;
    const now = Date.now();
    const day = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString().slice(0, 10);
    const acceptance = new Date(now - 3_600_000).toISOString();
    let calls = 0;
    const upstream: typeof fetch = async (input, init) => {
      calls++;
      const url = new URL(String(input));
      assert.equal(url.origin, "https://data.sec.gov");
      assert.match(new Headers(init?.headers).get("user-agent") ?? "", /contact@newsbeat\.dev/);
      const cik = url.pathname.match(/CIK(\d{10})/)![1]!;
      const accession = `${cik}-26-000100`;
      if (url.pathname.startsWith("/submissions/")) return Response.json({ cik, filings: { recent: {
        accessionNumber: [accession], form: ["10-Q"], acceptanceDateTime: [acceptance],
        filingDate: [day(0)], reportDate: [day(10)], items: [""], primaryDocument: ["quarter.htm"],
      } } });
      return Response.json({ cik: Number(cik), taxonomy: "us-gaap", tag: url.pathname.split("/").at(-1)!.replace(/\.json$/, ""), units: { USD: [
        { start: day(100), end: day(10), val: 125, accn: accession, filed: day(0), form: "10-Q" },
        { start: day(464), end: day(374), val: 100, accn: `${cik}-25-000100`, filed: day(364), form: "10-Q" },
      ] } });
    };
    const first = await runOfficialEvidence(upstream);
    const second = await runOfficialEvidence(upstream);
    assert.equal(first.status, "updated");
    assert.equal(second.status, "updated");
    assert.notEqual(first.beat_id, second.beat_id);
    assert.equal(calls, 8);
    const radar = await readCatalysts({});
    assert.equal(radar.status, "partial");
    assert.equal(radar.items.length, 2);
    assert.ok(radar.items.every(item => item.reported_revenue?.change_percent === 25));
    assert.equal(radar.coverage.find(asset => asset.beat_id === first.beat_id)?.snapshot?.comparisons.length, 3);
    assert.equal((await readOpportunities({ limit: 1 })).catalysts.items.length, 1);
    assert.equal(calls, 8, "public reads never fetch the upstream source");

    await sql`update public.newsbeat_official_evidence set last_attempt_at = now() where beat_id <> ${first.beat_id!}`;
    await sql`update public.newsbeat_official_evidence set last_attempt_at = now() - interval '16 minutes' where beat_id = ${first.beat_id!}`;
    const failed = await runOfficialEvidence(async () => new Response(null, { status: 503 }));
    assert.equal(failed.beat_id, first.beat_id);
    assert.equal(failed.status, "source_unavailable");
    const held = await readCatalysts({ beat_id: first.beat_id });
    assert.equal(held.coverage[0]?.status, "stale");
    assert.equal(held.coverage[0]?.snapshot?.comparisons.length, 3);
    assert.deepEqual(held.items, []);
  } finally {
    await closeDb();
  }
});
