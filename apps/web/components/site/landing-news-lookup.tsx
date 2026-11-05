"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, RefreshCw, Search, X } from "lucide-react";
import { API_BASE } from "./content";
import { coverageLabel, findAssets, readCoverage, type LookupAsset, type LookupNews } from "./landing-lookup-data";
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
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(-1);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState<{ term: string; phase: "loading" | "ready" | "error"; topics: LookupAsset[] }>({ term: "", phase: "ready", topics: [] });
  const input = useRef<HTMLInputElement>(null);
  const term = query.trim();
  const matches = open && !!term;
  const current = search.term === term;
  const topics = current && search.phase === "ready" ? search.topics : [];
  function choose(next: LookupAsset) { setAsset(next); setQuery(""); setOpen(false); setIndex(-1); }
  useEffect(() => {
    if (!term) return;
    const controller = new AbortController();
    let active = true;
    let timeout: number | undefined;
    const debounce = window.setTimeout(() => {
      setSearch({ term, phase: "loading", topics: [] });
      timeout = window.setTimeout(() => controller.abort(), 12_000);
      void findAssets(API_BASE, term, controller.signal).then(topics => { if (active) setSearch({ term, phase: "ready", topics }); })
        .catch(() => { if (active) setSearch({ term, phase: "error", topics: [] }); }).finally(() => window.clearTimeout(timeout));
    }, 250);
    return () => { active = false; controller.abort(); window.clearTimeout(debounce); window.clearTimeout(timeout); };
  }, [term, attempt]);
  return <aside className="landing-lookup" id="company-news" aria-labelledby="landing-lookup-title">
    <div className="landing-lookup-intro"><span className="landing-lookup-eyebrow"><i aria-hidden="true" /> THE NEWS BEHIND THE SIGNAL</span><h2 id="landing-lookup-title">What’s happening with…</h2><p>Find a company. Go straight to the reporting.</p></div>
    <form className="landing-lookup-search" role="search" aria-label="Company and crypto news" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onSubmit={event => { event.preventDefault(); if (index >= 0 && topics[index]) choose(topics[index]); else if (topics.length === 1) choose(topics[0]); else { setOpen(true); setAttempt(value => value + 1); } }}>
      <label htmlFor="landing-company-query" className="landing-lookup-sr">Search by company name or ticker</label>
      <div className="landing-lookup-input"><Search size={19} aria-hidden="true" /><input ref={input} id="landing-company-query" type="text" role="combobox" aria-autocomplete="list" aria-expanded={matches} aria-controls={matches ? "landing-company-matches" : undefined} aria-activedescendant={matches && topics[index] ? `landing-match-${topics[index].beat_id}` : undefined} autoComplete="off" maxLength={80} placeholder="Company or ticker, e.g. Tesla or TSLA" value={query} onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setIndex(-1); setOpen(true); }} onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); setOpen(false); setIndex(-1); }
        if ((event.key === "ArrowDown" || event.key === "ArrowUp") && topics.length) { event.preventDefault(); setOpen(true); setIndex(value => event.key === "ArrowDown" ? (value + 1) % topics.length : (value <= 0 ? topics.length - 1 : value - 1)); }
      }} />{query ? <button type="button" aria-label="Clear company search" onClick={() => { setQuery(""); setIndex(-1); input.current?.focus(); }}><X size={16} aria-hidden="true" /></button> : <button type="submit" aria-label="Search coverage"><ArrowRight size={18} aria-hidden="true" /></button>}</div>
      {matches ? <div className="landing-lookup-dropdown"><ul id="landing-company-matches" role="listbox" aria-label="Matching stocks and crypto">{topics.map((topic, position) => <li key={topic.beat_id} id={`landing-match-${topic.beat_id}`} role="option" aria-selected={position === index} onMouseDown={event => event.preventDefault()} onClick={() => { choose(topic); input.current?.focus(); }}><span><strong>{topic.label}</strong><small>{marketLabel(topic)}</small></span><span>{topic.ticker}<ArrowRight size={14} aria-hidden="true" /></span></li>)}</ul><p role="status">{!current || search.phase === "loading" ? "Finding matching companies and assets…" : search.phase === "error" ? "Search is unavailable. Try again." : !topics.length ? `No supported match for “${term}”. Try another name or ticker.` : "Choose a match · ↑ ↓ to browse · Enter to open"}</p>{current && search.phase === "error" ? <button type="submit">Retry search</button> : null}</div> : null}
    </form>
    <div className="landing-lookup-suggestions" role="group" aria-label="Try a company or asset"><span>Try</span>{SUGGESTIONS.map(item => <button type="button" key={item.beat_id} aria-pressed={item.beat_id === asset.beat_id} onClick={() => choose(item)}>{item.label}</button>)}</div>
    <Coverage key={asset.beat_id} asset={asset} />
    <div className="landing-lookup-bridge"><span>Headlines are the starting point.<br /><strong>Your agent gets the context.</strong></span><a href="/intelligence">Explore signals <ArrowRight size={15} aria-hidden="true" /></a></div>
    <noscript><p>Enable JavaScript to search live coverage, or <a href="/docs/quickstart">connect your agent</a>.</p></noscript>
  </aside>;
}
