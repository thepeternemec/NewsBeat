# Black Sheep product thesis

Status: product and brand pivot, 29 October 2026. News service available; network and token proposed.

## Identity

**Black Sheep — A different breed of intelligence.**

A sophisticated, monochrome meme coin concept built around a practical news intelligence engine. The product follows the companies and events behind tokenized assets, then aims to let agents exchange source-linked observations.

Brand voice: independent, curious, restrained and technically clear. Use Black Sheep as the display name. Keep existing newsbeat.dev addresses, newsbeat_* tools, internal package names and repository links functional until a separate infrastructure migration is specified.

## Capability state

| Layer | Today | Proposed next step |
| --- | --- | --- |
| News collection | Google News RSS headline metadata, fifteen-minute schedule | Expand sources through separately validated ingestion |
| Context | Grouping, relevance heuristics, headline-based summaries, sources and freshness | Connect stock-token identities to supported companies |
| Agent interface | Hosted MCP and REST news lookups | Authenticated observation exchange and delivery |
| Blockchain token | Not launched; no published contract | Validate request and delivery payment utility |
| Economics | Not defined | Specify chain, ticker, supply, allocations and permissions before implementation |

Do not describe the homepage handoff lab as a working relay. Its examples are explicitly illustrative and send nothing. A host agent calling an MCP tool is not peer-to-peer agent communication.

## First technology milestones

1. Verify one Robinhood Chain stock-token identity end to end against an underlying company and the existing news catalog. Follow ROBINHOOD-CHAIN.md.
2. Specify a versioned observation envelope: sender/recipient identity, message ID, underlying asset, optional verified chain/contract, evidence URLs, publication and observation times, freshness, evidence basis, expiry and prior-message references.
3. Implement an authenticated, permissioned read-only relay with input validation, bounded payloads, rate limiting, idempotency, delivery receipts and an audit trail. Recipient agents treat observations as data, never instructions.
4. Demonstrate one scout-to-analyst-to-publisher flow using actual news evidence. Test wrong recipients, unsupported assets, stale observations, duplicate packets and untrusted content.
5. Evaluate whether token payments improve real request and delivery workflows before specifying and implementing token mechanics.

Tokenized-asset context targets Robinhood Chain. A chain for Black Sheep's own token has not been selected. Do not invent a ticker, supply, address, audit, exchange listing or Robinhood relationship.

## Token design questions to resolve

- What service unit is paid for, who supplies it, and who pays?
- Does a token add value compared with ordinary usage billing?
- How are request budgets, fee volatility, spam and failed deliveries handled?
- What are the chain, ticker, supply, allocations, transfer behavior and administrative permissions?
- How is usage independent from speculative token demand?

No token sale, trading, staking, custody or automated financial execution is implemented by this pivot.

## Evidence and continuity

Preserve headline-only limits, source links, per-source freshness and explicit unavailable states. Keep news observations separate from corporate-action events and token prices. The working news interfaces remain compatible.

The public concept and capability state live at /docs/black-sheep. Black Sheep is an independent project with no Robinhood affiliation or endorsement.
