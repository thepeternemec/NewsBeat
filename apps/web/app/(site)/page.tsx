import { ArrowRight, ArrowUpRight, Activity, Bot, ScanLine } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import LandingNewsLookup from "@/components/site/landing-news-lookup";
import LandingClarity from "@/components/site/landing-clarity";
import LandingMotion from "@/components/site/landing-motion";
import "./landing.css";
import "./newsbeat.css";
import "./crypto-community.css";
import "./newsbeat-polish.css";
import "./intelligence.css";
import "./landing-cadence.css";
import "./landing-experience.css";

const DESCRIPTION = "NewsBeat connects reporting with available market evidence so your AI agent can explain what changed, what could matter and what to check next.";
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
            <span className="bs-kicker"><span /> MARKET INTELLIGENCE FOR YOUR AGENT</span>
            <h1><span className="nb-headline-line" data-hero-line>Connect the dots.</span><span className="nb-headline-line nb-headline-muted" data-hero-line>See the bigger picture.</span></h1>
            <p className="bs-lede">NewsBeat connects reporting with market checks so your agent can explain what changed, why it could matter and what to check next.</p>
            <div className="hero-cta">
              <a className="btn-primary" href="/docs/try">Try a question <ArrowRight size={16} /></a>
              <a className="bs-text-link" href="/for-agents">Connect your agent <ArrowUpRight size={16} /></a>
            </div>
            <p className="nb-home-cadence">News archive · 10-minute checks <span aria-hidden="true">/</span> <a href="/for-agents#collection">1-minute checks on request <ArrowUpRight size={12} /></a></p>
            <p className="ni-stage-note">Stocks + crypto · Evidence + context · MCP + API</p>
            <a className="nb-flow-cue" href="#agent-workflow"><span aria-hidden="true" /> See how the picture comes together <ArrowRight size={13} aria-hidden="true" /></a>
          </div>
          <div className="ni-hero-model nb-live-stage"><span className="nb-live-stage-orbit" aria-hidden="true" /><LandingNewsLookup /></div>
        </div>
      </section>

      <section className="bs-crypto" id="agent-workflow" aria-labelledby="workflow-title">
        <div className="wrap">
          <div className="bs-crypto-head">
            <div><span className="bs-kicker">WHY THE CONNECTION MATTERS</span><h2 id="workflow-title">The dots are data.<br /><span>The connections are context.</span></h2></div>
            <div className="bs-crypto-intro"><p>A headline is a starting point. NewsBeat brings the reporting, available market checks and unanswered questions into one view your agent can explain.</p><a className="bs-text-link" href="/intelligence">Explore real intelligence <ArrowUpRight size={17} /></a></div>
          </div>
          <LandingClarity />
          <p className="nb-coverage-scope">News research across 2,030 stock and crypto assets. Measured market checks are currently a six-asset pilot.</p>
        </div>
      </section>

      <section className="nb-home-features" id="build" aria-labelledby="features-title">
        <div className="wrap">
          <div className="bs-section-head"><span className="bs-kicker">EXPLORE NEWSBEAT</span><h2 className="bs-title" id="features-title">One connection.<br />A more informed agent.</h2></div>
          <div className="nb-feature-links">
            <a href="/intelligence"><ScanLine size={23} aria-hidden="true" /><span className="nb-feature-label">INTELLIGENCE</span><h3>Follow the evidence.</h3><p>A reported change, its possible meaning and the questions still open.</p><span className="nb-feature-bottom">Explore signals <ArrowRight size={17} /></span></a>
            <a href="/market-checks"><Activity size={23} aria-hidden="true" /><span className="nb-feature-label">MARKET CHECKS</span><h3>Test the market story.</h3><p>Available measurements help distinguish an observed move from a possible explanation.</p><span className="nb-feature-bottom">Explore the checks <ArrowRight size={17} /></span></a>
            <a href="/for-agents"><Bot size={23} aria-hidden="true" /><span className="nb-feature-label">FOR AGENTS</span><h3>Keep the context.</h3><p>Bring evidence and its limits into your agent’s own research workflow.</p><span className="nb-feature-bottom">Get connected <ArrowRight size={17} /></span></a>
          </div>
        </div>
      </section>

      <section className="bs-closing" id="community" aria-labelledby="closing-title">
        <div className="wrap">
          <span className="bs-kicker">NEWSBEAT / AGENT INTELLIGENCE</span>
          <h2 id="closing-title">Give your agent<br />the context to explain.</h2>
          <div className="hero-cta"><a className="btn-primary" href="/for-agents">Connect to NewsBeat <ArrowRight size={16} /></a><a className="bs-text-link" href="/docs/try">Try a question <ArrowUpRight size={15} /></a></div>
          <p className="bs-closing-fine">Evidence you can follow. Uncertainty you can see. A next check you can use.</p>
        </div>
      </section>
    </main>
    <SiteFooter />
  </>;
}
