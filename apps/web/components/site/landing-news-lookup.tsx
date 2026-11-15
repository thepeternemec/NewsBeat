"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, RefreshCw } from "lucide-react";
import { API_BASE } from "./content";
import { coverageLabel, readCoverage, type LookupAsset, type LookupNews } from "./landing-lookup-data";
import CatalogSearch from "./catalog-search";
import "./landing-news-lookup.css";

const SUGGESTIONS: LookupAsset[] = [
  { label: "NVIDIA", ticker: "NVDA", beat_id: "b_bb964843350e", asset: "equity" },
  { label: "Apple", ticker: "AAPL", beat_id: "b_7d5acdda6186", asset: "equity" },
  { label: "Tesla", ticker: "TSLA", beat_id: "b_3f8a25c6e1b7", asset: "equity" },
  { label: "Bitcoin", ticker: "BTC", beat_id: "b_06c91290de1c", asset: "crypto" },
];
const marketLabel = (asset: LookupAsset) => asset.asset === "crypto" ? "Crypto" : "Stock";
function date(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Time unavailable" : parsed.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
}

function Coverage({ asset }: { asset: LookupAsset }) {
  const [result, setResult] = useState<{ data: LookupNews; readAt: number } | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [clock, setClock] = useState(0);
  const region = useRef<HTMLDivElement>(null);
  const visible = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { visible.current = entries[0]?.isIntersecting ?? false; });
    if (region.current) observer.observe(region.current);
    const timer = window.setInterval(() => {
      setClock(Date.now());
      if (document.visibilityState === "visible" && visible.current) setAttempt(value => value + 1);
    }, 60_000);
    return () => { observer.disconnect(); window.clearInterval(timer); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(() => controller.abort(), 12_000);
    setPhase("loading");
    void readCoverage(API_BASE, asset.beat_id, controller.signal).then(data => {
      if (active) { const now = Date.now(); setResult({ data, readAt: now }); setClock(now); setPhase("ready"); }
    }).catch(() => { if (active) setPhase("error"); }).finally(() => window.clearTimeout(timer));
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [asset.beat_id, attempt]);
  const status = phase === "error" ? "Refresh unavailable" : result ? coverageLabel(result.data, result.readAt, clock) : "Checking collection";
  const items = result?.data.items.slice(0, expanded ? 8 : 3) ?? [];
  return <div className="landing-coverage" ref={region}>
    <div className="landing-coverage-asset"><div><span className="landing-coverage-ticker">{asset.ticker}</span><h3>{asset.label}</h3><span className="landing-coverage-market">{marketLabel(asset)}</span></div><button type="button" aria-label={`Refresh ${asset.label} coverage`} disabled={phase === "loading"} onClick={() => setAttempt(value => value + 1)}><RefreshCw size={15} aria-hidden="true" /></button></div>
    <div className="landing-coverage-status" role="status"><span>{phase === "loading" && result ? "Refreshing coverage…" : status}</span>{result?.data.freshness.last_success_at ? <span>Checked <time dateTime={result.data.freshness.last_success_at}>{date(result.data.freshness.last_success_at)}</time></span> : null}</div>
    <div className="landing-coverage-reports" aria-busy={phase === "loading"}>
      {!result && phase === "loading" ? <div className="landing-coverage-placeholder"><p role="status">Finding the latest reporting…</p><i /><i /><i /></div> : null}
      {phase === "error" ? <p className="landing-coverage-notice">We couldn’t refresh this coverage. {result ? "The earlier snapshot is shown below." : "Please try again."} <button type="button" onClick={() => setAttempt(value => value + 1)}>Retry</button></p> : null}
      {result && !items.length ? <p className="landing-coverage-notice">No headlines in the current coverage window. Try another company or check again later.</p> : null}
      {items.length ? <ul>{items.map(item => <li key={item.id}><a href={item.url} target="_blank" rel="noopener noreferrer"><span className="landing-coverage-meta"><span>{item.source}</span><time dateTime={item.published_at}>{date(item.published_at)}</time></span><span className="landing-coverage-headline">{item.title}<ArrowUpRight size={15} aria-hidden="true" /></span></a></li>)}</ul> : null}
    </div>
    {result && result.data.items.length > 3 ? <button className="landing-coverage-more" type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "Show fewer headlines" : "More headlines"}<ArrowDown size={13} aria-hidden="true" /></button> : null}
    <p className="landing-coverage-note">Original headlines · Publisher links via Google News · Coverage varies</p>
  </div>;
}

export default function LandingNewsLookup() {
  const [asset, setAsset] = useState(SUGGESTIONS[0]);
  return <aside className="landing-lookup" id="company-news" aria-labelledby="landing-lookup-title">
    <div className="landing-lookup-intro"><span className="landing-lookup-eyebrow"><i aria-hidden="true" /> NEWS ARCHIVE · 10-MINUTE COLLECTION</span><h2 id="landing-lookup-title">What’s happening with…</h2><p>Search collected stock and crypto headlines.</p></div>
    <CatalogSearch id="landing-company-query" className="landing-lookup-search" onSelect={setAsset} />
    <div className="landing-lookup-suggestions" role="group" aria-label="Try a company or asset"><span>Try</span>{SUGGESTIONS.map(item => <button type="button" key={item.beat_id} aria-pressed={item.beat_id === asset.beat_id} onClick={() => setAsset(item)}>{item.label}</button>)}</div>
    <Coverage key={asset.beat_id} asset={asset} />
    <div className="landing-lookup-bridge"><span>Start with the reporting.<br /><strong>Find the context behind it.</strong></span><a href="/intelligence">Explore signals <ArrowRight size={15} aria-hidden="true" /></a></div>
    <noscript><p>Enable JavaScript to search live coverage, or <a href="/docs/quickstart">connect your agent</a>.</p></noscript>
  </aside>;
}
