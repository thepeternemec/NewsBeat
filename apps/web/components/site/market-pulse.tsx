"use client";

/**
 * Market and sentiment, with its receipts.
 *
 * The point of this strip is not to show numbers — every dashboard has numbers. It is to
 * show *where each one came from and how old it is*, which is the thing scrapers do not
 * do and the reason the API bothers to attribute them. So the source and the fetch time
 * are on screen, not buried in a tooltip, and a part that failed says so rather than
 * rendering a zero.
 */

import { useEffect, useState } from "react";
import type { MarketOverview, Sourced } from "@newsbeat/contracts";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

function ago(isoSeconds: number): string {
  if (isoSeconds < 60) return `${isoSeconds}s ago`;
  if (isoSeconds < 3600) return `${Math.round(isoSeconds / 60)}m ago`;
  return `${Math.round(isoSeconds / 3600)}h ago`;
}

function pct(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

function attribution<T>(part: Sourced<T> | { error: string }): string {
  if (!("source" in part)) return "unavailable";
  return `${part.source} · ${part.freshness.upstream_cadence ?? "irregular"}`;
}

export default function MarketPulse() {
  const [data, setData] = useState<MarketOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`${API_BASE}/v2/market`, { cache: "no-store" });
        if (!response.ok) throw new Error(`market overview responded ${response.status}`);
        const payload = (await response.json()) as MarketOverview;
        if (!cancelled) {
          setData(payload);
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "market data unavailable");
      }
    };
    void load();
    const timer = window.setInterval(load, 90_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (error && !data) {
    return (
      <section className="market-pulse" aria-label="Market data">
        <p className="market-pulse-note">Market data is unavailable right now. News coverage above is unaffected.</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="market-pulse" aria-label="Market data">
        <p className="market-pulse-note">Reading market data…</p>
      </section>
    );
  }

  const fear = data.fear_greed;
  const tvl = data.tvl;
  const prices = data.prices;

  return (
    <section className="market-pulse" aria-label="Market sentiment and prices">
      <div className="market-pulse-head">
        <span>MARKET CONTEXT</span>
        <span>oldest read {ago(data.oldest_fetch_seconds)}</span>
      </div>

      <div className="market-pulse-grid">
        <div className="market-cell">
          <span className="market-label">Fear &amp; greed</span>
          {"data" in fear ? (
            <>
              <strong className="market-value">{fear.data.current.value}</strong>
              <span className="market-sub">
                {fear.data.current.classification}
                {fear.data.current.change === undefined ? "" : ` · ${fear.data.current.change > 0 ? "+" : ""}${fear.data.current.change} vs yesterday`}
              </span>
              <span className="market-source">{attribution(fear)}</span>
            </>
          ) : (
            <span className="market-sub">unavailable</span>
          )}
        </div>

        <div className="market-cell">
          <span className="market-label">DeFi TVL</span>
          {"data" in tvl ? (
            <>
              <strong className="market-value">${(tvl.data.total_usd / 1e9).toFixed(1)}B</strong>
              <span className="market-sub">
                {tvl.data.change === undefined ? "24h change unavailable" : `${pct(tvl.data.change)} in 24h`}
              </span>
              <span className="market-source">{attribution(tvl)}</span>
            </>
          ) : (
            <span className="market-sub">unavailable</span>
          )}
        </div>

        {"data" in prices ? (
          prices.data.assets.map((asset) => (
            <div className="market-cell" key={asset.id}>
              <span className="market-label">{asset.symbol}</span>
              <strong className="market-value">
                ${asset.price_usd.toLocaleString(undefined, { maximumFractionDigits: asset.price_usd < 10 ? 3 : 0 })}
              </strong>
              <span className="market-sub">{pct(asset.change_24h)} in 24h</span>
              <span className="market-source">coingecko · once a minute</span>
            </div>
          ))
        ) : (
          <div className="market-cell">
            <span className="market-label">Prices</span>
            <span className="market-sub">unavailable</span>
          </div>
        )}
      </div>

      <p className="market-pulse-note">
        Reference data from public endpoints, cached between reads. Not advice, and no price forecast is made anywhere in this product.
      </p>
    </section>
  );
}
