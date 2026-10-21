"use client";

import { useState } from "react";
import { hhmm } from "./content";

interface SummaryResult {
  basis: "headlines_only";
  method: "generated" | "extractive";
  coverage_truncated: boolean;
  freshness: { status: string; last_success_at: string | null };
  items: Array<{ story_id: string; text: string; reports: Array<{
    id: string; title: string; url: string; source: string; published_at: string;
  }> }>;
}

export default function HeadlineSummary({ beatId, label, base }: { beatId: string; label: string; base: string }) {
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${base}/v2/summary?beat_id=${encodeURIComponent(beatId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Summary unavailable. Try again shortly.");
      setResult(await response.json() as SummaryResult);
    } catch {
      setError("Summary unavailable. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="headline-summary" aria-label={`What happened with ${label}`}>
      <div className="headline-summary-head">
        <div><span className="sec-eyebrow">Based on headlines</span><h3>What happened with {label}?</h3></div>
        <button type="button" className="btn-ghost" onClick={() => void load()} disabled={loading}>
          {loading ? "Summarizing…" : result ? "Refresh summary" : "Summarize headlines"}
        </button>
      </div>
      {error && <p role="status" className="story-feed-note">{error}</p>}
      {result && (
        <>
          {result.items.length ? (
            <ol className="headline-summary-list">
              {result.items.map(item => (
                <li key={item.story_id}>
                  <p>{item.text}</p>
                  <span>
                    {item.reports.slice(0, 3).map((report, i) => (
                      <span key={report.id}>
                        {i > 0 ? " · " : ""}<a href={report.url} target="_blank" rel="noreferrer">{report.source}</a>
                        {i === 0 ? ` · ${hhmm(report.published_at)} UTC` : ""}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ol>
          ) : <p className="story-feed-note">No recent headlines to summarize for this asset.</p>}
          <p className="headline-summary-note">
            {result.method === "extractive" ? "Original headlines shown; generated summaries are unavailable. " : "Short summaries from headlines only. "}
            Open the sources for full reporting. Coverage: {result.freshness.status}{result.coverage_truncated ? " · recent snapshot" : ""}.
          </p>
        </>
      )}
    </section>
  );
}
