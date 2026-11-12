"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { BriefingSource, MarketBriefing } from "@newsbeat/contracts";
import { API_BASE } from "./content";
import "./market-briefing.css";

const change = new Intl.NumberFormat("en-US", { style: "percent", signDisplay: "exceptZero", maximumFractionDigits: 2 });
const timestamp = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function Source({ source }: { source: BriefingSource }) {
  return <a className="rb-brief-source" href={source.url} target="_blank" rel="noreferrer">
    {source.name} · <time dateTime={source.observed_at}>{timestamp(source.observed_at)}</time> <ArrowUpRight size={12} aria-hidden="true" />
  </a>;
}

export default function MarketBriefingCard({ compact = false }: { compact?: boolean }) {
  const [brief, setBrief] = useState<MarketBriefing | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    let active = true;
    let request: AbortController | undefined;
    const load = async () => {
      if (document.visibilityState === "hidden") return;
      request?.abort();
      const controller = new AbortController();
      request = controller;
      const timeout = window.setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(API_BASE + "/v2/briefing", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Briefing unavailable");
        const result = await response.json() as MarketBriefing;
        if (active && request === controller) { setBrief(result); setFailed(false); }
      } catch {
        if (active && request === controller) { setBrief(null); setFailed(true); }
      } finally {
        window.clearTimeout(timeout);
        if (active) setNow(Date.now());
      }
    };
    void load();
    const timer = window.setInterval(load, 90000);
    const updateClock = window.setInterval(() => setNow(Date.now()), 15000);
    document.addEventListener("visibilitychange", load);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.clearInterval(updateClock);
      document.removeEventListener("visibilitychange", load);
      request?.abort();
    };
  }, []);

  const market = brief?.market;
  const reporting = brief?.reporting;
  const watch = brief?.watch;
  const marketAge = now - Date.parse(market?.source.observed_at ?? "");
  const current = market && marketAge >= -60000 && marketAge <= 600000 ? market : null;
  const activeWatch = watch?.lead && Date.parse(watch.lead.valid_until) > now ? watch.lead : null;
  const measured = current ? current.up + current.down + current.flat : 0;
  const latest = reporting?.lead && now - Date.parse(reporting.lead.source.observed_at) <= 86400000 ? reporting.lead : null;
  return <section className="rb-brief" aria-labelledby="rb-market-brief-title">
    <header aria-live="polite">
      <p>Crypto market briefing</p>
      <h2 id="rb-market-brief-title">{current ? (
        current.up === 0 && current.down === 0 ? "Tracked prices were flat." :
          current.up === current.down ? "Tracked prices are split." :
            (current.up > current.down ? current.up + " rising" : current.down + " falling") + " out of " + measured + " measured."
      ) : brief ? "Fresh prices are limited." : failed ? "Briefing temporarily unavailable." : "Checking the market…"}</h2>
      {brief && <time dateTime={brief.generated_at}>Briefed {timestamp(brief.generated_at)}</time>}
    </header>
    {brief && <dl className="rb-brief-evidence">
      <div><dt>What moved</dt><dd>{current ? <>
        <p>{current.leader.name} had the largest absolute 24-hour move ({change.format(current.leader.change_24h)}) among {measured} current readings from the {current.tracked}-asset basket.</p>
        <Source source={current.leader.source} />
      </> : <p>No current price readings support a breadth summary.</p>}</dd></div>
      <div><dt>What’s being reported</dt><dd>{latest ? <>
        <p>{latest.asset} · {latest.title}</p><Source source={latest.source} />
      </> : <p>{reporting?.checked ? "No qualifying headline in the available snapshot." : "Current headline coverage is unavailable."}</p>}</dd></div>
      <div><dt>What to watch</dt><dd>{activeWatch ? <>
        <p><strong>{activeWatch.asset}.</strong> {activeWatch.detail} {activeWatch.next_check}</p><Source source={activeWatch.source} />
      </> : <>
        <p>{watch?.lead ? "The previous watch window has expired." : watch?.checked
          ? "No active BTC or ETH watch passed the market checks." : "Current BTC and ETH market checks are unavailable."}
          {watch && " " + watch.checked + " of " + watch.total + " pilot markets current at briefing."}</p>
        {current && current.leader.change_24h !== 0 && <a className="rb-brief-source" href={"/ask?" + new URLSearchParams({ ticker: current.leader.ticker })}>
          Research the {current.leader.ticker} move <ArrowUpRight size={12} aria-hidden="true" />
        </a>}
      </>}</dd></div>
    </dl>}
    {compact && <a className="rb-brief-detail" href="/crypto">Open crypto market overview <ArrowUpRight size={14} aria-hidden="true" /></a>}
  </section>;
}
