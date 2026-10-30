"use client";

import { useState } from "react";
import { ArrowUpRight, Copy, Download, Check } from "lucide-react";
import { buildResearchContext, buildResearchPrompt, type ResearchTopic, type ResearchSnapshot } from "./agent-context";
import "./agent-context.css";

export default function AgentContextPanel({ topic, snapshot, notice, onRefresh, loading }: {
  topic: ResearchTopic; snapshot: ResearchSnapshot | null; notice: string;
  onRefresh: () => void; loading: boolean;
}) {
  const [feedback, setFeedback] = useState("");
  const [showJson, setShowJson] = useState(false);
  const context = buildResearchContext(topic, snapshot);
  const json = context ? JSON.stringify(context, null, 2) : "";
  async function copyBrief() {
    if (!context) return;
    try {
      await navigator.clipboard.writeText(buildResearchPrompt(context));
      setFeedback("Research brief copied. Paste it into your agent.");
    } catch {
      setShowJson(true);
      setFeedback("Clipboard unavailable. Select the snapshot below or download the JSON.");
    }
  }
  function download() {
    if (!context) return;
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `black-sheep-${topic.ticker.replace(/[^a-z0-9_-]/gi, "-")}-research.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback("Research snapshot downloaded.");
  }
  return (
    <section className="agent-context" aria-labelledby="agent-context-title">
      <div className="agent-context-head">
        <div><span className="agent-context-eyebrow">RESEARCH WORKSPACE / {topic.ticker}</span><h2 id="agent-context-title">From evidence to agent context.</h2><p>{topic.label} company coverage, ready for a source-linked brief.</p></div>
        <a href="/docs/quickstart">Connect MCP <ArrowUpRight size={14} /></a>
      </div>
      <div className="agent-context-facts">
        <div><span>Evidence</span><strong>{context ? `${context.evidence.length} grouped stories` : "Not loaded"}</strong><small>Headline metadata · rolling 24h</small></div>
        <div><span>Coverage</span><strong>{context?.coverage.status ?? "Not loaded"}</strong><small>{context?.coverage.last_success_at ? `Last collected ${new Date(context.coverage.last_success_at).toLocaleString()}` : "Collection time unavailable"}</small></div>
        <div><span>Token identity</span><strong>Mapping unverified</strong><small>Researching the underlying company</small></div>
      </div>
      <div className="agent-context-task"><span>THE RESEARCH JOB</span><p>What changed, what supports or challenges your thesis, and what still needs checking? Export the evidence and a prompt that asks your agent to answer with citations.</p></div>
      {context ? <p className="agent-context-note">{context.coverage.truncated ? "Partial snapshot: the API grouped the latest 200 reports. " : ""}{context.evidence.length === 0 ? "No reports in this snapshot. This does not establish that nothing happened. " : ""}Captured {new Date(context.captured_at).toLocaleString()}. Recheck freshness before using it for a new decision. Token quotes, liquidity and execution are not connected.</p> : <p className="agent-context-note" role="status">{notice}</p>}
      <div className="agent-context-actions">
        <button type="button" className="agent-context-primary" disabled={!context} onClick={copyBrief}>{feedback.startsWith("Research brief copied") ? <Check size={15} /> : <Copy size={15} />} Copy research brief</button>
        <button type="button" disabled={!context} onClick={download}><Download size={15} /> Download JSON</button>
        <button type="button" disabled={!context} aria-expanded={showJson} aria-controls="research-snapshot" onClick={() => setShowJson(!showJson)}>{showJson ? "Hide" : "Inspect"} evidence JSON</button>
        <button type="button" disabled={loading} onClick={() => { setFeedback(""); onRefresh(); }}>{loading ? "Refreshing…" : "Refresh coverage"}</button>
      </div>
      <p className="agent-context-feedback" role="status">{feedback}</p>
      {showJson && context && <pre id="research-snapshot" tabIndex={0} aria-label="Research evidence JSON">{json}</pre>}
    </section>
  );
}
