"use client";

import { useEffect, useId, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import type { DiscoveryFeed } from "@newsbeat/contracts";
import CatalogSearch from "./catalog-search";
import type { LookupAsset } from "./landing-lookup-data";
import { API_BASE } from "./content";
import "./market-discovery.css";

const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const format = (value: string) => dateFormat.format(new Date(value));
const visitKey = "rarebird:discovery-last-read";
type FeedSnapshot = { scope: string; feed: DiscoveryFeed | null; failed: boolean };
const tabs = [{ id: "all", label: "All markets" }, { id: "equity", label: "Stocks" }, { id: "crypto", label: "Crypto" }] as const;

export default function MarketDiscovery({
  compact = false,
  showControls = !compact,
  initialMarket = "all",
}: { compact?: boolean; showControls?: boolean; initialMarket?: (typeof tabs)[number]["id"] }) {
  const heading = useId();
  const [asset, setAsset] = useState(initialMarket);
  const [selection, setSelection] = useState<LookupAsset | null>(null);
  const beatId = selection?.beat_id;
  const scope = beatId ?? asset;
  const searchId = heading + "-search";
  const [snapshot, setSnapshot] = useState<FeedSnapshot | null>(null);
  const feed = snapshot?.scope === scope ? snapshot.feed : null;
  const failed = snapshot?.scope === scope && snapshot.failed;
  const [priorVisit, setPriorVisit] = useState(0);
  useEffect(() => {
    try { setPriorVisit(Date.parse(window.localStorage.getItem(visitKey) ?? "")); } catch { /* Storage is optional. */ }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ limit: compact ? "3" : "12" });
    if (beatId) params.set("beat_id", beatId);
    else if (asset !== "all") params.set("asset", asset);
    let active = true;
    let request: AbortController | undefined;
    const load = async () => {
      if (document.visibilityState === "hidden") return;
      request?.abort();
      const controller = new AbortController();
      request = controller;
      const timeout = window.setTimeout(() => controller.abort(), 12_000);
      try {
        const response = await fetch(API_BASE + "/v2/discovery?" + params, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Discovery unavailable");
        const next = await response.json() as DiscoveryFeed;
        if (!active || request !== controller) return;
        setSnapshot({ scope, feed: next, failed: false });
        if (next.coverage.scanned_at) {
          try {
            const previous = window.localStorage.getItem(visitKey);
            if (!previous || previous < next.coverage.scanned_at) window.localStorage.setItem(visitKey, next.coverage.scanned_at);
          } catch { /* Storage is optional. */ }
        }
      } catch {
        if (active && request === controller) setSnapshot(previous => ({
          scope, feed: previous?.scope === scope ? previous.feed : null, failed: true,
        }));
      } finally {
        window.clearTimeout(timeout);
      }
    };
    void load();
    const timer = window.setInterval(load, 60_000);
    document.addEventListener("visibilitychange", load);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
      request?.abort();
    };
  }, [asset, beatId, compact, scope]);

  const state = failed ? feed ? "Refresh interrupted. Showing the last scan." : "The discovery feed is temporarily unavailable."
    : !feed ? "Loading the latest scan…"
    : feed.status === "unavailable" ? "The discovery feed is temporarily unavailable."
    : feed.status === "warming_up" ? "Waiting for the first catalog scan."
    : feed.status === "partial" ? "Coverage is partial. Some inputs are delayed or still being scanned." : null;
  const empty = !failed && feed && (feed.status === "ready" || feed.status === "partial") && !feed.events.length;
  return <section className="rb-discovery" aria-labelledby={heading}>
    <header>
      <h2 id={heading}>{compact && initialMarket === "crypto" ? "What changed in crypto" : "What changed"}</h2>
      {feed?.coverage.scanned_at && <p className="rb-discovery-meta">
        {feed.coverage.fresh_news_feeds.toLocaleString()} of {feed.coverage.catalog_total.toLocaleString()} news feeds current
        {" · "} Scanned <time dateTime={feed.coverage.scanned_at}>{format(feed.coverage.scanned_at)}</time>
      </p>}
    </header>
    {showControls && <>
      <div className="rb-discovery-controls">
        <CatalogSearch id={searchId} className="rb-discovery-search" onSelect={setSelection} />
        <div className="rb-discovery-tabs" role="group" aria-label="Filter market developments">
          {tabs.map(tab => <button key={tab.id} type="button" aria-pressed={!selection && tab.id === asset} onClick={() => {
            setSelection(null);
            setAsset(tab.id);
          }}>{tab.label}</button>)}
        </div>
      </div>
      {selection && <div className="rb-discovery-selection">
        <div className="rb-discovery-selection-name" role="status">
          <strong>{selection.ticker}</strong>
          <span>{selection.label} · {selection.asset === "crypto" ? "Crypto" : "Stock"}</span>
        </div>
        <a href={"/ask?" + new URLSearchParams({ ticker: selection.ticker, beat_id: selection.beat_id })}>
          Research {selection.ticker} <ArrowUpRight size={13} aria-hidden="true" />
        </a>
        <button type="button" aria-label="Clear asset filter" onClick={() => { setSelection(null); document.getElementById(searchId)?.focus(); }}>
          <X size={15} aria-hidden="true" />
        </button>
      </div>}
    </>}
    {state && <p className="rb-discovery-meta" role="status">{state}</p>}
    {empty && <p className="rb-discovery-meta" role="status">{selection
      ? `No recent developments for ${selection.label} met the evidence checks.`
      : "No recent developments met the evidence checks."}</p>}
    {!!feed?.events.length && <ol className="rb-discovery-list">
      {feed.events.map(event => {
        const lead = event.evidence[0];
        if (!lead) return null;
        const newSinceLastRead = priorVisit > 0 && Date.parse(event.first_recorded_at) > priorVisit;
        const primary = lead.type === "official_filing";
        return <li key={event.id}>
          <div className="rb-discovery-tags">
            <span>{event.assets.map(item => item.ticker).join(" · ")}</span>
            <span>{event.label}</span>
            {newSinceLastRead && <span className="rb-discovery-new">Since your last visit</span>}
          </div>
          <h3>{event.title}</h3>
          <a className="rb-discovery-source" href={lead.url} target="_blank" rel="noreferrer">{lead.source} <ArrowUpRight size={13} aria-hidden="true" /></a>
          <div className="rb-discovery-times">
            <span>{primary ? "Accepted" : "Published"} <time dateTime={lead.published_at}>{format(lead.published_at)}</time></span>
            <span>Recorded <time dateTime={event.first_recorded_at}>{format(event.first_recorded_at)}</time></span>
          </div>
          <details>
            <summary>Evidence and next check</summary>
            <p>{event.next_check}</p>
            <p className="rb-discovery-meta">{primary ? "Official filing metadata" : "Attributed press report"} · {primary ? "Source checked" : "Indexed"} <time dateTime={lead.indexed_at}>{format(lead.indexed_at)}</time></p>
            {event.evidence.slice(1).map(item => <p key={item.url} className="rb-discovery-meta">
              <a href={item.url} target="_blank" rel="noreferrer">{item.source} <ArrowUpRight size={12} aria-hidden="true" /></a>
              {" · "} <time dateTime={item.published_at}>{format(item.published_at)}</time>
            </p>)}
          </details>
        </li>;
      })}
    </ol>}
    {showControls && feed?.coverage.scanned_at && <p className="rb-discovery-meta">
      Official filings checked for {feed.coverage.fresh_official_issuers} of {feed.coverage.official_issuer_total} pilot issuers.
    </p>}
    {compact && <a className="rb-discovery-more" href="/intelligence#discovery">Explore the discovery feed <ArrowUpRight size={14} aria-hidden="true" /></a>}
  </section>;
}
