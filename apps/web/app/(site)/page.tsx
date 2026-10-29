import Image from "next/image";
import { ArrowRight, ArrowUpRight, Check, Radio, Network, Code2, FileText } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import BrandMark from "@/components/site/brand-mark";
import NewsPreview from "@/components/site/news-preview";
import CopyButton from "@/components/site/copy-button";
import AgentHandoff from "@/components/site/agent-handoff";
import "./landing.css";
import "./black-sheep.css";

const DESCRIPTION = "Black Sheep follows the news behind tokenized assets. Source-linked company intelligence for AI agents, with Robinhood Chain asset mapping and agent coordination planned.";
export const metadata = {
  title: "Black Sheep — Intelligence for tokenized assets",
  description: DESCRIPTION,
  openGraph: { title: "Black Sheep — Intelligence for tokenized assets", description: DESCRIPTION, url: "https://www.newsbeat.dev", siteName: "Black Sheep", type: "website" },
  twitter: { card: "summary_large_image", title: "Black Sheep — Intelligence for tokenized assets", description: DESCRIPTION },
};
const MCP_URL = "https://www.newsbeat.dev/api/mcp";
const STAGES = [
  { number: "01", label: "COLLECT", title: "Read the world behind the asset.", text: "Collect company and crypto headlines, group repeated coverage, and keep the reporting attached. The news engine works today." },
  { number: "02", label: "CONNECT", title: "Give every signal an identity.", text: "The planned Robinhood Chain integration maps a Stock Token to its underlying company and adds confirmed corporate events." },
  { number: "03", label: "RELAY", title: "Let agents pass the context.", text: "A proposed message format lets agents exchange observations with asset identity, sources and freshness. Agent messaging is planned." },
];
export default function Home() {
  return (
    <>
      <SiteNav active="/" />
      <main className="landing-home bs-home">
        <section className="bs-hero" id="top">
          <div className="wrap bs-hero-grid">
            <div className="bs-hero-copy">
              <span className="bs-kicker"><span /> BLACK SHEEP / TOKENIZED-ASSET INTELLIGENCE</span>
              <h1>Less baa.<br /><span>More brain.</span></h1>
              <p className="bs-lede">The news intelligence layer for tokenized assets. Follow the underlying companies, understand what changed, and give your agents context they can verify.</p>
              <div className="hero-cta">
                <a className="btn-primary" href="#live-news">Try the news engine <ArrowRight size={15} /></a>
                <a className="bs-text-link" href="#agent-network">Explore the agent network <ArrowUpRight size={15} /></a>
              </div>
              <div className="bs-status"><span><Check size={12} /> News tools live</span><span>Chain mapping planned</span></div>
              <a className="bs-chain-note" href="/docs/robinhood-chain">Robinhood Chain <span>/ integration planned</span><ArrowUpRight size={12} /></a>
            </div>
            <div className="bs-emblem" aria-label="Black Sheep mascot: a curious black sheep with a raised eyebrow and a knowing smile">
              <div className="bs-emblem-top"><span>MEET YOUR UNLIKELY ANALYST</span><span>EST. OUTSIDE THE HERD</span></div>
              <div className="bs-mascot-stage">
                <span className="bs-thought">Source?</span>
                <Image className="bs-mascot-3d" src="/black-sheep-3d.jpg" width={1254} height={1254} sizes="(max-width: 760px) 100vw, 50vw" priority alt="Black Sheep, a curious 3D sheep with textured black wool, a raised eyebrow and a knowing smile" />
              </div>
              <div className="bs-emblem-bottom"><span>READS THE NEWS.<br />QUESTIONS THE NARRATIVE.</span><span className="bs-asset-state">FOLLOWS TOKENIZED ASSETS<br />KEEPS THE SOURCES</span></div>
            </div>
          </div>
        </section>

        <section className="bs-ticker" aria-label="Underlying companies for research">
          <div className="wrap"><span>FOLLOW THE COMPANIES BEHIND THE TOKENS</span><strong>NVIDIA</strong><strong>ALPHABET</strong><strong>APPLE</strong><a href="/docs/try">Explore company news <ArrowUpRight size={12} /></a></div>
        </section>

        <section className="scaffold" id="thesis">
          <div className="wrap bs-thesis">
            <div><span className="bs-kicker">01 / THE THESIS</span><h2 className="bs-title">Funny face.<br />Serious questions.</h2></div>
            <div><p className="bs-editorial">Tokenized markets need context. Black Sheep starts with the companies, events and reporting behind the assets.</p><p className="bs-body">The foundation is the working NewsBeat news engine. The direction is a shared context network where agents can discover developments, check the evidence and pass an observation to another agent.</p><p className="bs-fine">Stock Token mapping and agent messaging are planned. The current news engine covers the underlying companies and retains its existing crypto catalog.</p></div>
          </div>
        </section>

        <section className="scaffold bs-news-section" id="live-news">
          <div className="wrap bs-live-grid">
            <div>
              <span className="bs-kicker"><Radio size={12} /> 02 / THE ENGINE IS LIVE</span>
              <h2 className="bs-title">Good intelligence.<br />Receipts included.</h2>
              <p className="bs-body">Ask what happened with NVIDIA, Apple or another supported company. Get source-linked headlines, a short summary and a clear view of coverage freshness.</p>
              <p className="bs-body">Sources are checked on a fifteen-minute schedule. Summaries use headline metadata; full article text is not included.</p>
              <a className="bs-text-link" href="/dashboard">Open the research terminal <ArrowRight size={14} /></a>
              <div className="bs-engine-note"><Check size={15} /><p>Public MCP and REST news reads are free during early access. No wallet is required.</p></div>
            </div>
            <NewsPreview />
          </div>
        </section>

        <section className="scaffold" id="pipeline">
          <div className="wrap">
            <div className="bs-section-top"><span className="bs-kicker">03 / FROM REPORT TO SHARED CONTEXT</span><p>One asset. Traceable evidence. A common language.</p></div>
            <div className="bs-stages">{STAGES.map(stage => <article key={stage.number}><div><span>{stage.number}</span><small>{stage.label}</small></div><h3>{stage.title}</h3><p>{stage.text}</p></article>)}</div>
          </div>
        </section>

        <section className="scaffold bs-network-section" id="agent-network">
          <div className="wrap">
            <div className="bs-network-head"><div><span className="bs-kicker"><Network size={12} /> 04 / THE AGENT NETWORK</span><h2 className="bs-title">A flock of agents.<br />A mind of its own.</h2></div><p className="bs-body">A scout finds a development. An analyst adds context. A publisher prepares the update. Explore the proposed handoff below.</p></div>
            <AgentHandoff />
          </div>
        </section>

        <section className="scaffold" id="asset-context">
          <div className="wrap bs-asset-grid">
            <div><span className="bs-kicker">05 / FOLLOW THE UNDERLYING ASSET</span><h2 className="bs-title">Onchain asset.<br />Real-world story.</h2><p className="bs-body">A token tells you what you hold. The reporting helps explain what is happening around it. Black Sheep brings company developments, original sources and coverage freshness into your agent’s research.</p></div>
            <div className="bs-asset-panel"><div className="bs-panel-heading"><BrandMark size={38} /><span>BLACK SHEEP / ASSET CONTEXT</span></div><dl><div><dt>Research focus</dt><dd>Tokenized real-world assets, starting with Stock Tokens</dd></div><div><dt>Available today</dt><dd>Underlying-company news through MCP and REST</dd></div><div><dt>Next integration</dt><dd>Verified token-to-company mapping on Robinhood Chain</dd></div><div><dt>Every observation</dt><dd>Source links, dates and coverage freshness</dd></div></dl><p>Token-contract mapping and corporate-action data are planned. Current lookups return news for supported underlying companies.</p><a className="bs-text-link" href="/docs/black-sheep">Read the product direction <ArrowRight size={13} /></a></div>
          </div>
        </section>

        <section className="scaffold bs-build-section" id="build">
          <div className="wrap bs-build-grid">
            <div><span className="bs-kicker"><Code2 size={12} /> 06 / OPEN TO BUILDERS</span><h2 className="bs-title">Plug into<br />the intelligence.</h2><p className="bs-body">Use the existing news tools in an assistant with remote MCP support, or build with REST. The NewsBeat domain and tool names remain the connection addresses during this transition.</p><div className="bs-build-links"><a className="bs-text-link" href="/docs/quickstart">Connect an agent <ArrowRight size={14} /></a><a className="bs-text-link" href="https://github.com/thepeternemec/NewsBeat">Read the source <ArrowUpRight size={14} /></a></div></div>
            <div><div className="code"><div className="code-bar">LIVE MCP ENDPOINT <CopyButton text={MCP_URL} label="Copy endpoint" /></div><pre>{MCP_URL}</pre></div><a className="bs-doc-link" href="/docs/robinhood-chain"><FileText size={16} /><span>Robinhood Chain integration plan<small>Token identity, corporate actions and market context.</small></span><ArrowUpRight size={15} /></a></div>
          </div>
        </section>

        <section className="bs-closing">
          <div className="wrap"><BrandMark size={60} /><span className="bs-kicker">STAY CURIOUS. STAY INDEPENDENT.</span><h2>Stay curious.<br />Question the herd.</h2><div><a className="btn-primary" href="/docs/try">Find your first signal <ArrowRight size={15} /></a><a className="bs-text-link" href="/docs/black-sheep">Explore Black Sheep <ArrowUpRight size={15} /></a></div><p>Independent project. No Robinhood affiliation or endorsement.</p></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

