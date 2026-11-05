import { ArrowRight, ArrowUpRight } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import SignalInspector from "@/components/site/signal-inspector";
import AgentSignalFlow from "@/components/site/agent-signal-flow";
import CopyButton from "@/components/site/copy-button";
import "../landing.css";
import "../newsbeat.css";
import "../newsbeat-polish.css";
import "../quantitative.css";

export const metadata = {
  title: "NewsBeat intelligence — Help your agent know what matters",
  description: "Give your agent the reported change, why it could matter, and a reason to review, wait or reassess. Explore a real stock or crypto signal, with detailed measurements when you want them.",
  alternates: { canonical: "https://www.newsbeat.dev/intelligence" },
};
const QUESTIONS = [
  { title: "Understand a company.", question: "Use NewsBeat to check NVIDIA. What changed, why could it matter, and is there a reason to review it now?" },
  { title: "Question the market story.", question: "Use NewsBeat to check Ethereum. Does the recent reporting change the view, and what is still unconfirmed?" },
];
export default function IntelligencePage() {
  return <>
    <SiteNav active="/intelligence" />
    <main className="landing-home bs-home nb-home ni-quant-home">
      <section className="wrap ni-quant-head">
        <div className="ni-quant-copy"><span className="bs-kicker">NEWSBEAT / AGENT INTELLIGENCE</span><h1>Help your agent<br /><span>know what matters.</span></h1><p>Give your agent the change, the reason it could matter, and a clear signal to review, wait or reassess.</p><div className="hero-cta"><a className="btn-primary" href="/docs/quickstart">Connect your agent <ArrowRight size={16} aria-hidden="true" /></a><a className="bs-text-link" href="#real-signal">See a real signal <ArrowRight size={15} aria-hidden="true" /></a></div><small>Stocks and crypto · MCP or API · No account needed</small></div>
        <AgentSignalFlow />
      </section>
      <div className="wrap ni-agent-value" aria-label="What NewsBeat brings to your agent"><span>Notice what changed.</span><span>Understand the context.</span><span>Know what to check next.</span></div>
      <section className="wrap ni-quant-workspace" id="real-signal" aria-labelledby="real-signal-title">
        <div className="ni-workspace-heading"><div><span className="bs-kicker">SEE WHAT THE CONNECTION ADDS</span><h2 id="real-signal-title">A headline. Then a clearer view.</h2></div><p>Choose an asset and a focus. See the reporting alongside the context your agent can use. Open the reasoning or numbers when you want to go deeper.</p></div>
        <SignalInspector />
      </section>
      <section className="wrap ni-agent-questions" aria-labelledby="agent-questions-title">
        <div className="ni-agent-questions-head"><span className="bs-kicker">BRING IT INTO THE CONVERSATION</span><h2 id="agent-questions-title">Connect once.<br /><span>Ask a better question.</span></h2><p>After adding NewsBeat to a compatible agent, try one of these. Your agent can bring the reporting, market checks and uncertainty into its answer.</p><a className="bs-text-link" href="/docs/quickstart">Set up the connection <ArrowUpRight size={15} aria-hidden="true" /></a></div>
        <div className="ni-question-cards">{QUESTIONS.map(item => <article key={item.title}><h3>{item.title}</h3><p>{item.question}</p><CopyButton text={item.question} label="Copy question" /></article>)}</div>
      </section>
      <div className="wrap ni-method-link"><p>Research pilot for selected stocks and crypto. Interpretations are based on headline reporting; a review signal asks for investigation.</p><a href="/docs/intelligence">Explore the checks and limitations <ArrowUpRight size={14} aria-hidden="true" /></a></div>
    </main>
    <SiteFooter />
  </>;
}
