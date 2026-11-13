import { ArrowUpRight } from "lucide-react";
import type { MarketForecasts } from "@newsbeat/contracts";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 });
const change = new Intl.NumberFormat("en-US", { style: "percent", signDisplay: "exceptZero", maximumFractionDigits: 2 });
const stamp = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const score = (value: number | null) => value === null ? "—" : value.toFixed(3);

export function MarketForecastPanel({ outlook, now, unavailable }: { outlook?: MarketForecasts; now: number; unavailable: boolean }) {
  return <section className="rb-forecast" aria-label="Hourly crypto forecasts">
    <header>
      <p>Hourly forecast · Experimental</p>
      <h2>Where could BTC and ETH close?</h2>
    </header>
    {outlook ? <div className="rb-forecast-assets">
      {outlook.assets.map(({ ticker, pair, forecast, scorecard, recent }) => {
        const active = forecast && Date.parse(forecast.target_at) > now ? forecast : null;
        return <article key={ticker} className="rb-forecast-asset">
          <h3>{pair}</h3>
          {active ? <>
            <p className="rb-forecast-call"><strong>{percent.format(active.probability_above)}</strong> estimated chance of closing above {usd.format(active.reference_price_usd)}</p>
            <p className="rb-forecast-meta">Target <time dateTime={active.target_at}>{stamp(active.target_at)}</time> · {percent.format(active.baseline_probability)} historical base rate</p>
            <a className="rb-brief-source" href={active.source.url} target="_blank" rel="noreferrer">
              {active.source.name} <ArrowUpRight size={12} aria-hidden="true" />
            </a>
          </> : <p className="rb-forecast-meta">No current forecast for this hour.</p>}
          <details>
            <summary>Indicators and results</summary>
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
            <h4>{outlook.scorecard_days}-day live scorecard</h4>
            <p className="rb-forecast-meta">{scorecard.scored} scored · {scorecard.pending} pending · {scorecard.missing} missing</p>
            {scorecard.scored ? <>
              <dl className="rb-forecast-stats">
                <div><dt>Forecast error</dt><dd>{score(scorecard.model_brier)}</dd></div>
                <div><dt>Baseline error</dt><dd>{score(scorecard.baseline_brier)}</dd></div>
              </dl>
              <p className="rb-forecast-meta">Mean squared probability error (Brier score). Lower is better.</p>
            </> : <p className="rb-forecast-meta">Scores appear after the first recorded forecast settles.</p>}
            {recent.length > 0 && <ul className="rb-forecast-results">{recent.map(result => <li key={result.target_at}>
              <time dateTime={result.target_at}>{stamp(result.target_at)}</time>
              <span>{percent.format(result.probability_above)} above {usd.format(result.reference_price_usd)} · {result.outcome === "missing" || result.target_price_usd === null ? "Close missing" : "Closed at " + usd.format(result.target_price_usd)}</span>
            </li>)}</ul>}
          </details>
        </article>;
      })}
    </div> : <p className="rb-forecast-meta">{unavailable ? "Forecasts temporarily unavailable." : "Checking the latest forecasts…"}</p>}
  </section>;
}
