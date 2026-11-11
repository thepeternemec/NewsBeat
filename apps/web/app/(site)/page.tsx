import { ArrowRight, ArrowUpRight, Bot, Check, FileText, HelpCircle, ScanLine } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import LandingNewsLookup from "@/components/site/landing-news-lookup";
import LandingClarity from "@/components/site/landing-clarity";
import LandingMotion from "@/components/site/landing-motion";
import LandingChapters from "@/components/site/landing-chapters";
import LandingTiming from "@/components/site/landing-timing";
import LandingLiveSignal from "@/components/site/landing-live-signal";
import BrandMark from "@/components/site/brand-mark";
import CopyButton from "@/components/site/copy-button";
import "./landing.css";
import "./newsbeat.css";
import "./crypto-community.css";
import "./newsbeat-polish.css";
import "./intelligence.css";
import "./landing-cadence.css";
import "./landing-experience.css";
import "./home-story.css";

const DESCRIPTION = "Connect Rarebird to your AI agent for fresh crypto and stock news, source links, and market context. Try a live ticker brief for free.";
const TITLE = "Rarebird — The story behind the market move";
export const metadata = {
  title: TITLE, description: DESCRIPTION,
  alternates: { canonical: "https://www.newsbeat.dev" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://www.newsbeat.dev", siteName: "Rarebird", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function Home() {
  return <>
    <SiteNav active="/" />
    <main className="landing-home bs-home nb-home ni-home">
      <LandingMotion />
      <section className="bs-hero" id="top">
        <div className="wrap bs-hero-grid">
          <div className="bs-hero-copy">
            <span className="bs-kicker"><span /> CRYPTO + STOCK RESEARCH FOR YOUR AGENT</span>
            <h1><span className="nb-headline-line" data-hero-line>The market moved.</span><span className="nb-headline-line nb-headline-muted" data-hero-line>Know what changed.</span></h1>
            <p className="bs-lede">Give your AI agent fresh crypto and stock news, links to the evidence, and market context before your next trade.</p>
            <div className="hero-cta">
              <a className="btn-primary" href="/docs/quickstart">Add Rarebird to your agent <ArrowRight size={16} aria-hidden="true" /></a>
              <a className="bs-text-link" href="/ask">Try a live brief <ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
            <p className="nb-home-cadence">Free public access · No API key · Compatible MCP apps</p>
            <p className="ni-stage-note">Trade on fomo, Robinhood, or elsewhere? <a href="/tokens">Check a token by contract</a>.</p>
            <a className="nb-flow-cue" href="#agent-workflow"><span aria-hidden="true" /> See how Rarebird checks a move <ArrowRight size={13} aria-hidden="true" /></a>
          </div>
          <div className="ni-hero-model nb-live-stage"><span className="nb-live-stage-orbit" aria-hidden="true" /><LandingNewsLookup /></div>
        </div>
      </section>

      <LandingChapters />

      <section className="bs-crypto" id="agent-workflow" aria-labelledby="workflow-title">
        <div className="wrap">
          <div className="bs-crypto-head">
            <div><span className="bs-kicker">01 / INTELLIGENCE</span><h2 id="workflow-title">The story is bigger<br /><span>than the headline.</span></h2></div>
            <div className="bs-crypto-intro"><p>Bring the reported change, its sources and the open questions into one view. Your agent can follow the reasoning and see what could change it.</p><a className="bs-text-link" href="#market-timing">Next, read the market <ArrowRight size={17} /></a></div>
          </div>
          <LandingClarity />
          <p className="nb-coverage-scope">News research across 2,030 stock and crypto assets. Measured market checks are currently a six-asset pilot.</p>
        </div>
      </section>

      <section className="home-story-section home-timing-section" id="market-timing" aria-labelledby="timing-title">
        <div className="wrap">
          <div className="home-story-heading" data-story-reveal>
            <span className="home-story-eyebrow">02 / TIMING</span>
            <h2 id="timing-title">Understand the move.<br /><span>Then read the timing.</span></h2>
            <p>The pilot checks how an asset is moving, whether the move has support and whether the evidence is still useful. A price change alone doesn’t answer all three.</p>
          </div>
          <LandingTiming />
          <p className="home-story-scope">Measured pilot: NVIDIA, Apple, Microsoft, Alphabet, Bitcoin and Ethereum. Stock observations use Kraken xStock markets.</p>
        </div>
      </section>

      <section className="home-story-section home-real-section" id="real-intelligence" aria-labelledby="home-real-title">
        <div className="wrap">
          <div className="home-story-heading home-story-centered" data-story-reveal>
            <span className="home-story-eyebrow">03 / IN PRACTICE</span>
            <h2 id="home-real-title">The story and the market.<br /><span>In the same picture.</span></h2>
            <p>Choose an asset. Follow a reported change, see the market context and explore the reason to review, wait or reassess.</p>
            <a className="home-story-link" href="/intelligence#opportunities">Open the opportunity brief <ArrowUpRight size={17} aria-hidden="true" /></a>
          </div>
          <LandingLiveSignal />
        </div>
      </section>

      <section className="home-story-section home-agent-section" id="connect-agent" aria-labelledby="home-agent-title">
        <div className="wrap home-agent-layout">
          <div className="home-agent-copy" data-story-reveal>
            <span className="home-story-eyebrow">04 / YOUR AGENT</span>
            <h2 id="home-agent-title">Connect once.<br /><span>Ask when it moves.</span></h2>
            <p>Add Rarebird to a compatible AI assistant and ask about the assets you follow.</p>
            <ol className="home-connect-steps">
              <li><span>1</span><div><strong>Add Rarebird.</strong><p>Paste the MCP address into your assistant’s connector settings.</p></div></li>
              <li><span>2</span><div><strong>Ask about a ticker.</strong><p>Start with a price move, a headline, or a risk you’re watching.</p></div></li>
              <li><span>3</span><div><strong>Check the evidence.</strong><p>Open the sources and see what could change the answer.</p></div></li>
            </ol>
            <a className="home-story-link" href="/docs/quickstart">Add Rarebird to your agent <ArrowUpRight size={17} aria-hidden="true" /></a>
          </div>
          <figure className="home-agent-visual" data-story-reveal>
            <span className="home-story-eyebrow">A QUESTION, IN YOUR OWN WORDS</span>
            <blockquote>“Use Rarebird. What could explain Bitcoin’s latest move, and what should I check next?”</blockquote>
            <div className="home-agent-handoff" aria-hidden="true"><BrandMark size={62} /><span><i /></span><div><Bot size={32} /></div></div>
            <span className="home-agent-payload-label">WHAT RAREBIRD CAN BRING TO THE ANSWER</span>
            <div className="home-agent-payload"><span><FileText size={17} /> The reported change</span><span><ScanLine size={17} /> Available market evidence</span><span><HelpCircle size={17} /> What’s still uncertain</span><span><Check size={17} /> An observable next check</span></div>
            <figcaption>The context travels with the answer.</figcaption>
          </figure>
          <div className="home-connect-endpoint"><span>MCP connection</span><code>https://www.newsbeat.dev/api/mcp</code><CopyButton text="https://www.newsbeat.dev/api/mcp" label="Copy address" /></div>
        </div>
      </section>

      <section className="bs-closing" id="community" aria-labelledby="closing-title">
        <div className="wrap">
          <h2 id="closing-title">Check the story<br />before your next trade.</h2>
          <div className="hero-cta"><a className="btn-primary" href="/docs/quickstart">Add Rarebird to your agent <ArrowRight size={16} aria-hidden="true" /></a><a className="bs-text-link" href="/ask">Try a live brief <ArrowUpRight size={15} aria-hidden="true" /></a></div>
          <p className="bs-closing-fine">Ask about a ticker. Get the sources and a next check.</p>
        </div>
      </section>
    </main>
    <SiteFooter />
  </>;
}
