import Image from "next/image";
import { ArrowRight, ArrowUpRight, Check, Radio, Network, Code2, FileText } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import NewsPreview from "@/components/site/news-preview";
import CopyButton from "@/components/site/copy-button";
import AgentHandoff from "@/components/site/agent-handoff";
import "./landing.css";
import "./black-sheep.css";

const DESCRIPTION = "Company intelligence for agents researching tokenized assets. Investigate developments, inspect sources and export research context through MCP, REST or the terminal.";
export const metadata = {
  title: "Black Sheep — Intelligence for tokenized markets",
  description: DESCRIPTION,
  openGraph: { title: "Black Sheep — Intelligence for tokenized markets", description: DESCRIPTION, url: "https://www.newsbeat.dev", siteName: "Black Sheep", type: "website" },
  twitter: { card: "summary_large_image", title: "Black Sheep — Intelligence for tokenized markets", description: DESCRIPTION },
};
const MCP_URL = "https://www.newsbeat.dev/api/mcp";
const PRINCIPLES = [
  { number: "01", title: "Discover what changed.", text: "Research the underlying company. Group related reports and track new headlines since your agent’s last check." },
  { number: "02", title: "Interrogate the evidence.", text: "Inspect publishers, timestamps and coverage freshness. Separate reported developments from assumptions about price." },
  { number: "03", title: "Put context to work.", text: "Export a research brief with evidence and open questions. Connect MCP or REST to bring the same context into your agent’s workflow." },
];

export default function Home() {
  return (
    <>
      <SiteNav active="/" />
      <main className="landing-home bs-home">
        <section className="bs-hero" id="top">
          <div className="wrap bs-hero-grid">
            <div className="bs-hero-copy">
              <span className="bs-kicker"><span /> INTELLIGENCE FOR TOKENIZED MARKETS</span>
              <h1>Context before<br /><span>the trade.</span></h1>
              <p className="bs-lede">Give your trading agent a clearer view of the world behind the token.</p>
              <p className="bs-hero-detail">Investigate company developments. Trace the evidence. Build a research brief your agent can use.</p>
              <div className="hero-cta">
                <a className="btn-primary" href="/dashboard">Open intelligence terminal <ArrowRight size={16} /></a>
                <a className="bs-text-link" href="/docs/quickstart">Connect your agent <ArrowUpRight size={16} /></a>
              </div>
              <div className="bs-status"><span><Check size={14} /> News engine live</span><span>Free public access</span><span>No wallet needed</span></div>
            </div>
            <figure className="bs-emblem">
              <div className="bs-mascot-stage">
                <Image className="bs-mascot" src="/black-sheep-flat.png" width={1254} height={1254} sizes="(max-width: 760px) 88vw, (max-width: 1200px) 44vw, 480px" priority alt="A goofy cartoon black sheep waving, with floppy ears, a crooked grin and two little front teeth" />
              </div>
              <figcaption>Funny sheep. Serious sources.</figcaption>
            </figure>
          </div>
          <div className="wrap bs-hero-foot"><span>COMPANY RESEARCH LIVE · TOKEN MAPPING PLANNED</span><a href="#thesis">Explore the intelligence layer <span aria-hidden="true">↓</span></a></div>
        </section>

        <section className="bs-ticker" aria-label="Company research examples">
          <div className="wrap"><span>START WITH THE UNDERLYING COMPANY</span><strong>NVIDIA</strong><strong>APPLE</strong><strong>ALPHABET</strong><a href="/dashboard">Find your company <ArrowUpRight size={14} /></a></div>
        </section>

        <section className="scaffold" id="thesis">
          <div className="wrap">
            <div className="bs-section-head"><span className="bs-kicker">01 / FROM NEWS TO RESEARCH</span><h2 className="bs-title">Know what changed.<br />Know what’s missing.</h2><p className="bs-body">A token ticker is only the starting point. Black Sheep gives agents source-linked company intelligence to support research before a trading decision.</p></div>
            <div className="bs-principles">{PRINCIPLES.map(item => <article key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
          </div>
        </section>

        <section className="scaffold bs-news-section" id="live-news">
          <div className="wrap bs-live-grid">
            <div>
              <span className="bs-kicker"><Radio size={13} /> 02 / LIVE COMPANY INTELLIGENCE</span>
              <h2 className="bs-title">Find the story<br />behind the asset.</h2>
              <p className="bs-body">Choose an underlying company. Review recent coverage, inspect headline summaries and take a sourced research snapshot into your agent.</p>
              <a className="bs-text-link" href="/dashboard">Open the research terminal <ArrowRight size={15} /></a>
              <div className="bs-engine-note"><Check size={16} /><p>Headlines are checked on a fifteen-minute schedule. Coverage freshness is shown with each lookup. Summaries use headlines, not full articles.</p></div>
            </div>
            <NewsPreview />
          </div>
        </section>

        <section className="scaffold" id="asset-context">
          <div className="wrap bs-asset-grid">
            <div><span className="bs-kicker">03 / REAL ASSETS. REAL STORIES.</span><h2 className="bs-title">The token is<br />only the beginning.</h2><p className="bs-body">An onchain asset still has a story in the real world. Black Sheep starts with company news and is building toward verified token-to-company context for Robinhood Chain.</p><a className="bs-text-link" href="/docs/robinhood-chain">Explore the integration plan <ArrowUpRight size={15} /></a></div>
            <div className="bs-roadmap">
              <article><span className="bs-state">AVAILABLE TODAY</span><h3>Company intelligence</h3><p>Source-linked headlines, grouped coverage, headline summaries and updates since your last check. Available through MCP and REST.</p></article>
              <article><span className="bs-state bs-state-planned">PLANNED</span><h3>Tokenized-asset context</h3><p>Verified Stock Token mapping and corporate-action context. Current lookups cover supported underlying companies; they do not resolve token contracts.</p></article>
            </div>
          </div>
        </section>

        <section className="scaffold bs-network-section" id="agent-network">
          <div className="wrap">
            <div className="bs-network-head"><div><span className="bs-kicker"><Network size={13} /> 04 / BUILT FOR AGENT WORKFLOWS</span><h2 className="bs-title">A sharper brief.<br />A better next question.</h2></div><div><p className="bs-body">Give your connected agent a specific research job. Start with these prompts, or export a brief built from live coverage in the terminal.</p><p className="bs-fine">MCP + REST available · Research stays grounded in cited evidence.</p></div></div>
            <AgentHandoff />
          </div>
        </section>

        <section className="scaffold bs-build-section" id="build">
          <div className="wrap bs-build-grid">
            <div><span className="bs-kicker"><Code2 size={13} /> 05 / THE CONTEXT LAYER FOR YOUR STACK</span><h2 className="bs-title">Your agent.<br />Connected to context.</h2><p className="bs-body">Use MCP for tool calls or REST for your own pipeline. Retrieve a baseline, save the cursor and ask what changed. Keep sources and freshness attached at every step.</p><div className="bs-build-links"><a className="btn-primary" href="/docs/quickstart">Connect your agent <ArrowRight size={15} /></a><a className="bs-text-link" href="/docs/connect">Read the docs <ArrowUpRight size={15} /></a></div></div>
            <div><div className="code"><div className="code-bar">MCP CONNECTION ADDRESS <CopyButton text={MCP_URL} label="Copy endpoint" /></div><pre>{MCP_URL}</pre></div><a className="bs-doc-link" href="/docs/black-sheep"><FileText size={17} /><span>Where Black Sheep is going<small>The product direction and what is available now.</small></span><ArrowUpRight size={15} /></a></div>
          </div>
        </section>

        <section className="bs-closing">
          <div className="wrap"><span className="bs-kicker">LESS NOISE. MORE CONTEXT.</span><h2>Research the asset.<br />Then make your move.</h2><a className="btn-primary" href="/dashboard">Build your first research brief <ArrowRight size={16} /></a><p>Company research today. Token mapping, market data and execution are not connected.<br />Independent project. No Robinhood affiliation or endorsement.</p></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

