"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import type { OpportunityBrief as Brief } from "@newsbeat/api";
import type { ReportedComparison } from "@newsbeat/contracts";
import "./opportunity-brief.css";

const endpoint = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api") + "/v2/opportunities";
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 });
const dateTime = (value: string) => new Date(value).toLocaleString(undefined, {
  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short",
});

function FinancialComparison({ comparison }: { comparison: ReportedComparison }) {
  const { current, previous } = comparison;
  return <li className="opportunity-figure">
    <strong>{comparison.label}</strong>
    <span>{comparison.change_percent === null ? `${money.format(comparison.change)} change` : `${comparison.change_percent > 0 ? "+" : ""}${comparison.change_percent.toFixed(1)}% year over year`}</span>
    <a href={current.url} target="_blank" rel="noreferrer" title={`USD ${current.value}`}>
      {money.format(current.value)} · {comparison.period} ended {current.end}
    </a>
    <a href={previous.url} target="_blank" rel="noreferrer" title={`USD ${previous.value}`}>
      {money.format(previous.value)} · prior year ended {previous.end}
    </a>
  </li>;
}

export default function OpportunityBrief() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") setRevision(value => value + 1); };
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    setStatus("loading");
    async function readBrief() {
      try {
        const response = await fetch(endpoint, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Brief unavailable");
        const next = await response.json() as Brief;
        if (!Array.isArray(next.coverage) || !Array.isArray(next.review) || !Array.isArray(next.watch)
          || !Array.isArray(next.catalysts?.coverage) || !Array.isArray(next.catalysts?.items)) throw new Error("Invalid brief");
        if (active) { setBrief(next); setStatus("ready"); }
      } catch {
        if (active) { setBrief(null); setStatus("unavailable"); }
      } finally {
        window.clearTimeout(timeout);
      }
    }
    void readBrief();
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [revision]);

  const reviews = brief?.review.filter(review => Date.parse(review.market_evidence_until) > Date.now()) ?? [];
  const watches = brief?.watch ?? [];
  const filings = brief?.catalysts.items ?? [];
  return <section className="opportunity-brief" aria-labelledby="opportunity-brief-title">
    <header className="opportunity-brief-header">
      <div>
        <h2 id="opportunity-brief-title">What to investigate now</h2>
        <p>Follow a filing, a market move, or a review with current evidence.</p>
      </div>
      <button type="button" className="opportunity-refresh" disabled={status === "loading"} onClick={() => setRevision(value => value + 1)}>
        <RefreshCw size={14} aria-hidden="true" /> Refresh
      </button>
    </header>
    <p role="status" className="opportunity-status">
      {status === "loading" ? "Checking the latest evidence…" : status === "unavailable" ? "The opportunity brief is unavailable. Try refreshing." : brief ? `Checked ${dateTime(brief.generated_at)}` : ""}
    </p>
    {brief ? <>
      <div className="opportunity-lanes">
        <section className="opportunity-lane" aria-labelledby="opportunity-filings-title">
          <h3 id="opportunity-filings-title">Official filings</h3>
          {filings.length ? <ul>{filings.map(filing => <li key={filing.id}>
            <a href={filing.url} target="_blank" rel="noreferrer">
              <strong>{filing.label} · {filing.form}</strong><ArrowUpRight size={14} aria-hidden="true" />
            </a>
            <p>{filing.description}</p>
            {filing.reported_revenue ? <p>Revenue {money.format(filing.reported_revenue.current.value)} versus {money.format(filing.reported_revenue.previous.value)} in the comparable prior-year period.</p> : null}
            <time dateTime={filing.accepted_at}>{dateTime(filing.accepted_at)}</time>
          </li>)}</ul> : <p>{brief.catalysts.status === "unavailable" ? "SEC filing checks are unavailable." : "No qualifying filings in the past 72 hours across issuers with current coverage."}</p>}
        </section>
        <section className="opportunity-lane" aria-labelledby="opportunity-review-title">
          <h3 id="opportunity-review-title">Ready to review</h3>
          {reviews.length ? <ul>{reviews.map(review => <li key={review.alert_id}>
            <strong>{review.label}</strong>
            <p>{review.what_changed}</p>
            <p>{review.why_now}</p>
            {review.next_check ? <p>{review.next_check}</p> : null}
            <p>Reassess if {review.invalidation}</p>
            {review.evidence[0] ? <a href={review.evidence[0].url} target="_blank" rel="noreferrer">{review.evidence[0].source}<ArrowUpRight size={14} aria-hidden="true" /></a> : null}
            <span>Market evidence expires {dateTime(review.market_evidence_until)}</span>
          </li>)}</ul> : <p>{brief.status === "unavailable" ? "Current market evidence is unavailable." : "No candidates pass the current reporting and market checks."}</p>}
        </section>
        <section className="opportunity-lane" aria-labelledby="opportunity-watch-title">
          <h3 id="opportunity-watch-title">Unusual moves</h3>
          {watches.length ? <ul>{watches.map(watch => <li key={watch.beat_id}>
            <strong>{watch.label} · {watch.minutes} min</strong>
            {watch.residual_return !== null ? <p>{(watch.residual_return * 100).toFixed(2)}% relative move after benchmark adjustment</p> : null}
            <p>{watch.next_check}</p>
            <time dateTime={watch.end_at}>{dateTime(watch.end_at)}</time>
          </li>)}</ul> : <p>{brief.status === "unavailable" ? "Current market evidence is unavailable." : "No moves currently meet the 30-minute anomaly checks."}</p>}
        </section>
      </div>
      <details className="opportunity-coverage">
        <summary>Coverage and reported figures</summary>
        <ul className="opportunity-asset-grid">
          {brief.coverage.map(asset => {
            const official = brief.catalysts.coverage.find(item => item.beat_id === asset.beat_id);
            const comparisons = official?.snapshot?.comparisons ?? [];
            const scored = asset.review_cost_scenario?.scored ?? 0;
            return <li key={asset.beat_id}>
              <h3>{asset.label}</h3>
              <p>Market {asset.market} · Reporting {asset.source_freshness}</p>
              <p>{official ? `SEC evidence ${official.status}${official.checked_at ? ` · checked ${dateTime(official.checked_at)}` : ""}` : "SEC filing coverage is limited to the four issuers in the pilot."}</p>
              {asset.holds?.length ? <ul className="opportunity-holds">{asset.holds.map(reason => <li key={reason}>{reason}</li>)}</ul> : null}
              {comparisons.length ? <ul className="opportunity-figures">{comparisons.map(comparison => <FinancialComparison key={comparison.metric} comparison={comparison} />)}</ul> : null}
              {asset.review_cost_scenario ? <p>{scored} scored reviews in the 60-minute cost scenario{scored < 20 ? " · summary available after 20 observations" : ""}</p> : null}
            </li>;
          })}
        </ul>
        <p>Filing records establish when an issuer disclosed something. Reported figures compare matching periods. Guidance, market expectations, and the effect on prices need separate evidence.</p>
      </details>
    </> : null}
  </section>;
}
