import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import InvestmentLookup from "@/components/site/investment-lookup";

export const metadata = { title: "Ask Rarebird about a ticker", description: "Get a sourced investment brief for a stock or crypto ticker. See Rarebird’s current stance, market evidence, risks, and what would change the view." };

export default async function AskPage({ searchParams }: { searchParams: Promise<{ ticker?: string; beat_id?: string }> }) {
  const params = await searchParams;
  const ticker = typeof params.ticker === "string" && /^\$?[A-Za-z0-9][A-Za-z0-9.-]{0,19}$/.test(params.ticker) ? params.ticker.toUpperCase() : "";
  const beatId = typeof params.beat_id === "string" && /^b_[0-9a-f]{12}$/.test(params.beat_id) ? params.beat_id : undefined;
  return <>
    <SiteNav active="/ask" />
    <main className="investment-page">
      <div className="investment-shell">
        <h1>Ask Rarebird about a ticker.</h1>
        <p className="investment-lead">See the case for investing, what could go wrong, and whether the evidence supports a closer look today.</p>
        <InvestmentLookup initialTicker={ticker} initialBeat={beatId} />
        <nav className="investment-links" aria-label="Other ways to use Rarebird"><a href="/docs/quickstart">Connect your agent</a><a href="/docs/connect#telegram">Use Rarebird in Telegram</a><a href="/docs/try">Ask an open-ended question</a></nav>
      </div>
    </main>
    <SiteFooter />
  </>;
}
