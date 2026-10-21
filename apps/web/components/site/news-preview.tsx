"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Radio, RefreshCw } from "lucide-react";
import { API_BASE } from "./content";

const ASSETS = [
  { label: "Nvidia", ticker: "NVDA", beatId: "b_bb964843350e" },
  { label: "Apple", ticker: "AAPL", beatId: "b_7d5acdda6186" },
  { label: "Bitcoin", ticker: "BTC", beatId: "b_06c91290de1c" },
] as const;
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
export default function NewsPreview() {
  const [selected, setSelected] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PreviewState>({
    status: "loading",
    data: null,
  });
  const asset = ASSETS[selected]!;

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
    <div className="news-preview" aria-label="Try a real news lookup">
      <div className="news-preview-heading">
        <span>
          <Radio size={14} /> Try a real news lookup
        </span>
        <span>NO SIGN-UP</span>
      </div>
      <div
        className="news-preview-assets"
        role="group"
        aria-label="Choose a preview topic"
      >
        {ASSETS.map((item, index) => (
          <button
            key={item.ticker}
            type="button"
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
          >
            {item.label}
          </button>
        ))}
      </div>
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
        <p>A preview of the headlines your assistant can use.</p>
        <a href="/dashboard">
          Explore more news <ArrowRight size={13} />
        </a>
      </div>
    </div>
  );
}
