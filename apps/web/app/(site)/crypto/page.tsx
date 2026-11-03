import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import InteriorPage from "@/components/site/interior-page";
import MarketPulse from "@/components/site/market-pulse";
import ChainPulseStrip from "@/components/site/chain-pulse";
import SignalsStrip from "@/components/site/signals-strip";

/**
 * Crypto has its own page.
 *
 * The dashboard is a news terminal, and it was carrying four polled panels above the
 * headlines — so the first thing a reader saw was market data, not the news they came for.
 * Those panels live here now, together, where the question is "what is the market doing"
 * rather than "what happened".
 *
 * Everything on this page is reference data with a visible source and age. None of it is a
 * forecast, and the copy says so on every panel.
 */

export const metadata: Metadata = {
  title: "Black Sheep crypto — market, chain and positioning",
  description:
    "Live crypto context: sentiment, DeFi TVL, prices, chain state, funding rates and stablecoin supply. Every figure carries its source, its fetch time and its freshness.",
  alternates: { canonical: "https://www.newsbeat.dev/crypto" },
};

const SOURCES = [
  { name: "CoinGecko", what: "prices, market caps, 24h change", cadence: "about a minute" },
  { name: "DefiLlama", what: "TVL, DEX volume, stablecoin supply, contract prices", cadence: "5–30 minutes" },
  { name: "alternative.me", what: "fear and greed index", cadence: "daily" },
  { name: "Binance / OKX", what: "perpetual funding, open interest", cadence: "continuous" },
  { name: "Public RPC", what: "Ethereum block and base fee, Solana slot", cadence: "~12 seconds" },
];

export default function CryptoPage() {
  return (
    <>
      <SiteNav active="/crypto" />

      <InteriorPage className="wrap crypto-page">
        <header className="crypto-hero">
          <span className="sec-eyebrow">Crypto context</span>
          <h1>The numbers behind the headline.</h1>
          <p>
            Every figure here carries its source, the time it was read and how long it stays good for.
            If a part is unavailable it says so rather than showing a zero.
          </p>
          <div className="crypto-hero-actions">
            <Link className="btn-primary" href="/dashboard">
              Read the news <ArrowRight size={15} />
            </Link>
            <Link className="bs-text-link" href="/docs/connect">
              Use the API
            </Link>
          </div>
        </header>

        <MarketPulse />
        <ChainPulseStrip />
        <SignalsStrip />

        <section className="crypto-sources" aria-labelledby="sources-title">
          <h2 id="sources-title">Where these numbers come from</h2>
          <p>
            Public endpoints, read through a cache, at a cadence chosen from how often each source
            actually changes. Nothing here is scraped from a paid terminal, and nothing is resold.
          </p>
          <div className="crypto-source-table">
            <div className="crypto-source-row is-head">
              <span>Source</span>
              <span>Provides</span>
              <span>Updates</span>
            </div>
            {SOURCES.map((source) => (
              <div className="crypto-source-row" key={source.name}>
                <span>{source.name}</span>
                <span>{source.what}</span>
                <span>{source.cadence}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="crypto-note" aria-label="What this is not">
          <h2>What this is not</h2>
          <ul>
            <li>Not a trading terminal: there are no charts drawn from our own ticks, and no orders.</li>
            <li>Not advice: a funding rate says what longs pay shorts, not where the price goes.</li>
            <li>Not real-time in the market-data sense: these are polled public endpoints, and each panel shows its own age.</li>
            <li>Not a wallet: nothing here reads a balance, quotes a swap, or sends anything to a node on your behalf.</li>
          </ul>
          <p>
            For the same data as tools, call <code>GET /api/v2/market</code>,{" "}
            <code>GET /api/v2/signals</code> or <code>GET /api/v2/chain</code>, or use{" "}
            <code>blacksheep_market</code>, <code>blacksheep_signals</code> and{" "}
            <code>blacksheep_chain</code> over MCP.
          </p>
        </section>
      </InteriorPage>

      <SiteFooter />
    </>
  );
}
