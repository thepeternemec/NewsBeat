"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, RefreshCw } from "lucide-react";
import type { IntelligenceResponse, SignalContextId } from "@newsbeat/contracts";
import "./signal-inspector.css";
import QuantitativePanel from "./quantitative-panel";
import { selectSignalIndex } from "./signal-presentation";

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
  { id: "fundamentals", label: "Business changes" },
  { id: "liquidity", label: "Funding & liquidity" },
  { id: "risk", label: "Adoption & risk" },
] as const;
const date = (value: string) => new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });

/** Selecting a context reads stored analysis; it never creates model work. */
function StoredSignal({ asset, context }: { asset: Asset; context: SignalContextId }) {
  const [data, setData] = useState<IntelligenceResponse | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const [clock, setClock] = useState(0);
  const selectedId = useRef<string | null>(null);
  useEffect(() => { selectedId.current = data?.signals[index]?.id ?? null; }, [data, index]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      setClock(Date.now()); setAttempt(value => value + 1);
    };
    setClock(Date.now());
    const interval = window.setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", refresh); };
  }, [asset.beatId, context]);
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
        if (active) { setData(next); setIndex(selectSignalIndex(next, selectedId.current)); setClock(Date.now()); setPhase("ready"); }
      } catch { if (active) setPhase("error"); }
      finally { window.clearTimeout(timer); }
    })();
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [asset.beatId, context, attempt]);
  const signal = data?.signals[index];
  const count = data?.signals.length ?? 0;
  const constructedCount = data?.constructions.filter(item => item.assessment).length ?? 0;
  const implication = signal?.implications[0];
  const readStale = phase === "error" || !!data && clock - Date.parse(data.generated_at) > 10 * 60000;
  const storedConstruction = data?.constructions.find(item => item.source_signal_id === signal?.id);
  const construction = storedConstruction && readStale && storedConstruction.action === "review_now" ? { ...storedConstruction, status: "watch" as const, action: "keep_watching" as const, alert_id: null, explanation: "The last read is no longer current. Refresh before assessing timing." } : storedConstruction;
  const assessment = construction?.assessment;
  const latestAlert = data?.alerts.find(item => item.source_signal_id === signal?.id);
  const lead = signal?.evidence.find(report => report.title === signal.what_changed) ?? signal?.evidence[0];
  const takeaway = (assessment?.market_relevance ?? implication?.hypothesis ?? "The interpretation is still being prepared.").split(/(?<=[.!?])\s+(?=[A-Z])/)[0];
  const notice = phase === "error" ? "The latest view could not be loaded. Earlier evidence may be shown."
    : data?.status === "pending" ? "New reporting is being checked. Earlier analysis is shown; review alerts stay on hold."
    : data?.status === "unavailable" ? "The latest analysis did not complete. Earlier evidence remains available; review alerts stay on hold."
    : data?.freshness.status === "stale" ? "Source collection is delayed. Check the original report dates before relying on this view." : null;
  return <>
    <div className="signal-inspector-toolbar"><span>{phase === "loading" ? "Reading the stored view…" : "Reporting, context and a reason to pay attention"}</span><button type="button" disabled={phase === "loading"} onClick={() => setAttempt(value => value + 1)} aria-label="Refresh stored intelligence"><RefreshCw size={14} aria-hidden="true" /> Refresh</button></div>
    <div className="signal-inspector-notices" role="status">{notice ? <p>{notice}</p> : null}{phase === "ready" && data?.status === "ready" && !signal ? <p>No new development was selected in the latest view.</p> : null}</div>
    <div className="signal-workbench-grid" data-has-signal={Boolean(signal)}>
      {signal ? <article className="inspected-event" aria-label={asset.label + " signal construction"}>
        <section className="signal-lead"><span className="inspected-event-label">THE REPORTED CHANGE</span><h3>{signal.what_changed}</h3>{lead ? <a className="signal-source-link" href={lead.url} target="_blank" rel="noopener noreferrer">Read the report <ExternalLink size={12} aria-hidden="true" /><span>{lead.source}</span></a> : null}</section>
        <section><span className="inspected-event-label">WHY THIS COULD MATTER</span><p className="signal-takeaway">{takeaway}</p></section>
        <section><span className="inspected-event-label">YOUR AGENT’S NEXT CHECK</span><p className="signal-next-check">{signal.next_checks[0]}</p></section>
        <details className="signal-reasoning" key={signal.id + context}><summary>Read the reasoning and sources <span aria-hidden="true">+</span></summary>
          <div className="inspected-event-tags"><span>{signal.category}</span><span>{signal.event_state}</span><span>Signal v{signal.version}</span></div>
          {data?.context ? <p><strong>Selected focus:</strong> {data.context.objective}</p> : null}
          {assessment ? <>
            <section className="inspected-event-inference"><span className="inspected-event-label">MARKET HYPOTHESIS <small>Model interpretation</small></span><div className="signal-market-tags"><span>{assessment.channel.replaceAll("_", " ")}</span><span>{assessment.direction}</span><span>{assessment.materiality} materiality</span><span>{assessment.horizon}</span></div><h4>{assessment.market_relevance}</h4>{implication ? <p>{implication.mechanism}</p> : null}</section>
            <section><span className="inspected-event-label">REVIEW CONDITION <small>{assessment.trigger.status.replaceAll("_", " ")}</small></span><h4>{assessment.trigger.condition}</h4>{assessment.trigger.headline_quote ? <p className="signal-trigger-quote">“{assessment.trigger.headline_quote}” <span>Reported headline</span></p> : null}</section>
            <section><span className="inspected-event-label">WHAT COULD CHANGE THE VIEW</span><p>{assessment.why_it_may_not_move}</p><p className="inspected-event-unknown"><strong>Reassess if:</strong> {assessment.invalidation}</p></section>
          </> : <p>A fuller interpretation is still being prepared.</p>}
          {signal.unknowns[0] ? <p className="inspected-event-unknown"><strong>Still unknown:</strong> {signal.unknowns[0]}</p> : null}
          {construction ? <details className="signal-gates"><summary>Reporting and construction checks</summary><ul>{construction.checks.map(check => <li key={check.id}><strong>{check.passed ? "Met" : "Hold"} · {check.label}</strong><p>{check.reason}</p></li>)}</ul></details> : null}
          <div className="inspected-event-memory"><code>{construction?.id ?? signal.id}</code><span>First detected {date(signal.first_detected_at)}</span><span>Interpretation updated {date(signal.updated_at)}</span>{signal.version > 1 ? <p>{signal.change_reason}</p> : null}</div>
          <ul>{signal.evidence.slice(0, 5).map(report => <li key={report.id}><a href={report.url} target="_blank" rel="noopener noreferrer">{report.title}<ExternalLink size={12} aria-hidden="true" /></a><span>{report.source} · {date(report.published_at)}</span></li>)}</ul>
          {signal.evidence.length > 5 ? <p>Showing five of {signal.evidence.length} retained reports.</p> : null}
          {latestAlert ? <p className="signal-alert-record">Review alert recorded {date(latestAlert.triggered_at)}{latestAlert.resolved_at ? " · superseded " + date(latestAlert.resolved_at) : ""}. <code>{latestAlert.id}</code></p> : null}
        </details>
        <div className="inspected-event-pagination"><span>Explore another reported change</span><div><button type="button" disabled={index === 0} onClick={() => setIndex(value => value - 1)} aria-label="Previous signal"><ArrowLeft size={16} aria-hidden="true" /></button><button type="button" disabled={index >= count - 1} onClick={() => setIndex(value => value + 1)} aria-label="Next signal"><ArrowRight size={16} aria-hidden="true" /></button></div></div>
      </article> : null}
      <QuantitativePanel bundle={data?.quantitative} decision={construction?.quantitative} signalId={signal?.id} version={signal?.version} construction={construction} analysisStatus={data?.status} loading={phase === "loading" && !data} readStale={readStale} />
    </div>
    <div className="signal-connect-value"><div><strong>Bring this context into your agent’s answers.</strong><p>The reported change, the interpretation and what to check next—through one connection.</p></div><a href="/docs/quickstart">Connect your agent <ArrowRight size={15} aria-hidden="true" /></a></div>
    <div className="signal-inspector-foot"><span>Headline-based research pilot · Source collection: {data?.freshness.status ?? "checking"}</span><details><summary>About this stored view</summary><p>{count} stored signals · {constructedCount} constructed. {data?.analysis.last_success_at ? "Last analysis " + date(data.analysis.last_success_at) + "." : "Analysis is scheduled."} Market checks run every five minutes; this page refreshes each minute while visible.{data?.analysis.coverage_truncated ? " Evidence is a selected coverage snapshot." : ""}</p><a href="/docs/intelligence">Read how signals and measurements work ↗</a></details></div>
  </>;
}

export default function SignalInspector() {
  const [ticker, setTicker] = useState<string>("NVDA");
  const [context, setContext] = useState<SignalContextId>("fundamentals");
  const asset = ASSETS.find(item => item.ticker === ticker) ?? ASSETS[0];
  return <aside className="signal-inspector" aria-label="Explore a real signal">
    <header><span><i aria-hidden="true" /> EXPLORE A REAL SIGNAL</span><span>REPORTING → CONTEXT → YOUR AGENT</span></header>
    <div className="signal-inspector-filters">
    <div className="signal-inspector-asset"><label htmlFor="inspector-asset">Follow an asset</label><select id="inspector-asset" value={ticker} onChange={event => setTicker(event.target.value)}>{ASSETS.map(item => <option key={item.ticker} value={item.ticker}>{item.label} / {item.ticker}</option>)}</select></div>
    <div className="signal-inspector-context"><label htmlFor="inspector-context">Focus</label><select id="inspector-context" value={context} onChange={event => setContext(event.target.value as SignalContextId)}>{CONTEXTS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
    </div>
    <StoredSignal key={asset.beatId + context} asset={asset} context={context} />
  </aside>;
}
