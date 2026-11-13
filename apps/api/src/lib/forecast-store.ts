import { db, hasDatabaseEnv, type Sql } from "@newsbeat/db";
import { type MarketBar, type MarketForecast, type MarketForecasts, type MarketSnapshot, type MoveRiskForecast } from "@newsbeat/contracts";
import {
  buildHourlyForecast, FORECAST_HOUR, FORECAST_ISSUE_WINDOW, FORECAST_LOOKBACK_DAYS, FORECAST_MARKETS,
  FORECAST_MISSING_AFTER_HOURS, FORECAST_VERSION,
} from "./forecast.js";
import { buildMoveRisk, moveRiskHistory, MOVE_RISK_VERSION, MOVE_THRESHOLD } from "./move-risk.js";

type ForecastAsset = MarketForecasts["assets"][number];
type ScoreRow = ForecastAsset["scorecard"] & { instrument_id: string; version: string };
type ForecastRow<T = MarketForecast> = { instrument_id: string; forecast: T; version: string };
type OutcomeRow = ForecastRow & Pick<ForecastAsset["recent"][number], "outcome" | "target_price_usd">;
const iso = (time: number) => new Date(time).toISOString();

export async function readMarketForecasts(now = Date.now()): Promise<MarketForecasts> {
  let scores: ScoreRow[] = [], active: ForecastRow<MarketForecast | MoveRiskForecast>[] = [], recent: OutcomeRow[] = [];
  let status: MarketForecasts["status"] = "unavailable";
  if (hasDatabaseEnv()) {
    try {
      const sql = db(), at = iso(now), since = iso(now - FORECAST_LOOKBACK_DAYS * 24 * FORECAST_HOUR);
      const ids = FORECAST_MARKETS.map(market => market.id);
      [scores, active, recent] = await Promise.all([
        sql.unsafe<ScoreRow[]>(`
          select instrument_id,version,count(*)::int as issued,count(*) filter (where outcome='pending')::int as pending,
          count(*) filter (where outcome in ('above','at_or_below'))::int as scored,
          count(*) filter (where outcome='missing')::int as missing,
          avg(power(model-event,2)) filter (where outcome in ('above','at_or_below')) as model_brier,
          avg(power(baseline-event,2)) filter (where outcome in ('above','at_or_below')) as baseline_brier
          from (
            select instrument_id,version,outcome,
              coalesce(forecast->>'probability_above',forecast->>'probability')::double precision as model,
              (forecast->>'baseline_probability')::double precision as baseline,
              case when version=$5 then
                (abs(target_price_usd-(forecast->>'reference_price_usd')::double precision)
                  /(forecast->>'reference_price_usd')::double precision >= $6::double precision-1e-12)::int
              else (outcome='above')::int end as event
            from public.newsbeat_market_forecasts where version in ($1,$5) and issued_at between $2 and $3
            and instrument_id=any($4::text[])
          ) forecasts group by instrument_id,version
        `, [FORECAST_VERSION, since, at, ids, MOVE_RISK_VERSION, MOVE_THRESHOLD]),
        sql.unsafe<ForecastRow<MarketForecast | MoveRiskForecast>[]>(
          "select instrument_id,version,forecast from public.newsbeat_market_forecasts where version in ($1,$5) and issued_at between $2 and $3 and target_at>$3 and instrument_id=any($4::text[])",
          [FORECAST_VERSION, iso(now - FORECAST_HOUR), at, ids, MOVE_RISK_VERSION]),
        sql.unsafe<OutcomeRow[]>(`
          select instrument_id,version,forecast,outcome,target_price_usd from unnest($4::text[]) as markets(id)
          cross join lateral (
            select instrument_id,version,forecast,outcome,target_price_usd from public.newsbeat_market_forecasts
            where instrument_id=markets.id and version=$1 and issued_at between $2 and $3 and outcome<>'pending'
            order by reference_at desc limit 5
          ) results order by instrument_id,(forecast->>'target_at') desc
        `, [FORECAST_VERSION, since, at, ids]),
      ]);
      status = scores.length ? "ready" : "warming_up";
    } catch (error) {
      if ((error as { code?: string }).code === "42P01") status = "warming_up";
      else console.warn("market forecast read unavailable");
    }
  }
  return {
    generated_at: iso(now), status, model_version: FORECAST_VERSION, horizon_minutes: 60, scorecard_days: FORECAST_LOOKBACK_DAYS,
    assets: FORECAST_MARKETS.map(market => {
      const scorecard = (version: string): ForecastAsset["scorecard"] => {
        const score = scores.find(row => row.instrument_id === market.id && row.version === version);
        return { issued: score?.issued ?? 0, pending: score?.pending ?? 0, scored: score?.scored ?? 0,
          missing: score?.missing ?? 0, model_brier: score?.model_brier ?? null, baseline_brier: score?.baseline_brier ?? null };
      };
      const stored = (version: string) => active.find(row => row.instrument_id === market.id && row.version === version)?.forecast;
      const direction = stored(FORECAST_VERSION), risk = stored(MOVE_RISK_VERSION);
      return {
        ticker: market.ticker, pair: market.pair, forecast: direction && "probability_above" in direction ? direction : null,
        scorecard: scorecard(FORECAST_VERSION),
        move_risk: { model_version: MOVE_RISK_VERSION, forecast: risk && "probability" in risk ? risk : null, scorecard: scorecard(MOVE_RISK_VERSION) },
        recent: recent.filter(row => row.instrument_id === market.id).map(({ forecast, outcome, target_price_usd }) => ({
          target_at: forecast.target_at, probability_above: forecast.probability_above,
          reference_price_usd: forecast.reference_price_usd, outcome, target_price_usd,
        })),
      };
    }),
  };
}

/** The existing market worker owns issuance. Public requests only read its journal. */
export async function refreshMarketForecasts(sql: Sql, token: string, snapshots: Map<string, MarketSnapshot>, latest: Set<string>, clock: () => number) {
  const now = clock(), reference = Math.floor(now / FORECAST_HOUR) * FORECAST_HOUR;
  const candidates = FORECAST_MARKETS.filter(market => {
    const snapshot = snapshots.get(market.id);
    return latest.has(market.id) && snapshot?.instrument.id === market.id && snapshot.instrument.status === "online"
      && Date.parse(snapshot.observed_at) >= reference && Date.parse(snapshot.observed_at) <= now;
  });
  const calls: Array<{ id: string; version: string; forecast: MarketForecast | MoveRiskForecast }> = [];
  if (candidates.length && now <= reference + FORECAST_ISSUE_WINDOW) {
    const history = await sql.unsafe<Array<MarketBar & { instrument_id: string }>>(
      `select instrument_id,extract(epoch from started_at)::double precision*1000 as time,
       open_price as open,high_price as high,low_price as low,close_price as close,volume,trades
       from public.newsbeat_market_bars where instrument_id=any($1::text[]) and started_at >= $2
       and started_at < $3 and observed_at <= $4 order by instrument_id,started_at`,
      [candidates.map(market => market.id), iso(reference - (24 * FORECAST_LOOKBACK_DAYS + 5) * FORECAST_HOUR), iso(reference), iso(now)]);
    const issued = clock();
    for (const market of candidates) {
      const bars = history.filter(row => row.instrument_id === market.id);
      const risk = buildMoveRisk(moveRiskHistory(bars), reference, issued, market.url);
      if (risk) calls.push({ id: market.id, version: MOVE_RISK_VERSION, forecast: risk });
      const forecast = buildHourlyForecast(bars, reference, issued, market.url);
      if (forecast) calls.push({ id: market.id, version: FORECAST_VERSION, forecast });
    }
  }

  return sql.begin(async tx => {
    const owner = await tx.unsafe<Array<{ lease_token: string | null }>>(
      "select lease_token from public.newsbeat_quant_worker where id='market-intelligence' for update");
    if (owner[0]?.lease_token !== token) throw new Error("lease_lost");

    // Evaluate the exact close. Later bars, flat empty buckets, and labels first seen after the grace period are excluded.
    const missingBefore = iso(now - FORECAST_MISSING_AFTER_HOURS * FORECAST_HOUR);
    await tx.unsafe(`
      update public.newsbeat_market_forecasts f set
        outcome=case when b.close_price::text in ('NaN','Infinity','-Infinity') then 'missing'
                     when b.close_price > (f.forecast->>'reference_price_usd')::double precision then 'above'
                     else 'at_or_below' end,
        target_price_usd=case when b.close_price::text in ('NaN','Infinity','-Infinity') then null else b.close_price end
      from public.newsbeat_market_bars b where f.outcome='pending' and f.target_at <= $1
        and b.instrument_id=f.instrument_id and b.started_at=f.target_at - interval '5 minutes'
        and b.trades>0 and b.observed_at>=f.target_at and b.observed_at<=least($1,f.target_at + ($2::integer * interval '1 hour'))
    `, [iso(now), FORECAST_MISSING_AFTER_HOURS]);
    await tx.unsafe("update public.newsbeat_market_forecasts set outcome='missing' where outcome='pending' and target_at<=$1", [missingBefore]);

    let directionInserted = 0, riskInserted = 0;
    for (const { id, version, forecast } of calls) {
      if (clock() > reference + FORECAST_ISSUE_WINDOW) break;
      const saved = await tx.unsafe<Array<{ instrument_id: string }>>(
        `insert into public.newsbeat_market_forecasts(instrument_id,version,issued_at,reference_at,target_at,forecast)
         values($1,$2,$3,$4,$5,$6::jsonb) on conflict do nothing returning instrument_id`,
        [id, version, forecast.issued_at, forecast.reference_at, forecast.target_at, JSON.parse(JSON.stringify(forecast))]);
      if (version === MOVE_RISK_VERSION) riskInserted += saved.length;
      else directionInserted += saved.length;
    }
    return { directionInserted, riskInserted };
  });
}
