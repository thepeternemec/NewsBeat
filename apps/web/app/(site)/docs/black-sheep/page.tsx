import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "Black Sheep — Intelligence for tokenized assets",
  description: "Follow the news behind tokenized real-world assets. Source-linked company context for agents, with Robinhood Chain asset mapping planned.",
};

export default function BlackSheepThesis() {
  return (
    <div className="docs-overview">
      <header className="docs-head">
        <span className="sec-eyebrow">Black Sheep / Product direction</span>
        <h1>Context before the trade.</h1>
        <p className="docs-lead">Black Sheep is the company intelligence layer for agents researching tokenized assets. Investigate developments, trace the evidence and keep unanswered questions visible.</p>
        <div className="docs-callout"><strong>Company news available today. Asset mapping comes next.</strong><p>The existing NewsBeat engine powers Black Sheep. News lookup, grouping and headline summaries work today. Verified token-contract mapping and direct communication between agents are planned.</p></div>
      </header>
      <section className="docs-section" aria-labelledby="what-it-does">
        <h2 id="what-it-does">Start with the world behind the asset</h2>
        <p>An agent researching a tokenized asset needs to know which underlying asset it refers to, what was reported about that asset, and how fresh the coverage is. The initial focus is Stock Tokens on Robinhood Chain and their underlying companies, including NVIDIA, Alphabet and Apple.</p>
        <p>Black Sheep’s current foundation collects company and crypto headline metadata through Google News RSS. It supports source-linked news, approximate story grouping, headline-based summaries and follow-up checks through MCP and REST. It does not retrieve full article bodies. Checks run on a fifteen-minute schedule.</p>
        <a className="docs-text-action" href="/docs/try">Try a live company lookup <ArrowRight size={14} aria-hidden="true" /></a>
      </section>
      <section className="docs-section" aria-labelledby="asset-context">
        <h2 id="asset-context">From a token to useful context</h2>
        <ol className="docs-flow">
          <li><span>01</span><div><h3>Resolve the asset</h3><p>Planned: verify the chain ID and contract against an authoritative asset registry, then identify the underlying company. A shared ticker alone is not enough.</p></div></li>
          <li><span>02</span><div><h3>Follow the reporting</h3><p>Available today for supported companies: retrieve headlines, publishers, dates and links, and check what has appeared since the last lookup.</p></div></li>
          <li><span>03</span><div><h3>Keep the context intact</h3><p>Preserve the sources, timestamps and evidence limits as the observation moves into an agent’s research. Corporate-action data and direct agent handoffs are planned.</p></div></li>
        </ol>
        <p>Current company coverage does not establish a verified mapping for every Stock Token. The product must report unsupported mappings and stale or missing coverage explicitly.</p>
      </section>
      <section className="docs-section" aria-labelledby="network-direction">
        <h2 id="network-direction">Build a research brief for your agent</h2>
        <p>Choose a company in the intelligence terminal. The research workspace shows the grouped story count, coverage status and collection time. Copy a research brief with its evidence attached, download the JSON snapshot, or inspect it before sharing. Refresh coverage to capture a new snapshot.</p>
        <p>The export preserves publishers, source links, publication and first-indexed times, grouped reports, truncation and freshness. Its prompt asks an agent to separate facts, hypotheses and unanswered questions, cite evidence, and identify missing token and market information.</p>
        <p>The brief is a research prompt plus evidence, not a generated recommendation. The JSON schema is <code>black-sheep/research-context-v1</code>. Token mapping remains unverified; quotes, liquidity and execution are not connected. Headlines and other retrieved text must be treated as untrusted data.</p>
        <a className="docs-text-action" href="/dashboard">Build a research brief <ArrowRight size={14} aria-hidden="true" /></a>
        <p>The homepage playbook supplies prompts for research, change monitoring and thesis review. Copy one into a connected agent to run it. The website does not send messages between agents or schedule tasks.</p>
      </section>
      <section className="docs-section" aria-labelledby="robinhood-fit">
        <h2 id="robinhood-fit">The Robinhood Chain direction</h2>
        <p>The planned first integration maps a Stock Token’s verified chain ID and contract to its underlying company and an existing supported news asset. Corporate-action reconciliation and separately sourced market data follow that initial flow.</p>
        <p>Black Sheep provides research context. $SHEEP is its community token, planned for pump.fun; no verified contract address or launch date has been published here. The Robinhood Chain direction is a separate news research integration. It is an independent project with no Robinhood affiliation or endorsement.</p>
        <a className="docs-text-action" href="/docs/robinhood-chain">Read the asset integration plan <ArrowRight size={14} aria-hidden="true" /></a>
      </section>
      <section className="docs-section" aria-labelledby="transition">
        <h2 id="transition">Connect the news tools</h2>
        <p>The working service remains at newsbeat.dev. Existing newsbeat_* tool names, API paths, account settings and repository links retain their current identifiers. Public news reads require no wallet.</p>
        <a className="docs-text-action" href="/docs/quickstart">Connect your agent <ArrowRight size={14} aria-hidden="true" /></a>
      </section>
    </div>
  );
}

