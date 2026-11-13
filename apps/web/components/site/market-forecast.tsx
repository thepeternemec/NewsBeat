import { ArrowUpRight } from "lucide-react";
import type { ForecastScorecard, MarketForecasts } from "@newsbeat/contracts";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });
const change = new Intl.NumberFormat("en-US", { style: "percent", signDisplay: "exceptZero", maximumFractionDigits: 2 });
const stamp = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const score = (value: number | null) => value === null ? "—" : value.toFixed(3);

function Scorecard({ title, data }: { title: string; data: ForecastScorecard }) {
  return <div className="rb-forecast-score">
    <h4>{title}</h4>
    <p className="rb-forecast-meta">{data.scored} scored · {data.pending} pending · {data.missing} missing</p>
    {data.scored ? <dl className="rb-forecast-stats">
      <div><dt>Forecast error</dt><dd>{score(data.model_brier)}</dd></div>
      <div><dt>Baseline error</dt><dd>{score(data.baseline_brier)}</dd></div>
    </dl> : <p className="rb-forecast-meta">Scores appear after the first recorded forecast settles.</p>}
  </div>;
}

export function MarketForecastPanel({ outlook, now, unavailable }: { outlook?: MarketForecasts; now: number; unavailable: boolean }) {
  return <section className="rb-forecast" aria-label="Hourly crypto forecasts">
    <header>
      <p>Hourly move risk · Experimental</p>
      <h2>How likely is a 1% move?</h2>
    </header>
    {outlook && outlook.status !== "unavailable" ? <div className="rb-forecast-assets">
      {outlook.assets.map(({ ticker, pair, forecast, move_risk, scorecard, recent }) => {
        const active = forecast && Date.parse(forecast.target_at) > now ? forecast : null;
        const risk = move_risk?.forecast && Date.parse(move_risk.forecast.target_at) > now ? move_risk.forecast : null;
        return <article key={ticker} className="rb-forecast-asset">
          <h3>{pair}</h3>
          {risk ? <>
            <p className="rb-forecast-call"><strong>{percent.format(risk.probability)}</strong> estimated chance of closing at least {percent.format(risk.threshold_fraction)} away from {usd.format(risk.reference_price_usd)}</p>
            <p className="rb-forecast-meta">Target <time dateTime={risk.target_at}>{stamp(risk.target_at)}</time> · {percent.format(risk.baseline_probability)} historical base rate</p>
            <a className="rb-brief-source" href={risk.source.url} target="_blank" rel="noreferrer">
              {risk.source.name} <ArrowUpRight size={12} aria-hidden="true" />
            </a>
          </> : <p className="rb-forecast-meta">No current move risk forecast for this hour.</p>}
          <details>
            <summary>Forecast evidence and results</summary>
            {risk && <p className="rb-forecast-meta">Past-hour realized volatility was {percent.format(risk.realized_volatility_1h)}. A 1% move followed {risk.matched_moves} of {risk.matched_windows} hours with similar volatility in {risk.sample_size} usable hours. The model blends that rate with the 30-day base rate.</p>}
            {move_risk && <Scorecard title={outlook.scorecard_days + "-day move risk scorecard"} data={move_risk.scorecard} />}
            {active && <p className="rb-forecast-meta">Experimental direction forecast · {percent.format(active.probability_above)} estimated chance of closing above {usd.format(active.reference_price_usd)} at <time dateTime={active.target_at}>{stamp(active.target_at)}</time>.</p>}
            {active && <>
              <p className="rb-forecast-meta">Issued <time dateTime={active.issued_at}>{stamp(active.issued_at)}</time> using candles through <time dateTime={active.reference_at}>{stamp(active.reference_at)}</time>.</p>
              <dl className="rb-forecast-stats">
                <div><dt>RSI (14)</dt><dd>{active.indicators.rsi_14.toFixed(1)}</dd></div>
                <div><dt>vs. 20-period EMA</dt><dd>{change.format(active.indicators.trend_vs_ema_20)}</dd></div>
                <div><dt>30m momentum</dt><dd>{change.format(active.indicators.momentum_30m)}</dd></div>
                <div><dt>ATR (14) / price</dt><dd>{change.format(active.indicators.atr_14_fraction)}</dd></div>
                <div><dt>30m relative volume</dt><dd>{active.indicators.relative_volume_30m.toFixed(2)}×</dd></div>
              </dl>
              <p className="rb-forecast-meta">{active.history.matched_above} of {active.history.matched} similar setups closed higher. The middle 80% of matched returns spanned {change.format(active.history.return_10th)} to {change.format(active.history.return_90th)}.</p>
            </>}
            <Scorecard title={outlook.scorecard_days + "-day direction scorecard"} data={scorecard} />
            <p className="rb-forecast-meta">Probability error uses the Brier score. Lower is better.</p>
            {recent.length > 0 && <ul className="rb-forecast-results">{recent.map(result => <li key={result.target_at}>
              <time dateTime={result.target_at}>{stamp(result.target_at)}</time>
              <span>{percent.format(result.probability_above)} above {usd.format(result.reference_price_usd)} · {result.outcome === "missing" || result.target_price_usd === null ? "Close missing" : "Closed at " + usd.format(result.target_price_usd)}</span>
            </li>)}</ul>}
          </details>
        </article>;
      })}
    </div> : <p className="rb-forecast-meta">{unavailable || outlook?.status === "unavailable" ? "Forecasts temporarily unavailable." : "Checking the latest forecasts…"}</p>}
    <a className="rb-brief-source" href="https://github.com/thepeternemec/NewsBeat/blob/main/docs/QUANTITATIVE.md#historical-replay">Method and historical results <ArrowUpRight size={12} aria-hidden="true" /></a>
  </section>;
}
