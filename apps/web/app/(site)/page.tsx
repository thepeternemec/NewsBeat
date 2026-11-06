import { ArrowRight, ArrowUpRight, Code2 } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import LandingNewsLookup from "@/components/site/landing-news-lookup";
import CryptoLoop from "@/components/site/crypto-loop";
import LandingMotion from "@/components/site/landing-motion";
import CopyButton from "@/components/site/copy-button";
import "./landing.css";
import "./newsbeat.css";
import "./crypto-community.css";
import "./newsbeat-polish.css";
import "./intelligence.css";
import "./landing-cadence.css";

const DESCRIPTION = "Stock and crypto context for AI agents. Explore a news archive collected every 10 minutes, with optional one-minute checks for priority assets.";
const TITLE = "NewsBeat — Meaningful signals for AI agents";
export const metadata = {
  title: TITLE, description: DESCRIPTION,
  alternates: { canonical: "https://www.newsbeat.dev" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://www.newsbeat.dev", siteName: "NewsBeat", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};
const MCP_URL = "https://www.newsbeat.dev/api/mcp";
const SIGNAL_QUESTIONS = [
  { number: "01", title: "What changed?", text: "Find the development behind the headlines, with its original reporting and the questions it leaves open." },
  { number: "02", title: "Does the market agree?", text: "Compare the story with observed market behavior. Look for an unusual move, supporting evidence or a reason to wait." },
  { number: "03", title: "What should your agent check next?", text: "Follow a clear condition for review, and understand what would strengthen or change the view." },
];

export default function Home() {
  return <>
    <SiteNav active="/" />
    <main className="landing-home bs-home nb-home ni-home">
      <LandingMotion />
      <section className="bs-hero" id="top">
        <div className="wrap bs-hero-grid">
          <div className="bs-hero-copy">
            <span className="bs-kicker"><span /> AGENT INTELLIGENCE</span>
            <h1>Meaningful signals.<br /><span>Built for agents.</span></h1>
            <p className="bs-lede">Give your agent a clearer view of stocks and crypto: what changed, what looks unusual, and what deserves a closer look.</p>
            <div className="hero-cta">
              <a className="btn-primary" href="/docs/quickstart">Connect your agent <ArrowRight size={16} /></a>
              <a className="bs-text-link" href="/intelligence">See a real signal <ArrowRight size={16} /></a>
            </div>
            <dl className="nb-collection-pace" aria-label="News collection options">
              <div><dt><span>SHARED NEWS ARCHIVE</span><strong>Every 10 minutes.</strong></dt><dd>We check the catalog for new reporting and add it to one searchable archive.</dd></div>
              <div><dt><span>WHEN YOU ASK</span><strong>Every minute.</strong></dt><dd>Request one-minute news checks for a priority asset. The session runs for 15 minutes, then stops automatically.</dd><a href="/intelligence#real-signal">Choose a priority asset <ArrowUpRight size={14} aria-hidden="true" /></a></div>
            </dl>
            <p className="nb-collection-note">One-minute requests cover news collection. Signal analysis follows its own schedule.</p>
            <p className="ni-stage-note">Stocks and crypto · MCP or API · No account needed.</p>
          </div>
          <div className="ni-hero-model"><LandingNewsLookup /></div>
        </div>
      </section>

      <section className="ni-value-strip" aria-label="Principles for agent intelligence">
        <div className="wrap"><span>Notice what changed</span><span>Understand the context</span><span>Know what to check next</span></div>
      </section>

      <section className="scaffold" id="thesis">
        <div className="wrap">
          <div className="bs-section-head">
            <span className="bs-kicker">WHAT MAKES A SIGNAL USEFUL</span>
            <h2 className="bs-title">See the change.<br />Understand the signal.</h2>
            <p className="bs-body">Reporting is the starting point. NewsBeat brings it together with market context, so your agent can explain what deserves attention and what still needs checking.</p>
          </div>
          <div className="bs-principles">{SIGNAL_QUESTIONS.map(item => <article key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
          <p className="ni-section-note">The intelligence pilot follows six assets, with clear reasons to review, keep watching or reassess.</p>
        </div>
      </section>

      <section className="bs-crypto" id="agent-workflow" aria-labelledby="workflow-title">
        <div className="wrap">
          <div className="bs-crypto-head">
            <div><span className="bs-kicker">THE NEWS-TO-AGENT LOOP</span><h2 id="workflow-title">News comes in.<br /><span>Signals take shape.</span></h2></div>
            <div className="bs-crypto-intro"><p>See how reporting becomes context your agent can use. Follow the evidence, explore the market checks and understand the next useful question.</p><a className="bs-text-link" href="/intelligence">Explore the intelligence layer <ArrowUpRight size={17} /></a></div>
          </div>
          <CryptoLoop />
        </div>
      </section>

      <section className="scaffold" id="intelligence">
        <div className="wrap ni-roadmap">
          <div className="bs-section-head">
            <span className="bs-kicker">WHERE NEWSBEAT IS GOING</span>
            <h2 className="bs-title">From context<br />to a decision.</h2>
            <p className="bs-body">Notice new information. Compare it with market behavior. Record what happens next. Each step helps us test whether a signal was useful.</p>
            <a className="bs-text-link" href="/intelligence">Inspect the intelligence layer <ArrowUpRight size={16} /></a>
          </div>
          <div className="ni-roadmap-cards">
            <article><span className="ni-state">Live pilot</span><h3>A reason to pay attention.</h3><p>Understand why a development could matter, what needs confirming and what would change the view. Available for NVIDIA, Apple, Microsoft, Alphabet, Bitcoin and Ethereum.</p></article>
            <article><span className="ni-state">Measured pilot</span><h3>Delta. Confirmation. Timing.</h3><p>Look for unusual moves, check market participation and follow whether a move develops or fades. Keep a record to test the interpretation over time.</p></article>
          </div>
        </div>
      </section>

      <section className="scaffold bs-build-section" id="build">
        <div className="wrap bs-build-grid">
          <div className="nb-connect-copy">
            <span className="bs-kicker"><Code2 size={13} /> BRING THE CONTEXT TO YOUR AGENT</span>
            <h2 className="bs-title">Keep your agent<br />in the loop.</h2>
            <p className="bs-body">Bring the reported change, the market context and the next useful question into your agent’s answers. Connect through MCP or API and ask in your own words.</p>
            <div className="bs-build-links"><a className="btn-primary" href="/docs/quickstart">Connect your agent <ArrowRight size={15} /></a><a className="bs-text-link" href="/docs">Developer docs <ArrowUpRight size={15} /></a></div>
          </div>
          <div className="ni-connect-panel">
            <span className="ni-state">Available today</span>
            <h3>One connection.<br />Source-linked context.</h3>
            <div className="code"><div className="code-bar">MCP ENDPOINT <CopyButton text={MCP_URL} label="Copy" /></div><pre>{MCP_URL}</pre></div>
            <p>Free public access during early access. No account or API key needed.</p>
          </div>
        </div>
      </section>

      <section className="bs-closing" id="community" aria-labelledby="closing-title">
        <div className="wrap">
          <span className="bs-kicker">NEWSBEAT / AGENT INTELLIGENCE</span>
          <h2 id="closing-title">Build agents<br />that stay informed.</h2>
          <div className="hero-cta"><a className="btn-primary" href="/docs/quickstart">Connect to NewsBeat <ArrowRight size={16} /></a><a className="bs-text-link" href="https://github.com/thepeternemec/NewsBeat" target="_blank" rel="noopener noreferrer">Follow the build <ArrowUpRight size={15} /></a></div>
          <p className="bs-closing-fine">Signal construction · Contextual review alerts · MCP + REST</p>
        </div>
      </section>
    </main>
    <SiteFooter />
  </>;
}
