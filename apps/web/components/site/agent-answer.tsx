"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { AgentResponse } from "@rarebird/contracts";
import type { LookupAsset } from "./landing-lookup-data";
import { ResearchDetails } from "./research-question";
import { MarketForecastPanel } from "./market-forecast";
import "./market-briefing.css";

export default function AgentAnswer({ result, disabled = false, proactive = false, onAsk, onSelect, onFollow, followedIds = [] }: {
  result: AgentResponse;
  disabled?: boolean;
  proactive?: boolean;
  onAsk: (question: string) => void;
  onSelect?: (beatId: string) => void;
  onFollow?: (asset: LookupAsset) => void;
  followedIds?: string[];
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!result.forecasts) return;
    const clock = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(clock);
  }, [result.forecasts]);
  const highlights = result.evidence.filter(item => item.freshness === "fresh" && !item.id.startsWith("agent:forecast:") && !item.id.startsWith("agent:scorecard:"))
    .filter((item, index, items) => items.findIndex(other => other.url === item.url && other.text === item.text) === index).slice(0, proactive ? 3 : 2);
  const citations = [...new Map((result.answer?.reasoning.flatMap(reason => reason.evidence_ids) ?? [])
    .flatMap(id => { const item = result.evidence.find(item => item.id === id); return item ? [[item.url, item] as const] : []; })).values()].slice(0, 4);
  return <div className="rb-agent-answer research-question">
    <p className="rb-feed-speaker">Rarebird</p>
    {proactive && <><h2 className="rb-agent-welcome">Here’s where I’d start.</h2><p className="rb-agent-intro">Ask a question. I’ll bring together the relevant reporting, market checks and tools, then help you decide what to investigate next.</p></>}
    <div className="rb-agent-tools" aria-label="Capabilities checked">{result.tools.map(tool => <span key={tool.id} data-status={tool.status}>
      {tool.label}{tool.status !== "complete" && <small>{tool.status === "limited" ? "Partial coverage" : "Unavailable"}</small>}
    </span>)}</div>
    <ResearchDetails result={result} onSelect={disabled ? undefined : onSelect} />
    {!!citations.length && <div className="rb-agent-citations" aria-label="Answer sources">{citations.map(item => <a key={item.url} href={item.url} target="_blank" rel="noreferrer">{item.source}<ArrowUpRight size={13} aria-hidden="true" /></a>)}</div>}
    {!!highlights.length && <div className="rb-agent-results" aria-label="Relevant results">{highlights.map(item => <article key={item.id}>
      <p className="rb-feed-note">{item.id.startsWith("agent:review:") ? "Review candidate" : item.id.startsWith("agent:watch:") ? "Anomaly watch" : item.kind === "measurement" ? "Market observation" : "Source reporting"}</p>
      <p className="rb-agent-result-text">{item.text}</p>
      <a href={item.url} target="_blank" rel="noreferrer">{item.source}<ArrowUpRight size={13} aria-hidden="true" /></a>
      <time dateTime={item.observed_at}>{new Date(item.observed_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time>
    </article>)}</div>}
    {!!result.forecasts?.assets.length && <div className="rb-agent-forecast rb-brief">
      <MarketForecastPanel outlook={result.forecasts} now={now} unavailable={result.forecasts.status === "unavailable"} />
    </div>}
    {!!result.assets.length && onFollow && <div className="rb-agent-follow" aria-label="Follow assets from this answer">{result.assets.map(asset => <button key={asset.beat_id} type="button"
      className="rb-feed-button" aria-pressed={followedIds.includes(asset.beat_id)} onClick={() => onFollow(asset)}>
      {followedIds.includes(asset.beat_id) ? "Following " : "Follow "}{asset.ticker}
    </button>)}</div>}
    <p className="rb-feed-note">Checked <time dateTime={result.generated_at}>{new Date(result.generated_at).toLocaleString()}</time></p>
    {!!result.suggestions.length && <div className="rb-agent-suggestions" aria-label="Suggested next questions">{result.suggestions.map(question => <button key={question} type="button" disabled={disabled} onClick={() => onAsk(question)}>{question}<ArrowUpRight size={14} aria-hidden="true" /></button>)}</div>}
  </div>;
}
