import { SEED_BEATS } from "@rarebird/contracts";
import WorkspaceShell from "@/components/site/workspace-shell";
import FeedWorkspace from "@/components/site/feed-workspace";
import SignalInspector from "@/components/site/signal-inspector";
import OpportunityBrief from "@/components/site/opportunity-brief";
import MarketBriefingCard from "@/components/site/market-briefing";
import "../landing.css";
import "../rarebird.css";
import "../rarebird-polish.css";
import "../quantitative.css";
import "./workspace.css";

export const metadata = {
  title: "Rarebird — Market checks",
  description: "Follow company and token feeds, read current evidence, and ask market questions in one conversation.",
  alternates: { canonical: "/intelligence" },
};

export default async function IntelligencePage({ searchParams }: {
  searchParams: Promise<{ beat?: string; market?: string }>;
}) {
  const query = await searchParams;
  const beat = typeof query.beat === "string" ? SEED_BEATS.find(item => item.beat_id === query.beat) : undefined;
  const asset = beat ? { beat_id: beat.beat_id, label: beat.label, ticker: beat.ticker, asset: beat.asset ?? "equity" } : null;
  const market = query.market === "equity" || query.market === "crypto" ? query.market : "all";

  return <WorkspaceShell active="/intelligence">
    <FeedWorkspace key={asset?.beat_id ?? market} asset={asset} market={market} unknownAsset={Boolean(query.beat && !asset)}>
      <div className="rb-feed-tools rb-market-workspace" aria-label="More market tools">
        <details>
          <summary>Market briefing</summary>
          <div className="rb-feed-tool-content"><MarketBriefingCard /></div>
        </details>
        <details id="opportunities">
          <summary>Reviews and filings</summary>
          <div className="rb-feed-tool-content"><OpportunityBrief /></div>
        </details>
        <details id="real-signal">
          <summary>Asset inspector</summary>
          <div className="rb-feed-tool-content ni-quant-workspace"><SignalInspector /></div>
        </details>
      </div>
    </FeedWorkspace>
  </WorkspaceShell>;
}
