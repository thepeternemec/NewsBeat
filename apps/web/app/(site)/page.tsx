import { ArrowRight, ArrowUpRight, Code2 } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import NewsPreview from "@/components/site/news-preview";
import IntelligenceModel from "@/components/site/intelligence-model";
import LandingMotion from "@/components/site/landing-motion";
import CopyButton from "@/components/site/copy-button";
import "./landing.css";
import "./newsbeat.css";
import "./newsbeat-polish.css";
import "./intelligence.css";

const DESCRIPTION = "NewsBeat is building meaningful signals for AI agents: what changed, why it may matter, and what to investigate next. Source-linked news is the foundation.";
const TITLE = "NewsBeat — Meaningful signals for AI agents";
export const metadata = {
  title: TITLE, description: DESCRIPTION,
  alternates: { canonical: "https://www.newsbeat.dev" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://www.newsbeat.dev", siteName: "NewsBeat", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};
const MCP_URL = "https://www.newsbeat.dev/api/mcp";
const SIGNAL_QUESTIONS = [
  { number: "01", title: "What actually changed?", text: "Identify a reported development, preserve its sources, and distinguish new information from repeated coverage." },
  { number: "02", title: "Why might it matter?", text: "Connect the development to the entities, questions and decisions an agent is working on." },
  { number: "03", title: "What needs attention?", text: "Surface the evidence, possible implications, uncertainty and useful follow-up questions." },
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
            <p className="bs-lede">Help your agent understand what changed, why it may matter, and what deserves attention. NewsBeat is building an intelligence layer on top of source-linked market news.</p>
            <div className="hero-cta">
              <a className="btn-primary" href="/intelligence">Explore the direction <ArrowRight size={16} /></a>
              <a className="bs-text-link" href="/dashboard">Try the live feed <ArrowUpRight size={16} /></a>
            </div>
            <p className="ni-stage-note">The news foundation is live. Deeper signal intelligence is the next stage.</p>
          </div>
          <div className="ni-hero-model"><IntelligenceModel /></div>
        </div>
      </section>

      <section className="ni-value-strip" aria-label="Principles for agent intelligence">
        <div className="wrap"><span>Relevant to the task</span><span>Grounded in evidence</span><span>Clear about uncertainty</span></div>
      </section>

      <section className="scaffold" id="thesis">
        <div className="wrap">
          <div className="bs-section-head">
            <span className="bs-kicker">WHAT MAKES A SIGNAL USEFUL</span>
            <h2 className="bs-title">Context an agent<br />can reason with.</h2>
            <p className="bs-body">A meaningful signal connects a reported change to a question worth investigating. This is the intelligence we’re building toward.</p>
          </div>
          <div className="bs-principles">{SIGNAL_QUESTIONS.map(item => <article key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
          <p className="ni-section-note">Task-specific interpretation and implications are planned. Today’s summaries remain based on headlines.</p>
        </div>
      </section>

      <section className="scaffold bs-news-section" id="live-news">
        <div className="wrap bs-live-grid">
          <div>
            <span className="bs-kicker">THE FOUNDATION / AVAILABLE TODAY</span>
            <h2 className="bs-title">Start with<br />the evidence.</h2>
            <p className="bs-body">Explore recent reporting, grouped stories and changes since your agent’s last check. Every lookup keeps sources, timestamps and coverage freshness attached.</p>
            <p className="ni-coverage-note">Current coverage: stocks and crypto. News collection runs on a 15-minute schedule.</p>
            <a className="bs-text-link" href="/dashboard">Explore the news foundation <ArrowRight size={15} /></a>
          </div>
          <NewsPreview />
        </div>
      </section>

      <section className="scaffold" id="intelligence">
        <div className="wrap ni-roadmap">
          <div className="bs-section-head">
            <span className="bs-kicker">WHERE NEWSBEAT IS GOING</span>
            <h2 className="bs-title">From reporting<br />to understanding.</h2>
            <p className="bs-body">The feed supplies evidence. The next layer will help agents connect developments, assess their relevance and explain what to investigate next.</p>
            <a className="bs-text-link" href="/intelligence">Read the intelligence roadmap <ArrowUpRight size={16} /></a>
          </div>
          <div className="ni-roadmap-cards">
            <article><span className="ni-state">Available today</span><h3>A source-linked news foundation.</h3><p>Asset discovery, approximate story grouping, headline-based updates, freshness and change tracking.</p></article>
            <article><span className="ni-state ni-state-planned">Planned intelligence</span><h3>Meaningful signals for the task.</h3><p>Event context, connections across developments, relevance to an agent’s question, possible implications and explicit uncertainty.</p></article>
          </div>
        </div>
      </section>

      <section className="scaffold bs-build-section" id="build">
        <div className="wrap bs-build-grid">
          <div className="nb-connect-copy">
            <span className="bs-kicker"><Code2 size={13} /> BRING THE CONTEXT TO YOUR AGENT</span>
            <h2 className="bs-title">Keep your agent<br />in the loop.</h2>
            <p className="bs-body">Connect to the current news foundation through MCP or REST. Bring evidence into your agent’s workflow as NewsBeat develops the intelligence above it.</p>
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
          <p className="bs-closing-fine">Source-linked foundation today. Meaningful signal intelligence ahead.</p>
        </div>
      </section>
    </main>
    <SiteFooter />
  </>;
}
