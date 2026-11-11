"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { parseTokenAsset, TOKEN_ADDRESS_ERROR, TOKEN_CHAINS, TOKENIZED_EQUITIES,
  type TokenChain, type TokenIntelligence } from "@newsbeat/contracts/token-intelligence";
import CopyButton from "./copy-button";
import { API_BASE } from "./content";
import "./token-lookup.css";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumSignificantDigits: 8 });
const compactUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat("en-US", { signDisplay: "exceptZero", maximumFractionDigits: 2 });
const format = (value: number | null, formatter: Intl.NumberFormat) => value === null ? "—" : formatter.format(value);
const timestamp = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const marketLabels = { fresh: "Feed checked", stale: "Stale pool data", no_pools: "No matching pools", unavailable: "Feed unavailable" };

export default function TokenLookup({ initial }: { initial: { chain: TokenChain; address: string } | null }) {
  const [chain, setChain] = useState<TokenChain>(initial?.chain ?? "solana");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [report, setReport] = useState<TokenIntelligence | null>(null);
  const [share, setShare] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function lookup(nextChain: TokenChain, nextAddress: string) {
    request.current?.abort();
    request.current = null;
    setReport(null);
    setShare("");
    setError("");
    setPending(false);
    const asset = parseTokenAsset(nextChain + ":" + nextAddress.trim());
    if (!asset) { setError(TOKEN_ADDRESS_ERROR); return; }
    const controller = new AbortController();
    request.current = controller;
    setChain(asset.chain);
    setAddress(asset.address);
    setPending(true);
    const params = new URLSearchParams({ asset: asset.chain + ":" + asset.address });
    const timer = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(API_BASE + "/v2/tokens?" + params, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 429 ? "Too many lookups. Try again in a moment." : "The lookup is temporarily unavailable.");
      const next = await response.json() as TokenIntelligence;
      if (next.asset?.address !== asset.address || next.asset?.chain !== asset.chain || !Array.isArray(next.market?.pools)) {
        throw new Error("The token response could not be verified.");
      }
      if (request.current === controller) {
        setReport(next);
        setShare(new URL("/tokens?" + params, window.location.origin).href);
      }
    } catch (cause) {
      if (request.current === controller) setError(controller.signal.aborted ? "The lookup timed out. Try again." : cause instanceof Error ? cause.message : "The lookup is unavailable.");
    } finally {
      window.clearTimeout(timer);
      if (request.current === controller) setPending(false);
    }
  }

  return <>
    <form className="token-form" onSubmit={event => { event.preventDefault(); void lookup(chain, address); }}>
      <label>Chain<select value={chain} onChange={event => setChain(event.target.value as TokenChain)}>
        {Object.entries(TOKEN_CHAINS).map(([key, entry]) => <option key={key} value={key}>{entry.label}</option>)}
      </select></label>
      <label>Contract address or Solana mint<input value={address} onChange={event => setAddress(event.target.value)}
        autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={64} required placeholder={chain === "solana" ? "Paste a mint address" : "Paste a 0x contract"} /></label>
      <button className="btn-primary" type="submit" disabled={pending}>Check token <ArrowRight size={16} aria-hidden="true" /></button>
    </form>
    <div className="token-examples" aria-label="Try a tokenized stock on Solana">
      <span>Try on Solana</span>
      {TOKENIZED_EQUITIES.map(item => <button key={item.symbol} type="button"
        onClick={() => void lookup("solana", item.addresses.solana)}>{item.symbol}</button>)}
    </div>

    <div aria-live="polite" aria-busy={pending}>
      {pending && <p className="token-feedback" role="status">Checking the contract, pools and issuer coverage…</p>}
      {error && <p className="token-feedback" role="alert">{error}</p>}
      {report && <div className="token-report">
        <section className="token-card token-identity" aria-labelledby="token-result">
          <div>
            <p className="token-eyebrow">{TOKEN_CHAINS[report.asset.chain].label} · {report.registry ? "Issuer record matched" : "Contract lookup"}</p>
            <h2 id="token-result">{report.asset.name ?? report.asset.symbol ?? "Contract details"}</h2>
            <a className="token-address" href={report.asset.explorer_url} target="_blank" rel="noreferrer">{report.asset.address} <ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>
          {share && <CopyButton label="Copy lookup link" text={share} />}
        </section>

        <section className="token-card" aria-labelledby="token-markets">
          <div className="token-section-head">
            <h3 id="token-markets">Where it trades</h3>
            <span className="token-status">{marketLabels[report.market.status]}</span>
          </div>
          {report.market.pools.length > 0 ? <>
            <p className="token-muted">Showing {report.market.pools.length} of {report.market.matching_pools} indexed pools with this contract as the base token. Sorted by reported liquidity.</p>
            <ul className="token-pools">
              {report.market.pools.map(pool => <li key={pool.id}>
                <div><a href={pool.url} target="_blank" rel="noreferrer">{pool.dex} <ArrowUpRight size={13} aria-hidden="true" /></a><small>vs {pool.quote_symbol}</small></div>
                <dl>
                  <div><dt>Token price</dt><dd>{format(pool.price_usd, usd)}</dd></div>
                  <div><dt>Liquidity</dt><dd>{format(pool.liquidity_usd, compactUsd)}</dd></div>
                  <div><dt>24h volume</dt><dd>{format(pool.volume_24h_usd, compactUsd)}</dd></div>
                  <div><dt>24h move</dt><dd>{pool.change_24h_pct === null ? "—" : percent.format(pool.change_24h_pct) + "%"}</dd></div>
                </dl>
              </li>)}
            </ul>
          </> : <p className="token-muted">{report.market.status === "unavailable"
            ? "The pool source could not be reached. Try again shortly."
            : "The pool feed has no matching base-token pool for this lookup."}</p>}
          <p className="token-source"><a href={report.market.source_url} target="_blank" rel="noreferrer">{report.market.source} <ArrowUpRight size={13} aria-hidden="true" /></a>
            {report.market.fetched_at && <span>Fetched {timestamp(report.market.fetched_at)}</span>}</p>
        </section>

        {report.registry && <section className="token-card" aria-labelledby="token-company">
          <div className="token-section-head">
            <h3 id="token-company">Underlying company · {report.registry.ticker}</h3>
            <a href={"/ask?" + new URLSearchParams({ ticker: report.registry.ticker, ...(report.underlying_news ? { beat_id: report.underlying_news.beat_id } : {}) })}>Research {report.registry.ticker} <ArrowUpRight size={14} aria-hidden="true" /></a>
          </div>
          <p className="token-muted">{report.registry.issuer} · {report.registry.isin} · <a href={report.registry.source_url} target="_blank" rel="noreferrer">Issuer record</a> checked {report.registry.checked_on}</p>
          {report.underlying_news?.items.length ? <ul className="token-reports">{report.underlying_news.items.map(item => <li key={item.url}>
            <a href={item.url} target="_blank" rel="noreferrer">{item.title} <ArrowUpRight size={13} aria-hidden="true" /></a>
            <small>{item.source} · {timestamp(item.published_at)}</small>
          </li>)}</ul> : <p className="token-muted">No company headlines are available in this snapshot.</p>}
          {report.underlying_news && <p className="token-source">Company reporting {report.underlying_news.status}
            {report.underlying_news.last_success_at && " · checked " + timestamp(report.underlying_news.last_success_at)}</p>}
        </section>}

        <details className="token-card token-coverage"><summary>Sources and coverage</summary>
          <ul>{report.limitations.map(note => <li key={note}>{note}</li>)}</ul>
        </details>
      </div>}
    </div>
  </>;
}
