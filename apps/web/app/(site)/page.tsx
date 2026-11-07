import { ArrowRight, ArrowUpRight, Activity, Bot, ScanLine } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import LandingNewsLookup from "@/components/site/landing-news-lookup";
import CryptoLoop from "@/components/site/crypto-loop";
import LandingMotion from "@/components/site/landing-motion";
import "./landing.css";
import "./newsbeat.css";
import "./crypto-community.css";
import "./newsbeat-polish.css";
import "./intelligence.css";
import "./landing-cadence.css";

const DESCRIPTION = "News, market checks and meaningful signals for your AI agent. Understand what changed across stocks and crypto.";
const TITLE = "NewsBeat — Meaningful signals for AI agents";
export const metadata = {
  title: TITLE, description: DESCRIPTION,
  alternates: { canonical: "https://www.newsbeat.dev" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://www.newsbeat.dev", siteName: "NewsBeat", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function Home() {
  return <>
    <SiteNav active="/" />
    <main className="landing-home bs-home nb-home ni-home">
      <LandingMotion />
      <section className="bs-hero" id="top">
        <div className="wrap bs-hero-grid">
          <div className="bs-hero-copy">
            <span className="bs-kicker"><span /> AGENT INTELLIGENCE</span>
            <h1>Market intelligence.<br /><span>For your agent.</span></h1>
            <p className="bs-lede">We connect the news with market data so your agent can spot unusual moves and explain what deserves attention.</p>
            <div className="hero-cta">
              <a className="btn-primary" href="/for-agents">Connect your agent <ArrowRight size={16} /></a>
              <a className="bs-text-link" href="/intelligence">See a real signal <ArrowRight size={16} /></a>
            </div>
            <p className="nb-home-cadence">News archive · 10-minute checks <span aria-hidden="true">/</span> <a href="/for-agents#collection">1-minute checks on request <ArrowUpRight size={12} /></a></p>
            <p className="ni-stage-note">Stocks + crypto · News + market data · MCP + API</p>
          </div>
          <div className="ni-hero-model"><LandingNewsLookup /></div>
        </div>
      </section>

      <section className="bs-crypto" id="agent-workflow" aria-labelledby="workflow-title">
        <div className="wrap">
          <div className="bs-crypto-head">
            <div><span className="bs-kicker">BEHIND THE SIGNAL</span><h2 id="workflow-title">News comes in.<br /><span>Signals take shape.</span></h2></div>
            <div className="bs-crypto-intro"><p>News is the starting point. Market checks help your agent decide whether to investigate, wait or reassess.</p><a className="bs-text-link" href="/intelligence">See the intelligence <ArrowUpRight size={17} /></a></div>
          </div>
          <CryptoLoop />
        </div>
      </section>

      <section className="nb-home-features" id="build" aria-labelledby="features-title">
        <div className="wrap">
          <div className="bs-section-head"><span className="bs-kicker">EXPLORE NEWSBEAT</span><h2 className="bs-title" id="features-title">Less noise.<br />A clearer next question.</h2></div>
          <div className="nb-feature-links">
            <a href="/intelligence"><ScanLine size={23} aria-hidden="true" /><span className="nb-feature-label">INTELLIGENCE</span><h3>Find what matters.</h3><p>Signal construction, evidence and reasons to review or wait.</p><span className="nb-feature-bottom">Explore signals <ArrowRight size={17} /></span></a>
            <a href="/market-checks"><Activity size={23} aria-hidden="true" /><span className="nb-feature-label">MARKET CHECKS</span><h3>Check the market.</h3><p>Delta. Confirmation. Timing. See how a move compares with its market.</p><span className="nb-feature-bottom">Explore the checks <ArrowRight size={17} /></span></a>
            <a href="/for-agents"><Bot size={23} aria-hidden="true" /><span className="nb-feature-label">FOR AGENTS</span><h3>Bring it to your agent.</h3><p>One connection for reporting, market context and follow-up questions.</p><span className="nb-feature-bottom">Get connected <ArrowRight size={17} /></span></a>
          </div>
        </div>
      </section>

      <section className="bs-closing" id="community" aria-labelledby="closing-title">
        <div className="wrap">
          <span className="bs-kicker">NEWSBEAT / AGENT INTELLIGENCE</span>
          <h2 id="closing-title">Give your agent<br />the bigger picture.</h2>
          <div className="hero-cta"><a className="btn-primary" href="/for-agents">Connect to NewsBeat <ArrowRight size={16} /></a><a className="bs-text-link" href="https://github.com/thepeternemec/NewsBeat" target="_blank" rel="noopener noreferrer">Follow the build <ArrowUpRight size={15} /></a></div>
          <p className="bs-closing-fine">Signal construction · Contextual review alerts · MCP + REST</p>
        </div>
      </section>
    </main>
    <SiteFooter />
  </>;
}
