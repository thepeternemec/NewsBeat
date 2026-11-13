import { ArrowRight, ArrowUpRight } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import MarketBriefingCard from "@/components/site/market-briefing";
import LandingNewsLookup from "@/components/site/landing-news-lookup";
import LandingMotion from "@/components/site/landing-motion";
import "./landing.css";
import "./newsbeat.css";
import "./newsbeat-polish.css";
import "./intelligence.css";
import "./landing-cadence.css";
import "./landing-experience.css";
import "./home-story.css";
import "./briefing-home.css";

const DESCRIPTION = "Rarebird monitors selected crypto and tokenized stocks for developments worth investigating. Get the market evidence, source links, and a clear next check.";
const TITLE = "Rarebird — Know what’s worth watching";
export const metadata = {
  title: TITLE, description: DESCRIPTION,
  alternates: { canonical: "https://www.newsbeat.dev" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://www.newsbeat.dev", siteName: "Rarebird", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function Home() {
  return <>
    <SiteNav active="/" />
    <main className="landing-home bs-home nb-home ni-home rb-focus-home">
      <LandingMotion />
      <section className="bs-hero" id="top">
        <div className="wrap bs-hero-grid">
          <div className="bs-hero-copy">
            <span className="bs-kicker"><span /> Market intelligence for crypto and tokenized stocks</span>
            <h1 id="home-title"><span className="nb-headline-line" data-hero-line>Know what’s</span><span className="nb-headline-line nb-headline-muted" data-hero-line>worth watching.</span></h1>
            <p className="bs-lede">See Rarebird’s next-hour Bitcoin and Ethereum forecasts, the indicators behind them, and how past calls scored.</p>
            <div className="hero-cta">
              <a className="btn-primary" href="#real-intelligence">See the live forecast <ArrowRight size={16} aria-hidden="true" /></a>
              <a className="bs-text-link" href="/pricing#later">See the $8.99 plan <ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
          <div className="ni-hero-model nb-live-stage" id="real-intelligence">
            <span className="nb-live-stage-orbit" aria-hidden="true" />
            <MarketBriefingCard compact />
          </div>
        </div>
      </section>

      <section className="wrap rb-focus-method" id="agent-workflow" aria-labelledby="workflow-title">
        <h2 id="workflow-title">How a development earns your attention</h2>
        <dl>
          <div><dt>What changed</dt><dd>Read the original report or market observation and see when it appeared.</dd></div>
          <div id="market-timing"><dt>Why look now</dt><dd>Check whether the move is unusual and whether current market data supports a closer look.</dd></div>
          <div><dt>What to check next</dt><dd>See which evidence would strengthen the case or make it worth reassessing.</dd></div>
        </dl>
        <p>Market checks cover Bitcoin, Ethereum, and Kraken xStocks for NVIDIA, Apple, Microsoft, and Alphabet.</p>
      </section>

      <section className="wrap rb-focus-tools" id="connect-agent" aria-labelledby="tools-title">
        <h2 id="tools-title">Open the evidence</h2>
        <nav aria-label="Research tools">
          <a href="/intelligence#opportunities">Review candidates <ArrowUpRight size={15} aria-hidden="true" /></a>
          <a href="/crypto">Market data <ArrowUpRight size={15} aria-hidden="true" /></a>
          <a href="/tokens">Token contracts <ArrowUpRight size={15} aria-hidden="true" /></a>
          <a href="/ask">Ticker research <ArrowUpRight size={15} aria-hidden="true" /></a>
          <a href="/docs/quickstart">Connect an agent <ArrowUpRight size={15} aria-hidden="true" /></a>
        </nav>
        <details className="rb-brief-search"><summary>Search stock and crypto news</summary><LandingNewsLookup /></details>
      </section>

      <section className="wrap rb-focus-pricing" id="community" aria-labelledby="closing-title">
        <div>
          <h2 id="closing-title">Rarebird Pro</h2>
          <p>For traders who want one place to check what changed and follow the evidence.</p>
        </div>
        <a className="btn-primary" href="/pricing#later">See the $8.99 plan <ArrowRight size={16} aria-hidden="true" /></a>
      </section>
    </main>
    <SiteFooter />
  </>;
}
