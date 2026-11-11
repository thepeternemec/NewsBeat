"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Send } from "lucide-react";
import type { InvestmentBrief } from "@newsbeat/contracts";
import { API_BASE } from "./content";
import { ResearchDetails } from "./research-question";
import "./investment-lookup.css";

const examples = ["BTC", "ETH", "NVDA", "AAPL"];
const validTicker = /^\$?[A-Za-z0-9][A-Za-z0-9.-]{0,19}$/;

export default function InvestmentLookup({ initialTicker, initialBeat }: { initialTicker: string; initialBeat?: string }) {
  const [ticker, setTicker] = useState(initialTicker);
  const [result, setResult] = useState<InvestmentBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const active = useRef<AbortController | null>(null);

  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);
  useEffect(() => {
    const deadline = result?.stance?.valid_until;
    if (!deadline) return;
    const timer = window.setTimeout(() => setExpired(true), Math.max(0, Date.parse(deadline) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [result]);

  async function lookup(symbol: string, beatId?: string) {
    const value = symbol.trim().toUpperCase();
    if (!validTicker.test(value)) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 35000);
    setTicker(value); setResult(null); setExpired(false); setError(""); setLoading(true);
    try {
      const response = await fetch(API_BASE + "/v2/investment", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", signal: controller.signal,
        body: JSON.stringify({ ticker: value, ...(beatId ? { beat_id: beatId } : {}) }),
      });
      if (!response.ok) throw new Error(response.status === 429 ? "Too many requests. Wait a moment before retrying." : "The brief is unavailable right now. Try again.");
      const next = await response.json() as InvestmentBrief;
      if (next.research?.version !== "question-research-v1" || !Array.isArray(next.research.evidence)) throw new Error("The brief could not be read.");
      if (active.current === controller) setResult(next);
    } catch (cause) {
      if (active.current === controller) setError(controller.signal.aborted ? "The request timed out. Try again." : cause instanceof Error ? cause.message : "The brief is unavailable.");
    } finally {
      window.clearTimeout(timer);
      if (active.current === controller) setLoading(false);
    }
  }

  const asset = result?.research.assets[0];
  const stance = expired ? { label: "Wait for a fresh check", reason: "The market evidence window has expired. Refresh the brief for the latest stance." } : result?.stance;
  const shareLink = result && asset && stance ? `https://t.me/share/url?${new URLSearchParams({
    url: `https://www.newsbeat.dev/ask?${new URLSearchParams({ ticker: result.ticker, beat_id: asset.beat_id })}`,
    text: `Rarebird · ${asset.label} (${result.ticker})\n${new Date(result.generated_at).toISOString().slice(0, 16).replace("T", " ")} UTC\n${stance.label}\n${stance.reason}${!expired && result.stance?.valid_until ? `\nTiming evidence through ${result.stance.valid_until.slice(0, 16).replace("T", " ")} UTC` : ""}\n\n${result.research.answer?.answer ?? ""}`.slice(0, 1000),
  })}` : null;

  return <div className="investment-lookup">
    <section className="investment-search" aria-label="Look up an investment ticker">
      <form onSubmit={event => { event.preventDefault(); void lookup(ticker, ticker === initialTicker ? initialBeat : undefined); }}>
        <label htmlFor="investment-ticker">Stock or crypto ticker</label>
        <div className="investment-field">
          <input id="investment-ticker" value={ticker} onChange={event => setTicker(event.target.value.toUpperCase())}
            placeholder="BTC, NVDA, AAPL" maxLength={21} autoComplete="off" autoCapitalize="characters" spellCheck={false} required />
          <button type="submit" disabled={loading || !validTicker.test(ticker.trim())}>Get the brief <ArrowRight size={17} aria-hidden="true" /></button>
        </div>
      </form>
      <div className="investment-examples" aria-label="Example tickers">{examples.map(symbol => <button type="button" key={symbol} onClick={() => void lookup(symbol)}>{symbol}</button>)}</div>
      <p className="investment-note">The same research brief powers the web app, MCP, and Telegram. Your time horizon, risk tolerance, and portfolio determine whether an investment fits.</p>
    </section>

    <div aria-live="polite">
      {loading ? <p className="investment-progress" role="status">Checking current reporting, market data, and the investment case for {ticker}…</p> : null}
      {error ? <p className="investment-progress" role="alert">{error}</p> : null}
    </div>

    {!result && !loading && !error ? <section className="investment-report investment-example" aria-labelledby="investment-example-title">
      <div className="investment-report-heading"><div><p className="investment-eyebrow">Example response</p><h2 id="investment-example-title">Bitcoin · BTC</h2></div><span className="investment-stamp">Illustrative</span></div>
      <div className="investment-stance"><h3>Wait for stronger evidence</h3><p>Recent reporting may support a case for adoption. A current market check and evidence of actual use would help assess it.</p></div>
      <dl className="investment-example-grid">
        <div><dt>What supports the case</dt><dd>A new custody service could make Bitcoin easier for institutions to hold.</dd></div>
        <div><dt>What argues against it</dt><dd>The case depends on client uptake and market conditions.</dd></div>
        <div><dt>What to check next</dt><dd>Look for confirmed usage and a fresh market reaction around the announcement.</dd></div>
      </dl>
    </section> : null}

    {result ? <section className="investment-report" aria-labelledby="investment-result-title">
      <div className="investment-report-heading">
        <div><p className="investment-eyebrow">Investment brief</p><h2 id="investment-result-title">{asset ? `${asset.label} · ${asset.ticker}` : result.ticker}</h2></div>
        <time className="investment-stamp" dateTime={result.generated_at}>{new Date(result.generated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time>
      </div>
      {stance ? <div className="investment-stance"><h3>{stance.label}</h3><p>{stance.reason}</p>
        {!expired && result.stance?.valid_until ? <small>Timing evidence through {new Date(result.stance.valid_until).toLocaleTimeString()}</small> : null}
      </div> : null}
      {!expired && result.timing?.trigger ? <div className="investment-trigger">
        <a href={result.timing.trigger.url} target="_blank" rel="noreferrer">{result.timing.trigger.title} <ArrowUpRight size={14} aria-hidden="true" /></a>
        <p>{result.timing.trigger.source} · {new Date(result.timing.trigger.published_at).toLocaleString()}</p>
        {result.timing.invalidation ? <p>What would change the timing view · {result.timing.invalidation}</p> : null}
      </div> : null}
      <div className="research-question-result"><ResearchDetails result={result.research} onSelect={beatId => void lookup(result.ticker, beatId)} /></div>
      {shareLink ? <a className="investment-share" href={shareLink} target="_blank" rel="noreferrer"><Send size={16} aria-hidden="true" /> Share to Telegram</a> : null}
    </section> : null}
  </div>;
}
