"use client";

import { useEffect, useState } from "react";
import type { IntelligenceResponse } from "@newsbeat/contracts";
import "./intelligence-panel.css";

const date = (value: string) => new Date(value).toLocaleString();
export default function IntelligencePanel({ beatId, label, base }: { beatId: string; label: string; base: string }) {
  const [data, setData] = useState<IntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setData(current => current?.beat_id === beatId ? current : null);
    setFailed(false);
    let active = true;
    let controller: AbortController | null = null;
    const load = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      const timeout = window.setTimeout(() => request.abort(), 12000);
      setLoading(true);
      try {
        const response = await fetch(`${base}/v2/intelligence?beat_id=${encodeURIComponent(beatId)}`, { signal: request.signal });
        if (!response.ok) throw new Error("Unavailable");
        const next = await response.json() as IntelligenceResponse;
        if (next.beat_id !== beatId || !Array.isArray(next.signals) || !next.analysis) throw new Error("Invalid response");
        if (active && controller === request) { setData(next); setFailed(false); }
      } catch { if (active && controller === request) setFailed(true); }
      finally { window.clearTimeout(timeout); if (active && controller === request) setLoading(false); }
    };
    void load();
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 60000);
    return () => { active = false; controller?.abort(); window.clearInterval(timer); };
  }, [beatId, base, attempt]);
  return <section className="event-intelligence" aria-labelledby="event-intelligence-title" id="event-intelligence">
    <header><div><span className="event-intelligence-kicker">EVENT INTELLIGENCE / FIRST PILOT</span><h2 id="event-intelligence-title">What deserves attention?</h2><p>Reported changes, possible implications and the next questions for {label}.</p></div><button type="button" disabled={loading} onClick={() => setAttempt(value => value + 1)}>{loading ? "Checking…" : "Refresh"}</button></header>
    {failed && <p role="status" className="event-intelligence-notice">Intelligence could not be loaded. Any previous results below are historical.</p>}
    {!failed && data?.status === "not_in_pilot" && <p className="event-intelligence-notice">The first pilot covers NVIDIA, Apple, Microsoft, Alphabet, Bitcoin and Ethereum. This asset’s news feed remains available below.</p>}
    {!failed && data?.status === "pending" && <p className="event-intelligence-notice">The worker is waiting to interpret new coverage. {data.signals.length ? "Previous event memory is shown below." : "The first signals will appear after a scheduled analysis."}</p>}
    {!failed && data?.status === "unavailable" && <p className="event-intelligence-notice">The last interpretation attempt is unavailable. {data.signals.length ? "Previous event memory is shown below." : "No generated interpretation is available yet."}</p>}
    {data?.pilot && <div className="event-intelligence-meta"><span>Analysis: {data.analysis.last_success_at ? date(data.analysis.last_success_at) : "Not yet recorded"}</span><span>Source coverage: {data.freshness.status}</span>{data.analysis.coverage_truncated && <span>Selected coverage snapshot</span>}</div>}
    {data?.status === "ready" && !data.signals.length && <p className="event-intelligence-notice">No substantive event was selected in the latest analyzed snapshot. This does not establish that nothing happened.</p>}
    {data?.signals.map(signal => <article className="event-signal" key={signal.id}>
      <div className="event-signal-labels"><span>{signal.category}</span><span>{signal.event_state}</span><span>{signal.attention}</span><span>v{signal.version} · {signal.change_kind.replaceAll("_", " ")}</span></div>
      <h3>{signal.what_changed}</h3>
      <p className="event-signal-entities">Named in reporting: {signal.affected_entities.join(", ")}</p>
      <p className="event-signal-reason">{signal.attention_reason}</p>
      <div className="event-signal-reasoning"><h4>Why it may matter <span>Inference</span></h4>{signal.implications.map((item, index) => <div key={index}><strong>{item.hypothesis}</strong><p>{item.mechanism}</p><p><span>Watch for</span> {item.watch_for}</p></div>)}</div>
      <div className="event-signal-checks"><div><h4>Still uncertain</h4><ul>{signal.unknowns.map(value => <li key={value}>{value}</li>)}</ul></div><div><h4>Next checks</h4><ul>{signal.next_checks.map(value => <li key={value}>{value}</li>)}</ul></div></div>
      {signal.version > 1 && <p className="event-signal-change"><strong>Change from prior interpretation:</strong> {signal.change_reason}</p>}
      <details><summary>Evidence and event memory · {signal.evidence.length} reports</summary><div className="event-signal-provenance"><code>{signal.id}</code><span>First detected {date(signal.first_detected_at)}</span><span>Interpretation updated {date(signal.updated_at)}</span><span>Evidence updated {date(signal.evidence_updated_at)}</span></div><ol>{signal.evidence.map(report => <li key={report.id}><a href={report.url} target="_blank" rel="noopener noreferrer">{report.title}</a><span>{report.source} · {date(report.published_at)}</span></li>)}</ol></details>
    </article>)}
    <p className="event-intelligence-boundary">Interpretations are model hypotheses from headlines. Original reporting is linked; full articles and causal claims have not been verified. Repeated coverage adds evidence to event memory.</p>
  </section>;
}
