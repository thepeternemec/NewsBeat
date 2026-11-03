"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, RefreshCw } from "lucide-react";
import type { IntelligenceResponse, SignalContextId } from "@newsbeat/contracts";
import "./signal-inspector.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
const ASSETS = [
  { ticker: "NVDA", label: "NVIDIA", beatId: "b_bb964843350e" },
  { ticker: "AAPL", label: "Apple", beatId: "b_7d5acdda6186" },
  { ticker: "MSFT", label: "Microsoft", beatId: "b_a723a1d2787f" },
  { ticker: "GOOGL", label: "Alphabet", beatId: "b_c0c3f9282a94" },
  { ticker: "BTC", label: "Bitcoin", beatId: "b_06c91290de1c" },
  { ticker: "ETH", label: "Ethereum", beatId: "b_edbc5b5af755" },
] as const;
type Asset = (typeof ASSETS)[number];
const CONTEXTS = [
  { id: "fundamentals", label: "Business fundamentals" },
  { id: "liquidity", label: "Liquidity & capital" },
  { id: "risk", label: "Adoption & risk" },
] as const;
const ACTIONS = { review_now: "Review now", keep_watching: "Keep watching", no_alert: "No alert in this context", reassess: "Reassess the premise" };
const date = (value: string) => new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });

/** Selecting a context reads stored analysis; it never creates model work. */
function StoredSignal({ asset, context }: { asset: Asset; context: SignalContextId }) {
  const [data, setData] = useState<IntelligenceResponse | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 12000);
    setPhase("loading");
    void (async () => {
      try {
        const response = await fetch(API_BASE + "/v2/intelligence?beat_id=" + encodeURIComponent(asset.beatId) + "&context=" + context, { signal: controller.signal });
        if (!response.ok) throw new Error("Unavailable");
        const next = await response.json() as IntelligenceResponse;
        if (next.beat_id !== asset.beatId || next.context?.id !== context || !Array.isArray(next.signals) || !Array.isArray(next.constructions) || !Array.isArray(next.alerts) || !next.analysis) throw new Error("Invalid response");
        if (active) { setData(next); setIndex(0); setPhase("ready"); }
      } catch { if (active) setPhase("error"); }
      finally { window.clearTimeout(timer); }
    })();
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [asset.beatId, context, attempt]);
  const signal = data?.signals[index];
  const count = data?.signals.length ?? 0;
  const implication = signal?.implications[0];
  const construction = data?.constructions.find(item => item.source_signal_id === signal?.id);
  const assessment = construction?.assessment;
  const failed = construction?.checks.filter(item => !item.passed) ?? [];
  const latestAlert = data?.alerts.find(item => item.source_signal_id === signal?.id);
  return <>
    <div className="signal-inspector-toolbar">
      <span>{phase === "loading" ? "Loading signal context…" : phase === "error" && !data ? "Signal context unavailable" : count + " " + (count === 1 ? "construction" : "constructions")}</span>
      <button type="button" disabled={phase === "loading"} onClick={() => setAttempt(value => value + 1)} aria-label="Refresh stored intelligence"><RefreshCw size={14} aria-hidden="true" /> Refresh</button>
    </div>
    <div className="signal-inspector-notices" role="status">
      {phase === "error" && <p>Signal context could not be loaded. Try refreshing. {signal ? "Earlier memory is shown below." : ""}</p>}
      {data?.status === "pending" && <p>New signal context is waiting for analysis. {signal ? "Earlier memory is shown below; alert gates remain on hold." : "The first construction has not been recorded yet."}</p>}
      {data?.status === "unavailable" && <p>The latest analysis is unavailable. {signal ? "Earlier memory is shown below; alert gates remain on hold." : "No stored construction is available yet."}</p>}
      {data?.freshness.status === "stale" && <p>Source collection is stale. Check dates before using this construction.</p>}
      {phase === "ready" && data?.status === "ready" && !signal && <p>No substantive development was selected in the latest snapshot.</p>}
    </div>
    {data?.context && <p className="signal-context-objective">{data.context.objective}</p>}
    {signal && <article className="inspected-event" aria-label={asset.label + " signal construction"}>
      <div className="inspected-event-tags"><span>{signal.category}</span><span>{signal.event_state}</span><span>Signal v{signal.version}</span></div>
      {construction && <div className="signal-decision" data-state={construction.status}><span>CONTEXT DECISION</span><h3>{ACTIONS[construction.action]}</h3><p>{construction.status === "alert" || construction.status === "invalidated" ? construction.explanation : failed[0]?.reason ?? construction.explanation}</p></div>}
      <section><span className="inspected-event-label">01 / REPORTED CHANGE</span><h3>{signal.what_changed}</h3></section>
      {assessment ? <>
        <section className="inspected-event-inference"><span className="inspected-event-label">02 / MARKET HYPOTHESIS <small>Model estimate</small></span><div className="signal-market-tags"><span>{assessment.channel.replaceAll("_", " ")}</span><span>{assessment.direction}</span><span>{assessment.materiality} materiality</span><span>{assessment.horizon}</span></div><h4>{assessment.market_relevance}</h4>{implication && <p>{implication.mechanism}</p>}</section>
        <section><span className="inspected-event-label">03 / ALERT TRIGGER <small>{assessment.trigger.status.replaceAll("_", " ")}</small></span><h4>{assessment.trigger.condition}</h4>{assessment.trigger.headline_quote && <p className="signal-trigger-quote">“{assessment.trigger.headline_quote}” <span>Reported headline</span></p>}</section>
        <section><span className="inspected-event-label">04 / WHY IT MAY NOT MOVE</span><p>{assessment.why_it_may_not_move}</p><p className="inspected-event-unknown"><strong>Reassess if:</strong> {assessment.invalidation}</p></section>
      </> : <section><span className="inspected-event-label">02 / CONSTRUCTION PENDING</span><p>The worker is adding a market channel, trigger and invalidation to this earlier interpretation.</p>{implication && <p>{implication.hypothesis}</p>}</section>}
      <section><span className="inspected-event-label">NEXT CHECK</span><p>{signal.next_checks[0]}</p>{signal.unknowns[0] && <p className="inspected-event-unknown"><strong>Still unknown:</strong> {signal.unknowns[0]}</p>}</section>
      {construction && <details className="signal-gates" key={signal.id + context}><summary>Why this decision <span>{construction.checks.filter(item => item.passed).length} / {construction.checks.length} checks met</span></summary><ul>{construction.checks.map(check => <li key={check.id}><strong>{check.passed ? "Met" : "Hold"} · {check.label}</strong><p>{check.reason}</p></li>)}</ul></details>}
      {latestAlert && <p className="signal-alert-record">Review alert recorded {date(latestAlert.triggered_at)}{latestAlert.resolved_at ? " · superseded " + date(latestAlert.resolved_at) : ""}. Alert ID: <code>{latestAlert.id}</code></p>}
      <details key={signal.id}><summary>Evidence &amp; signal memory <span>{signal.evidence.length} {signal.evidence.length === 1 ? "report" : "reports"}</span></summary>
        <div className="inspected-event-memory"><code>{construction?.id ?? signal.id}</code><span>First detected {date(signal.first_detected_at)}</span><span>Interpretation updated {date(signal.updated_at)}</span>{signal.version > 1 && <p>{signal.change_reason}</p>}</div>
        <ul>{signal.evidence.slice(0, 5).map(report => <li key={report.id}><a href={report.url} target="_blank" rel="noopener noreferrer">{report.title}<ExternalLink size={12} aria-hidden="true" /></a><span>{report.source} · {date(report.published_at)}</span></li>)}</ul>
        {signal.evidence.length > 5 && <p>Showing five of {signal.evidence.length} retained reports.</p>}
      </details>
      <div className="inspected-event-pagination"><span>Signal {index + 1} / {count}</span><div><button type="button" disabled={index === 0} onClick={() => setIndex(value => value - 1)} aria-label="Previous signal"><ArrowLeft size={16} aria-hidden="true" /></button><button type="button" disabled={index >= count - 1} onClick={() => setIndex(value => value + 1)} aria-label="Next signal"><ArrowRight size={16} aria-hidden="true" /></button></div></div>
    </article>}
    <div className="signal-inspector-foot"><span>{data?.analysis.last_success_at ? "Analyzed " + date(data.analysis.last_success_at) : "Scheduled signal-construction pilot"}</span>{data && <span>Source coverage: {data.freshness.status}</span>}{data?.analysis.coverage_truncated && <span>Selected coverage snapshot</span>}<p>Market reaction awaits price confirmation. Review alerts are recorded in this workbench.</p></div>
  </>;
}

export default function SignalInspector() {
  const [ticker, setTicker] = useState<string>("NVDA");
  const [context, setContext] = useState<SignalContextId>("fundamentals");
  const asset = ASSETS.find(item => item.ticker === ticker) ?? ASSETS[0];
  return <aside className="signal-inspector" aria-label="Contextual signal workbench">
    <header><span><i aria-hidden="true" /> SIGNAL CONSTRUCTION</span><span>CONTEXTUAL PILOT</span></header>
    <div className="signal-inspector-asset"><label htmlFor="inspector-asset">Inspect an asset</label><select id="inspector-asset" value={ticker} onChange={event => setTicker(event.target.value)}>{ASSETS.map(item => <option key={item.ticker} value={item.ticker}>{item.label} / {item.ticker}</option>)}</select></div>
    <div className="signal-inspector-context"><label htmlFor="inspector-context">Decision context</label><select id="inspector-context" value={context} onChange={event => setContext(event.target.value as SignalContextId)}>{CONTEXTS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
    <StoredSignal key={asset.beatId + context} asset={asset} context={context} />
  </aside>;
}
