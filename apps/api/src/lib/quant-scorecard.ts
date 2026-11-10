import type { ReviewCostScenario } from "@newsbeat/contracts";
import type { Sql } from "@newsbeat/db";

const MAX_RECORDS = 300;
const MIN_OBSERVATIONS = 20;
const FEE_BPS_PER_SIDE = 25;

interface ReviewSample {
  decision_at: Date | string;
  book_cost_bps: number | null;
  outcome_status: string | null;
  asset_return: number | null;
}

/** Select chronologically before looking at returns or whether the outcome settled. */
export function scoreReviewCosts(samples: ReviewSample[]): ReviewCostScenario {
  let previousTime = -Infinity;
  let overlapping = 0;
  let pending = 0;
  let missingCost = 0;
  let missingOutcome = 0;
  const adjusted: number[] = [];

  for (const sample of samples.slice(0, MAX_RECORDS)) {
    const at = new Date(sample.decision_at).getTime();
    // The 60-minute outcome may close up to ten minutes after its due time.
    if (at - previousTime < 70 * 60_000) {
      overlapping++;
      continue;
    }
    previousTime = at;

    if (sample.outcome_status === "pending") {
      pending++;
    } else if (sample.outcome_status !== "observed" || sample.asset_return === null || !Number.isFinite(sample.asset_return)) {
      missingOutcome++;
    } else if (sample.book_cost_bps === null || !Number.isFinite(sample.book_cost_bps) || sample.book_cost_bps < 0) {
      missingCost++;
    } else {
      adjusted.push(sample.asset_return * 10_000 - sample.book_cost_bps - 2 * FEE_BPS_PER_SIDE);
    }
  }

  const descriptive = adjusted.length >= MIN_OBSERVATIONS;
  return {
    status: descriptive ? "descriptive" : "collecting",
    horizon_minutes: 60,
    lookback_days: 30,
    reference_notional_usd: 1000,
    assumed_fee_bps_per_side: FEE_BPS_PER_SIDE,
    eligible: Math.min(samples.length, MAX_RECORDS) - overlapping,
    scored: adjusted.length,
    missing_cost: missingCost,
    missing_outcome: missingOutcome,
    pending,
    overlapping,
    truncated: samples.length > MAX_RECORDS,
    mean_adjusted_return_bps: descriptive ? adjusted.reduce((sum, value) => sum + value, 0) / adjusted.length : null,
    positive_fraction: descriptive ? adjusted.filter(value => value > 0).length / adjusted.length : null,
    note: "First review per event in the window, supportive directions only. Deducts frozen entry-book impact on both sides and an illustrative fee on each side from the later candle return. Exit liquidity and fills are unmeasured. This is a prospective cost scenario, not executable P&L, an expected return or a calibrated probability. Summary statistics appear after 20 scored observations.",
  };
}

export async function readReviewCosts(sql: Sql, beatId: string, contextId: string, policy: string, now: number) {
  const rows = await sql<ReviewSample[]>`
    with first_reviews as (
      select distinct on (event_id) decision_at, record
      from public.newsbeat_quant_evaluations
      where beat_id = ${beatId} and context_id = ${contextId} and policy_version = ${policy}
        and cohort = 'review_alert'
        and decision_at > to_timestamp(${now / 1000}) - interval '30 days'
        and decision_at <= to_timestamp(${now / 1000})
      order by event_id, decision_at, id
    )
    select decision_at, (record->>'reference_book_cost_bps')::double precision as book_cost_bps,
           outcome->>'status' as outcome_status,
           (outcome->>'asset_return')::double precision as asset_return
    from first_reviews
    left join lateral (
      select value as outcome
      from jsonb_array_elements(record->'outcomes')
      where value->>'horizon_minutes' = '60'
      limit 1
    ) outcome_at_horizon on true
    where record->'decision'->>'direction' = 'supportive'
    order by decision_at, record->>'id'
    limit ${MAX_RECORDS + 1}
  `;
  return scoreReviewCosts(rows);
}
