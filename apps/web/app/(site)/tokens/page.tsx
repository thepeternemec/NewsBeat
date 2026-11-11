import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import TokenLookup from "@/components/site/token-lookup";
import { parseTokenAsset } from "@newsbeat/contracts";

export const metadata = {
  title: "Token intelligence | Rarebird",
  description: "Look up a token by chain and contract. Compare DEX pools and check issuer records and company reporting for supported tokenized stocks.",
  alternates: { canonical: "/tokens" },
};

export default async function TokensPage({ searchParams }: { searchParams: Promise<{ asset?: string }> }) {
  const { asset } = await searchParams;
  const initial = typeof asset === "string" ? parseTokenAsset(asset) : null;
  return <>
    <SiteNav active="/tokens" />
    <main className="token-page">
      <div className="token-shell">
        <header className="token-header">
          <p className="token-eyebrow">Token intelligence</p>
          <h1>Start with the contract.</h1>
          <p>See where a token trades, how much liquidity each pool reports, and which underlying company it tracks when the issuer record matches.</p>
        </header>
        <TokenLookup initial={initial} />
        <nav className="token-links" aria-label="More research tools">
          <a href="/ask">Research a stock or crypto ticker</a>
          <a href="/docs/connect#token-intelligence">Use token intelligence in your agent</a>
        </nav>
      </div>
    </main>
    <SiteFooter />
  </>;
}
