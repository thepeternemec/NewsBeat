import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, Code2 } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import BrandMark, { BrandWordmark } from "@/components/site/brand-mark";
import MarketPerspective from "@/components/site/market-perspective";
import "./rarebird-home.css";

const TITLE = "Rarebird — Find your edge. In either direction.";
const DESCRIPTION = "Market intelligence for rising and falling markets. Explore developments, weigh the evidence and understand what could change the outlook with Rarebird.";
const REPO = "https://github.com/thepeternemec/NewsBeat";

export const metadata = {
  title: TITLE, description: DESCRIPTION,
  alternates: { canonical: "https://www.newsbeat.dev" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://www.newsbeat.dev", siteName: "Rarebird", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const CAPABILITIES = [
  { number: "01", title: "Find what deserves your attention.", description: "Follow new developments across 2,030 stocks and crypto assets. See the original source, when it appeared and what needs checking next.", tag: "Market discovery", href: "/intelligence#discovery", action: "Explore market checks" },
  { number: "02", title: "Build a view. Know what could break it.", description: "Research a ticker and weigh the supporting evidence, the risks and the unknowns. Get a clear next check, including when the evidence says to wait.", tag: "Ticker intelligence", href: "/ask", action: "Research an asset" },
  { number: "03", title: "Hold the forecast accountable.", description: "Inspect hourly Bitcoin and Ethereum forecasts, then see how they compare with actual outcomes and a historical baseline. Experimental forecasts, with the scorecard open.", tag: "Forecasts & outcomes", href: "/app/forecasts", action: "See the scorecard" },
];

export default function Home() {
  return <>
    <SiteNav active="/" />
    <main className="rb-home">
      <section className="rb-home-hero rb-home-width" id="top" aria-labelledby="home-title">
        <div className="rb-home-hero-copy">
          <p className="rb-home-eyebrow"><span className="rb-home-dot" /> Intelligence for every market</p>
          <h1 id="home-title">Find your edge.<br /><span>In either<br className="rb-home-desktop-break" /> direction.</span></h1>
          <p className="rb-home-lede">When markets rise, find the substance.<br />When markets fall, see the bigger picture.<br />Make your next move with evidence.</p>
          <div className="rb-home-actions">
            <a className="rb-home-button" href="/app">Explore Rarebird <ArrowUpRight size={19} aria-hidden="true" /></a>
            <a className="rb-home-text-link" href="#market-perspective">Discover your edge <ArrowRight size={17} aria-hidden="true" /></a>
          </div>
          <p className="rb-home-access">Free early access <span aria-hidden="true">/</span> Built for people and AI agents</p>
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
          <span className="rb-home-art-caption">A wider perspective. A clearer next move.</span>
        </div>
      </section>

      <div className="rb-home-proof rb-home-width" aria-label="Inside Rarebird">
        <span>One intelligence layer.</span>
        <p>Market discovery <i /> Source evidence <i /> Risk context <i /> AI agents</p>
      </div>

      <section className="rb-home-section rb-home-width" id="market-perspective" aria-labelledby="perspective-title">
        <header className="rb-home-section-heading">
          <p className="rb-home-eyebrow">01 / A wider perspective</p>
          <h2 id="perspective-title">The market changes.<br /><span>Your thinking should, too.</span></h2>
          <p>A rally, a sell-off, a market going nowhere. Each calls for a different question. Rarebird gives you the tools to investigate it.</p>
        </header>
        <MarketPerspective />
      </section>

      <section className="rb-home-section rb-home-capabilities" id="connect-agent" aria-labelledby="tools-title">
        <div className="rb-home-width">
          <header className="rb-home-section-heading">
            <p className="rb-home-eyebrow">02 / From noise to a point of view</p>
            <h2 id="tools-title">An advantage you<br /><span>can investigate.</span></h2>
          </header>
          <div className="rb-home-capability-list">
            {CAPABILITIES.map(item => <article className="rb-home-capability" key={item.number}>
              <span className="rb-home-capability-number" aria-hidden="true">{item.number}</span>
              <div><p className="rb-home-eyebrow">{item.tag}</p><h3>{item.title}</h3></div>
              <div><p>{item.description}</p><a className="rb-home-text-link" href={item.href}>{item.action} <ArrowUpRight size={17} aria-hidden="true" /></a></div>
            </article>)}
          </div>
        </div>
      </section>

      <section className="rb-home-section rb-home-width rb-home-agent" id="agent-workflow" aria-labelledby="agent-title">
        <div className="rb-home-agent-copy">
          <p className="rb-home-eyebrow">03 / Your intelligence. Everywhere.</p>
          <h2 id="agent-title">One research layer.<br /><span>You and your agent.</span></h2>
          <p>Explore in the app. Bring the same research tools to your AI assistant through MCP or API. Use ticker briefs in configured Telegram groups.</p>
          <a className="rb-home-button rb-home-button-outline" href="/docs/quickstart">Connect your agent <ArrowUpRight size={18} aria-hidden="true" /></a>
          <a className="rb-home-text-link" href="/docs/connect#telegram">Set up Telegram <ArrowUpRight size={15} aria-hidden="true" /></a>
        </div>
        <div className="rb-home-research-note">
          <div className="rb-home-note-top"><Code2 size={18} aria-hidden="true" /><span>The research brief</span><span>MCP / API / APP</span></div>
          <h3>What would change<br />the outlook for Bitcoin?</h3>
          <p>Inside a Rarebird answer</p>
          <ul>{["The current view and its evidence", "Supporting and opposing developments", "Missing data and uncertainty", "What to check next"].map(item => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}</ul>
          <a href="/ask?ticker=BTC">Open Bitcoin research <ArrowUpRight size={17} aria-hidden="true" /></a>
        </div>
      </section>

      <section className="rb-home-build rb-home-width" id="build-history" aria-labelledby="build-title">
        <div><p className="rb-home-eyebrow">Built in the open</p><h2 id="build-title">The work is there to see.</h2><p>Open-source code. Published methodology. Forecast scorecards. Follow how Rarebird is built and help shape what comes next.</p></div>
        <nav aria-label="Open-source project"><a href={REPO}>Explore the code <ArrowUpRight size={17} aria-hidden="true" /></a><a href={REPO + "/commits/main/"}>See the build history <ArrowUpRight size={17} aria-hidden="true" /></a><a href="/docs/intelligence">Read the methodology <ArrowUpRight size={17} aria-hidden="true" /></a></nav>
      </section>

      <section className="rb-home-close rb-home-width" id="community" aria-labelledby="closing-title">
        <p className="rb-home-eyebrow">Stay curious. Move with context.</p>
        <h2 id="closing-title">Up. Down.<br /><span>Eyes open.</span></h2>
        <a className="rb-home-button" href="/app">Find your next perspective <ArrowUpRight size={19} aria-hidden="true" /></a>
        <div className="rb-home-signature" role="img" aria-label="Rarebird"><BrandWordmark width={1040} /></div>
      </section>
    </main>
    <SiteFooter />
  </>;
}
