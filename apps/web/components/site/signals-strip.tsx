"use client";

/**
 * Positioning and liquidity, on the dashboard.
 *
 * Three numbers that news cannot give you: what leverage is paying to stay in, how much
 * actually traded, and how much stablecoin supply is sitting idle. They are deliberately
 * shown as facts with their source, never as a directional call — a funding rate is what
 * longs pay shorts, not a prediction of where the price goes next.
 */

import { useEffect, useState } from "react";
import type { SignalsPayload } from "@blacksheep/contracts";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
const POLL_MS = 60_000;

function pct(value: number, digits = 2): string {
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(digits)}%`;
}

export default function SignalsStrip() {
  const [data, setData] = useState<SignalsPayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const load = async () => {
      try {
        const response = await fetch(`${API_BASE}/v2/signals`, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const payload = (await response.json()) as SignalsPayload;
        if (!cancelled) {
          setData(payload);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) timer = window.setTimeout(load, POLL_MS);
      }
    };
    void load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (failed && !data) {
    return <p className="market-pulse-note">Signal sources are unavailable right now. Coverage above is unaffected.</p>;
  }
  if (!data) {
    return <p className="market-pulse-note">Reading positioning and liquidity…</p>;
  }

  const funding = data.funding;
  const dex = data.dex_volume;
  const stables = data.stablecoins;

  return (
    <section className="market-pulse" aria-label="Positioning and liquidity">
      <div className="market-pulse-head">
        <span>SIGNALS</span>
        <span>positioning and liquidity, not forecasts</span>
      </div>

      <div className="market-pulse-grid">
        <div className="market-cell">
          <span className="market-label">Funding</span>
          {"data" in funding && funding.data.length > 0 ? (
            <>
              <strong className="market-value">{pct(funding.data[0]!.rate, 4)}</strong>
              <span className="market-sub">
                {funding.data[0]!.symbol.replace("USDT", "")} per 8h · {pct(funding.data[0]!.annualised, 1)} annualised
              </span>
              <span className="market-source">binance · continuous</span>
            </>
          ) : (
            <>
              <strong className="market-value">—</strong>
              <span className="market-sub">unavailable</span>
            </>
          )}
        </div>

        <div className="market-cell">
          <span className="market-label">DEX volume 24h</span>
          {"data" in dex ? (
            <>
              <strong className="market-value">${(dex.data.total_24h_usd / 1e9).toFixed(2)}B</strong>
              <span className="market-sub">
                {dex.data.change_24h === undefined ? "change unavailable" : `${pct(dex.data.change_24h, 1)} vs yesterday`}
              </span>
              <span className="market-source">defillama · daily aggregate</span>
            </>
          ) : (
            <span className="market-sub">unavailable</span>
          )}
        </div>

        <div className="market-cell">
          <span className="market-label">Stablecoin supply</span>
          {"data" in stables ? (
            <>
              <strong className="market-value">${(stables.data.circulating_usd / 1e9).toFixed(1)}B</strong>
              <span className="market-sub">across {stables.data.assets_tracked} pegged assets</span>
              <span className="market-source">defillama · hourly</span>
            </>
          ) : (
            <span className="market-sub">unavailable</span>
          )}
        </div>

        {"data" in funding && funding.data.length > 1 ? (
          <div className="market-cell">
            <span className="market-label">Other funding</span>
            <span className="market-sub">
              {funding.data
                .slice(1)
                .map((rate) => `${rate.symbol.replace("USDT", "")} ${pct(rate.rate, 4)}`)
                .join(" · ")}
            </span>
            <span className="market-source">binance</span>
          </div>
        ) : null}
      </div>

      <p className="market-pulse-note">
        Positive funding means longs pay shorts, so leverage is leaning long. Reference data from public
        endpoints, cached between reads — not advice, and no forecast of price direction.
      </p>
    </section>
  );
}
