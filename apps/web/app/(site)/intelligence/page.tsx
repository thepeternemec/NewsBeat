import { ArrowUpRight } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import SignalInspector from "@/components/site/signal-inspector";
import OpportunityBrief from "@/components/site/opportunity-brief";
import MarketBriefingCard from "@/components/site/market-briefing";
import "../landing.css";
import "../newsbeat.css";
import "../newsbeat-polish.css";
import "../quantitative.css";
import "./workspace.css";

export const metadata = {
  title: "Rarebird — Market checks",
  description: "See what Rarebird is watching, which checks passed, and the original evidence behind the call.",
  alternates: { canonical: "https://www.newsbeat.dev/intelligence" },
};

export default function IntelligencePage() {
  return <>
    <SiteNav active="/intelligence" />
    <main className="wrap ni-quant-home rb-market-workspace">
      <header>
        <h1>Market checks</h1>
        <p>See which developments passed the checks and what could change the view.</p>
      </header>
      <MarketBriefingCard />
      <div id="opportunities"><OpportunityBrief /></div>
      <section className="ni-quant-workspace" id="real-signal" aria-labelledby="real-signal-title">
        <h2 id="real-signal-title">Inspect an asset</h2>
        <SignalInspector />
      </section>
      <div className="rb-workspace-links">
        <a href="/crypto">Crypto overview <ArrowUpRight size={14} aria-hidden="true" /></a>
        <a href="/tokens">Token contracts <ArrowUpRight size={14} aria-hidden="true" /></a>
        <a href="/docs/intelligence">How the checks work <ArrowUpRight size={14} aria-hidden="true" /></a>
      </div>
    </main>
    <SiteFooter />
  </>;
}
