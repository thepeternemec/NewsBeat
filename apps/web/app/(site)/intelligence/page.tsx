import { ArrowRight, ArrowUpRight } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import SignalInspector from "@/components/site/signal-inspector";
import LandingMotion from "@/components/site/landing-motion";
import "../landing.css";
import "../newsbeat.css";
import "../newsbeat-polish.css";
import "../intelligence.css";

export const metadata = {
  title: "NewsBeat intelligence — Contextual signals and alert conditions",
  description: "Construct signals for a decision context, inspect their market hypothesis and evidence, and understand which trigger conditions pass or block a review alert.",
  alternates: { canonical: "https://www.newsbeat.dev/intelligence" },
};

const QUALITIES = [
  { title: "A clear change", text: "Describe the reported development and distinguish it from coverage that repeats what was already known." },
  { title: "Relevant context", text: "Connect the change to the entities and questions the agent is researching." },
  { title: "Traceable evidence", text: "Keep source links, publication times and the basis for each interpretation." },
  { title: "Explicit uncertainty", text: "Separate reporting from inference, show conflicting evidence, and identify what needs checking." },
];

export default function IntelligencePage() {
  return <>
    <SiteNav active="/intelligence" />
    <main className="landing-home bs-home nb-home ni-home ni-overview">
      <LandingMotion />
      <section className="bs-hero">
        <div className="wrap bs-hero-grid" style={{ alignItems: "start" }}>
          <div className="bs-hero-copy">
            <span className="bs-kicker">THE SIGNAL WORKBENCH</span>
            <h1>Construct the signal.<br /><span>Test the context.</span></h1>
            <p className="bs-lede">Choose a decision context. Inspect the possible market driver, what would trigger an alert, why the market may ignore it, and what would invalidate the hypothesis.</p>
            <p className="ni-stage-note">The first pilot combines model hypotheses with explicit alert gates. Price response and historical calibration are the next inputs to build.</p>
            <div className="hero-cta"><a className="btn-primary" href="/dashboard">Open research workspace <ArrowRight size={16} /></a><a className="bs-text-link" href="/docs/quickstart">Connect your agent <ArrowUpRight size={16} /></a></div>
          </div>
          <div className="ni-hero-model"><SignalInspector /></div>
        </div>
      </section>

      <section className="scaffold ni-purpose" aria-labelledby="signal-purpose">
        <div className="wrap">
          <div className="bs-section-head"><span className="bs-kicker">WHAT WE MEAN BY INTELLIGENCE</span><h2 className="bs-title" id="signal-purpose">Give the agent<br />a reason to pay attention.</h2><p className="bs-body">A useful signal should explain why a development belongs in the agent’s reasoning, while preserving the evidence and limits behind that explanation.</p></div>
          <div className="ni-quality-grid">{QUALITIES.map(item => <article key={item.title}><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
          <p className="ni-section-note">The pilot begins this work with headline-based model interpretation. Task-specific relevance and stronger verification remain design goals; neither summaries nor pilot hypotheses establish causality.</p>
        </div>
      </section>

      <section className="scaffold bs-news-section" aria-labelledby="intelligence-roadmap">
        <div className="wrap">
          <div className="bs-section-head"><span className="bs-kicker">THE BUILDING BLOCKS</span><h2 className="bs-title" id="intelligence-roadmap">A foundation.<br />Then deeper intelligence.</h2></div>
          <div className="ni-roadmap-cards ni-roadmap-wide">
            <article><span className="ni-state">Available today</span><h3>Collect and organize evidence.</h3><p>Source-linked market headlines, approximate story grouping, headline-based summaries, collection freshness and updates since the last check. Agents can use this foundation now.</p><a className="bs-text-link" href="/docs/data">Coverage and evidence limits <ArrowRight size={15} /></a></article>
            <article><span className="ni-state ni-state-planned">Signal construction pilot</span><h3>Construct and evaluate a signal.</h3><p>The scheduled pilot constructs market hypotheses and evaluates context, freshness, materiality and grounded trigger conditions. Review alerts are recorded once per signal version and context.</p><a className="bs-text-link" href="/dashboard">Open the research workspace <ArrowRight size={15} /></a></article>
          </div>
        </div>
      </section>

      <section className="scaffold">
        <div className="wrap ni-scope">
          <div><span className="bs-kicker">COVERAGE SERVES THE INTELLIGENCE</span><h2 className="bs-title">Start with the assets.<br />Build the understanding.</h2></div>
          <div><p className="bs-body">Stocks and crypto are the current coverage universe. Our focus is the reporting and context an agent needs to understand developments across those assets.</p><p className="bs-body">Tokenized assets remain a longer-term application. Verified mapping to underlying assets is planned, alongside the broader intelligence work.</p><a className="bs-text-link" href="/docs/data">See current coverage and limits <ArrowRight size={15} /></a></div>
        </div>
      </section>
      <section className="bs-closing"><div className="wrap"><span className="bs-kicker">BUILD WITH THE FOUNDATION</span><h2>Put better context<br />in your agent’s hands.</h2><a className="btn-primary" href="/docs/quickstart">Connect to NewsBeat <ArrowRight size={16} /></a></div></section>
    </main>
    <SiteFooter />
  </>;
}
