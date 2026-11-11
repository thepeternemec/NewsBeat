"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import type {
  AssetMarket, FearGreedPayload, PricesPayload, SignalsPayload, Sourced,
} from "@newsbeat/contracts";
import { API_BASE } from "./content";

const POLL_MS = 90_000;
const MAX_PRICE_AGE_MS = 10 * 60_000;
const NEWS = [
  { symbol: "BTC", label: "Bitcoin", id: "b_06c91290de1c" },
  { symbol: "ETH", label: "Ethereum", id: "b_edbc5b5af755" },
  { symbol: "SOL", label: "Solana", id: "b_ea0efdf6c421" },
] as const;

type NewsBrief = {
  freshness: { status: string; last_success_at: string | null };
  items: { lede: string; source: string; url: string; published_at: string }[];
};
type Feed<T> = { data: T | null; state: "loading" | "ready" | "unavailable" };

function useFeed<T>(path: string, revision: number) {
  const [feed, setFeed] = useState<Feed<T>>({ data: null, state: "loading" });
  useEffect(() => {
    const request = new AbortController();
    const timer = window.setTimeout(() => request.abort("timeout"), 20000);
    setFeed(previous => ({ ...previous, state: "loading" }));
    void (async () => {
      try {
        const response = await fetch(API_BASE + path, { cache: "no-store", signal: request.signal });
        if (!response.ok) throw new Error("Feed unavailable");
        const data = await response.json() as T;
        if (!request.signal.aborted) setFeed({ data, state: "ready" });
      } catch {
        if (!request.signal.aborted || request.signal.reason === "timeout") setFeed({ data: null, state: "unavailable" });
      } finally {
        window.clearTimeout(timer);
      }
    })();
    return () => { window.clearTimeout(timer); request.abort(); };
  }, [path, revision]);
  return feed;
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumSignificantDigits: 7 });
const compact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 });
const change = new Intl.NumberFormat("en-US", { style: "percent", signDisplay: "exceptZero", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fundingRate = new Intl.NumberFormat("en-US", { style: "percent", signDisplay: "exceptZero", maximumFractionDigits: 4 });
const present = (number: unknown): number is number => typeof number === "number" && Number.isFinite(number);
const time = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const sourceNames: Record<string, string> = { coingecko: "CoinGecko", defillama: "DefiLlama", "alternative.me": "Alternative.me", okx: "OKX", binance: "Binance" };

function observedRecently(asset: AssetMarket, now: number) {
  const age = now - Date.parse(asset.observed_at);
  return age >= -60_000 && age <= MAX_PRICE_AGE_MS;
}

function Receipt({ part, now }: { part: Sourced<unknown>; now: number }) {
  const age = now - Date.parse(part.fetched_at);
  const old = part.freshness.status !== "fresh" || age > part.ttl_seconds * 1000;
  return <p className="crypto-receipt">
    <a href={part.source_url} target="_blank" rel="noreferrer">{sourceNames[part.source] ?? part.source} <ArrowUpRight size={12} aria-hidden="true" /></a>
    <span>{old ? "Stale snapshot" : "Fetched"} · {time(part.fetched_at)}</span>
  </p>;
}

function Indicator({ title, value, children, part, now, pending }: {
  title: string; value?: string; children?: ReactNode; part?: Sourced<unknown>; now: number; pending: boolean;
}) {
  return <article className="crypto-panel crypto-indicator">
    <h3>{title}</h3>
    <strong>{value ?? "—"}</strong>
    {value ? <div className="crypto-indicator-note">{children}</div>
      : <p className="crypto-indicator-note">{pending ? "Checking source…" : "Source unavailable"}</p>}
    {part && <Receipt part={part} now={now} />}
  </article>;
}

function MarketBoard({ feed, now }: { feed: Feed<Sourced<PricesPayload>>; now: number }) {
  const [rankBy, setRankBy] = useState<"market" | "movers">("market");
  const assets = feed.data?.data.assets ?? [];
  const tracked = assets.length + (feed.data?.data.unsupported.length ?? 0);
  const current = assets.filter(asset => observedRecently(asset, now) && present(asset.change_24h));
  const up = current.filter(asset => asset.change_24h! > 0).length;
  const down = current.filter(asset => asset.change_24h! < 0).length;
  const flat = current.length - up - down;
  const direction = flat === current.length ? "Tracked assets are unchanged." : up === down ? "The tracked market is split."
    : (up > down ? up : down) + " of " + current.length + " tracked assets are " + (up > down ? "up." : "down.");
  const largest = Math.max(...current.map(asset => Math.abs(asset.change_24h!)), 0.0001);
  const currentIds = new Set(current.map(asset => asset.id));
  const byMove = (asset: AssetMarket) => currentIds.has(asset.id) ? Math.abs(asset.change_24h!) : -1;
  const sorted = [...assets].sort((a, b) => rankBy === "movers"
    ? byMove(b) - byMove(a) : (b.market_cap_usd ?? 0) - (a.market_cap_usd ?? 0));

  return <section className="crypto-panel crypto-market" aria-labelledby="crypto-market-title">
    <div className="crypto-market-summary">
      <div>
        <p className="crypto-overview-kicker">24-hour market breadth</p>
        <h2 id="crypto-market-title">{current.length
          ? direction
          : feed.state === "loading" ? "Checking price coverage…" : "Market breadth unavailable."}</h2>
        {current.length > 0 && <p>{up} up · {down} down · {flat} unchanged · {tracked - current.length} without a current move</p>}
      </div>
      {current.length > 0 && <div className="crypto-breadth" aria-hidden="true">
        {up > 0 && <i className="crypto-breadth-up" style={{ flexGrow: up }} />}
        {flat > 0 && <i className="crypto-breadth-flat" style={{ flexGrow: flat }} />}
        {down > 0 && <i className="crypto-breadth-down" style={{ flexGrow: down }} />}
      </div>}
    </div>
    {sorted.length > 0 && <>
      <div className="crypto-table-head">
        <h3>Tracked assets</h3>
        <div className="crypto-switch" aria-label="Sort tracked assets">
          <button type="button" aria-pressed={rankBy === "market"} onClick={() => setRankBy("market")}>Market cap</button>
          <button type="button" aria-pressed={rankBy === "movers"} onClick={() => setRankBy("movers")}>Largest moves</button>
        </div>
      </div>
      <table className="crypto-moves">
        <thead><tr><th scope="col">Asset</th><th scope="col">Price</th><th scope="col">24h move</th><th scope="col">Observed</th></tr></thead>
        <tbody>{sorted.map(asset => {
          const fresh = observedRecently(asset, now);
          const move = asset.change_24h;
          const showMove = fresh && present(move);
          return <tr key={asset.id}>
            <th scope="row"><a href={"/ask?" + new URLSearchParams({ ticker: asset.symbol })}>{asset.symbol} <ArrowUpRight size={12} aria-hidden="true" /></a><small>{asset.name}</small></th>
            <td>{present(asset.price_usd) ? money.format(asset.price_usd) : "—"}</td>
            <td>
              <span className="crypto-move-value">{present(move) ? change.format(move) : "—"}</span>
              {showMove && <span className="crypto-move-plot" aria-hidden="true"><i data-down={move < 0} style={{ width: Math.abs(move) / largest * 50 + "%" }} /></span>}
            </td>
            <td><span>{time(asset.observed_at)}</span>{!fresh && <small>Stale</small>}</td>
          </tr>;
        })}</tbody>
      </table>
      <p className="crypto-scope">Equal-weight count for this tracked basket. Observations over ten minutes old are excluded from breadth and the move bars.</p>
    </>}
    {feed.data && <Receipt part={feed.data} now={now} />}
  </section>;
}

function HeadlineGroup({ topic, revision, now }: { topic: typeof NEWS[number]; revision: number; now: number }) {
  const feed = useFeed<NewsBrief>("/v2/brief?beat_id=" + topic.id, revision);
  const checked = feed.data?.freshness.last_success_at;
  const age = now - Date.parse(checked ?? "");
  const recent = age >= -60_000 && age <= 30 * 60_000 && feed.data?.freshness.status === "fresh";
  const items = feed.data?.items ?? [];
  return <article className="crypto-news-group">
    <div><h3>{topic.label}</h3><a href={"/ask?" + new URLSearchParams({ ticker: topic.symbol, beat_id: topic.id })}>Research {topic.symbol} <ArrowUpRight size={14} aria-hidden="true" /></a></div>
    {items.length ? <ul>{items.slice(0, 2).map(item => <li key={item.url}>
      <a href={item.url} target="_blank" rel="noreferrer">{item.lede} <ArrowUpRight size={13} aria-hidden="true" /></a>
      <small>{item.source} · {time(item.published_at)}</small>
    </li>)}</ul> : <p className="crypto-scope">{feed.state === "loading" ? "Checking reporting…" : recent ? "No recent reports in this snapshot." : "Current reporting unavailable."}</p>}
    {checked && <p className="crypto-scope">{recent ? "Collection checked" : "Older collection"} · {time(checked)}</p>}
  </article>;
}

export default function CryptoOverview() {
  const [revision, setRevision] = useState(0);
  const [newsRevision, setNewsRevision] = useState(0);
  const [now, setNow] = useState(0);
  const prices = useFeed<Sourced<PricesPayload>>("/v2/prices", revision);
  const sentiment = useFeed<Sourced<FearGreedPayload>>("/v2/sentiment?limit=2", revision);
  const signals = useFeed<SignalsPayload>("/v2/signals", revision);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (document.visibilityState === "visible") setRevision(previous => previous + 1);
    }, POLL_MS);
    const newsTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") setNewsRevision(previous => previous + 1);
    }, 600_000);
    return () => { window.clearInterval(timer); window.clearInterval(newsTimer); };
  }, []);
  const dex = signals.data?.dex_volume;
  const stable = signals.data?.stablecoins;
  const funding = signals.data?.funding;
  const rates = funding && "data" in funding ? funding.data.filter(item => present(item.rate)) : [];
  const fear = sentiment.data?.data.current;

  return <>
    <div className="crypto-actions">
      <span>Market data refreshes every 90 seconds while visible</span>
      <button type="button" className="crypto-refresh" disabled={prices.state === "loading"} onClick={() => {
        setNow(Date.now());
        setRevision(previous => previous + 1);
        setNewsRevision(previous => previous + 1);
      }}>
        <RefreshCw size={14} aria-hidden="true" /> Refresh
      </button>
    </div>
    <MarketBoard feed={prices} now={now} />
    <section className="crypto-context" aria-labelledby="crypto-context-title">
      <h2 id="crypto-context-title">Activity, positioning and sentiment</h2>
      <div className="crypto-indicators">
        <Indicator title="24h DEX volume" value={dex && "data" in dex && present(dex.data.total_24h_usd) ? compact.format(dex.data.total_24h_usd) : undefined}
          part={dex && "data" in dex ? dex : undefined} now={now} pending={signals.state === "loading"}>
          {dex && "data" in dex && present(dex.data.change_24h) ? change.format(dex.data.change_24h) + " versus prior day" : "Rolling trading volume"}
        </Indicator>
        <Indicator title="Stablecoin supply" value={stable && "data" in stable && present(stable.data.circulating_usd) ? compact.format(stable.data.circulating_usd) : undefined}
          part={stable && "data" in stable ? stable : undefined} now={now} pending={signals.state === "loading"}>
          {stable && "data" in stable ? stable.data.assets_tracked + " tracked USD-pegged assets" : ""}
        </Indicator>
        <Indicator title="Perpetual funding" value={rates.length ? fundingRate.format(rates[0]!.rate) : undefined}
          part={funding && "data" in funding ? funding : undefined} now={now} pending={signals.state === "loading"}>
          {rates.length > 0 && <>{rates[0]!.symbol} funding rate{rates.length > 1 && <small>{rates.slice(1).map(rate => rate.symbol + " " + fundingRate.format(rate.rate)).join(" · ")}</small>}</>}
        </Indicator>
        <Indicator title="Fear & greed" value={fear && present(fear.value) ? fear.value + " / 100" : undefined}
          part={sentiment.data ?? undefined} now={now} pending={sentiment.state === "loading"}>
          {fear && <>{fear.classification}<small>Index date · {new Date(fear.observed_at).toLocaleDateString(undefined, { timeZone: "UTC", dateStyle: "medium" })}</small></>}
        </Indicator>
      </div>
    </section>
    <section className="crypto-panel crypto-news" aria-labelledby="crypto-news-title">
      <div className="crypto-table-head"><h2 id="crypto-news-title">What’s being reported</h2><a href="/intelligence#opportunities">Check research signals <ArrowUpRight size={15} aria-hidden="true" /></a></div>
      <div className="crypto-news-grid">{NEWS.map(topic => <HeadlineGroup key={topic.id} topic={topic} revision={newsRevision} now={now} />)}</div>
      <p className="crypto-scope">Headline coverage is a starting point for research. A headline and a price move can occur at the same time for different reasons.</p>
    </section>
  </>;
}
