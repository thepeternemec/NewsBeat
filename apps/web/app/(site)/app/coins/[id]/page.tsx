import { notFound } from "next/navigation";
import WorkspaceShell from "@/components/site/workspace-shell";
import { CryptoCoinDetail } from "@/components/site/crypto-market-board";

export const metadata = {
  title: "Coin price and evidence | Rarebird",
  description: "Check a coin’s market snapshot, 7-day price history and source-linked news.",
};

export default async function CoinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(id)) notFound();
  return <WorkspaceShell active="/app">
    <CryptoCoinDetail id={id} />
  </WorkspaceShell>;
}
