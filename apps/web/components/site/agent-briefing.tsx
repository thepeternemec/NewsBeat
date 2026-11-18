"use client";

import { useEffect, useState } from "react";
import type { AgentRequest, AgentResponse } from "@rarebird/contracts";
import type { LookupAsset } from "./landing-lookup-data";
import AgentAnswer from "./agent-answer";
import { API_BASE } from "./content";

export default function AgentBriefing({ asset, market, disabled, onAsk, onFollow, followedIds, onResult }: {
  asset: LookupAsset | null;
  market?: AgentRequest["market"];
  disabled?: boolean;
  onAsk: (question: string) => void;
  onFollow: (asset: LookupAsset) => void;
  followedIds: string[];
  onResult: (result: AgentResponse) => void;
}) {
  const [snapshot, setSnapshot] = useState<AgentResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current: AbortController | undefined;
    async function refresh() {
      if (document.hidden || current) return;
      const controller = new AbortController();
      current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 25_000);
      try {
        const params = new URLSearchParams();
        if (asset) params.set("beat_id", asset.beat_id);
        if (market) params.set("market", market);
        const response = await fetch(API_BASE + "/v2/agent?" + params, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error();
        const data = await response.json() as AgentResponse;
        if (data.agent_version !== "market-agent-v1" || !Array.isArray(data.tools)) throw new Error();
        if (current === controller) { setSnapshot(data); setFailed(false); onResult(data); }
      } catch { if (current === controller) setFailed(true); }
      finally { window.clearTimeout(timeout); if (current === controller) current = undefined; }
    }
    void refresh();
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      const request = current;
      current = undefined;
      request?.abort();
    };
  }, [asset?.beat_id, market, attempt, onResult]);
  return <section className="rb-agent-briefing" id="discovery" aria-label="Your proactive market briefing">
    {failed && <p role="status">{snapshot ? "Refresh interrupted. The last briefing below may be out of date." : "The current briefing is unavailable."} <button className="rb-feed-button" type="button" onClick={() => setAttempt(value => value + 1)}>Retry briefing</button></p>}
    {!snapshot && !failed && <p role="status" className="rb-agent-checking">Checking current reviews, reporting and market conditions…</p>}
    {snapshot && <AgentAnswer result={snapshot} disabled={disabled} proactive onAsk={onAsk} onFollow={onFollow} followedIds={followedIds} />}
  </section>;
}
