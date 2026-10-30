import { ArrowRight, ArrowUpRight, Check, Radio, Network, Code2, FileText } from "lucide-react";
import BrandMark from "@/components/site/brand-mark";
import SheepBadge from "@/components/site/sheep-badge";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import NewsPreview from "@/components/site/news-preview";
import MissionBuilder from "@/components/site/mission-builder";
import CopyButton from "@/components/site/copy-button";
import AgentHandoff from "@/components/site/agent-handoff";
import "./landing.css";
import "./black-sheep.css";

const DESCRIPTION =
  "A news bot for agents researching tokenized assets. Source-linked company headlines, freshness and change cursors — or a plain \"nothing moved\". Company research is live; token mapping is planned.";
export const metadata = {
  title: "Black Sheep — the news bot that cites or says nothing",
  description: DESCRIPTION,
  openGraph: { title: "Black Sheep — the news bot that cites or says nothing", description: DESCRIPTION, url: "https://www.newsbeat.dev", siteName: "Black Sheep", type: "website" },
  twitter: { card: "summary_large_image", title: "Black Sheep — the news bot that cites or says nothing", description: DESCRIPTION },
};
const MCP_URL = "https://www.newsbeat.dev/api/mcp";
const PRINCIPLES = [
  { number: "01", title: "It knows what changed.", text: "Send a topic and a cursor. You get only the reports that appeared since your last check — not a fresh pile to read again." },
  { number: "02", title: "It shows its evidence.", text: "Every item carries a publisher, a timestamp and a link. Freshness is reported per lookup, and “unavailable” is a state, not an empty list." },
  { number: "03", title: "It will not invent the rest.", text: "No article bodies, no summaries passed off as reporting, no claims about price. What the headlines do not say, Black Sheep does not say." },
];

export default function Home() {
  return (
    <>
      <SiteNav active="/" />
      <main className="landing-home bs-home">
        <section className="bs-hero" id="top">
          <div className="wrap bs-hero-grid">
            <div className="bs-hero-copy">
              <SheepBadge />
              <span className="bs-kicker"><span /> A NEWS BOT FOR TOKENIZED MARKETS</span>
              <h1>Other bots guess.<br /><span>This one cites.</span></h1>
              <p className="bs-lede">Black Sheep is a news bot for agents researching tokenized assets. Ask what changed behind a company and get source-linked headlines — or a plain “nothing moved”.</p>
              <p className="bs-hero-detail">No invented summaries. Headlines in the publisher’s own words, with the link, the timestamp and the freshness attached. Connect it with MCP, or read it in the terminal.</p>
              <div className="hero-cta">
                <a className="btn-primary" href="/dashboard">Open intelligence terminal <ArrowRight size={16} /></a>
                <a className="bs-text-link" href="/docs/quickstart">Connect your agent <ArrowUpRight size={16} /></a>
              </div>
              <div className="bs-status"><span><Check size={14} /> News engine live</span><span>Free public access</span><span>No wallet needed</span></div>
            </div>
            <MissionBuilder />
          </div>
          <div className="wrap bs-hero-foot"><span>COMPANY RESEARCH LIVE · TOKEN MAPPING PLANNED</span><a href="#thesis">Explore the intelligence layer <span aria-hidden="true">↓</span></a></div>
        </section>

        <section className="bs-ticker" aria-label="Company research examples">
          <div className="wrap"><span>START WITH THE UNDERLYING COMPANY</span><strong>NVIDIA</strong><strong>APPLE</strong><strong>ALPHABET</strong><a href="/dashboard">Find your company <ArrowUpRight size={14} /></a></div>
        </section>

        <section className="scaffold" id="thesis">
          <div className="wrap">
            <div className="bs-section-head"><span className="bs-kicker">01 / THE CASE FOR A QUIETER BOT</span><h2 className="bs-title">Most tools always<br />have an answer.</h2><p className="bs-body">That is how a confident brief ends up resting on an article nobody read. Black Sheep is built the other way: it returns the evidence, or it tells you nothing changed. A black sheep will not follow the flock off a cliff.</p></div>
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
            <div><span className="bs-kicker">03 / REAL ASSETS. REAL STORIES.</span><h2 className="bs-title">The asset is<br />only the beginning.</h2><p className="bs-body">An onchain asset still has a story in the real world. Black Sheep starts with company news and is building toward verified token-to-company context for Robinhood Chain.</p><a className="bs-text-link" href="/docs/robinhood-chain">Explore the integration plan <ArrowUpRight size={15} /></a></div>
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

        <section className="sheep-community-section" id="sheep-community" aria-labelledby="sheep-community-title">
          <div className="wrap sheep-community-grid">
            <div className="sheep-community-identity"><BrandMark size={140} /><span>$SHEEP</span><small>A CURIOUS FLOCK.</small></div>
            <div>
              <span className="bs-kicker">THE BLACK SHEEP COMMUNITY</span>
              <h2 className="bs-title" id="sheep-community-title">Good instincts.<br />Better questions.</h2>
              <p className="bs-body">$SHEEP is the community token, and it is a separate thing from the news bot. You do not need it to use Black Sheep, and holding it is not a claim on the product, its data or its revenue. The token is planned for pump.fun. The bot is live today, free, with no wallet involved.</p>
              <div className="sheep-community-links"><a className="btn-primary" href="https://x.com/blacksheep_" target="_blank" rel="noopener noreferrer">Follow the flock <ArrowUpRight size={15} /></a><a className="bs-text-link" href="/docs/robinhood-chain">Explore the project <ArrowRight size={15} /></a></div>
              <p className="sheep-community-status">Coming to pump.fun · launch date and verified contract address to be announced.</p>
            </div>
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

