import { ArrowUpRight, FileSearch, ScanLine, TimerReset } from "lucide-react";
import WorkspaceShell from "@/components/site/workspace-shell";
import MarketDiscovery from "@/components/site/market-discovery";
import { ForecastWorkspace } from "@/components/site/market-briefing";
import CryptoMarketBoard from "@/components/site/crypto-market-board";

export const metadata = {
  title: "Stock and crypto workspace | Rarebird",
  description: "Follow stock and crypto developments, research a ticker, and check the evidence, forecasts and crypto watchlist.",
  alternates: { canonical: "/app" },
};

export default function WorkspacePage() {
  return <WorkspaceShell active="/app" title="Market workspace"
    description="Find what changed across stocks and crypto, then open the research, sources and market data behind the assets you follow.">
    <div className="rb-app-snapshot">
      <MarketDiscovery compact showControls />
      <ForecastWorkspace compact />
    </div>
    <CryptoMarketBoard />
    <section className="rb-app-process" id="how-it-works" aria-labelledby="how-it-works-title">
      <h2 id="how-it-works-title">From source to signal</h2>
      <ol>
        <li>
          <FileSearch size={18} aria-hidden="true" />
          <h3>Find the development</h3>
          <p>Rarebird matches reporting to assets and groups repeat coverage. It records when the source published and when the scan first picked it up.</p>
          <a href="/intelligence#discovery">Inspect source evidence <ArrowUpRight size={13} aria-hidden="true" /></a>
        </li>
        <li>
          <ScanLine size={18} aria-hidden="true" />
          <h3>Check the market response</h3>
          <p>The six-asset pilot checks relative moves, volume and trading costs. Stale data or missing confirmation can hold a review.</p>
          <a href="/intelligence#real-signal">Inspect a market check <ArrowUpRight size={13} aria-hidden="true" /></a>
        </li>
        <li>
          <TimerReset size={18} aria-hidden="true" />
          <h3>Score the forecast</h3>
          <p>Hourly BTC and ETH forecasts are recorded before the close. The scorecard compares settled forecasts with a historical baseline.</p>
          <a href="/app/forecasts">Open forecast results <ArrowUpRight size={13} aria-hidden="true" /></a>
        </li>
      </ol>
      <div className="rb-app-shortcuts">
        <a href="/dashboard">Explore the full news map</a>
        <a href="/docs/intelligence">Read the methodology</a>
        <a href="/docs/quickstart">Use the same tools in your agent</a>
      </div>
    </section>
  </WorkspaceShell>;
}
