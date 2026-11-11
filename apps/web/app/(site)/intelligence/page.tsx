import { ArrowRight, ArrowUpRight } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import SignalInspector from "@/components/site/signal-inspector";
import OpportunityBrief from "@/components/site/opportunity-brief";
import AgentSignalFlow from "@/components/site/agent-signal-flow";
import CopyButton from "@/components/site/copy-button";
import "../landing.css";
import "../newsbeat.css";
import "../newsbeat-polish.css";
import "../quantitative.css";

export const metadata = {
  title: "Rarebird intelligence — Market signals and their evidence",
  description: "Give your agent the reported change, why it could matter, and a reason to review, wait or reassess. Explore a real stock or crypto signal, with detailed measurements when you want them.",
  alternates: { canonical: "https://www.newsbeat.dev/intelligence" },
};
const QUESTIONS = [
  { title: "Understand a company.", question: "Use Rarebird to check NVIDIA. What changed in its latest reported results, and what still needs confirmation?" },
  { title: "Question the market story.", question: "Use Rarebird to check Ethereum. Does the recent reporting change the view, and what is still unconfirmed?" },
];
export default function IntelligencePage() {
  return <>
    <SiteNav active="/intelligence" />
    <main className="landing-home bs-home nb-home ni-quant-home">
      <section className="wrap ni-quant-head">
        <div className="ni-quant-copy"><span className="bs-kicker">RAREBIRD / AGENT INTELLIGENCE</span><h1>Help your agent<br /><span>know what matters.</span></h1><p>Give your agent the change, the evidence behind it, and what to check next.</p><div className="hero-cta"><a className="btn-primary" href="#opportunities">See what to investigate <ArrowRight size={16} aria-hidden="true" /></a><a className="bs-text-link" href="/docs/quickstart">Connect your agent <ArrowRight size={15} aria-hidden="true" /></a></div><small>Stocks and crypto · MCP or API · No account needed</small></div>
        <AgentSignalFlow />
      </section>
      <div className="wrap" id="opportunities"><OpportunityBrief /></div>
      <section className="wrap ni-quant-workspace" id="real-signal" aria-labelledby="real-signal-title">
        <div className="ni-workspace-heading"><div><span className="bs-kicker">SEE WHAT THE CONNECTION ADDS</span><h2 id="real-signal-title">A headline. Then a clearer view.</h2></div><p>Choose an asset and a focus. See the reporting alongside the context your agent can use. Open the reasoning or numbers when you want to go deeper.</p></div>
        <SignalInspector />
      </section>
      <section className="wrap ni-agent-questions" aria-labelledby="agent-questions-title">
        <div className="ni-agent-questions-head"><span className="bs-kicker">BRING IT INTO THE CONVERSATION</span><h2 id="agent-questions-title">Connect once.<br /><span>Ask a better question.</span></h2><p>After adding Rarebird to your agent, ask about a company or market move and follow the evidence in its answer.</p><a className="bs-text-link" href="/docs/quickstart">Set up the connection <ArrowUpRight size={15} aria-hidden="true" /></a></div>
        <div className="ni-question-cards">{QUESTIONS.map(item => <article key={item.title}><h3>{item.title}</h3><p>{item.question}</p><CopyButton text={item.question} label="Copy question" /></article>)}</div>
      </section>
      <div className="wrap ni-method-link"><p>Research pilot for selected stocks and crypto. Interpretations are based on headline reporting; a review signal asks for investigation.</p><a href="/docs/intelligence">Explore the checks and limitations <ArrowUpRight size={14} aria-hidden="true" /></a></div>
    </main>
    <SiteFooter />
  </>;
}
