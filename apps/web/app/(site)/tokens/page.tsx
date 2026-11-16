import WorkspaceShell, { WorkspaceEvidence } from "@/components/site/workspace-shell";
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
  return <WorkspaceShell active="/tokens" title="Token contracts"
    description="Look up a token by chain and address. See where it trades, pool liquidity and the underlying stock when an issuer record matches.">
    <WorkspaceEvidence title="How Rarebird verifies a match">
      <p>Rarebird matches the chain and exact address to indexed pools and supported issuer records. Pool prices and liquidity have their own source and timestamp. Company news comes from a separate lookup.</p>
      <a href="/docs/connect#token-intelligence">Use token intelligence in your agent</a>
    </WorkspaceEvidence>
    <TokenLookup initial={initial} />
  </WorkspaceShell>;
}
