"use client";

import { useEffect, useId, useState } from "react";
import { ArrowUpRight, Bookmark, BookmarkCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CatalogSearch from "./catalog-search";
import MarketDiscovery from "./market-discovery";
import IntelligencePanel from "./intelligence-panel";
import { API_BASE } from "./content";
import type { LookupAsset } from "./landing-lookup-data";
import { loadStoryFeed } from "./story-feed";
import "./feed-workspace.css";

const markets = [
  { id: "all", label: "All markets", href: "/" },
  { id: "equity", label: "Stocks", href: "/?market=equity" },
  { id: "crypto", label: "Crypto", href: "/?market=crypto" },
] as const;
const storageKey = "rarebird:followed-feeds";
const legacySections = new Set(["#top", "#signal-graph", "#agent-workflow", "#connect-agent", "#market-perspective", "#build-history", "#community"]);
const feedHref = (id: string) => "/?beat=" + encodeURIComponent(id);
type Stories = Awaited<ReturnType<typeof loadStoryFeed>>;
const localDate = (date: string) => new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function Reporting({ asset }: { asset: LookupAsset }) {
  const [stories, setStories] = useState<Stories | null>(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(6);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let current: AbortController | undefined;
    async function refresh() {
      if (document.hidden || current) return;
      const request = new AbortController();
      current = request;
      const timeout = window.setTimeout(() => request.abort(), 12_000);
      try {
        const result = await loadStoryFeed(API_BASE, asset.beat_id, 40, request.signal);
        if (current === request) { setStories(result); setFailed(false); }
      } catch {
        if (current === request) setFailed(true);
      } finally {
        window.clearTimeout(timeout);
        if (current === request) current = undefined;
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      const request = current;
      current = undefined;
      request?.abort();
    };
  }, [asset.beat_id, retry]);

  return <section className="rb-feed-reporting" aria-labelledby="feed-reporting-title">
    <h2 id="feed-reporting-title">Source reporting</h2>
    <p className="rb-feed-note">Past 24 hours · Grouped by related headlines</p>
    {failed && <p role="status">{stories ? "Refresh failed. Showing the last loaded reports." : "Reporting is temporarily unavailable."}{" "}
      <button type="button" className="rb-feed-button" onClick={() => setRetry(value => value + 1)}>Retry</button>
    </p>}
    {!stories && !failed && <p role="status">Loading reports…</p>}
    {stories && <>
      <p className="rb-feed-note">{stories.freshness.status === "fresh" ? "Collection current" : "Collection delayed or unconfirmed"}
        {stories.freshness.last_success_at && <> · Checked <time dateTime={stories.freshness.last_success_at}>{localDate(stories.freshness.last_success_at)}</time></>}
        {stories.coverage_truncated && " · Partial reporting window"}
      </p>
      {!stories.items.length && <p>No reporting found in this window.</p>}
      <ol>
        {stories.items.slice(0, visible).map(item => <li key={item.id}>
          <p className="rb-feed-note">{item.source} · <time dateTime={item.published_at}>{localDate(item.published_at)}</time></p>
          <h3><a href={item.url} target="_blank" rel="noreferrer">{item.title} <ArrowUpRight size={14} aria-hidden="true" /></a></h3>
          {item.reports.length > 1 && <details>
            <summary>{item.reports.length} related reports</summary>
            <ul>{item.reports.map(report => <li key={report.id}><a href={report.url} target="_blank" rel="noreferrer">{report.source} · {report.title}</a></li>)}</ul>
          </details>}
        </li>)}
      </ol>
      {visible < stories.items.length && <button className="rb-feed-button" type="button" onClick={() => setVisible(value => value + 6)}>Show more reports</button>}
    </>}
  </section>;
}

export default function FeedWorkspace({ asset, market, unknownAsset }: {
  asset: LookupAsset | null;
  market: (typeof markets)[number]["id"];
  unknownAsset: boolean;
}) {
  const router = useRouter();
  const searchId = useId();
  const [followed, setFollowed] = useState<LookupAsset[]>([]);
  const [storageIssue, setStorageIssue] = useState(false);
  const [view, setView] = useState<"updates" | "reporting" | "analysis">("updates");
  const isFollowing = followed.some(item => item.beat_id === asset?.beat_id);

  useEffect(() => {
    if (legacySections.has(window.location.hash) && !window.location.search) {
      window.location.replace("/about" + window.location.hash);
      return;
    }
    function readFollows() {
      try {
        const items: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
        if (Array.isArray(items)) setFollowed(items.filter((item): item is LookupAsset =>
          item && typeof item.beat_id === "string" && /^b_[a-f0-9]{12}$/.test(item.beat_id)
          && typeof item.ticker === "string" && typeof item.label === "string" && typeof item.asset === "string"));
      } catch { setStorageIssue(true); }
    }
    readFollows();
    window.addEventListener("storage", readFollows);
    return () => window.removeEventListener("storage", readFollows);
  }, []);

  function toggleFollow() {
    if (!asset) return;
    const next = isFollowing ? followed.filter(item => item.beat_id !== asset.beat_id) : [...followed, asset];
    setFollowed(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setStorageIssue(false); }
    catch { setStorageIssue(true); }
  }

  return <main className="rb-feed">
    <header className="rb-feed-head">
      <h1>Market feeds</h1>
      <p>See what changed. Follow a company or token to keep its reporting and analysis in one place.</p>
      <CatalogSearch id={searchId} onSelect={item => router.push(feedHref(item.beat_id), { scroll: false })} />
    </header>
    {unknownAsset && <p role="status">That asset feed couldn’t be found. Search the catalog or choose a market below.</p>}
    <div className="rb-feed-layout">
      <aside className="rb-feed-sidebar" aria-label="Choose a feed">
        <nav className="rb-feed-scopes" aria-label="Markets">
          {markets.map(item => <Link key={item.id} href={item.href} scroll={false} aria-current={!asset && market === item.id ? "page" : undefined}>{item.label}</Link>)}
        </nav>
        <div className="rb-feed-followed">
          <h2>Following</h2>
          {followed.length ? <nav aria-label="Followed feeds">{followed.map(item =>
            <Link key={item.beat_id} href={feedHref(item.beat_id)} scroll={false} aria-current={asset?.beat_id === item.beat_id ? "page" : undefined}>
              <strong>{item.ticker}</strong><span>{item.label} · {item.asset === "crypto" ? "Crypto" : "Stock"}</span>
            </Link>)}</nav> : <p className="rb-feed-note">Search for an asset to follow it here.</p>}
          {storageIssue && <p className="rb-feed-note" role="status">This browser couldn’t save your followed feeds.</p>}
        </div>
        <a className="rb-feed-about" href="/about">How Rarebird works <ArrowUpRight size={14} aria-hidden="true" /></a>
      </aside>
      <div className="rb-feed-stream">
        {asset && <header className="rb-feed-asset">
          <div><p className="rb-feed-note">{asset.ticker} · {asset.asset === "crypto" ? "Crypto" : "Stock"}</p><h2>{asset.label}</h2></div>
          <button className="rb-feed-button" type="button" aria-pressed={isFollowing} aria-label={"Follow " + asset.label} onClick={toggleFollow}>
            {isFollowing ? <BookmarkCheck size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}
            {isFollowing ? "Following" : "Follow"}
          </button>
        </header>}
        {asset && <div className="rb-feed-views" role="group" aria-label="Asset feed view">
          <button type="button" aria-pressed={view === "updates"} onClick={() => setView("updates")}>Updates</button>
          <button type="button" aria-pressed={view === "reporting"} onClick={() => setView("reporting")}>Reporting</button>
          <button type="button" aria-pressed={view === "analysis"} onClick={() => setView("analysis")}>Analysis</button>
        </div>}
        {view === "updates" && <MarketDiscovery showControls={false} initialMarket={market} initialSelection={asset} linkFeeds />}
        {view === "reporting" && asset && <Reporting asset={asset} />}
        {view === "analysis" && asset && <IntelligencePanel beatId={asset.beat_id} label={asset.label} base={API_BASE} />}
        {asset && <a className="rb-feed-about" href={"/ask?" + new URLSearchParams({ ticker: asset.ticker, beat_id: asset.beat_id })}>Open ticker research <ArrowUpRight size={14} aria-hidden="true" /></a>}
      </div>
    </div>
  </main>;
}
