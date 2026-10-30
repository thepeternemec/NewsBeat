"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { API_BASE } from "./content";
import "./news-mesh.css";

const COMPANIES = [
  { name: "NVIDIA", ticker: "NVDA", beatId: "b_bb964843350e" },
  { name: "APPLE", ticker: "AAPL", beatId: "b_7d5acdda6186" },
  { name: "ALPHABET", ticker: "GOOGL", beatId: "b_c0c3f9282a94" },
] as const;

interface Headline { lede: string; source: string; url: string; published_at: string }
interface Brief {
  items: Headline[];
  freshness: { status: string; last_success_at: string | null };
}
type Result = { state: "loading" | "error" } | { state: "ready"; brief: Brief };

function initialResults(): Record<string, Result> {
  return Object.fromEntries(COMPANIES.map(company => [company.beatId, { state: "loading" }])) as Record<string, Result>;
}

function publishedLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return date.toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  }) + " UTC";
}

function sourceUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

/** Three independent live lookups; one unavailable feed does not hide the others. */
export default function NewsMesh() {
  const [results, setResults] = useState<Record<string, Result>>(initialResults);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    let disposed = false;
    setResults(initialResults());

    for (const company of COMPANIES) {
      void (async () => {
        try {
          const response = await fetch(API_BASE + "/v2/brief?beat_id=" + encodeURIComponent(company.beatId), {
            cache: "no-store", signal: controller.signal,
          });
          if (!response.ok) throw new Error("News lookup unavailable");
          const brief = await response.json() as Brief;
          if (!Array.isArray(brief.items) || !brief.freshness || typeof brief.freshness.status !== "string")
            throw new Error("Invalid news response");
          if (!disposed) setResults(current => ({ ...current, [company.beatId]: { state: "ready", brief } }));
        } catch {
          if (!disposed) setResults(current => ({ ...current, [company.beatId]: { state: "error" } }));
        }
      })();
    }

    return () => { disposed = true; window.clearTimeout(timeout); controller.abort(); };
  }, [attempt]);

  const hasError = COMPANIES.some(company => results[company.beatId]?.state === "error");
  return (
    <aside className="news-mesh" aria-label="Company news mesh">
      <div className="news-mesh-top">
        <span><span className="news-mesh-pulse" aria-hidden="true" /> NEWS MESH</span>
        <span>3 UNDERLYING COMPANIES</span>
      </div>
      <div className="news-mesh-intro">
        <strong>What’s happening behind the asset?</strong>
        <span>Live lookups · headline metadata</span>
      </div>
      <ol className="news-mesh-list">
        {COMPANIES.map(company => {
          const result = results[company.beatId] ?? { state: "loading" as const };
          const brief = result.state === "ready" ? result.brief : null;
          const headline = brief?.items[0];
          const url = headline ? sourceUrl(headline.url) : null;
          const coverage = brief?.freshness.status.toUpperCase() ?? (result.state === "loading" ? "CHECKING" : "UNAVAILABLE");
          return <li className="news-mesh-row" key={company.beatId} aria-busy={result.state === "loading"}>
            <div className="news-mesh-company"><span>{company.ticker}</span><small>{company.name}</small></div>
            <span className="news-mesh-connection" aria-hidden="true" />
            <article className="news-mesh-story">
              <div className="news-mesh-story-top"><span>COMPANY NEWS</span><span>{coverage}</span></div>
              {headline ? <>
                {url
                  ? <a className="news-mesh-headline" href={url} target="_blank" rel="noopener noreferrer">{headline.lede}<ArrowUpRight size={13} aria-hidden="true" /></a>
                  : <p className="news-mesh-headline">{headline.lede}</p>}
                <div className="news-mesh-meta"><span>{headline.source || "Publisher unavailable"}</span><time dateTime={headline.published_at}>{publishedLabel(headline.published_at)}</time></div>
              </> : <p className="news-mesh-empty" role="status">{result.state === "loading" ? "Checking the latest coverage…" : result.state === "error" ? "Couldn’t load coverage right now." : "No headlines in this briefing."}</p>}
            </article>
          </li>;
        })}
      </ol>
      <div className="news-mesh-bottom">
        <span>COMPANY → REPORT → SOURCE</span>
        {hasError
          ? <button type="button" onClick={() => setAttempt(value => value + 1)}><RefreshCw size={13} aria-hidden="true" /> Retry</button>
          : <a href="/dashboard">Explore all coverage <ArrowUpRight size={13} aria-hidden="true" /></a>}
      </div>
    </aside>
  );
}
