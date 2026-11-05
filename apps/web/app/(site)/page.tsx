import { ArrowRight, ArrowUpRight, Code2 } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import IntelligenceModel from "@/components/site/intelligence-model";
import CryptoLoop from "@/components/site/crypto-loop";
import LandingMotion from "@/components/site/landing-motion";
import CopyButton from "@/components/site/copy-button";
import "./landing.css";
import "./newsbeat.css";
import "./crypto-community.css";
import "./newsbeat-polish.css";
import "./intelligence.css";

const DESCRIPTION = "NewsBeat constructs contextual signals for AI agents: potential market drivers, observable triggers and clear conditions for alerts across stocks and crypto.";
const TITLE = "NewsBeat — Meaningful signals for AI agents";
export const metadata = {
  title: TITLE, description: DESCRIPTION,
  alternates: { canonical: "https://www.newsbeat.dev" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://www.newsbeat.dev", siteName: "NewsBeat", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};
const MCP_URL = "https://www.newsbeat.dev/api/mcp";
const SIGNAL_QUESTIONS = [
  { number: "01", title: "What could move the market?", text: "Connect a development to demand, revenue, liquidity or risk. Explain the transmission mechanism and what remains unknown." },
  { number: "02", title: "What would trigger an alert?", text: "Set a context and an observable condition. Test relevance, materiality, freshness and new evidence before raising an alert." },
  { number: "03", title: "When should the view change?", text: "State what would invalidate the hypothesis, why the market may ignore it, and when the agent should keep watching or reassess." },
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
            <p className="bs-lede">Give your agent the reported change, why it could matter, and what to check next. NewsBeat connects news to market context so your agent can explain when to review, wait or reassess.</p>
            <div className="hero-cta">
              <a className="btn-primary" href="/docs/quickstart">Connect your agent <ArrowRight size={16} /></a>
              <a className="bs-text-link" href="/intelligence">See a real signal <ArrowRight size={16} /></a>
            </div>
            <p className="ni-stage-note">Stocks and crypto · MCP or API · No account needed.</p>
          </div>
          <div className="ni-hero-model"><IntelligenceModel /></div>
        </div>
      </section>

      <section className="ni-value-strip" aria-label="Principles for agent intelligence">
        <div className="wrap"><span>Notice what changed</span><span>Understand the context</span><span>Know what to check next</span></div>
      </section>

      <section className="scaffold" id="thesis">
        <div className="wrap">
          <div className="bs-section-head">
            <span className="bs-kicker">WHAT MAKES A SIGNAL USEFUL</span>
            <h2 className="bs-title">Construct the signal.<br />Test the context.</h2>
            <p className="bs-body">A signal needs a market hypothesis, supporting evidence and a condition worth acting on. Better context helps an agent decide when to pay attention and when to wait.</p>
          </div>
          <div className="bs-principles">{SIGNAL_QUESTIONS.map(item => <article key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
          <p className="ni-section-note">First pilot: six assets, three decision contexts and explicit review-alert conditions.</p>
        </div>
      </section>

      <section className="bs-crypto" id="agent-workflow" aria-labelledby="workflow-title">
        <div className="wrap">
          <div className="bs-crypto-head">
            <div><span className="bs-kicker">THE NEWS-TO-AGENT LOOP</span><h2 id="workflow-title">News comes in.<br /><span>Signals take shape.</span></h2></div>
            <div className="bs-crypto-intro"><p>Follow reporting into market context, then see a signal tested before it reaches an agent. Select a step to explore the construction.</p><a className="bs-text-link" href="/intelligence">Open the signal workbench <ArrowUpRight size={17} /></a></div>
          </div>
          <CryptoLoop />
        </div>
      </section>

      <section className="scaffold" id="intelligence">
        <div className="wrap ni-roadmap">
          <div className="bs-section-head">
            <span className="bs-kicker">WHERE NEWSBEAT IS GOING</span>
            <h2 className="bs-title">From context<br />to a decision.</h2>
            <p className="bs-body">A useful signal needs a fresh information delta, a market baseline and the right conditions. NewsBeat measures the response and records what follows each decision.</p>
            <a className="bs-text-link" href="/intelligence">Inspect the intelligence layer <ArrowUpRight size={16} /></a>
          </div>
          <div className="ni-roadmap-cards">
            <article><span className="ni-state">Live pilot</span><h3>Signals with explicit conditions.</h3><p>Market-impact hypotheses, observable triggers, invalidation and review alerts for NVIDIA, Apple, Microsoft, Alphabet, Bitcoin and Ethereum.</p></article>
            <article><span className="ni-state">Measured pilot</span><h3>Delta. Confirmation. Timing.</h3><p>Benchmark-adjusted moves, participation and liquidity checks. Developing, extended or fading—with a forward record to test the decision.</p></article>
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
