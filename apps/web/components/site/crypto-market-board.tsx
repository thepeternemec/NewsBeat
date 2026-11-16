"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowDownUp, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, RefreshCw, Search, Star } from "lucide-react";
import type { CryptoMarketRow, CryptoMarketsPayload, Sourced } from "@newsbeat/contracts";
import BrandMark from "./brand-mark";
import { API_BASE } from "./content";
import { findAssets, readCoverage, type LookupAsset, type LookupNews } from "./landing-lookup-data";
import "./crypto-market-board.css";

type Markets = Sourced<CryptoMarketsPayload>;
type MarketState = { snapshot: Markets | null; loading: boolean; failed: boolean; now: number };
const refreshMs = 120_000;
const freshnessMs = 10 * 60_000;
const watchlistKey = "rarebird:crypto-watchlist";
const coinIdPattern = /^[a-z0-9][a-z0-9-]{0,99}$/;

function useCryptoMarkets() {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<MarketState>({ snapshot: null, loading: true, failed: false, now: 0 });
  useEffect(() => {
    let current: AbortController | undefined;
    async function refresh() {
      if (document.visibilityState === "hidden" || current) return;
      const request = new AbortController();
      current = request;
      const timeout = window.setTimeout(() => request.abort("timeout"), 20_000);
      setState(previous => ({ ...previous, loading: true, now: Date.now() }));
      try {
        const response = await fetch(API_BASE + "/v2/markets", { signal: request.signal });
        if (!response.ok) throw new Error("Crypto prices unavailable");
        const snapshot: Markets = await response.json();
        if (!Array.isArray(snapshot.data?.assets)) throw new Error("Invalid market snapshot");
        if (current === request) setState({ snapshot, loading: false, failed: false, now: Date.now() });
      } catch {
        if (current === request) setState(previous => ({ ...previous, loading: false, failed: true, now: Date.now() }));
      } finally {
        window.clearTimeout(timeout);
        if (current === request) current = undefined;
      }
    }
    void refresh();
    const interval = window.setInterval(refresh, refreshMs);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      const request = current;
      current = undefined;
      request?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [revision]);
  return { ...state, refresh: () => setRevision(previous => previous + 1) };
}

function readWatchlist(): string[] | null {
  try {
    const values: unknown = JSON.parse(window.localStorage.getItem(watchlistKey) ?? "[]");
    return Array.isArray(values)
      ? Array.from(new Set(values.filter((id): id is string => typeof id === "string" && coinIdPattern.test(id))))
      : [];
  } catch { return null; }
}

function useWatchlist() {
  const [saved, setSaved] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setSaved(previous => readWatchlist() ?? previous);
    sync();
    function onStorage(event: StorageEvent) {
      if (event.key === watchlistKey || event.key === null) sync();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  function toggle(id: string) {
    const previous = readWatchlist() ?? saved;
    const next = previous.includes(id) ? previous.filter(coin => coin !== id) : [...previous, id];
    setSaved(next);
    try { window.localStorage.setItem(watchlistKey, JSON.stringify(next)); } catch { /* Keep the current view usable. */ }
  }
  return { saved, toggle };
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumSignificantDigits: 7 });
const compact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat("en-US", { style: "percent", signDisplay: "exceptZero", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const stamp = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const value = (number: number | null, formatter: Intl.NumberFormat) => number === null ? "—" : formatter.format(number);
const coinLink = (id: string) => "/app/coins/" + encodeURIComponent(id);

function recent(coin: CryptoMarketRow, now: number) {
  const age = now - Date.parse(coin.observed_at ?? "");
  return age >= -60_000 && age <= freshnessMs;
}

function CoinIcon({ coin }: { coin: CryptoMarketRow }) {
  return <span className="rb-coin-icon" aria-hidden="true">
    <span>{coin.symbol.slice(0, 2)}</span>
    {coin.icon_url && <img src={coin.icon_url} alt="" width={26} height={26} loading="lazy" decoding="async"
      onError={event => { event.currentTarget.hidden = true; }} />}
  </span>;
}

function WatchButton({ coin, saved, toggle }: { coin: CryptoMarketRow; saved: boolean; toggle: () => void }) {
  return <button type="button" className="rb-watch-button" onClick={toggle} aria-pressed={saved}
    aria-label={(saved ? "Remove " : "Save ") + coin.name + (saved ? " from watchlist" : " to watchlist")}
    title={saved ? "Remove from watchlist" : "Save to watchlist"}>
    <Star size={16} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
  </button>;
}

function Change({ change }: { change: number | null }) {
  return <span className="rb-coin-change" data-sign={change !== null && change < 0 ? "down" : undefined}>
    {change !== null && change > 0 && <ArrowUp size={12} aria-hidden="true" />}
    {change !== null && change < 0 && <ArrowDown size={12} aria-hidden="true" />}
    {value(change, percent)}
  </span>;
}

function Sparkline({ points, large = false }: { points: number[]; large?: boolean }) {
  if (points.length < 2) return <span className="rb-coin-no-chart">{large ? "7-day price history unavailable" : "—"}</span>;
  const width = large ? 560 : 104;
  const height = large ? 145 : 34;
  const low = Math.min(...points);
  const range = Math.max(...points) - low;
  const coordinates = points.map((point, i) => [
    2 + i * (width - 4) / (points.length - 1),
    range ? height - 3 - (point - low) / range * (height - 6) : height / 2,
  ].map(value => value.toFixed(1)).join(",")).join(" ");
  return <svg className={large ? "rb-coin-chart-large" : "rb-coin-chart"} viewBox={"0 0 " + width + " " + height}
    preserveAspectRatio="none" role="img" aria-label="7-day price history">
    {large && <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" opacity=".15" />}
    <polyline fill="none" stroke="currentColor" strokeWidth={large ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round"
      vectorEffect="non-scaling-stroke" points={coordinates} />
  </svg>;
}

function MarketSource({ snapshot, now }: { snapshot: Markets; now: number }) {
  const old = snapshot.freshness.status !== "fresh" || now - Date.parse(snapshot.fetched_at) > snapshot.ttl_seconds * 1000;
  return <p className="rb-coin-source">
    <a href={snapshot.source_url} target="_blank" rel="noreferrer">Data provided by CoinGecko <ArrowUpRight size={12} aria-hidden="true" /></a>
    <span>{old ? "Snapshot may be stale" : "Fetched"} · <time dateTime={snapshot.fetched_at}>{stamp(snapshot.fetched_at)}</time></span>
  </p>;
}

const views = ["All coins", "Gainers", "Losers", "Watchlist"] as const;
type View = typeof views[number];
const columns = [
  { key: "rank", title: "#", priority: "rank" },
  { key: "price_usd", title: "Price", priority: "core" },
  { key: "change_1h", title: "1h", priority: "detail" },
  { key: "change_24h", title: "24h", priority: "core" },
  { key: "change_7d", title: "7d", priority: "detail" },
  { key: "market_cap_usd", title: "Market cap", priority: "detail" },
  { key: "volume_24h_usd", title: "Volume (24h)", priority: "detail" },
] as const;
type Column = typeof columns[number];
type Sort = { key: Column["key"]; ascending: boolean };
const defaultSort: Sort = { key: "rank", ascending: true };

function sortedCoins(assets: CryptoMarketRow[], sort: Sort) {
  return [...assets].sort((a, b) => {
    if (sort.key === "rank" && a.rank === null && b.rank === null) {
      return (b.market_cap_usd ?? -1) - (a.market_cap_usd ?? -1) || a.name.localeCompare(b.name);
    }
    const left = a[sort.key], right = b[sort.key];
    if (left === null) return right === null ? a.name.localeCompare(b.name) : 1;
    if (right === null) return -1;
    return (sort.ascending ? left - right : right - left) || a.name.localeCompare(b.name);
  });
}

export default function CryptoMarketBoard() {
  const market = useCryptoMarkets();
  const { saved, toggle } = useWatchlist();
  const [view, setView] = useState<View>("All coins");
  const [sort, setSort] = useState<Sort>(defaultSort);
  const [query, setQuery] = useState("");
  const [size, setSize] = useState(20);
  const assets = market.snapshot?.data.assets ?? [];
  const measured = assets.filter(coin => recent(coin, market.now) && coin.change_24h !== null);
  const up = measured.filter(coin => coin.change_24h! > 0);
  const down = measured.filter(coin => coin.change_24h! < 0);
  const top = sortedCoins(up, { key: "change_24h", ascending: false })[0];
  const volume = assets.filter(coin => recent(coin, market.now) && coin.volume_24h_usd !== null);
  const trackedVolume = volume.reduce((total, coin) => total + coin.volume_24h_usd!, 0);
  const scope = view === "Gainers" ? up : view === "Losers" ? down
    : view === "Watchlist" ? assets.filter(coin => saved.includes(coin.id)) : assets;
  const term = query.trim().toLowerCase();
  const found = scope.filter(coin => [coin.name, coin.symbol].some(label => label.toLowerCase().includes(term)));
  const rows = sortedCoins(found, sort);
  const unavailableSaved = view === "Watchlist" ? saved.length - scope.length : 0;

  function selectView(next: View) {
    setView(next);
    setSize(20);
    setSort(next === "Gainers" || next === "Losers" ? { key: "change_24h", ascending: next === "Losers" } : defaultSort);
  }

  function sortBy(key: Sort["key"]) {
    setSize(20);
    setSort(previous => ({ key, ascending: previous.key === key ? !previous.ascending : key === "rank" }));
  }

  function header(column: Column) {
    return <th key={column.key} scope="col" data-priority={column.priority}
      aria-sort={sort.key === column.key ? sort.ascending ? "ascending" : "descending" : undefined}>
      <button type="button" onClick={() => sortBy(column.key)} aria-label={column.key === "rank" ? "Sort by market cap rank" : "Sort by " + column.title}>
        {column.title} {sort.key === column.key
          ? sort.ascending ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />
          : <ArrowDownUp size={11} aria-hidden="true" />}
      </button>
    </th>;
  }

  return <section className="rb-coin-board" aria-label="Cryptocurrency market rankings">
    {market.snapshot && <div className="rb-coin-overview">
      <article>
        <h2>24h market breadth</h2>
        <strong>{up.length} up <span>·</span> {down.length} down</strong>
        <p>{measured.length} of {assets.length} coins with current readings</p>
        {measured.length > 0 && <div className="rb-coin-breadth" aria-hidden="true">
          {up.length > 0 && <i style={{ flexGrow: up.length }} />}
          {measured.length - up.length - down.length > 0 && <i data-flat style={{ flexGrow: measured.length - up.length - down.length }} />}
          {down.length > 0 && <i data-down style={{ flexGrow: down.length }} />}
        </div>}
      </article>
      <article>
        <h2>Highest 24h gain</h2>
        {top ? <><a className="rb-coin-top" href={coinLink(top.id)}><CoinIcon coin={top} />{top.symbol} <Change change={top.change_24h} /></a><p>{top.name}</p></>
          : <><strong>—</strong><p>No current gains in this snapshot</p></>}
      </article>
      <article>
        <h2>Tracked 24h volume</h2>
        <strong>{volume.length ? compact.format(trackedVolume) : "—"}</strong>
        <p>Combined volume across {volume.length} current readings</p>
      </article>
    </div>}
    <div className="rb-coin-panel">
      <div className="rb-coin-toolbar">
        <div className="rb-coin-tabs" role="group" aria-label="Filter cryptocurrency markets">
          {views.map(tab => <button key={tab} type="button" aria-pressed={view === tab} onClick={() => selectView(tab)}>
            {tab === "Watchlist" && <Star size={14} aria-hidden="true" />}{tab}{tab === "Watchlist" && saved.length > 0 && <span>{saved.length}</span>}
          </button>)}
        </div>
        <div className="rb-coin-controls">
          <label className="rb-coin-search"><Search size={16} aria-hidden="true" />
            <input type="search" aria-label="Search coins by name or ticker" placeholder="Search coins" value={query} onChange={event => {
              setQuery(event.target.value);
              setSize(20);
            }} />
          </label>
          <button className="rb-coin-refresh" type="button" aria-label="Refresh market prices" title="Refresh market prices"
            onClick={market.refresh} disabled={market.loading}><RefreshCw size={16} aria-hidden="true" /></button>
        </div>
      </div>
      <div className="rb-coin-panel-meta">
        {market.snapshot && <p>{market.snapshot.data.coverage === "market_cap_ranked"
          ? assets.length + " coins in the market-cap rankings"
          : "Rankings unavailable · " + assets.length + " tracked coins"} · USD</p>}
        {market.snapshot && <MarketSource snapshot={market.snapshot} now={market.now} />}
      </div>
      {market.failed && <p className="rb-coin-empty" role="status">{market.snapshot
        ? "Refresh interrupted. Showing the last received snapshot." : "Market prices are temporarily unavailable."}</p>}
      {!market.snapshot && market.loading && <p className="rb-coin-empty" role="status">Loading market prices…</p>}
      {market.snapshot && view === "Watchlist" && <p className="rb-coin-watch-note">Saved in this browser{unavailableSaved > 0 && " · " + unavailableSaved + " saved outside the current snapshot"}</p>}
      {market.snapshot && rows.length === 0 && <p className="rb-coin-empty" role="status">{view === "Watchlist" && saved.length === 0
        ? <>Save coins with the star next to their name. <button type="button" onClick={() => selectView("All coins")}>Browse all coins</button></>
        : term ? <>No coins in this view match the search. <a href="/intelligence#discovery">Search the Rarebird news catalog</a></>
          : "No coins in this view right now."}</p>}
      {rows.length > 0 && <>
        <div className="rb-coin-table-scroll"><table className="rb-coin-table">
          <thead><tr>
            <th scope="col"><span className="rb-coin-sr-only">Watchlist</span></th>
            {header(columns[0])}
            <th scope="col" className="rb-coin-name">Coin</th>
            {columns.slice(1).map(header)}
            <th scope="col" data-priority="detail">Last 7 days</th>
          </tr></thead>
          <tbody>{rows.slice(0, size).map(coin => <tr key={coin.id}>
            <td><WatchButton coin={coin} saved={saved.includes(coin.id)} toggle={() => toggle(coin.id)} /></td>
            <td data-priority="rank" className="rb-coin-rank">{coin.rank ?? "—"}</td>
            <th scope="row" className="rb-coin-name">
              <a href={coinLink(coin.id)}><CoinIcon coin={coin} /><span><strong>{coin.name}</strong><small>{coin.symbol}</small></span></a>
            </th>
            <td className="rb-coin-quote">{value(coin.price_usd, money)}{!recent(coin, market.now) && <small>Stale</small>}</td>
            <td data-priority="detail"><Change change={coin.change_1h} /></td>
            <td><Change change={coin.change_24h} /></td>
            <td data-priority="detail"><Change change={coin.change_7d} /></td>
            <td data-priority="detail">{value(coin.market_cap_usd, compact)}</td>
            <td data-priority="detail">{value(coin.volume_24h_usd, compact)}</td>
            <td data-priority="detail"><Sparkline points={coin.sparkline_7d} /></td>
          </tr>)}</tbody>
        </table></div>
        <div className="rb-coin-pagination">
          <span>Showing {Math.min(size, rows.length)} of {rows.length} coins</span>
          {size < rows.length && <button type="button" onClick={() => setSize(previous => previous + 20)}>Show more coins <ArrowRight size={14} aria-hidden="true" /></button>}
        </div>
      </>}
    </div>
  </section>;
}

type Evidence = { topic: LookupAsset | null; coverage: LookupNews | null; failed: boolean };
function CoinEvidence({ coin }: { coin: CryptoMarketRow }) {
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  useEffect(() => {
    const request = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => request.abort(), 16_000);
    const name = (value: string) => value.normalize("NFKC").trim().toLowerCase();
    async function read() {
      let topic: LookupAsset | null = null;
      try {
        const topics = await findAssets(API_BASE, coin.symbol, request.signal);
        const matched = topics.filter(entry => entry.asset === "crypto" && name(entry.ticker) === name(coin.symbol) && name(entry.label) === name(coin.name));
        topic = matched.length === 1 ? matched[0]! : null;
        const coverage = topic ? await readCoverage(API_BASE, topic.beat_id, request.signal) : null;
        if (active) setEvidence({ topic, coverage, failed: false });
      } catch {
        if (active) setEvidence({ topic, coverage: null, failed: true });
      } finally { window.clearTimeout(timeout); }
    }
    void read();
    return () => { active = false; window.clearTimeout(timeout); request.abort(); };
  }, [coin.name, coin.symbol]);
  const coverage = evidence?.coverage;
  const research = evidence?.topic && "/ask?" + new URLSearchParams({ ticker: evidence.topic.ticker, beat_id: evidence.topic.beat_id });
  return <section className="rb-coin-evidence">
    <div className="rb-coin-evidence-heading"><h2><BrandMark size={24} /> Rarebird evidence</h2>
      {research && <a href={research}>Research {coin.symbol} <ArrowUpRight size={14} aria-hidden="true" /></a>}
    </div>
    {!evidence && <p role="status">Finding matching coverage…</p>}
    {evidence?.failed && <p>Recent coverage is temporarily unavailable.</p>}
    {evidence && !evidence.failed && !evidence.topic && <p>Rarebird couldn’t confirm a news match for this coin by name and ticker.</p>}
    {coverage && <p>{coverage.freshness.last_success_at
      ? <>{coverage.freshness.status === "fresh" ? "Collection checked" : "Last successful collection"} <time dateTime={coverage.freshness.last_success_at}>{stamp(coverage.freshness.last_success_at)}</time></>
      : "Collection freshness is unavailable."}</p>}
    {coverage && coverage.items.length === 0 && <p>No recent headlines in this snapshot.</p>}
    {coverage && coverage.items.length > 0 && <ul>{coverage.items.slice(0, 5).map(item => <li key={item.id}>
      <a href={item.url} target="_blank" rel="noreferrer">{item.title} <ArrowUpRight size={13} aria-hidden="true" /></a>
      <span>{item.source} · <time dateTime={item.published_at}>{stamp(item.published_at)}</time></span>
    </li>)}</ul>}
  </section>;
}

export function CryptoCoinDetail({ id }: { id: string }) {
  const market = useCryptoMarkets();
  const { saved, toggle } = useWatchlist();
  const coin = market.snapshot?.data.assets.find(asset => asset.id === id);
  return <div className="rb-coin-page">
    <a className="rb-coin-back" href="/app"><ArrowLeft size={15} aria-hidden="true" /> All coins</a>
    {!coin ? <>
      <h1>Coin markets</h1>
      <p role="status">{market.loading ? "Loading the market snapshot…" : market.failed
        ? "Market prices are temporarily unavailable." : "This coin is outside the current market snapshot."}</p>
      {market.failed && <button type="button" className="rb-coin-refresh" onClick={market.refresh}>Try again</button>}
    </> : <>
      <div className="rb-coin-page-heading">
        <CoinIcon coin={coin} />
        <h1>{coin.name} <small>{coin.symbol}</small></h1>
        <WatchButton coin={coin} saved={saved.includes(coin.id)} toggle={() => toggle(coin.id)} />
      </div>
      <div className="rb-coin-detail-grid">
        <section className="rb-coin-price">
          <h2>Price</h2>
          <p className="rb-coin-large-price">{value(coin.price_usd, money)} <Change change={coin.change_24h} /></p>
          <p className="rb-coin-observed">{coin.observed_at
            ? <>{recent(coin, market.now) ? "Observed" : "Stale observation"} · <time dateTime={coin.observed_at}>{stamp(coin.observed_at)}</time></>
            : "Observation time unavailable"}</p>
          <h3>Last 7 days</h3>
          <Sparkline points={coin.sparkline_7d} large />
          {market.snapshot && <MarketSource snapshot={market.snapshot} now={market.now} />}
        </section>
        <section className="rb-coin-stat">
          <h2>Market data</h2>
          <dl>
            <div><dt>Market cap rank</dt><dd>{coin.rank ?? "—"}</dd></div>
            <div><dt>Market cap</dt><dd>{value(coin.market_cap_usd, compact)}</dd></div>
            <div><dt>Volume (24h)</dt><dd>{value(coin.volume_24h_usd, compact)}</dd></div>
            <div><dt>1h change</dt><dd><Change change={coin.change_1h} /></dd></div>
            <div><dt>24h change</dt><dd><Change change={coin.change_24h} /></dd></div>
            <div><dt>7d change</dt><dd><Change change={coin.change_7d} /></dd></div>
          </dl>
          {(coin.id === "bitcoin" || coin.id === "ethereum") && <a href="/app/forecasts">Hourly forecast and scorecard <ArrowUpRight size={14} aria-hidden="true" /></a>}
        </section>
      </div>
      <CoinEvidence key={coin.id} coin={coin} />
    </>}
  </div>;
}
