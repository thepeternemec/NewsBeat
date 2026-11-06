"use client";
import { useEffect, useState } from "react";
import type { CollectionResult, CollectionStatus } from "@newsbeat/contracts";
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

/** Mounting and refreshing read status only. POST start is confined to the explicit button. */
export default function FastCollectionControl({ beatId }: { beatId: string }) {
  const [status, setStatus] = useState<CollectionStatus | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState(0);
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    async function read() {
      try { const response = await fetch(API + "/v2/collection?beat_id=" + encodeURIComponent(beatId), { signal: controller.signal, cache: "no-store" });
        if (!response.ok) return;
        const next = await response.json() as CollectionStatus;
        if (mounted && next.beat_id === beatId) { setStatus(next); setClock(Date.now()); }
      } catch { /* A status failure never starts a collection request. */ }
    }
    void read(); const timer = window.setInterval(() => { setClock(Date.now()); void read(); }, 30000);
    return () => { mounted = false; controller.abort(); window.clearInterval(timer); };
  }, [beatId]);
  const active = !!status?.active && !!status.expires_at && (clock || Date.now()) < Date.parse(status.expires_at);
  async function change(action: "start" | "stop") {
    setBusy(true); setError(null);
    try {
      const response = await fetch(API + "/v2/collection", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify(action === "start" ? { action, beat_id: beatId, interval_seconds: 60 } : { action, beat_id: beatId, session_token: token }) });
      if (!response.ok) throw new Error("Unable to update collection.");
      const next = await response.json() as CollectionResult;
      if (next.beat_id !== beatId) throw new Error("Invalid collection response.");
      setStatus(next); setClock(Date.now());
      if (next.session_token) setToken(next.session_token);
      if (action === "stop" || !next.active) setToken(null);
    } catch { setError("The collection request did not complete. Try again."); }
    finally { setBusy(false); }
  }
  return <section className="fast-collection-control" aria-label="Optional one-minute news collection">
    <div><strong>{active ? "One-minute news collection is active." : "Need a closer watch?"}</strong>
      <p>{active && status?.expires_at ? "Stops automatically at " + new Date(status.expires_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZoneName: "short" }) + ". No automatic renewal." : "Request one-minute news checks for this asset for 15 minutes. Otherwise the catalog runs every 10 minutes."}</p>
      <small>News collection only. Market checks and analysis remain on their existing schedules.</small>
      {error && <p role="alert">{error}</p>}
    </div>
    <button type="button" disabled={busy || active && !token} onClick={() => void change(active && token ? "stop" : "start")}>{busy ? "Updating…" : active ? token ? "Stop one-minute checks" : "Already requested" : "Request 1-min news · 15 min"}</button>
    <span className="fast-collection-announcement" role="status" aria-live="polite">{active ? "One-minute collection requested." : "One-minute collection is off."}</span>
  </section>;
}
