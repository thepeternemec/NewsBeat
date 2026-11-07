import { ArrowRight } from "lucide-react";
import ResearchQuestion from "@/components/site/research-question";
import CopyButton from "@/components/site/copy-button";
import "./try.css";

export const metadata = {
  title: "Ask NewsBeat",
  description: "Ask a stock or crypto research question. Get a direct answer, evidence, uncertainty and the next check.",
};
const REQUEST = `curl -X POST "https://www.newsbeat.dev/api/v2/research" \\
  -H "Content-Type: application/json" \\
  -d '{"question":"What could change the outlook for NVIDIA?"}'`;

export default function TryNewsBeat() {
  return (
    <div className="try-guide">
      <header className="docs-head">
        <span className="sec-eyebrow">Your question · an evidence-led answer</span>
        <h1>Understand the picture.</h1>
        <p className="docs-lead">Ask what could matter, what the market confirms and what would change the view.
          NewsBeat checks the available evidence and explains its answer. No account or key needed.</p>
      </header>
      <ResearchQuestion />
      <h2>From a question to a next check</h2>
      <ol className="try-steps">
        <li><strong>Ask naturally.</strong> Name a company or crypto asset. Compare up to three. Ambiguous tickers need an exact match.</li>
        <li><strong>Inspect the reasoning.</strong> The answer separates reporting from possible mechanisms and checks available market measurements. Expand the evidence to see sources and dates.</li>
        <li><strong>Know what would change the view.</strong> Read the unknowns and observable next checks. Missing measurements cannot establish a price reaction or timing signal.</li>
      </ol>
      <p>News research covers the 2,030-asset catalog. Deeper measured market checks remain a six-asset pilot.
        Questions requiring older history, full reports or unavailable market data will show those limits.</p>
      <h2>Bring this flow into your agent</h2>
      <p>Connect the remote MCP server and ask your assistant to use <code>newsbeat_research</code> with your actual question.
        The browser above uses the same research flow.</p>
      <a className="try-next" href="/docs/quickstart">Connect your assistant <ArrowRight size={15} /></a>
      <h2>Use the API</h2>
      <div className="code"><div className="code-bar">Question research <CopyButton text={REQUEST} label="request" /></div><pre>{REQUEST}</pre></div>
      <p>Research runs on demand. It does not activate one-minute collection or send alerts. Public access is free during early access and rate limited.</p>
    </div>
  );
}
