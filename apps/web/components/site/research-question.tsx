"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import type { ResearchResponse } from "@newsbeat/contracts";
import { API_BASE } from "./content";
import "./research-question.css";

const EXAMPLES = [
  "What could change the outlook for NVIDIA?",
  "Compare the risks in AMD and NVIDIA.",
  "Does Bitcoin’s latest news explain its market move?",
];

export default function ResearchQuestion({ beatIds, label, compact = false }: {
  beatIds?: string[]; label?: string; compact?: boolean;
}) {
  const id = useId();
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  const revision = useRef(0);
  useEffect(() => () => { revision.current++; active.current?.abort(); }, []);

  async function research(text: string, selected?: string[]) {
    if (text.trim().length < 3) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const current = ++revision.current;
    const timeout = window.setTimeout(() => controller.abort(), 35000);
    setQuestion(text); setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch(API_BASE + "/v2/research", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({ question: text.trim(), ...((selected ?? beatIds)?.length ? { beat_ids: selected ?? beatIds } : {}) }),
      });
      if (!response.ok) throw new Error(response.status === 429 ? "Too many requests. Wait a moment before trying again." : "Research is unavailable right now. Please try again.");
      const data = await response.json() as ResearchResponse;
      if (data.version !== "question-research-v1" || !Array.isArray(data.evidence)) throw new Error("The research response could not be read.");
      if (current === revision.current) setResult(data);
    } catch (cause) {
      if (current === revision.current) setError(controller.signal.aborted ? "The request took too long. Please try again." : cause instanceof Error ? cause.message : "Research is unavailable.");
    } finally {
      window.clearTimeout(timeout);
      if (current === revision.current) setLoading(false);
    }
  }
  return (
    <section className={"research-question" + (compact ? " research-question-compact" : "")} aria-label="Ask Rarebird">
      <div className="research-question-heading"><Sparkles size={15} aria-hidden="true" /><span>ASK RAREBIRD{label ? " · " + label : ""}</span></div>
      <form onSubmit={event => { event.preventDefault(); void research(question); }}>
        <label htmlFor={id}>{compact ? "What do you want to understand?" : "Ask about a company, a market move or a risk."}</label>
        <div className="research-question-input">
          <textarea id={id} rows={compact ? 2 : 3} value={question} onChange={event => setQuestion(event.target.value)}
            minLength={3} maxLength={600} required placeholder={label ? "What could change the outlook for " + label + "?" : "What could change the outlook for NVIDIA?"} />
          <button type="submit" disabled={loading || question.trim().length < 3} aria-label="Research this question"><ArrowRight size={19} /></button>
        </div>
      </form>
      {!compact && !result && !loading && <div className="research-question-examples">{EXAMPLES.map(text =>
        <button type="button" key={text} onClick={() => void research(text)}>{text}<ArrowUpRight size={12} /></button>)}</div>}
      <div aria-live="polite" aria-busy={loading}>
        {loading && <p className="research-question-loading" role="status"><span aria-hidden="true" />Checking reporting and available market evidence…</p>}
        {error && <p role="status">{error}</p>}
        {result && <div className="research-question-result">
          <div className="research-question-flow" aria-label="Research coverage">{result.flow.map(step =>
            <span key={step.step} data-state={step.status}><i aria-hidden="true" />{step.step}</span>)}</div>
          <ResearchDetails result={result} onSelect={beatId => void research(result.question, [beatId])} />
        </div>}
      </div>
      {!compact && <p className="research-question-note">Question research across 2,030 stock and crypto assets. Measured market checks cover a six-asset pilot; missing evidence stays visible.</p>}
    </section>
  );
}

export function ResearchDetails({ result, onSelect, showReasoning = false }: {
  result: ResearchResponse; onSelect?: (beatId: string) => void; showReasoning?: boolean;
}) {
  return <>
          {result.answer ? <>
            <h3>The answer</h3><p className="research-question-answer">{result.answer.answer}</p>
            {result.message && <p className="research-question-coverage">{result.message}</p>}
            <details open={showReasoning || undefined}><summary>Why this view</summary>
              {result.answer.reasoning.map((reason, index) => <div className="research-question-reason" key={index}>
                <span>{reason.kind === "observation" ? "Reported / measured" : "Possible interpretation"}</span>
                <p>{reason.claim}</p><div className="research-question-sources">{reason.evidence_ids.map(eid => {
                  const item = result.evidence.find(e => e.id === eid);
                  return item ? <a key={eid} href={item.url} target="_blank" rel="noreferrer">{item.source}<ArrowUpRight size={11} /></a> : null;
                })}</div>
              </div>)}
            </details>
            {result.answer.unknowns.length > 0 && <details><summary>What remains uncertain</summary><ul>{result.answer.unknowns.map(text => <li key={text}>{text}</li>)}</ul></details>}
            <div className="research-question-next"><h4>What to check next</h4><ul>{result.answer.next_checks.map(text => <li key={text}>{text}</li>)}</ul></div>
          </> : <p role="status">{result.message}</p>}
          {onSelect && result.candidates.length > 0 && <div className="research-question-candidates">{result.candidates.map(asset =>
            <button type="button" key={asset.beat_id} onClick={() => void onSelect?.(asset.beat_id)}>{asset.label} · {asset.ticker} · {asset.asset === "crypto" ? "Crypto" : "Stock"}</button>)}</div>}
          {result.assets.length > 0 && <p className="research-question-coverage">{result.assets.map(asset => asset.label + ": news " + asset.news_status + ", market " + asset.market_status).join(" · ")}</p>}
          <details><summary>Evidence and coverage</summary>
            {result.evidence.map(item => <div className="research-question-evidence" key={item.id}>
              <a href={item.url} target="_blank" rel="noreferrer">{item.text}<ArrowUpRight size={12} /></a>
              <small>{item.source} · {new Date(item.observed_at).toLocaleString("en-GB", { timeZone: "UTC" })} UTC · {item.freshness}</small>
            </div>)}
            <ul>{result.limitations.map(text => <li key={text}>{text}</li>)}</ul>
          </details>
  </>;
}
