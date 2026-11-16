import { ArrowRight, ArrowUpRight } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import MarketDiscovery from "@/components/site/market-discovery";
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

const DESCRIPTION = "Open-source market intelligence for AI agents. Track 2,030 stocks and crypto assets, check the evidence and see what’s worth investigating.";
const TITLE = "Rarebird — See what just changed";
export const metadata = {
  title: TITLE, description: DESCRIPTION,
  alternates: { canonical: "https://www.newsbeat.dev" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://www.newsbeat.dev", siteName: "Rarebird", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const REPO = "https://github.com/thepeternemec/NewsBeat";

const MILESTONES = [
  {
    title: "From headlines to sourced answers",
    question: "What changed, and where’s the evidence?",
    detail: "Ask by ticker and get a cited brief with what still needs checking. Rarebird marks gaps when market data or evidence is missing.",
    pullRequest: 121,
    linkLabel: "Ticker briefs and Telegram",
  },
  {
    title: "Scan the market before anyone asks",
    question: "What’s worth looking at right now?",
    detail: "The live feed watches 2,030 stocks and crypto assets. It shows the source time, first-recorded time, and what to check next.",
    pullRequest: 131,
    linkLabel: "Catalog-wide discovery",
  },
  {
    title: "Identify the token by contract",
    question: "Am I looking at the right token?",
    detail: "Resolve a token by chain and contract. See pool observations alongside a separate view of issuer evidence where available.",
    pullRequest: 125,
    linkLabel: "Token intelligence",
  },
  {
    title: "Score forecasts against outcomes",
    question: "How do I know the forecast is useful?",
    detail: "Hourly BTC and ETH move-risk estimates show the historical base rate and are evaluated when the target hour closes.",
    pullRequest: 130,
    linkLabel: "Forecasts and evaluation",
  },
];

export default function Home() {
  return <>
    <SiteNav active="/" />
    <main className="landing-home bs-home nb-home ni-home rb-focus-home">
      <LandingMotion />
      <section className="bs-hero" id="top">
        <div className="wrap bs-hero-grid">
          <div className="bs-hero-copy">
            <span className="bs-kicker"><span /> Market discovery across 2,030 assets</span>
            <h1 id="home-title"><span className="nb-headline-line" data-hero-line>See what</span><span className="nb-headline-line nb-headline-muted" data-hero-line>just changed.</span></h1>
            <p className="bs-lede">Rarebird scans for earnings, guidance changes, deals and market disruptions across stocks and crypto. See the evidence and when Rarebird first recorded it.</p>
            <div className="hero-cta">
              <a className="btn-primary" href="#real-intelligence">Open live discovery <ArrowRight size={16} aria-hidden="true" /></a>
              <a className="bs-text-link" href="#build-history">Explore the open-source project <ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
          <div className="ni-hero-model nb-live-stage" id="real-intelligence">
            <span className="nb-live-stage-orbit" aria-hidden="true" />
            <MarketDiscovery compact />
          </div>
        </div>
      </section>

      <section className="wrap rb-focus-method" id="agent-workflow" aria-labelledby="workflow-title">
        <h2 id="workflow-title">How Rarebird flags a development</h2>
        <dl>
          <div><dt>Match the asset</dt><dd>Check the name and context before attaching a report to a stock or token.</dd></div>
          <div id="market-timing"><dt>Record the timing</dt><dd>See when a source published and when Rarebird first recorded the development.</dd></div>
          <div><dt>Follow the evidence</dt><dd>Open the report or filing and see the next check for that type of development.</dd></div>
        </dl>
        <p>News discovery covers the full catalog. Direct SEC filing checks cover four pilot issuers.</p>
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

      <section className="wrap rb-focus-history" id="build-history" aria-labelledby="history-title">
        <header>
          <p className="rb-history-launch">Live preview · Public launch planned for late November 2026</p>
          <h2 id="history-title">Built in the open, shaped by users.</h2>
          <p>Rarebird’s MIT-licensed code and 50+ merged pull requests show how it grew from a news feed into a market intelligence system for AI agents.</p>
          <nav aria-label="Open-source project">
            <a href={REPO}>View source <ArrowUpRight size={15} aria-hidden="true" /></a>
            <a href={REPO + "/commits/main/"}>Commit history <ArrowUpRight size={15} aria-hidden="true" /></a>
            <a href={REPO + "/issues/new/choose"}>Request a feature <ArrowUpRight size={15} aria-hidden="true" /></a>
          </nav>
        </header>
        <ul>
          {MILESTONES.map((milestone) => (
            <li key={milestone.pullRequest}>
              <p className="rb-history-question">{milestone.question}</p>
              <h3>{milestone.title}</h3>
              <p>{milestone.detail}</p>
              <a href={REPO + "/pull/" + milestone.pullRequest}>{milestone.linkLabel} <ArrowUpRight size={14} aria-hidden="true" /></a>
            </li>
          ))}
        </ul>
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
