"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, RefreshCw } from "lucide-react";
import type { IntelligenceResponse } from "@newsbeat/contracts";
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
const date = (value: string) => new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });

/** Public reads show stored analysis; selecting or refreshing never runs a model. */
function StoredEvent({ asset }: { asset: Asset }) {
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
        const response = await fetch(`${API_BASE}/v2/intelligence?beat_id=${encodeURIComponent(asset.beatId)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Unavailable");
        const next = await response.json() as IntelligenceResponse;
        if (next.beat_id !== asset.beatId || !Array.isArray(next.signals) || !next.analysis) throw new Error("Invalid response");
        if (active) { setData(next); setIndex(0); setPhase("ready"); }
      } catch { if (active) setPhase("error"); }
      finally { window.clearTimeout(timer); }
    })();
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [asset.beatId, attempt]);
  const signal = data?.signals[index];
  const count = data?.signals.length ?? 0;
  const implication = signal?.implications[0];
  return <>
    <div className="signal-inspector-toolbar">
      <span>{phase === "loading" ? "Loading stored analysis…" : phase === "error" && !data ? "Stored analysis unavailable" : `${count} stored ${count === 1 ? "event" : "events"}`}</span>
      <button type="button" disabled={phase === "loading"} onClick={() => setAttempt(value => value + 1)} aria-label="Refresh stored intelligence"><RefreshCw size={14} /> Refresh</button>
    </div>
    <div className="signal-inspector-notices" role="status">
      {phase === "error" && <p>Stored analysis could not be loaded. Try refreshing. {signal ? "Earlier event memory is shown below." : ""}</p>}
      {data?.status === "pending" && <p>New coverage is waiting for analysis. {signal ? "Earlier event memory is shown below." : "The first interpretation has not been recorded yet."}</p>}
      {data?.status === "unavailable" && <p>The latest analysis is unavailable. {signal ? "Earlier event memory is shown below." : "No stored interpretation is available yet."}</p>}
      {data?.freshness.status === "stale" && <p>Source collection is stale. Check dates before using this interpretation.</p>}
      {phase === "ready" && data?.status === "ready" && !signal && <p>No substantive event was selected in the latest analyzed snapshot.</p>}
    </div>
    {signal && <article className="inspected-event" aria-label={`${asset.label} event interpretation`}>
      <div className="inspected-event-tags"><span>{signal.category}</span><span>{signal.event_state}</span><span>Memory v{signal.version}</span></div>
      <section><span className="inspected-event-label">01 / REPORTED CHANGE</span><h3>{signal.what_changed}</h3><p>{signal.attention_reason}</p></section>
      {implication && <section className="inspected-event-inference"><span className="inspected-event-label">02 / POSSIBLE IMPLICATION <small>Inference</small></span><h4>{implication.hypothesis}</h4><p>{implication.mechanism}</p></section>}
      <section><span className="inspected-event-label">03 / WHAT TO CHECK NEXT</span><p>{signal.next_checks[0]}</p>{signal.unknowns[0] && <p className="inspected-event-unknown"><strong>Still unknown:</strong> {signal.unknowns[0]}</p>}</section>
      <details key={signal.id}><summary>Evidence &amp; event memory <span>{signal.evidence.length} {signal.evidence.length === 1 ? "report" : "reports"}</span></summary>
        <div className="inspected-event-memory"><code>{signal.id}</code><span>First detected {date(signal.first_detected_at)}</span><span>Interpretation updated {date(signal.updated_at)}</span>{signal.version > 1 && <p>{signal.change_reason}</p>}</div>
        <ul>{signal.evidence.slice(0, 5).map(report => <li key={report.id}><a href={report.url} target="_blank" rel="noopener noreferrer">{report.title}<ExternalLink size={12} /></a><span>{report.source} · {date(report.published_at)}</span></li>)}</ul>
        {signal.evidence.length > 5 && <p className="inspected-event-more">Showing five of {signal.evidence.length} retained reports.</p>}
      </details>
      <div className="inspected-event-pagination"><span>Event {index + 1} / {count}</span><div><button type="button" disabled={index === 0} onClick={() => setIndex(value => value - 1)} aria-label="Previous event"><ArrowLeft size={16} /></button><button type="button" disabled={index >= count - 1} onClick={() => setIndex(value => value + 1)} aria-label="Next event"><ArrowRight size={16} /></button></div></div>
    </article>}
    <div className="signal-inspector-foot"><span>{data?.analysis.last_success_at ? `Analyzed ${date(data.analysis.last_success_at)}` : "Scheduled event-intelligence pilot"}</span>{data && <span>Source coverage: {data.freshness.status}</span>}{data?.analysis.coverage_truncated && <span>Selected coverage snapshot</span>}<p>Model hypotheses from headlines. Open the reporting to check the evidence.</p></div>
  </>;
}

export default function SignalInspector() {
  const [ticker, setTicker] = useState<string>("NVDA");
  const asset = ASSETS.find(item => item.ticker === ticker) ?? ASSETS[0];
  return <aside className="signal-inspector" aria-label="Live event intelligence inspector">
    <header><span><i aria-hidden="true" /> EVENT INSPECTOR</span><span>STORED ANALYSIS</span></header>
    <div className="signal-inspector-asset"><label htmlFor="inspector-asset">Inspect an asset</label><select id="inspector-asset" value={ticker} onChange={event => setTicker(event.target.value)}>{ASSETS.map(item => <option key={item.ticker} value={item.ticker}>{item.label} / {item.ticker}</option>)}</select></div>
    <StoredEvent key={asset.beatId} asset={asset} />
  </aside>;
}
