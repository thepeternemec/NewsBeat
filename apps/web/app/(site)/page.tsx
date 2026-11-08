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

const DESCRIPTION = "NewsBeat connects reporting with available market evidence so your AI agent can explain what changed, what could matter and what to check next.";
const TITLE = "NewsBeat — Meaningful signals for AI agents";
export const metadata = {
  title: TITLE, description: DESCRIPTION,
  alternates: { canonical: "https://www.newsbeat.dev" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://www.newsbeat.dev", siteName: "NewsBeat", type: "website" },
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
            <span className="bs-kicker"><span /> MARKET INTELLIGENCE FOR YOUR AGENT</span>
            <h1><span className="nb-headline-line" data-hero-line>Connect the dots.</span><span className="nb-headline-line nb-headline-muted" data-hero-line>See the bigger picture.</span></h1>
            <p className="bs-lede">NewsBeat connects reporting with market evidence so your agent can explain what changed, why it could matter, and whether to investigate now or wait.</p>
            <div className="hero-cta">
              <a className="btn-primary" href="/docs/try">Try a question <ArrowRight size={16} /></a>
              <a className="bs-text-link" href="/for-agents">Connect your agent <ArrowUpRight size={16} /></a>
            </div>
            <p className="nb-home-cadence">News archive · 10-minute checks <span aria-hidden="true">/</span> <a href="/for-agents#collection">1-minute checks on request <ArrowUpRight size={12} /></a></p>
            <p className="ni-stage-note">Stocks + crypto · Evidence + context · MCP + API</p>
            <a className="nb-flow-cue" href="#agent-workflow"><span aria-hidden="true" /> See how the picture comes together <ArrowRight size={13} aria-hidden="true" /></a>
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
            <p>Choose an asset. Follow a reported change, see the market context and explore the reason to review, wait or reassess. The reasoning and numbers open when you want them.</p>
          </div>
          <LandingLiveSignal />
        </div>
      </section>

      <section className="home-story-section home-agent-section" id="connect-agent" aria-labelledby="home-agent-title">
        <div className="wrap home-agent-layout">
          <div className="home-agent-copy" data-story-reveal>
            <span className="home-story-eyebrow">04 / YOUR AGENT</span>
            <h2 id="home-agent-title">Bring the whole picture<br /><span>into the conversation.</span></h2>
            <p>NewsBeat brings the evidence and its limits into the assistant you already use. Ask a stock or crypto question in your own words.</p>
            <ol className="home-connect-steps">
              <li><span>1</span><div><strong>Add NewsBeat.</strong><p>One connection through MCP or REST.</p></div></li>
              <li><span>2</span><div><strong>Ask what matters to you.</strong><p>A company, a move, a change in the story.</p></div></li>
              <li><span>3</span><div><strong>Follow the next check.</strong><p>Keep the sources, context and open questions together.</p></div></li>
            </ol>
            <a className="home-story-link" href="/docs/quickstart">Connect your agent <ArrowUpRight size={17} /></a>
          </div>
          <figure className="home-agent-visual" data-story-reveal>
            <span className="home-story-eyebrow">A QUESTION, IN YOUR OWN WORDS</span>
            <blockquote>“What changed with NVIDIA—and what should I look at next?”</blockquote>
            <div className="home-agent-handoff" aria-hidden="true"><BrandMark size={62} /><span><i /></span><div><Bot size={32} /></div></div>
            <span className="home-agent-payload-label">WHAT NEWSBEAT CAN BRING TO THE ANSWER</span>
            <div className="home-agent-payload"><span><FileText size={17} /> The reported change</span><span><ScanLine size={17} /> Available market evidence</span><span><HelpCircle size={17} /> What’s still uncertain</span><span><Check size={17} /> An observable next check</span></div>
            <figcaption>The context travels with the answer.</figcaption>
          </figure>
          <div className="home-connect-endpoint"><span>MCP connection</span><code>https://www.newsbeat.dev/api/mcp</code><CopyButton text="https://www.newsbeat.dev/api/mcp" label="Copy address" /></div>
        </div>
      </section>

      <section className="bs-closing" id="community" aria-labelledby="closing-title">
        <div className="wrap">
          <span className="bs-kicker">NEWSBEAT / AGENT INTELLIGENCE</span>
          <h2 id="closing-title">Your next question.<br />A clearer starting point.</h2>
          <div className="hero-cta"><a className="btn-primary" href="/docs/try">Try a question <ArrowRight size={16} /></a><a className="bs-text-link" href="/for-agents">Connect your agent <ArrowUpRight size={15} /></a></div>
          <p className="bs-closing-fine">Evidence you can follow. Uncertainty you can see. A next check you can use.</p>
        </div>
      </section>
    </main>
    <SiteFooter />
  </>;
}
