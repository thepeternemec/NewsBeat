import { ArrowDownRight, ArrowRight, ArrowUpRight, Bot, Search, Terminal } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import BrandMark, { BrandWordmark } from "@/components/site/brand-mark";
import MarketPerspective from "@/components/site/market-perspective";
import SignalGraph from "@/components/site/signal-graph";
import { EARLY_ACCESS_END } from "@/components/site/access-offer";
import "./rarebird-home.css";

const TITLE = "Rarebird — Market intelligence for stocks and crypto";
const DESCRIPTION = "Follow fresh market developments, research tickers and see what could change the outlook. Use the Rarebird app or connect your AI agent.";
const REPO = "https://github.com/thepeternemec/rarebird";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/", siteName: "Rarebird", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const RESEARCH_PATHS = [
  {
    name: "Market timing",
    title: "See what deserves a closer look.",
    description: "Follow new developments across 2,030 stocks and crypto assets. See when a source published, when Rarebird picked it up, and what to check next.",
    href: "/intelligence#discovery",
    action: "Explore market checks",
  },
  {
    name: "Risk research",
    title: "Know what could change your view.",
    description: "Ask about any covered ticker. See the supporting evidence, the risks and the missing information. Market measurements are included where available.",
    href: "/ask",
    action: "Research a ticker",
  },
  {
    name: "Forecasts and outcomes",
    title: "See how forecasts actually performed.",
    description: "Inspect experimental hourly Bitcoin and Ethereum forecasts, then compare the results with a historical baseline.",
    href: "/app/forecasts",
    action: "See the scorecard",
  },
];

export default function Home() {
  return <>
    <SiteNav active="/" />
    <main className="rb-home">
      <section className="rb-home-hero rb-home-width" id="top" aria-labelledby="home-title">
        <div className="rb-home-hero-copy">
          <p className="rb-home-eyebrow"><span className="rb-home-dot" /> Market intelligence for stocks and crypto</p>
          <h1 id="home-title">Find your edge.<br /><span>In either<br className="rb-home-desktop-break" /> direction.</span></h1>
          <p className="rb-home-lede">Rarebird follows the market as it moves. See what changed, trace it to the source, and know what to check before your next decision.</p>
          <div className="rb-home-actions">
            <a className="rb-home-button" href="/app">Open the app <ArrowUpRight size={19} aria-hidden="true" /></a>
            <a className="rb-home-text-link" href="/for-agents">Connect your agent <ArrowRight size={17} aria-hidden="true" /></a>
          </div>
          <p className="rb-home-access">App and agent free through {EARLY_ACCESS_END}.</p>
          <a className="rb-home-text-link rb-home-graph-link" href="#signal-graph">Explore the signal graph <ArrowRight size={15} aria-hidden="true" /></a>
        </div>
        <div className="rb-home-sculpture" aria-hidden="true">
          <div className="rb-home-sculpture-grid" />
          <div className="rb-home-orbit rb-home-orbit-outer" />
          <div className="rb-home-orbit rb-home-orbit-inner" />
          <svg className="rb-home-paths" viewBox="0 0 560 560" fill="none">
            <path className="rb-home-path-shadow" d="M25 390 155 390 225 320 320 225 390 155 520 155" />
            <path className="rb-home-path-shadow" d="M25 170 155 170 225 240 320 335 390 405 520 405" />
            <path className="rb-home-path-up" d="M25 390 155 390 225 320 320 225 390 155 520 155" pathLength="1" />
            <path className="rb-home-path-down" d="M25 170 155 170 225 240 320 335 390 405 520 405" pathLength="1" />
            <path d="m508 143 12 12-12 12M508 393l12 12-12 12" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="25" cy="390" r="4" fill="currentColor" /><circle cx="25" cy="170" r="4" fill="currentColor" />
          </svg>
          <div className="rb-home-emblem"><BrandMark size={230} /></div>
          <span className="rb-home-direction rb-home-direction-up"><ArrowUpRight size={20} /> Find opportunity</span>
          <span className="rb-home-direction rb-home-direction-down"><ArrowDownRight size={20} /> Understand risk</span>
        </div>
      </section>

      <section className="rb-signal-section rb-home-width" id="signal-graph" aria-labelledby="signal-graph-title">
        <header className="rb-signal-heading">
          <div>
            <p className="rb-home-eyebrow">How Rarebird works</p>
            <h2 id="signal-graph-title">From anomaly to<br /><span>signal intelligence.</span></h2>
          </div>
          <p>See how unusual market activity and source evidence feed into the timing checks. Select a node to see what goes into a review and what Rarebird measures afterward.</p>
        </header>
        <SignalGraph />
      </section>

      <section className="rb-home-section rb-home-width rb-home-platform" id="agent-workflow" aria-labelledby="platform-title">
        <header className="rb-home-section-heading">
          <p className="rb-home-eyebrow">The app and the agent</p>
          <h2 id="platform-title">One view of the market.<br /><span>Two ways to work.</span></h2>
        </header>
        <div className="rb-home-product-grid">
          <article className="rb-home-product-card">
            <Terminal size={24} strokeWidth={1.4} aria-hidden="true" />
            <h3>Open the workspace</h3>
            <p>Start with what changed across stocks and crypto. Research an asset, inspect the evidence, or check the forecast scorecard.</p>
            <a className="rb-home-text-link" href="/app">Explore the app <ArrowUpRight size={17} aria-hidden="true" /></a>
          </article>
          <article className="rb-home-product-card">
            <Bot size={24} strokeWidth={1.4} aria-hidden="true" />
            <h3>Ask through your agent</h3>
            <p>Connect a compatible AI assistant through MCP and ask in your own words. Get reporting, market checks and open questions in the answer.</p>
            <a className="rb-home-text-link" href="/docs/quickstart">Set up the agent <ArrowUpRight size={17} aria-hidden="true" /></a>
          </article>
        </div>
        <p className="rb-home-offer">Both are included in Rarebird Pro. <a href="/pricing">See pricing <ArrowRight size={15} aria-hidden="true" /></a></p>
      </section>

      <section className="rb-home-section rb-home-capabilities" id="connect-agent" aria-labelledby="tools-title">
        <div className="rb-home-width">
          <header className="rb-home-section-heading">
            <p className="rb-home-eyebrow">Evidence you can inspect</p>
            <h2 id="tools-title">From market move<br /><span>to informed decision.</span></h2>
          </header>
          <div className="rb-home-capability-list">
            {RESEARCH_PATHS.map(item => <article className="rb-home-capability" key={item.href}>
              <div><p className="rb-home-eyebrow">{item.name}</p><h3>{item.title}</h3></div>
              <div><p>{item.description}</p><a className="rb-home-text-link" href={item.href}>{item.action} <ArrowUpRight size={17} aria-hidden="true" /></a></div>
            </article>)}
          </div>
          <p className="rb-home-roadmap"><strong>In development.</strong> Portfolio risk and position sizing based on your loss limits, liquidity and existing exposure.</p>
        </div>
      </section>

      <section className="rb-home-section rb-home-width" id="market-perspective" aria-labelledby="perspective-title">
        <header className="rb-home-section-heading">
          <p className="rb-home-eyebrow">The research playbook</p>
          <h2 id="perspective-title">The market changes.<br /><span>So does the next question.</span></h2>
        </header>
        <MarketPerspective />
      </section>

      <section className="rb-home-build rb-home-width" id="build-history" aria-labelledby="build-title">
        <div><p className="rb-home-eyebrow">Built in the open</p><h2 id="build-title">Check how it works.</h2><p>Inspect the source code, see how we measure forecasts, and follow the work as it ships.</p></div>
        <nav aria-label="Open-source project"><a href={REPO}>Explore the code <ArrowUpRight size={17} aria-hidden="true" /></a><a href={REPO + "/commits/main/"}>See the build history <ArrowUpRight size={17} aria-hidden="true" /></a><a href="/docs/intelligence">Read the methodology <ArrowUpRight size={17} aria-hidden="true" /></a></nav>
      </section>

      <section className="rb-home-close rb-home-width" id="community" aria-labelledby="closing-title">
        <h2 id="closing-title">What are you<br /><span>watching?</span></h2>
        <a className="rb-home-button" href="/ask">Research a stock or token <Search size={18} aria-hidden="true" /></a>
        <div className="rb-home-signature" role="img" aria-label="Rarebird"><BrandWordmark width={1040} /></div>
      </section>
    </main>
    <SiteFooter />
  </>;
}
