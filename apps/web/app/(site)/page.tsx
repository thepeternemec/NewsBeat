import { ArrowRight, ArrowUpRight, Radio, Code2 } from "lucide-react";
import SheepBadge from "@/components/site/sheep-badge";
import BrandMark from "@/components/site/brand-mark";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import NewsPreview from "@/components/site/news-preview";
import MissionBuilder from "@/components/site/mission-builder";
import LandingMotion from "@/components/site/landing-motion";
import CopyButton from "@/components/site/copy-button";
import "./landing.css";
import "./black-sheep.css";
import "./crypto-community.css";

const DESCRIPTION =
  "Market news intelligence for agents researching companies, crypto and tokenized assets. Source-linked headlines, coverage freshness and updates since your last check. Checked on a fifteen-minute cycle.";
export const metadata = {
  title: "Black Sheep — Market intelligence for agents",
  description: DESCRIPTION,
  openGraph: { title: "Black Sheep — Market intelligence for agents", description: DESCRIPTION, url: "https://www.newsbeat.dev", siteName: "Black Sheep", type: "website" },
  twitter: { card: "summary_large_image", title: "Black Sheep — Market intelligence for agents", description: DESCRIPTION },
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
        <LandingMotion />
        <section className="bs-hero" id="top">
          <div className="wrap bs-hero-grid">
            <div className="bs-hero-copy">
              <SheepBadge />
              <span className="bs-kicker"><span /> FINANCIAL NEWS / AGENT INTELLIGENCE</span>
              <h1>Market intelligence.<br /><span>Built for your agent.</span></h1>
              <p className="bs-lede">Give your agent the context behind companies, crypto and tokenized markets. Follow the reporting, check what changed, and trace every source.</p>
              <div className="hero-cta">
                <a className="btn-primary" href="/dashboard">Open the terminal <ArrowRight size={16} /></a>
                <a className="bs-text-link" href="/docs/quickstart">Connect your agent <ArrowUpRight size={16} /></a>
              </div>
              <p className="bs-hero-cadence"><span aria-hidden="true" /> 15-minute collection cycle <span aria-hidden="true">·</span> MCP + REST</p>
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

        <section className="bs-crypto" id="crypto-community" aria-labelledby="crypto-title">
          <div className="wrap">
            <div className="bs-crypto-head">
              <div>
                <span className="bs-kicker">THE FLOCK / CRYPTO RESEARCH</span>
                <h2 id="crypto-title">Markets move fast.<br /><span>Bring receipts.</span></h2>
              </div>
              <div className="bs-crypto-intro">
                <p>Follow reporting on 502 crypto assets. Ask what appeared since your agent last checked, then follow the source before forming a view.</p>
                <a className="bs-text-link" href="/dashboard">Explore crypto coverage <ArrowUpRight size={17} /></a>
              </div>
            </div>

            <div className="bs-crypto-stage">
              <div className="bs-crypto-orbit" aria-hidden="true">
                <div className="bs-crypto-rings" aria-hidden="true" />
                <div className="bs-crypto-core">
                  <BrandMark size={150} />
                  <strong>$SHEEP</strong>
                  <span>COMMUNITY · PLANNED</span>
                </div>
                <span className="bs-crypto-node bs-crypto-node-btc">BTC <small>RESEARCH TOPIC</small></span>
                <span className="bs-crypto-node bs-crypto-node-eth">ETH <small>RESEARCH TOPIC</small></span>
                <span className="bs-crypto-node bs-crypto-node-sol">SOL <small>RESEARCH TOPIC</small></span>
                <span className="bs-crypto-orbit-note">ILLUSTRATIVE TOPICS · NO PRICE FEED</span>
              </div>
              <div className="bs-crypto-path">
                <div className="bs-crypto-path-top"><span>THE RESEARCH LOOP</span><span>01 — 03</span></div>
                <ol>
                  <li><span>01 / DISCOVER</span><strong>Pick your beat.</strong><p>Start with a supported coin or company in the topic catalog.</p></li>
                  <li><span>02 / DETECT</span><strong>Ask what changed.</strong><p>Save a cursor. On your next check, get the newly reported items.</p></li>
                  <li><span>03 / VERIFY</span><strong>Keep the receipts.</strong><p>Each headline comes with its publisher, timestamp and source link.</p></li>
                </ol>
                <a href="/docs/quickstart">Put your agent on the beat <ArrowRight size={16} /></a>
              </div>
            </div>

            <div className="bs-crypto-foot">
              <p><strong>$SHEEP is for the community.</strong> Planned for pump.fun. Research access does not require the token.</p>
              <a href="#sheep-community">Meet the flock <ArrowUpRight size={16} /></a>
            </div>
          </div>
        </section>

        <section className="scaffold" id="thesis">
          <div className="wrap">
            <div className="bs-section-head">
              <span className="bs-kicker">THE CASE</span>
              <h2 className="bs-title">From market noise<br />to useful context.</h2>
              <p className="bs-body">A clear view of what was reported, what changed, and how fresh the evidence is.</p>
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

