"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { ArrowUpRight, Menu, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CatalogSearch from "./catalog-search";
import type { LookupAsset } from "./landing-lookup-data";
import FeedConversation from "./feed-conversation";
import "./feed-workspace.css";

const markets = [
  { id: "all", label: "All markets", href: "/intelligence" },
  { id: "equity", label: "Stocks", href: "/intelligence?market=equity" },
  { id: "crypto", label: "Crypto", href: "/intelligence?market=crypto" },
] as const;
const storageKey = "rarebird:followed-feeds";
const feedHref = (id: string) => "/intelligence?beat=" + encodeURIComponent(id);
export default function FeedWorkspace({ asset, market, unknownAsset, children }: {
  asset: LookupAsset | null;
  market: (typeof markets)[number]["id"];
  unknownAsset: boolean;
  children?: ReactNode;
}) {
  const router = useRouter();
  const searchId = useId();
  const sidebarId = useId();
  const [followed, setFollowed] = useState<LookupAsset[]>([]);
  const [storageIssue, setStorageIssue] = useState(false);
  const [conversationVersion, setConversationVersion] = useState(0);

  useEffect(() => {
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

  function toggleFollow(item: LookupAsset) {
    const next = followed.some(saved => saved.beat_id === item.beat_id) ? followed.filter(saved => saved.beat_id !== item.beat_id) : [...followed, item];
    setFollowed(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setStorageIssue(false); }
    catch { setStorageIssue(true); }
  }

  const navigation = <>
        <Link className="rb-feed-new" href="/intelligence" scroll={false} onClick={() => {
          setConversationVersion(value => value + 1);
        }}><Plus size={17} aria-hidden="true" />New market check</Link>
        <nav className="rb-feed-scopes" aria-label="Markets">
          {markets.map(item => <Link key={item.id} href={item.href} scroll={false} aria-current={!asset && market === item.id ? "page" : undefined}>{item.label}</Link>)}
        </nav>
        <div className="rb-feed-followed">
          <h2>Your feeds</h2>
          {followed.length ? <nav aria-label="Followed feeds">{followed.map(item =>
            <Link key={item.beat_id} href={feedHref(item.beat_id)} scroll={false} aria-current={asset?.beat_id === item.beat_id ? "page" : undefined}>
              <strong>{item.ticker}</strong><span>{item.label} · {item.asset === "crypto" ? "Crypto" : "Stock"}</span>
            </Link>)}</nav> : <p className="rb-feed-note">Search for an asset to follow it here.</p>}
          {storageIssue && <p className="rb-feed-note" role="status">This browser couldn’t save your followed feeds.</p>}
        </div>
        <a className="rb-feed-about" href="/">How Rarebird works <ArrowUpRight size={14} aria-hidden="true" /></a>
  </>;

  return <section className="rb-feed" aria-label="Market checks and feeds">
      <aside className="rb-feed-sidebar" aria-label="Choose a feed">
        {navigation}
      </aside>
      <div id={sidebarId} className="rb-feed-mobile-feeds" popover="auto" onClick={event => {
        if ((event.target as Element).closest("a")) event.currentTarget.hidePopover();
      }}><button className="rb-feed-mobile-close" type="button" popoverTarget={sidebarId} popoverTargetAction="hide">Close feeds</button>{navigation}</div>
      <div className="rb-feed-main">
        <header className="rb-feed-head">
          <div className="rb-feed-title">
            <button className="rb-feed-mobile-toggle" type="button" popoverTarget={sidebarId} aria-label="Open your feeds"><Menu size={20} aria-hidden="true" /></button>
            <div><h1>Market checks</h1><p>{asset ? asset.label + " · " + asset.ticker : markets.find(item => item.id === market)?.label}</p></div>
          </div>
          <CatalogSearch id={searchId} onSelect={item => router.push(feedHref(item.beat_id), { scroll: false })} />
        </header>
        <FeedConversation key={conversationVersion} asset={asset} market={market === "all" ? undefined : market}
          onFollow={toggleFollow} followedIds={followed.map(item => item.beat_id)}>
        {unknownAsset && <p role="status">That asset feed couldn’t be found. Search the catalog or choose a market.</p>}
        {children}
        </FeedConversation>
      </div>
  </section>;
}
