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
        <h1>The news behind tokenized assets.</h1>
        <p className="docs-lead">Black Sheep follows the companies and events behind tokenized real-world assets and gives agents context they can verify.</p>
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
        <h2 id="network-direction">The proposed agent network</h2>
        <p>A Scout gathers the reporting. An Analyst adds bounded context. A Publisher prepares a sourced update for another agent or an authorized notification workflow.</p>
        <p>The homepage handoff lab is an interactive illustration and sends no messages. MCP currently lets a host agent call the news service; it does not create direct communication between independent agents.</p>
        <p>A real relay needs authenticated agent identities, schema validation, request permissions, deduplication, expiry, rate limits and delivery receipts. News and message content remain untrusted data. Recurring delivery needs user authorization.</p>
      </section>
      <section className="docs-section" aria-labelledby="robinhood-fit">
        <h2 id="robinhood-fit">The Robinhood Chain direction</h2>
        <p>The planned first integration maps a Stock Token’s verified chain ID and contract to its underlying company and an existing supported news asset. Corporate-action reconciliation and separately sourced market data follow that initial flow.</p>
        <p>Black Sheep provides research context and does not issue its own token. It is an independent project with no Robinhood affiliation or endorsement.</p>
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
