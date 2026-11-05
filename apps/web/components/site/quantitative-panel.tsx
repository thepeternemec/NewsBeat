import type { ConstructedSignal, IntelligenceResponse, QuantBundle, QuantSignalDecision, MarketContext } from "@newsbeat/contracts";
import "./quantitative-panel.css";
import { presentTiming } from "./signal-presentation";

const PHASES: Record<QuantSignalDecision["phase"], string> = {
  data_hold: "Waiting for reliable market data", analysis_hold: "New reporting awaits analysis",
  inactive: "Too few fresh trades", liquidity_hold: "Liquidity blocks confirmation",
  old_information: "No fresh information edge", unconfirmed: "Confirmation is pending",
  developing: "A move is developing", extended: "The move is already extended",
  fading: "Confirmation is fading", diverging: "Price and thesis diverge", invalidated: "Reassess the premise",
};
const DELTAS: Record<QuantSignalDecision["delta"]["kind"], string> = {
  new_development: "New development", thesis_changed: "Thesis changed", new_reporting: "New reporting",
  context_added: "Context added to existing news", coverage_only: "Coverage only", unchanged: "No substantive delta",
};
const percent = (value: number | null | undefined, signed = true) => value === null || value === undefined || !Number.isFinite(value) ? "—" : (signed && value > 0 ? "+" : "") + (value * 100).toFixed(2) + "%";
const number = (value: number | null | undefined, suffix = "") => value === null || value === undefined || !Number.isFinite(value) ? "—" : value.toFixed(2) + suffix;
const date = (value: string) => new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
const ACTIONS = { review_now: "Review now", keep_watching: "Keep watching", no_alert: "No alert in this context", reassess: "Reassess" };
function ReturnPath({ market }: { market: MarketContext }) {
  const rows = market.curve;
  if (rows.length < 2) return <div className="quant-chart-empty">The recent price comparison is still being collected.</div>;
  const values = rows.flatMap(row => [row.asset_return, row.benchmark_return]);
  const low = Math.min(0, ...values), high = Math.max(0, ...values), range = Math.max(high - low, 0.0001);
  const points = (field: "asset_return" | "benchmark_return") => rows.map((row, index) =>
    (index / (rows.length - 1) * 700 + 10).toFixed(1) + "," + (146 - (row[field] - low) / range * 130).toFixed(1)).join(" ");
  return <figure className="quant-return-path">
    <figcaption><span><i />{market.instrument?.underlying_ticker ?? "Asset"} market</span><span><i className="quant-proxy-line" />Market comparison</span></figcaption>
    <svg viewBox="0 0 720 160" role="img" aria-label={"Observed matched-candle returns for " + (market.instrument?.symbol ?? "the asset") + " and " + market.benchmark.label} preserveAspectRatio="none">
      <line x1="10" x2="710" y1={146 - (0 - low) / range * 130} y2={146 - (0 - low) / range * 130} stroke="currentColor" opacity=".15" />
      <polyline points={points("benchmark_return")} fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 5" opacity=".45" vectorEffect="non-scaling-stroke" />
      <polyline className="quant-asset-line" pathLength={1} points={points("asset_return")} fill="none" stroke="currentColor" strokeWidth="1.75" vectorEffect="non-scaling-stroke" />
    </svg>
    <div className="quant-chart-range"><span>Earlier</span><span>Most recent</span></div>
  </figure>;
}
function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="quant-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}
export default function QuantitativePanel({ bundle, decision, signalId, version, construction, analysisStatus, loading = false, readStale = false }: {
  bundle?: QuantBundle; decision?: QuantSignalDecision; signalId?: string; version?: number; readStale?: boolean;
  construction?: ConstructedSignal; analysisStatus?: IntelligenceResponse["status"]; loading?: boolean;
}) {
  const readiness = construction || analysisStatus || loading ? { constructed: Boolean(construction?.assessment), analysisStatus, loading } : undefined;
  if (!bundle) { const pending = presentTiming(undefined, readStale, readiness); return <div className="quant-panel quant-pending" role="status"><span className="quant-eyebrow">{pending.label}</span><h3>{pending.title}</h3><p>{pending.text}</p></div>; }
  const market = bundle.market, stale = readStale || market.status === "stale";
  const recent = decision?.recent_window ?? market.windows.find(row => row.minutes === 30);
  const fit = decision ? decision.fit : market.fit;
  const volume = decision ? decision.volume_ratio : market.volume_ratio;
  const currentDecision = stale ? undefined : decision;
  const phase = stale ? "data_hold" : currentDecision?.phase;
  const records = bundle.evaluations.filter(row => row.source_signal_id === signalId && row.signal_version === version);
  const first = records.find(row => row.cohort === "all_constructions");
  const cost = market.book?.buy_impact_bps !== null && market.book?.buy_impact_bps !== undefined && market.book.sell_impact_bps !== null ? market.book.buy_impact_bps + market.book.sell_impact_bps : null;
  const view = presentTiming(currentDecision, stale, readiness);
  const passed = (id: string) => !stale && decision?.checks.find(check => check.id === id)?.passed === true;
  const checks = [
    { label: "Market hypothesis", met: construction ? Boolean(construction.assessment) : Boolean(decision) },
    { label: "Market confirmation", met: passed("post_information_response") && passed("relative_confirmation") },
    { label: "Ready for review", met: view.state === "review" },
  ];
  return <div className="quant-panel" aria-label="Your agent's view">
    <div className="agent-outcome" data-state={view.state}><span className="quant-eyebrow">WHAT YOUR AGENT CAN USE</span><div className="agent-outcome-label"><i aria-hidden="true" />{view.label}</div><h3>{view.title}</h3><p>{view.text}</p></div>
    <ul className="agent-simple-checks" aria-label="Signal checks at a glance">{checks.map(check => <li key={check.label} data-met={check.met}><i aria-hidden="true" /><span>{check.label}</span><small>{check.met ? "Met" : "Waiting"}</small></li>)}</ul>
    <div className="agent-market-picture"><span className="quant-eyebrow">{stale ? "LAST RECORDED MARKET PICTURE" : "THE MARKET PICTURE"}</span><ReturnPath market={market} /><p>{market.instrument?.kind === "tokenized_equity" ? "Stock graph uses the related xStock venue market." : "Price comparison uses one spot venue."} This shows observed movement, not a forecast.</p></div>
    <details className="quant-technical"><summary>See the numbers and checks <span aria-hidden="true">+</span></summary><div className="quant-technical-content">

    <div className="quant-market-head"><div><span className="quant-eyebrow">MEASURED MARKET CONTEXT</span><h3>{market.instrument?.symbol ?? "Market data pending"}</h3></div><span className="quant-venue">{market.instrument?.venue ?? "Kraken"} · 5m</span></div>
    <p className="quant-instrument-note">{market.instrument?.kind === "tokenized_equity" ? "xStock venue market · company news informs the thesis" : "Spot venue market · self-excluding peer comparison"}{market.instrument && <> · <a href={market.instrument.mapping_url} target="_blank" rel="noopener noreferrer">Verified pair ↗</a></>}</p>
    <div className="quant-timing-state" data-phase={phase ?? "pending"}>
      <span>{stale ? "MARKET DATA HOLD" : currentDecision ? ACTIONS[currentDecision.action] : "MARKET MONITOR"}</span>
      <h3>{phase ? PHASES[phase] : "Waiting for a constructed thesis"}</h3>
      <p>{stale ? "The last measurement is no longer current. Refresh before using it to assess timing." : currentDecision?.reason ?? "Market measurements are available. A source-grounded thesis and its revision delta are needed to evaluate a review alert."}</p>
    </div>
    <div className="quant-metrics">
      <Metric label="Asset · 30m" value={percent(recent?.asset_return)} note="Closed-candle return" />
      <Metric label="Proxy · 30m" value={percent(recent?.benchmark_return)} note={market.benchmark.label} />
      <Metric label="Residual · 30m" value={percent(recent?.residual_return)} note={number(recent?.residual_z, " residual σ")} />
      <Metric label="Relative volume" value={number(volume, "×")} note={decision ? "Pre-thesis median" : "Prior-window median"} />
      <Metric label="Quoted spread" value={number(market.book?.spread_bps, " bp")} note="Top of observed book" />
      <Metric label="$1k book impact" value={number(cost, " bp")} note="Two-sided estimate · fees excluded" />
    </div>
    {decision && <div className="quant-delta">
      <span className="quant-eyebrow">INFORMATION DELTA</span><h4>{DELTAS[decision.delta.kind]}</h4><p>{decision.delta.description}</p>
      <div><span>{decision.delta.previous_version === null ? "First revision" : "v" + decision.delta.previous_version + " → v" + decision.delta.current_version}</span><span>{decision.delta.new_report_count} new cited {decision.delta.new_report_count === 1 ? "report" : "reports"}</span></div>
      <small>Thesis known {date(decision.delta.known_at)}</small>
      {decision.event_window && <p className="quant-anchor-response">After the first full post-thesis bucket: asset {percent(decision.event_window.asset_return)}, proxy {percent(decision.event_window.benchmark_return)}, residual {percent(decision.event_window.residual_return)}.</p>}
    </div>}
    {decision && <details className="quant-details"><summary>Timing conditions <span>{decision.checks.filter(check => check.passed).length} / {decision.checks.length}</span></summary><ul>{decision.checks.map(check => <li key={check.id}><strong>{check.passed ? "Met" : "Hold"} · {check.id.replaceAll("_", " ")}</strong><p>{check.reason}</p></li>)}</ul></details>}
    <details className="quant-details"><summary>Model, source &amp; data quality</summary>
      <div className="quant-model-grid"><Metric label="Estimated β" value={number(fit?.beta)} note="Intercept-bearing OLS" /><Metric label="Fit R²" value={number(fit?.r_squared)} note={(fit?.samples ?? 0) + " aligned returns"} /></div>
      {fit && <p>Baseline: {date(fit.start_at)} → {date(fit.end_at)}. {decision ? "Ends before the information anchor." : "Ends before the displayed short windows."}</p>}
      <p>{market.benchmark.methodology}</p><ul>{market.quality.map(check => <li key={check.id}><strong>{check.passed ? "Met" : "Hold"} · {check.id.replaceAll("_", " ")}</strong><p>{check.reason}</p></li>)}</ul>
      {market.limitations.map(text => <p key={text}>{text}</p>)}
      <p>Timing thresholds are explicit research heuristics awaiting outcome calibration.</p>
    </details>
    <div className="quant-forward">
      <span className="quant-eyebrow">FORWARD OBSERVATIONS</span><h4>Record first. Measure later.</h4>
      <p>{bundle.evaluation.observations} frozen {bundle.evaluation.observations === 1 ? "observation" : "observations"} · {bundle.evaluation.alerts} timing {bundle.evaluation.alerts === 1 ? "alert" : "alerts"} in this context.</p>
      <div className="quant-table-scroll"><table><caption>Direction-aligned mean return vs proxy · before fees</caption><thead><tr><th>Horizon</th><th>All cases</th><th>Review alerts</th><th>Pending / missed</th></tr></thead><tbody>{bundle.evaluation.horizons.map(row => {
        const review = bundle.evaluation.review_horizons?.find(item => item.minutes === row.minutes);
        return <tr key={row.minutes}><th>{row.minutes < 60 ? row.minutes + "m" : row.minutes / 60 + "h"}</th><td>{percent(row.mean_directional_excess_return)} <small>n={row.observed}</small></td><td>{percent(review?.mean_directional_excess_return)} <small>n={review?.observed ?? 0}</small></td><td>{row.pending} / {row.expired}</td></tr>;
      })}</tbody></table></div>
      {first && <details className="quant-details"><summary>This thesis’s frozen observation</summary><p>Recorded {date(first.decision_at)} at a snapshot midpoint of {first.reference_price.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 })}.</p><ul>{first.outcomes.map(row => <li key={row.horizon_minutes} data-evaluation-status={row.status}><strong>{row.horizon_minutes}m · {row.status}</strong><p>{row.status === "observed" ? "Asset " + percent(row.asset_return) + " · proxy " + percent(row.benchmark_return) + " · residual " + percent(row.residual_return) + (row.market_at ? " · candle closed " + date(row.market_at) : "") : row.status === "pending" ? "Awaiting a closed traded candle after " + date(row.due_at) : "No eligible aligned traded candle was observed in the measurement window."}</p></li>)}</ul></details>}
      <small>{bundle.evaluation.note}</small>
    </div>
    <div className="quant-asof"><span>Collected {market.observed_at ? date(market.observed_at) : "pending"}</span><span>Last traded bucket {market.last_trade_at ? date(market.last_trade_at) : "unavailable"}</span><span>{bundle.policy_version}</span></div>

    <a className="quant-doc-link" href="/docs/intelligence">What do these measurements mean? ↗</a>
    </div></details>
  </div>;
}
