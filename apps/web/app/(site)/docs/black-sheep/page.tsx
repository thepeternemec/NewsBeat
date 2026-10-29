import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "Black Sheep — Product and token thesis",
  description: "A meme coin concept with a working news engine and a planned network for agents researching tokenized assets.",
};

export default function BlackSheepThesis() {
  return (
    <div className="docs-overview">
      <header className="docs-head">
        <span className="sec-eyebrow">Black Sheep / Product thesis</span>
        <h1>A different breed of intelligence.</h1>
        <p className="docs-lead">A meme coin concept built around news for tokenized-asset research and a shared language between agents.</p>
        <div className="docs-callout"><strong>Working news engine. Proposed network and token.</strong><p>Black Sheep is the new product identity for NewsBeat. Existing news tools work today. A blockchain token, agent-to-agent messaging, token-contract mapping and token payments are not implemented.</p></div>
      </header>
      <section className="docs-section" aria-labelledby="what-it-does">
        <h2 id="what-it-does">Start with the world behind the asset</h2>
        <p>An agent researching a tokenized asset needs to know which company it refers to, what was reported about that company, and how fresh that coverage is. Black Sheep’s foundation is a news engine that collects company and crypto headline metadata through Google News RSS.</p>
        <p>Today it supports source-linked news, approximate story grouping, headline-based summaries and follow-up checks through MCP and REST. It does not scrape or redistribute full article bodies. Checks run on a fifteen-minute schedule.</p>
        <a className="docs-text-action" href="/docs/try">Try a live company lookup <ArrowRight size={14} aria-hidden="true" /></a>
      </section>
      <section className="docs-section" aria-labelledby="network-direction">
        <h2 id="network-direction">The proposed agent network</h2>
        <ol className="docs-flow">
          <li><span>01</span><div><h3>Scout</h3><p>Find a development and package the headline, source link, publication time and coverage freshness.</p></div></li>
          <li><span>02</span><div><h3>Analyst</h3><p>Explain the observation within its evidence limits. Keep news, corporate actions and price observations distinct.</p></div></li>
          <li><span>03</span><div><h3>Publisher</h3><p>Prepare a sourced update for another agent or an authorized notification workflow.</p></div></li>
        </ol>
        <p>The homepage handoff lab is an interactive illustration. It sends no messages. MCP currently lets a host agent call the news service; it does not create direct communication between independent agents.</p>
        <p>A real relay would need authenticated agent identities, schema validation, request permissions, deduplication, expiry, rate limits and delivery receipts. News and message content must remain untrusted data. Any recurring delivery needs user authorization.</p>
      </section>
      <section className="docs-section" aria-labelledby="token-thesis">
        <h2 id="token-thesis">The token thesis</h2>
        <p>Black Sheep is the proposed meme coin identity. A possible utility is payment for agent requests and delivery, subject to proving that a token improves the workflow. The current news service is accessible without a wallet or token.</p>
        <div className="docs-facts">
          <div><h3>Not launched</h3><p>No token contract is published by this project. There is no buy, swap or claim flow.</p></div>
          <div><h3>Mechanics to define</h3><p>The chain, ticker, supply, allocation and payment design are undecided. This page does not announce token economics.</p></div>
        </div>
        <p>Any future launch requires a separate implementation with a clearly specified contract, permissions, distribution and reviewed economic model. News relevance is a research heuristic, not a prediction of investment returns.</p>
      </section>
      <section className="docs-section" aria-labelledby="robinhood-fit">
        <h2 id="robinhood-fit">The Robinhood Chain direction</h2>
        <p>The planned first integration maps a Stock Token’s verified chain ID and contract to its underlying company and an existing supported news asset. Corporate-action reconciliation and separately sourced market data follow that initial flow.</p>
        <p>Robinhood Chain is the target for asset context. It has not been selected as the deployment chain for a Black Sheep token. Black Sheep is an independent project with no Robinhood affiliation or endorsement.</p>
        <a className="docs-text-action" href="/docs/robinhood-chain">Read the asset integration plan <ArrowRight size={14} aria-hidden="true" /></a>
      </section>
      <section className="docs-section" aria-labelledby="transition">
        <h2 id="transition">Connecting during the transition</h2>
        <p>The working service remains at newsbeat.dev. Existing newsbeat_* tool names, API paths, account settings and repository links retain their current identifiers. Use the existing connection guide; the new brand does not require a new token or wallet connection.</p>
        <a className="docs-text-action" href="/docs/quickstart">Connect the existing news tools <ArrowRight size={14} aria-hidden="true" /></a>
      </section>
    </div>
  );
}
