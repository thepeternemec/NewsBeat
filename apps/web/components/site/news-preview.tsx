"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Radio, RefreshCw, Search, Sparkles } from "lucide-react";
import RippleButton from "@/components/ui/ripple-button/ripple-button";
import { API_BASE } from "./content";

const ASSETS = [
  { label: "Nvidia", ticker: "NVDA", beatId: "b_bb964843350e" },
  { label: "Apple", ticker: "AAPL", beatId: "b_7d5acdda6186" },
  { label: "Bitcoin", ticker: "BTC", beatId: "b_06c91290de1c" },
] as const;
const CRYPTO_ASSETS = [
  { label: "Bitcoin", ticker: "BTC", beatId: "b_06c91290de1c" },
  { label: "Ethereum", ticker: "ETH", beatId: "b_edbc5b5af755" },
  { label: "Solana", ticker: "SOL", beatId: "b_ea0efdf6c421" },
  { label: "Nvidia", ticker: "NVDA", beatId: "b_bb964843350e" },
] as const;
type Asset = { label: string; ticker: string; beatId: string };
type Topic = { label: string; ticker: string; beat_id: string; asset: string; article_count: number };
type Summary = {
  basis: "headlines_only";
  method: "generated" | "extractive";
  freshness: Brief["freshness"];
  items: Array<{ story_id: string; text: string; reports: Array<{ source: string; url: string; published_at: string }> }>;
};
interface Brief {
  items: Array<{
    lede: string;
    source: string;
    url: string;
    published_at: string;
  }>;
  freshness: {
    status: "fresh" | "stale" | "unavailable";
    last_success_at: string | null;
  };
}
type PreviewState =
  | { status: "loading" | "error"; data: null }
  | { status: "ready"; data: Brief };
function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      }) + " UTC";
}

/** A real, anonymous headline lookup; the host assistant still writes the answer. */
export default function NewsPreview({ cryptoFirst = false }: { cryptoFirst?: boolean }) {
  const assets = cryptoFirst ? CRYPTO_ASSETS : ASSETS;
  const [asset, setAsset] = useState<Asset>(assets[0]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [searchState, setSearchState] = useState<{ status: "idle" | "loading" | "ready" | "error"; topics: Topic[] }>({ status: "idle", topics: [] });
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [summaryRequested, setSummaryRequested] = useState(false);
  const [summaryAttempt, setSummaryAttempt] = useState(0);
  const [summaryState, setSummaryState] = useState<{ status: "idle" | "loading" | "ready" | "error"; data: Summary | null }>({ status: "idle", data: null });
  const [state, setState] = useState<PreviewState>({
    status: "loading",
    data: null,
  });

  useEffect(() => {
    if (!search) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/v2/topics?q=${encodeURIComponent(search)}&limit=8`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search unavailable");
        const data = (await response.json()) as { topics?: Topic[] };
        if (!Array.isArray(data.topics)) throw new Error("Search unavailable");
        if (!controller.signal.aborted) setSearchState({ status: "ready", topics: data.topics });
      } catch {
        if (!controller.signal.aborted) setSearchState({ status: "error", topics: [] });
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [search, searchAttempt]);

  useEffect(() => {
    if (!summaryRequested) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25000);
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/v2/summary?beat_id=${encodeURIComponent(asset.beatId)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Summary unavailable");
        const data = (await response.json()) as Summary;
        if (data.basis !== "headlines_only" || !Array.isArray(data.items) || !data.freshness) throw new Error("Summary unavailable");
        if (!controller.signal.aborted) setSummaryState({ status: "ready", data });
      } catch {
        if (!controller.signal.aborted) setSummaryState({ status: "error", data: null });
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [asset.beatId, summaryRequested, summaryAttempt]);

  function chooseAsset(next: Asset) {
    setAsset(next);
    setSearch("");
    setQuery("");
    setSearchState({ status: "idle", topics: [] });
    setSummaryRequested(false);
    setSummaryState({ status: "idle", data: null });
  }

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    setState({ status: "loading", data: null });
    void (async () => {
      try {
        const response = await fetch(
          `${API_BASE}/v2/brief?beat_id=${asset.beatId}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Preview unavailable");
        const data = (await response.json()) as Brief;
        if (!Array.isArray(data.items) || !data.freshness)
          throw new Error("Preview unavailable");
        if (!cancelled)
          setState({
            status: "ready",
            data: { ...data, items: data.items.slice(0, 3) },
          });
      } catch {
        if (!cancelled) setState({ status: "error", data: null });
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [asset.beatId, attempt]);

  return (
    <div className="news-preview" data-state={state.status} aria-label="Try a real news lookup">
      <div className="news-preview-heading">
        <span>
          <Radio size={14} aria-hidden="true" /> {cryptoFirst ? "Your crypto briefing" : "Try a real news lookup"}
        </span>
        <span>NO SIGN-UP</span>
      </div>
      <div
        className="news-preview-assets"
        role="group"
        aria-label="Choose a preview topic"
      >
        {assets.map((item) => (
          <RippleButton
            key={item.ticker}
            type="button"
            aria-label={item.label}
            aria-pressed={asset.beatId === item.beatId}
            onClick={() => chooseAsset(item)}
            rippleStyle="bg-foreground/20"
          >
            {cryptoFirst ? item.ticker : item.label}
          </RippleButton>
        ))}
      </div>
      <form className="news-preview-search" onSubmit={(event) => {
        event.preventDefault();
        const term = query.trim();
        if (term.length < 2) return;
        setSearchState({ status: "loading", topics: [] });
        setSearch(term);
        setSearchAttempt((value) => value + 1);
      }}>
        <label htmlFor="news-preview-query">Or find your company or crypto</label>
        <div>
          <input id="news-preview-query" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={cryptoFirst ? "Search crypto or companies, e.g. ETH" : "Name or ticker, e.g. AMD"} minLength={2} maxLength={80} />
          <button type="submit" aria-label="Search supported assets"><Search size={16} /></button>
        </div>
      </form>
      {search && <div className="news-preview-matches" aria-live="polite">
        {searchState.status === "loading" && <p>Finding {search}…</p>}
        {searchState.status === "error" && <p>Search is unavailable right now. Try again.</p>}
        {searchState.status === "ready" && searchState.topics.length === 0 && <p>No supported assets match “{search}”. Try a full name or ticker.</p>}
        {searchState.status === "ready" && searchState.topics.map((topic) => <button key={topic.beat_id} type="button" onClick={() => chooseAsset({ label: topic.label, ticker: topic.ticker, beatId: topic.beat_id })}>
          <span>{topic.label} <small>{topic.asset === "crypto" ? "Crypto" : "Company"}</small></span>
          <span>{topic.ticker} <ArrowRight size={13} /></span>
        </button>)}
      </div>}
      <noscript>
        <p className="news-preview-noscript">
          Enable JavaScript for this live preview, or{" "}
          <a href="/docs/quickstart">follow the setup guide</a> to connect your
          assistant.
        </p>
      </noscript>
      <div className="news-preview-question">
        <span>YOU ASK</span>
        <p>“What’s happening with {asset.label}?”</p>
      </div>
      <div
        className="news-preview-results"
        aria-busy={state.status === "loading"}
      >
        <div className="news-preview-result-label">
          <span>NEWSBEAT FINDS</span>
          <span>
            {state.status === "ready" && state.data.freshness.status === "fresh"
              ? "Recent headlines"
              : "Latest available coverage"}
          </span>
        </div>
        {state.status === "loading" && (
          <div className="news-preview-loading">
            <p role="status">Looking up {asset.label}…</p>
            <div aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </div>
        )}
        {state.status === "error" && (
          <div className="news-preview-empty">
            <p role="status">The preview couldn’t load right now.</p>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
            >
              <RefreshCw size={13} /> Try again
            </button>
          </div>
        )}
        {state.status === "ready" && state.data.items.length === 0 && (
          <div className="news-preview-empty">
            <p role="status">
              No headlines are available in this preview. Try another topic or
              explore the terminal.
            </p>
          </div>
        )}
        {state.status === "ready" && state.data.items.length > 0 && (
          <ol>
            {state.data.items.map((item) => (
              <li key={item.url + item.lede}>
                <a href={item.url} target="_blank" rel="noreferrer">
                  <span>{item.lede}</span>
                  <ArrowUpRight size={14} />
                </a>
                <div>
                  <span>{item.source}</span>
                  <time dateTime={item.published_at}>
                    {dateLabel(item.published_at)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        )}
        {state.status === "ready" && state.data.items.length > 0 && !summaryRequested && (
          <button className="news-preview-summarize" type="button" onClick={() => { setSummaryState({ status: "loading", data: null }); setSummaryRequested(true); }}>
            <Sparkles size={14} /> Summarize what happened <ArrowRight size={13} />
          </button>
        )}
        {summaryRequested && <div className="news-preview-summary" aria-busy={summaryState.status === "loading"}>
          <div className="news-preview-summary-heading"><Sparkles size={14} /> HEADLINE SUMMARY</div>
          {summaryState.status === "loading" && <p role="status">Putting the headlines together…</p>}
          {summaryState.status === "error" && <p role="status">The summary couldn’t load. <button type="button" onClick={() => { setSummaryState({ status: "loading", data: null }); setSummaryAttempt((value) => value + 1); }}>Try again</button></p>}
          {summaryState.status === "ready" && summaryState.data && <>
            <ol>{summaryState.data.items.map((item) => <li key={item.story_id}>
              <p>{item.text}</p>
              {item.reports[0] && <a href={item.reports[0].url} target="_blank" rel="noreferrer">{item.reports[0].source} · {dateLabel(item.reports[0].published_at)} <ArrowUpRight size={12} /></a>}
            </li>)}</ol>
            <p className="news-preview-summary-note">Based on headlines only · {summaryState.data.method === "extractive" ? "Original headlines shown" : "Short summary"}. Check the linked reporting for details.</p>
            {summaryState.data.freshness.status !== "fresh" && <p className="news-preview-freshness">{summaryState.data.freshness.last_success_at ? `Coverage may be out of date. Last successful check: ${dateLabel(summaryState.data.freshness.last_success_at)}.` : "Coverage freshness is unavailable."}</p>}
          </>}
        </div>}
        <span className="news-preview-announcement" role="status">
          {state.status === "ready"
            ? `${state.data.items.length} headlines loaded for ${asset.label}.`
            : ""}
        </span>
        {state.status === "ready" &&
          state.data.freshness.status !== "fresh" && (
            <p className="news-preview-freshness">
              {state.data.freshness.last_success_at
                ? `Coverage may be out of date. Last successful check: ${dateLabel(state.data.freshness.last_success_at)}.`
                : "Coverage freshness is unavailable."}
            </p>
          )}
      </div>
      <div className="news-preview-footer">
        <p>Live coverage from the same news your agent can use.</p>
        <a href="/dashboard">
          Explore more news <ArrowRight size={13} />
        </a>
      </div>
    </div>
  );
}
