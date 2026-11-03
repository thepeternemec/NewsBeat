"use client";

/**
 * Live chain state.
 *
 * A block every ~12 seconds is what "real-time" honestly means on a free public RPC, so
 * this polls at twelve and shows the age rather than pretending to stream. Ethereum and
 * Solana are reported separately because either node can fail on its own, and a missing
 * slot should not hide a block number that is still moving.
 *
 * The dot only pulses while the reading is fresh. A pulse on stale data is the most
 * misleading thing a live indicator can do.
 */

import { useEffect, useState } from "react";
import type { ChainPulse, Sourced } from "@newsbeat/contracts";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
// Poll inside the server's 8s TTL, not at the block cadence. Polling at 12s against an
// 8s TTL lands every read in the stale-while-revalidate window, so the browser is served
// the previous block and the number appears frozen while the server is fine. At 6s the
// read is always fresh from cache, and the value advances when the TTL rolls over.
const POLL_MS = 6_000;

export default function ChainPulseStrip() {
  const [pulse, setPulse] = useState<Sourced<ChainPulse> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    const load = async () => {
      try {
        const response = await fetch(`${API_BASE}/v2/chain`, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const payload = (await response.json()) as Sourced<ChainPulse>;
        if (!cancelled) {
          // Serverless runs several instances, each with its own cache, so two reads a
          // few seconds apart can come from instances that disagree. A block number or a
          // slot that goes backwards reads as broken, so keep the highest we have seen.
          setPulse((previous) => {
            if (!previous) return payload;
            const prevEth = previous.data.ethereum?.block ?? 0;
            const prevSol = previous.data.solana?.slot ?? 0;
            const nextEth = payload.data.ethereum;
            const nextSol = payload.data.solana;
            if (nextEth && nextEth.block < prevEth) nextEth.block = prevEth;
            if (nextSol && nextSol.slot < prevSol) nextSol.slot = prevSol;
            return payload;
          });
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

  if (failed && !pulse) {
    return (
      <div className="chain-pulse" role="status">
        <span className="chain-dot is-idle" aria-hidden="true" />
        <span className="chain-label">Chain state unavailable</span>
      </div>
    );
  }

  if (!pulse) {
    return (
      <div className="chain-pulse" role="status">
        <span className="chain-dot" aria-hidden="true" />
        <span className="chain-label">Reading chain state…</span>
      </div>
    );
  }

  const fresh = pulse.freshness.status === "fresh";
  const { ethereum, solana } = pulse.data;

  return (
    <div className="chain-pulse" role="status">
      <span className={`chain-dot${fresh ? " is-live" : " is-idle"}`} aria-hidden="true" />
      <span className="chain-label">
        {fresh ? "Live" : "Stale"} · block every ~12s
        {pulse.freshness.age_seconds > 0 ? ` · read ${pulse.freshness.age_seconds}s ago` : ""}
      </span>

      {ethereum ? (
        <span className="chain-value">
          <b>ETH</b> block {ethereum.block.toLocaleString()}
          <em>gas {ethereum.gas_gwei.toFixed(2)} gwei</em>
        </span>
      ) : (
        <span className="chain-value is-missing">ETH node unavailable</span>
      )}

      {solana ? (
        <span className="chain-value">
          <b>SOL</b> slot {solana.slot.toLocaleString()}
        </span>
      ) : (
        <span className="chain-value is-missing">SOL node unavailable</span>
      )}
    </div>
  );
}
