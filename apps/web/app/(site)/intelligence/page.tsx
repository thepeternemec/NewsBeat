import WorkspaceShell, { WorkspaceEvidence } from "@/components/site/workspace-shell";
import SignalInspector from "@/components/site/signal-inspector";
import OpportunityBrief from "@/components/site/opportunity-brief";
import MarketBriefingCard from "@/components/site/market-briefing";
import MarketDiscovery from "@/components/site/market-discovery";
import "../landing.css";
import "../newsbeat.css";
import "../newsbeat-polish.css";
import "../quantitative.css";
import "./workspace.css";

export const metadata = {
  title: "Rarebird — Market checks",
  description: "Scan company and token developments, open the original evidence, and inspect deeper market checks.",
  alternates: { canonical: "https://www.newsbeat.dev/intelligence" },
};

export default function IntelligencePage() {
  return <WorkspaceShell active="/intelligence" title="Market checks"
    description="Search a stock or crypto asset, open the original evidence and see which developments warrant a closer look.">
    <WorkspaceEvidence title="How a report becomes a review candidate">
      <p>The catalog scan checks for relevant reporting across 2,030 assets. Four pilot issuers also have direct SEC filing checks.</p>
      <p>For six pilot assets, Rarebird tests fresh reporting against market participation, relative price moves and trading costs. The asset inspector shows the sources, timing checks and reasons to wait.</p>
      <a href="/docs/intelligence#pilot-and-policy">Read the criteria for a review</a>
    </WorkspaceEvidence>
    <nav className="rb-app-jump" aria-label="Jump to a market check">
      <a href="#discovery">Developments</a>
      <a href="#opportunities">Reviews and filings</a>
      <a href="#real-signal">Asset inspector</a>
    </nav>
    <div className="rb-market-workspace">
      <div id="discovery"><MarketDiscovery /></div>
      <MarketBriefingCard />
      <div id="opportunities"><OpportunityBrief /></div>
      <section className="ni-quant-workspace" id="real-signal" aria-labelledby="real-signal-title">
        <h2 id="real-signal-title">Inspect an asset</h2>
        <SignalInspector />
      </section>
    </div>
  </WorkspaceShell>;
}
