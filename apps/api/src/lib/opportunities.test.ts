import assert from "node:assert/strict";
import { test } from "node:test";
import { QUANT_POLICY_VERSION, type IntelligenceResponse } from "@newsbeat/contracts";
import { buildOpportunityBrief } from "./opportunities.js";
import { discoverMarket } from "./quant-anomaly.js";
import { buildMarketContext } from "./quant-engine.js";
import { quantitativeFixture } from "./quant-fixtures.js";
import { scoreReviewCosts } from "./quant-scorecard.js";

test("independent dislocations stay in watch and expire with the market data", () => {
  const f = quantitativeFixture(Date.now(), 0.003);
  const market = buildMarketContext(f.profile, f.snapshots, f.now);
  const research = discoverMarket(f.profile, f.snapshots, market, [], false, f.now);
  const now = new Date(f.now).toISOString();
  const output: IntelligenceResponse = {
    beat_id: f.signal.beat_id, label: "NVIDIA", context: f.context, pilot: true,
    generated_at: now, status: "pending", freshness: { status: "fresh", last_success_at: now },
    analysis: { last_success_at: null, last_attempt_at: null, error: null, coverage_truncated: false },
    signals: [], constructions: [], alerts: [],
    quantitative: {
      policy_version: QUANT_POLICY_VERSION, computed_at: now, context_id: f.context.id,
      market, research, decisions: [], evaluations: [],
      evaluation: { observations: 0, alerts: 0, horizons: [], review_horizons: [], note: "" },
    },
  };
  const current = buildOpportunityBrief([output], f.context.id, 6, f.now);
  assert.equal(current.review.length, 0);
  assert.equal(current.watch.length, 1);
  assert.equal(current.watch[0]?.reporting_status, "pending");
  const expired = buildOpportunityBrief([output], f.context.id, 6, f.now + 11 * 60_000);
  assert.equal(expired.status, "unavailable");
  assert.deepEqual(expired.watch, []);
});

test("forward scorecard counts missing observations and excludes overlapping outcomes before scoring", () => {
  const now = Date.now();
  const row = (minutes: number, assetReturn: number | null, bookCost: number | null, status = "observed") => ({
    decision_at: new Date(now + minutes * 60_000), asset_return: assetReturn,
    book_cost_bps: bookCost, outcome_status: status,
  });
  const rows = [
    row(0, null, 10, "expired"),
    row(60, 0.9, 10),
    row(75, 0.04, null),
    row(150, null, 10, "pending"),
    ...Array.from({ length: 20 }, (_, i) => row(225 + i * 75, i % 2 ? 0.005 : 0.01, 10)),
  ];
  const scored = scoreReviewCosts(rows);
  assert.equal(scored.scored, 20);
  assert.equal(scored.overlapping, 1);
  assert.equal(scored.missing_cost, 1);
  assert.equal(scored.missing_outcome, 1);
  assert.equal(scored.pending, 1);
  assert.equal(scored.mean_adjusted_return_bps, 15);
  assert.equal(scored.positive_fraction, 0.5);
  assert.equal(scoreReviewCosts(rows.slice(0, -1)).mean_adjusted_return_bps, null);
});
