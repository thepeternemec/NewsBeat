import { ArrowRight, ArrowUpRight, Radio, Code2 } from "lucide-react";
import SheepBadge from "@/components/site/sheep-badge";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import NewsPreview from "@/components/site/news-preview";
import MissionBuilder from "@/components/site/mission-builder";
import CopyButton from "@/components/site/copy-button";
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
              <span className="bs-kicker"><span /> NEWS FOR AGENTS · 2,030 ASSETS</span>
              <h1>Your agent is guessing.<br /><span>Give it the news.</span></h1>
              <p className="bs-lede">Source-linked headlines for 2,030 companies and coins — refreshed every fifteen minutes, wired into any agent over MCP.</p>
              <div className="hero-cta">
                <a className="btn-primary" href="/dashboard">Open the terminal <ArrowRight size={16} /></a>
                <a className="bs-text-link" href="/docs/quickstart">Connect your agent <ArrowUpRight size={16} /></a>
              </div>
            </div>
            <MissionBuilder />
          </div>
        </section>

        <section className="bs-proof" aria-label="Black Sheep at a glance">
          <div className="wrap">
            <div><strong>2,030</strong><span>assets covered</span></div>
            <div><strong>15 min</strong><span>refresh cycle</span></div>
            <div><strong>7</strong><span>agent tools</span></div>
            <div><strong>$0</strong><span>to start</span></div>
          </div>
        </section>

        <section className="scaffold" id="thesis">
          <div className="wrap">
            <div className="bs-section-head">
              <span className="bs-kicker">THE CASE</span>
              <h2 className="bs-title">An agent that<br />always answers<br />is guessing.</h2>
              <p className="bs-body">Confidence is cheap. A citation is not.</p>
            </div>
            <div className="bs-principles">{PRINCIPLES.map(item => <article key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
          </div>
        </section>

        <section className="scaffold bs-news-section" id="live-news">
          <div className="wrap bs-live-grid">
            <div>
              <span className="bs-kicker"><Radio size={13} /> LIVE</span>
              <h2 className="bs-title">Every token<br />has a story.</h2>
              <p className="bs-body">Read it before you act on it. Live coverage, original sources, freshness on every lookup.</p>
              <a className="bs-text-link" href="/dashboard">Open the terminal <ArrowRight size={15} /></a>
            </div>
            <NewsPreview />
          </div>
        </section>

        <section className="scaffold bs-build-section" id="build">
          <div className="wrap bs-build-grid">
            <div>
              <span className="bs-kicker"><Code2 size={13} /> CONNECT</span>
              <h2 className="bs-title">One endpoint.<br />Any agent.</h2>
              <p className="bs-body">Point it at Black Sheep and it can read the news. MCP for tool calls, REST for your own stack.</p>
              <div className="bs-build-links"><a className="btn-primary" href="/docs/quickstart">Connect your agent <ArrowRight size={15} /></a><a className="bs-text-link" href="/docs">Read the docs <ArrowUpRight size={15} /></a></div>
            </div>
            <div>
              <div className="code"><div className="code-bar">MCP ENDPOINT <CopyButton text={MCP_URL} label="Copy" /></div><pre>{MCP_URL}</pre></div>
            </div>
          </div>
        </section>

        <section className="bs-closing" id="sheep-community" aria-labelledby="closing-title">
          <div className="wrap">
            <span className="bs-kicker">THE BLACK SHEEP COMMUNITY</span>
            <h2 id="closing-title">Research the asset.<br />Then make your move.</h2>
            <p className="bs-closing-note">$SHEEP is the community token, planned for pump.fun. You do not need it to use the bot, and holding it is not a claim on the product.</p>
            <div className="hero-cta">
              <a className="btn-primary" href="/dashboard">Build your first brief <ArrowRight size={16} /></a>
              <a className="bs-text-link" href="https://x.com/blacksheep_" target="_blank" rel="noopener noreferrer">Follow the flock <ArrowUpRight size={15} /></a>
            </div>
            <p className="bs-closing-fine">Company research today. Token mapping, market data and execution are not connected. Independent project, no Robinhood affiliation.</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

