import WorkspaceShell, { WorkspaceEvidence } from "@/components/site/workspace-shell";
import InvestmentLookup from "@/components/site/investment-lookup";

export const metadata = { title: "Ask Rarebird about a ticker", description: "Get a sourced investment brief for a stock or crypto ticker. See Rarebird’s current stance, market evidence, risks, and what would change the view." };

export default async function AskPage({ searchParams }: { searchParams: Promise<{ ticker?: string; beat_id?: string }> }) {
  const params = await searchParams;
  const ticker = typeof params.ticker === "string" && /^\$?[A-Za-z0-9][A-Za-z0-9.-]{0,19}$/.test(params.ticker) ? params.ticker.toUpperCase() : "";
  const beatId = typeof params.beat_id === "string" && /^b_[0-9a-f]{12}$/.test(params.beat_id) ? params.beat_id : undefined;
  return <WorkspaceShell active="/ask" title="Ticker research"
    description="Get a sourced brief on a stock or crypto ticker. See what supports a closer look, what could go wrong and what would change the view.">
    <WorkspaceEvidence title="What goes into a ticker brief?">
      <p>Rarebird resolves the ticker, checks relevant sources and adds measured market evidence where available. If support is too thin, the brief explains what is missing and what to check next.</p>
      <a href="/docs/connect#telegram">Use the same briefs in Telegram</a>
    </WorkspaceEvidence>
    <InvestmentLookup initialTicker={ticker} initialBeat={beatId} />
  </WorkspaceShell>;
}
