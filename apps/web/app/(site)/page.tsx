import { ArrowRight, ArrowUpRight, Code2, Check } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import NewsPreview from "@/components/site/news-preview";
import CryptoLoop from "@/components/site/crypto-loop";
import MissionBuilder from "@/components/site/mission-builder";
import LandingMotion from "@/components/site/landing-motion";
import CopyButton from "@/components/site/copy-button";
import "./landing.css";
import "./newsbeat.css";
import "./crypto-community.css";
import "./newsbeat-polish.css";

const DESCRIPTION = "Stock and crypto news for AI agents. Explore recent headlines, get source-linked updates, and follow what changed through MCP or API.";
const TITLE = "NewsBeat — Stock and crypto news for AI agents";
export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.newsbeat.dev" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://www.newsbeat.dev", siteName: "NewsBeat", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};
const MCP_URL = "https://www.newsbeat.dev/api/mcp";
const BENEFITS = [
  { number: "01", title: "Catch up in a moment.", text: "Get a short update from recent headlines. Similar reports are grouped, so you can spend less time sorting through repeated coverage." },
  { number: "02", title: "See what changed.", text: "Your agent can remember its last check and bring back newly collected stories. A quiet feed gets a clear “nothing new.”" },
  { number: "03", title: "Follow every source.", text: "Publisher links, publication times and coverage freshness stay with the news. Open the reporting and make up your own mind." },
];

export default function Home() {
  return (
    <>
      <SiteNav active="/" />
      <main className="landing-home bs-home nb-home">
        <LandingMotion />
        <section className="bs-hero" id="top">
          <div className="wrap bs-hero-grid">
            <div className="bs-hero-copy">
              <span className="bs-kicker"><span /> THE NEWS FEED FOR AI AGENTS</span>
              <h1>The news behind<br /><span>stocks and crypto.</span></h1>
              <p className="bs-lede">Give your agent a clearer view of what’s happening. Get recent headlines, short updates, and the changes that matter to your research — with sources you can follow.</p>
              <div className="hero-cta">
                <a className="btn-primary" href="/dashboard">Explore the news <ArrowRight size={16} /></a>
                <a className="bs-text-link" href="/docs/quickstart">Connect your agent <ArrowUpRight size={16} /></a>
              </div>
              <p className="nb-free"><Check size={14} aria-hidden="true" /> Free to try. No account or API key needed.</p>
              <div className="nb-asset-strip" aria-label="Example stocks and cryptocurrencies">
                <span>NVDA</span><span>AAPL</span><span>MSFT</span><i aria-hidden="true" /><span>BTC</span><span>ETH</span><span>SOL</span>
              </div>
            </div>
            <div className="nb-hero-preview" id="live-news">
              <NewsPreview />
            </div>
          </div>
        </section>

        <section className="bs-proof" aria-label="NewsBeat coverage">
          <div className="wrap">
            <div><strong>1,528</strong><span>US stocks</span></div>
            <div><strong>502</strong><span>crypto assets</span></div>
            <div><strong>15 min</strong><span>news collection cycle</span></div>
            <div><strong>MCP + API</strong><span>ready for your agent</span></div>
          </div>
        </section>

        <section className="scaffold" id="thesis">
          <div className="wrap">
            <div className="bs-section-head">
              <span className="bs-kicker">LESS NOISE. MORE CONTEXT.</span>
              <h2 className="bs-title">Keep up with the assets<br />you care about.</h2>
              <p className="bs-body">From company announcements to crypto developments, NewsBeat turns a stream of headlines into useful context for you and your agent.</p>
            </div>
            <div className="bs-principles">{BENEFITS.map(item => <article key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
          </div>
        </section>

        <section className="bs-crypto" id="crypto-community" aria-labelledby="workflow-title">
          <div className="wrap">
            <div className="bs-crypto-head">
              <div>
                <span className="bs-kicker">YOUR AGENT, ON THE BEAT</span>
                <h2 id="workflow-title">One simple loop.<br /><span>A better-informed agent.</span></h2>
              </div>
              <div className="bs-crypto-intro">
                <p>Choose a stock or cryptocurrency. Check the latest reporting. Come back for what’s new. The same workflow works across both markets.</p>
                <a className="bs-text-link" href="/docs/quickstart">See how to connect <ArrowUpRight size={17} /></a>
              </div>
            </div>
            <CryptoLoop />
            <p className="nb-direction">Built for stock and crypto research today. We’re building toward feeds for tokenized assets, starting with the news behind the underlying company or cryptocurrency.</p>
          </div>
        </section>

        <section className="scaffold bs-build-section" id="build">
          <div className="wrap bs-build-grid">
            <div className="nb-connect-copy">
              <span className="bs-kicker"><Code2 size={13} /> BUILT TO CONNECT</span>
              <h2 className="bs-title">Your assistant.<br />Now with the news.</h2>
              <p className="bs-body">Connect NewsBeat to an assistant that supports remote MCP, or use the REST API in your own app. Ask a question naturally and let your agent bring back the context.</p>
              <div className="bs-build-links"><a className="btn-primary" href="/docs/quickstart">Get connected <ArrowRight size={15} /></a><a className="bs-text-link" href="/docs/connect">API reference <ArrowUpRight size={15} /></a></div>
              <div className="code"><div className="code-bar">MCP ENDPOINT <CopyButton text={MCP_URL} label="Copy" /></div><pre>{MCP_URL}</pre></div>
              <p className="nb-connect-note">Try a research prompt here, then copy it into your connected agent.</p>
            </div>
            <MissionBuilder />
          </div>
        </section>

        <section className="bs-closing" id="community" aria-labelledby="closing-title">
          <div className="wrap">
            <span className="bs-kicker">STAY ON THE BEAT</span>
            <h2 id="closing-title">The next headline.<br />A little more context.</h2>
            <div className="hero-cta">
              <a className="btn-primary" href="/dashboard">Explore stocks and crypto <ArrowRight size={16} /></a>
              <a className="bs-text-link" href="https://github.com/thepeternemec/NewsBeat" target="_blank" rel="noopener noreferrer">Build with NewsBeat <ArrowUpRight size={15} /></a>
            </div>
            <p className="bs-closing-fine">Source-linked news · Headline-based summaries · Free public access during early access</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
