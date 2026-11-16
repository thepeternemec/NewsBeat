import WorkspaceShell, { WorkspaceEvidence } from "@/components/site/workspace-shell";
import MarketBriefingCard from "@/components/site/market-briefing";
import CryptoOverview from "@/components/site/crypto-overview";
import "./crypto.css";

export const metadata = {
  title: "Crypto market overview | Rarebird",
  description: "See crypto market breadth, 24-hour moves, DEX activity, perpetual funding, and the source-linked headlines behind the day.",
  alternates: { canonical: "/crypto" },
};

export default function CryptoPage() {
  return <WorkspaceShell active="/crypto" title="Crypto market indicators"
    description="See how widely crypto is moving, where trading is active and what’s being reported.">
    <WorkspaceEvidence title="Where the market readings come from">
      <p>Breadth counts the current readings in the tracked basket. DEX activity, funding and sentiment carry their own source and update time.</p>
      <p>Expand or follow the source under each reading to see where it came from and how recently it was checked.</p>
      <a href="/app/forecasts">See the hourly BTC and ETH forecast results</a>
    </WorkspaceEvidence>
    <div className="crypto-overview">
      <MarketBriefingCard />
      <CryptoOverview />
    </div>
  </WorkspaceShell>;
}
