import Image from "next/image";
import { ArrowRight, ArrowUpRight, Check, Radio, Network, Code2, FileText } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import NewsPreview from "@/components/site/news-preview";
import CopyButton from "@/components/site/copy-button";
import AgentHandoff from "@/components/site/agent-handoff";
import "./landing.css";
import "./black-sheep.css";

const DESCRIPTION = "Black Sheep follows the news behind tokenized assets. Company headlines, source links and fresh context for your AI agent. Built on the NewsBeat news engine.";
export const metadata = {
  title: "Black Sheep — A different kind of market intelligence",
  description: DESCRIPTION,
  openGraph: { title: "Black Sheep — A different kind of market intelligence", description: DESCRIPTION, url: "https://www.newsbeat.dev", siteName: "Black Sheep", type: "website" },
  twitter: { card: "summary_large_image", title: "Black Sheep — A different kind of market intelligence", description: DESCRIPTION },
};
const MCP_URL = "https://www.newsbeat.dev/api/mcp";
const PRINCIPLES = [
  { number: "01", title: "Follow the company.", text: "Start with the business behind an asset. Read recent company developments and keep track of what changed." },
  { number: "02", title: "Keep the receipts.", text: "Every headline comes with a publisher, a date and a link. Check the reporting and form your own view." },
  { number: "03", title: "Bring your agent.", text: "Connect through MCP or REST. Give your assistant the context for a briefing, a follow-up or a better question." },
];

export default function Home() {
  return (
    <>
      <SiteNav active="/" />
      <main className="landing-home bs-home">
        <section className="bs-hero" id="top">
          <div className="wrap bs-hero-grid">
            <div className="bs-hero-copy">
              <span className="bs-kicker"><span /> A DIFFERENT KIND OF MARKET INTELLIGENCE</span>
              <h1>Less baa.<br /><span>More brain.</span></h1>
              <p className="bs-lede">Meet Black Sheep. A curious little character following the real-world stories behind tokenized assets.</p>
              <p className="bs-hero-detail">Company news. Linked sources. Better context for your AI agent.</p>
              <div className="hero-cta">
                <a className="btn-primary" href="#live-news">Explore the news <ArrowRight size={16} /></a>
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
          <div className="wrap bs-hero-foot"><span>POWERED BY THE NEWSBEAT NEWS ENGINE</span><a href="#thesis">Get to know Black Sheep <span aria-hidden="true">↓</span></a></div>
        </section>

        <section className="bs-ticker" aria-label="Company research examples">
          <div className="wrap"><span>START WITH THE UNDERLYING COMPANY</span><strong>NVIDIA</strong><strong>APPLE</strong><strong>ALPHABET</strong><a href="/dashboard">Find your company <ArrowUpRight size={14} /></a></div>
        </section>

        <section className="scaffold" id="thesis">
          <div className="wrap">
            <div className="bs-section-head"><span className="bs-kicker">01 / CURIOUS BY NATURE</span><h2 className="bs-title">A funny face.<br />A useful point of view.</h2><p className="bs-body">Markets move. Stories pile up. Black Sheep helps your agent catch up with the companies behind the assets you follow.</p></div>
            <div className="bs-principles">{PRINCIPLES.map(item => <article key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
          </div>
        </section>

        <section className="scaffold bs-news-section" id="live-news">
          <div className="wrap bs-live-grid">
            <div>
              <span className="bs-kicker"><Radio size={13} /> 02 / TRY IT FOR YOURSELF</span>
              <h2 className="bs-title">What happened?<br />Start here.</h2>
              <p className="bs-body">Choose a company and see the latest available reporting. Your agent can use the same news to prepare a short, source-linked briefing.</p>
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
            <div className="bs-network-head"><div><span className="bs-kicker"><Network size={13} /> 04 / A MORE CURIOUS FLOCK</span><h2 className="bs-title">Good context<br />travels well.</h2></div><div><p className="bs-body">A scout finds a development. An analyst adds context. A publisher prepares an update. Here is how agents could pass the story along.</p><p className="bs-fine">Concept preview · Agent messaging is planned.</p></div></div>
            <AgentHandoff />
          </div>
        </section>

        <section className="scaffold bs-build-section" id="build">
          <div className="wrap bs-build-grid">
            <div><span className="bs-kicker"><Code2 size={13} /> 05 / BRING YOUR OWN BRAIN</span><h2 className="bs-title">Your agent.<br />Our curiosity.</h2><p className="bs-body">Connect an assistant that supports remote MCP, or build with REST. Existing NewsBeat endpoints and tool names keep working.</p><div className="bs-build-links"><a className="btn-primary" href="/docs/quickstart">Connect your agent <ArrowRight size={15} /></a><a className="bs-text-link" href="/docs/connect">Read the docs <ArrowUpRight size={15} /></a></div></div>
            <div><div className="code"><div className="code-bar">MCP CONNECTION ADDRESS <CopyButton text={MCP_URL} label="Copy endpoint" /></div><pre>{MCP_URL}</pre></div><a className="bs-doc-link" href="/docs/black-sheep"><FileText size={17} /><span>Where Black Sheep is going<small>The product direction and what is available now.</small></span><ArrowUpRight size={15} /></a></div>
          </div>
        </section>

        <section className="bs-closing">
          <div className="wrap"><span className="bs-kicker">STAY CURIOUS.</span><h2>Great questions<br />start somewhere.</h2><a className="btn-primary" href="/dashboard">Find your first story <ArrowRight size={16} /></a><p>Independent project. No Robinhood affiliation or endorsement.</p></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
