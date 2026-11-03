import { ArrowRight, ArrowUpRight } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import IntelligenceModel from "@/components/site/intelligence-model";
import LandingMotion from "@/components/site/landing-motion";
import "../landing.css";
import "../newsbeat.css";
import "../newsbeat-polish.css";
import "../intelligence.css";

export const metadata = {
  title: "NewsBeat intelligence — From reporting to meaningful signals",
  description: "The NewsBeat direction: a source-linked news foundation today, with task-relevant signal intelligence, context and uncertainty as the next layer.",
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
        <div className="wrap bs-hero-grid">
          <div className="bs-hero-copy">
            <span className="bs-kicker">THE NEWSBEAT DIRECTION</span>
            <h1>From reporting<br /><span>to understanding.</span></h1>
            <p className="bs-lede">NewsBeat’s goal is to produce meaningful signals for AI agents: a reported change, its context, its relevance, and the questions it raises.</p>
            <p className="ni-stage-note">The source-linked feed is live. The deeper intelligence layer described here is planned.</p>
            <div className="hero-cta"><a className="btn-primary" href="/dashboard">Explore the foundation <ArrowRight size={16} /></a><a className="bs-text-link" href="/docs/quickstart">Connect your agent <ArrowUpRight size={16} /></a></div>
          </div>
          <div className="ni-hero-model"><IntelligenceModel /></div>
        </div>
      </section>

      <section className="scaffold ni-purpose" aria-labelledby="signal-purpose">
        <div className="wrap">
          <div className="bs-section-head"><span className="bs-kicker">WHAT WE MEAN BY INTELLIGENCE</span><h2 className="bs-title" id="signal-purpose">Give the agent<br />a reason to pay attention.</h2><p className="bs-body">A useful signal should explain why a development belongs in the agent’s reasoning, while preserving the evidence and limits behind that explanation.</p></div>
          <div className="ni-quality-grid">{QUALITIES.map(item => <article key={item.title}><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
          <p className="ni-section-note">These are design goals for the next intelligence layer. Current headline summaries do not establish cause, significance or future outcomes.</p>
        </div>
      </section>

      <section className="scaffold bs-news-section" aria-labelledby="intelligence-roadmap">
        <div className="wrap">
          <div className="bs-section-head"><span className="bs-kicker">THE BUILDING BLOCKS</span><h2 className="bs-title" id="intelligence-roadmap">A foundation.<br />Then deeper intelligence.</h2></div>
          <div className="ni-roadmap-cards ni-roadmap-wide">
            <article><span className="ni-state">Available today</span><h3>Collect and organize evidence.</h3><p>Source-linked market headlines, approximate story grouping, headline-based summaries, collection freshness and updates since the last check. Agents can use this foundation now.</p><a className="bs-text-link" href="/dashboard">Try the live feed <ArrowRight size={15} /></a></article>
            <article><span className="ni-state ni-state-planned">Next layer / planned</span><h3>Interpret what deserves attention.</h3><p>Identify developments, connect related context, assess relevance to a task, and express possible implications with evidence and uncertainty. This requires work beyond today’s headline summaries.</p><a className="bs-text-link" href="https://github.com/thepeternemec/NewsBeat" target="_blank" rel="noopener noreferrer">Follow development <ArrowUpRight size={15} /></a></article>
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
