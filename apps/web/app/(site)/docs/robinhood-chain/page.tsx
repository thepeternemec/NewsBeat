import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "Robinhood Chain integration plan — NewsBeat",
  description: "How NewsBeat plans to connect tokenized assets to company news, corporate actions and source-linked research. Integration is planned, not live.",
};

export default function RobinhoodChainPlan() {
  return (
    <div className="docs-overview">
      <header className="docs-head">
        <span className="sec-eyebrow">Product direction / Planned integration</span>
        <h1>Market context for Robinhood Chain.</h1>
        <p className="docs-lead">
          Connect the asset onchain to the company and events behind it.
          Give agents, wallets and research apps a source-linked answer to “what changed?”
        </p>
        <div className="docs-callout">
          <strong>Integration status: planned.</strong>
          <p>NewsBeat currently supplies company and crypto headlines through MCP and REST.
            Token-contract mapping, chain balances, token prices and transaction execution
            are not implemented. NewsBeat is an independent project with no Robinhood
            affiliation or endorsement.</p>
        </div>
      </header>

      <section className="docs-section" aria-labelledby="chain-fit">
        <h2 id="chain-fit">Why this fits the network</h2>
        <p><a href="https://docs.robinhood.com/chain/">Robinhood Chain</a> is an open,
          Ethereum-compatible network designed to bring traditional markets, crypto and
          tokenized real-world assets together. Its documentation describes programmable,
          self-custodied assets and open developer access.</p>
        <p>Our proposed contribution is the context around those assets: company developments,
          corporate events, linked reporting and a clear account of when each source was checked.
          Developers could use that context in portfolio explanations, research assistants
          and watchlist workflows.</p>
      </section>

      <section className="docs-section" aria-labelledby="current-foundation">
        <h2 id="current-foundation">The foundation available today</h2>
        <div className="docs-facts">
          <div><h3>Company and crypto news</h3><p>Discover supported assets and retrieve headlines, grouped stories and headline-based summaries.</p></div>
          <div><h3>Follow-up checks</h3><p>Save a news cursor and ask for newly indexed items. Check up to 50 supported assets per request.</p></div>
          <div><h3>Evidence and freshness</h3><p>Publisher names, source links, publication times and per-asset freshness travel with the news.</p></div>
          <div><h3>Open interfaces</h3><p>Use the hosted MCP connection or REST API in your own assistant or application. Public reads are free during early access.</p></div>
        </div>
        <a className="docs-text-action" href="/docs/try">Try the current news service <ArrowRight size={14} aria-hidden="true" /></a>
      </section>

      <section className="docs-section" aria-labelledby="build-sequence">
        <h2 id="build-sequence">The planned build sequence</h2>
        <ol className="docs-flow">
          <li><span>01</span><div><h3>Resolve the token and the company</h3><p>Use the official asset catalog to connect an asset UID, chain ID and contract address to a supported NewsBeat company. Verify the mapping; shared ticker symbols alone are not enough. Return an explicit unsupported result when no mapping exists.</p></div></li>
          <li><span>02</span><div><h3>Explain corporate events</h3><p>Combine news with the documented corporate-action API and onchain multiplier events. Keep a reported company event separate from a confirmed token adjustment, including its effective time and source.</p></div></li>
          <li><span>03</span><div><h3>Add separately sourced market context</h3><p>Bring in documented price feeds and, later, optional read-only wallet balances. Preserve source timestamps, stale-data checks and the distinction between underlying-equity quotes and token values.</p></div></li>
        </ol>
        <p>First validation target: resolve one supported stock token, return the underlying
          company’s news with provenance, and handle unmapped or stale data explicitly.
          Expand only after that complete read-only flow is verified.</p>
      </section>

      <section className="docs-section" aria-labelledby="research-experience">
        <h2 id="research-experience">The experience we want to enable</h2>
        <p><strong>Planned example:</strong> “What changed with the company behind this stock
          token since my last check? Show the reporting, any confirmed corporate action,
          and when each data source was updated.”</p>
        <p>The response should identify the token and underlying company, distinguish news
          from token events, and show missing data. A headline does not establish why a price
          changed. News summaries remain based on headlines, not full article text.</p>
      </section>

      <section className="docs-section" aria-labelledby="integration-details">
        <h2 id="integration-details">Integration details to get right</h2>
        <ul>
          <li>Keep a stable mapping from token identity to the existing NewsBeat asset ID. Preserve existing news tools and cursors.</li>
          <li>Use the official per-chain deployments rather than assuming an equity ticker identifies a contract or supported token.</li>
          <li>Robinhood’s REST prices are underlying-equity bid/ask values; its documented onchain feeds include the corporate-action multiplier. Apply the multiplier once when converting REST prices, and never twice to onchain feed values.</li>
          <li>Respect each API’s cache window and rate limits. Track news freshness, quote time and chain observations independently.</li>
          <li>Validate chain identity and test on testnet before enabling production reads. Never substitute an empty response for an upstream failure.</li>
        </ul>
        <p>Stock Tokens provide economic exposure under their issuer’s terms; they are not direct
          ownership of the underlying shares. Open network access does not guarantee asset
          availability or trading access in every region. Trading and wallet permissions
          would require separate implementation and review.</p>
      </section>

      <section className="docs-section" aria-labelledby="official-references">
        <h2 id="official-references">Official references</h2>
        <ul>
          <li><a href="https://docs.robinhood.com/chain/">Robinhood Chain vision and ecosystem</a></li>
          <li><a href="https://docs.robinhood.com/chain/connecting/">Network configuration</a></li>
          <li><a href="https://docs.robinhood.com/chain/stock-token-apis/">Asset, price and corporate-action APIs</a></li>
          <li><a href="https://docs.robinhood.com/chain/building-with-stock-tokens/">Building with Stock Tokens</a></li>
          <li><a href="https://docs.robinhood.com/chain/oracles-and-price-feeds/">Oracles and price-feed checks</a></li>
        </ul>
        <a className="docs-text-action" href="mailto:contact@newsbeat.dev">Help shape the integration <ArrowRight size={14} aria-hidden="true" /></a>
      </section>
    </div>
  );
}
