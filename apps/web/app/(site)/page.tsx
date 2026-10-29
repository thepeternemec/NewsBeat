import { ArrowRight, ArrowUpRight, Check, Radio, Network, Code2, FileText } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import BrandMark from "@/components/site/brand-mark";
import NewsPreview from "@/components/site/news-preview";
import CopyButton from "@/components/site/copy-button";
import AgentHandoff from "@/components/site/agent-handoff";
import "./landing.css";
import "./black-sheep.css";

const DESCRIPTION = "Black Sheep is a meme coin concept with a news intelligence engine for tokenized-asset research. Source-linked news today; agent coordination and token utility planned.";
export const metadata = {
  title: "Black Sheep — A different breed of intelligence",
  description: DESCRIPTION,
  openGraph: { title: "Black Sheep — A different breed of intelligence", description: DESCRIPTION, url: "https://www.newsbeat.dev", siteName: "Black Sheep", type: "website" },
  twitter: { card: "summary_large_image", title: "Black Sheep — A different breed of intelligence", description: DESCRIPTION },
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
              <span className="bs-kicker"><span /> A DIFFERENT BREED OF INTELLIGENCE</span>
              <h1>Black Sheep.<br /><span>Find your signal.</span></h1>
              <p className="bs-lede">Meme culture meets market intelligence. A meme coin concept for agents that follow the news behind tokenized assets—and share what matters.</p>
              <div className="hero-cta">
                <a className="btn-primary" href="#live-news">Try the news engine <ArrowRight size={15} /></a>
                <a className="bs-text-link" href="#agent-network">Explore the agent network <ArrowUpRight size={15} /></a>
              </div>
              <div className="bs-status"><span><Check size={12} /> News tools live</span><span>Token + messaging planned</span></div>
            </div>
            <div className="bs-emblem" aria-label="Black Sheep token concept illustration">
              <div className="bs-emblem-top"><span>BLACK SHEEP / CONCEPT 001</span><span>INDEPENDENT BY DESIGN</span></div>
              <div className="bs-coin">
                <span className="bs-coin-orbit" aria-hidden="true" />
                <div className="bs-coin-face"><BrandMark size={210} /><span>BLACK SHEEP</span><small>NEWS · CONTEXT · AGENTS</small></div>
              </div>
              <div className="bs-emblem-bottom"><span>MEME ON THE SURFACE.<br />INTELLIGENCE UNDERNEATH.</span><span className="bs-token-state">TOKEN CONCEPT<br />NOT LAUNCHED</span></div>
            </div>
          </div>
        </section>

        <section className="bs-ticker" aria-label="Underlying companies for research">
          <div className="wrap"><span>FOLLOW THE COMPANIES BEHIND THE TOKENS</span><strong>NVIDIA</strong><strong>ALPHABET</strong><strong>APPLE</strong><a href="/docs/try">Explore company news <ArrowUpRight size={12} /></a></div>
        </section>

        <section className="scaffold" id="thesis">
          <div className="wrap bs-thesis">
            <div><span className="bs-kicker">01 / THE THESIS</span><h2 className="bs-title">A meme with<br />something to say.</h2></div>
            <div><p className="bs-editorial">Tokenized markets need context. Black Sheep starts with the companies, events and reporting behind the assets.</p><p className="bs-body">The foundation is the working NewsBeat news engine. The direction is a shared context network where agents can discover developments, check the evidence and pass an observation to another agent.</p><p className="bs-fine">Stock Token mapping, agent messaging and a blockchain token are planned. Current coverage is company and crypto news.</p></div>
          </div>
        </section>

        <section className="scaffold bs-news-section" id="live-news">
          <div className="wrap bs-live-grid">
            <div>
              <span className="bs-kicker"><Radio size={12} /> 02 / THE ENGINE IS LIVE</span>
              <h2 className="bs-title">Real headlines.<br />A working product.</h2>
              <p className="bs-body">Ask what happened with NVIDIA, Apple or another supported company. Get source-linked headlines, a short summary and a clear view of coverage freshness.</p>
              <p className="bs-body">Sources are checked on a fifteen-minute schedule. Summaries use headline metadata; full article text is not included.</p>
              <a className="bs-text-link" href="/dashboard">Open the research terminal <ArrowRight size={14} /></a>
              <div className="bs-engine-note"><Check size={15} /><p>Public MCP and REST news reads are free during early access. No wallet or token is required.</p></div>
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
            <div className="bs-network-head"><div><span className="bs-kicker"><Network size={12} /> 04 / THE AGENT NETWORK</span><h2 className="bs-title">Give the signal<br />somewhere to go.</h2></div><p className="bs-body">A scout finds a development. An analyst adds context. A publisher prepares the update. Explore the proposed handoff below.</p></div>
            <AgentHandoff />
          </div>
        </section>

        <section className="scaffold" id="token">
          <div className="wrap bs-token-grid">
            <div><span className="bs-kicker">05 / THE TOKEN THESIS</span><h2 className="bs-title">Culture first.<br />Utility to prove.</h2><p className="bs-body">Black Sheep is the proposed meme coin identity for this network. Its utility would need to earn a place in how agents request, exchange and deliver context.</p></div>
            <div className="bs-token-panel"><div className="bs-panel-heading"><BrandMark size={38} /><span>BLACK SHEEP / TOKEN CONCEPT</span></div><dl><div><dt>Status</dt><dd>Not launched</dd></div><div><dt>Proposed role</dt><dd>Agent request and delivery payments</dd></div><div><dt>Chain, ticker and supply</dt><dd>To be defined</dd></div><div><dt>Contract address</dt><dd>None published by this project</dd></div></dl><p>Token utility and economics are design proposals. The current news service runs without a token.</p><a className="bs-text-link" href="/docs/black-sheep">Read the product thesis <ArrowRight size={13} /></a></div>
          </div>
        </section>

        <section className="scaffold bs-build-section" id="build">
          <div className="wrap bs-build-grid">
            <div><span className="bs-kicker"><Code2 size={12} /> 06 / OPEN TO BUILDERS</span><h2 className="bs-title">Plug into<br />the intelligence.</h2><p className="bs-body">Use the existing news tools in an assistant with remote MCP support, or build with REST. The NewsBeat domain and tool names remain the connection addresses during this transition.</p><div className="bs-build-links"><a className="bs-text-link" href="/docs/quickstart">Connect an agent <ArrowRight size={14} /></a><a className="bs-text-link" href="https://github.com/thepeternemec/NewsBeat">Read the source <ArrowUpRight size={14} /></a></div></div>
            <div><div className="code"><div className="code-bar">LIVE MCP ENDPOINT <CopyButton text={MCP_URL} label="Copy endpoint" /></div><pre>{MCP_URL}</pre></div><a className="bs-doc-link" href="/docs/robinhood-chain"><FileText size={16} /><span>Robinhood Chain integration plan<small>Token identity, corporate actions and market context.</small></span><ArrowUpRight size={15} /></a></div>
          </div>
        </section>

        <section className="bs-closing">
          <div className="wrap"><BrandMark size={60} /><span className="bs-kicker">STAY CURIOUS. STAY INDEPENDENT.</span><h2>A different breed<br />of market intelligence.</h2><div><a className="btn-primary" href="/docs/try">Find your first signal <ArrowRight size={15} /></a><a className="bs-text-link" href="/docs/black-sheep">Explore Black Sheep <ArrowUpRight size={15} /></a></div><p>Independent project. No Robinhood affiliation or endorsement.</p></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
