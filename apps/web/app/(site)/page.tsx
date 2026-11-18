import { SEED_BEATS } from "@rarebird/contracts";
import FeedWorkspace from "@/components/site/feed-workspace";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";

export const metadata = {
  title: "Rarebird — Market feeds for stocks and crypto",
  description: "Read checked market developments or follow a company or token for source-linked reporting and Rarebird analysis.",
  alternates: { canonical: "/" },
};

export default async function Home({ searchParams }: {
  searchParams: Promise<{ beat?: string; market?: string }>;
}) {
  const query = await searchParams;
  const beat = typeof query.beat === "string" ? SEED_BEATS.find(item => item.beat_id === query.beat) : undefined;
  const asset = beat ? { beat_id: beat.beat_id, label: beat.label, ticker: beat.ticker, asset: beat.asset ?? "equity" } : null;
  const market = query.market === "equity" || query.market === "crypto" ? query.market : "all";
  return <>
    <SiteNav active="/" />
    <FeedWorkspace key={asset?.beat_id ?? market} asset={asset} market={market} unknownAsset={Boolean(query.beat && !asset)} />
    <SiteFooter />
  </>;
}
