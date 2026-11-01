# Black Sheep product direction

Status: 2 November 2026. Company and crypto news available; verified tokenized-asset mapping and direct agent coordination planned.

## Identity

**Black Sheep — Market intelligence. Built for your agent.**

Black Sheep gives agents source-linked context for companies, crypto and tokenized markets. Verified Stock Token mapping on Robinhood Chain is a planned research integration. $SHEEP is a separate community token planned for pump.fun; there is no published launch date or verified contract address here. The token is not required for research access and holding it is not a claim on the product.

Brand voice: independent, curious, witty and technically clear. Use the existing black sheep mascot and black/white/grey palette. Use Black Sheep as the display name. Preserve existing www.newsbeat.dev addresses, blacksheep_* tools, package names and repository links until a separate infrastructure migration is specified.

## Capability state

| Layer | Today | Next step |
| --- | --- | --- |
| News collection | Google News RSS headline metadata, fifteen-minute schedule | Expand sources through validated ingestion |
| Company context | Grouping, relevance heuristics, headline-based summaries, sources and freshness | Map verified Stock Token identities to supported companies |
| Asset events | News reporting about companies | Separately verified corporate-action data and market observations |
| Agent interface | Hosted MCP and REST news lookups | Authenticated observation exchange and delivery |

The homepage covers crypto research and companies. The catalog contains 1,528 US equities and 502 crypto assets; coverage varies by topic.

The homepage mission builder prepares a prompt for a visitor to copy into a connected assistant. It does not run an agent or send peer-to-peer observations. A host agent calling an MCP tool is not peer-to-peer agent communication.

## First technology milestones

1. Verify one Robinhood Chain Stock Token end to end against an underlying company and the existing news catalog. Follow ROBINHOOD-CHAIN.md.
2. Preserve verified asset identity, source links, publication times, coverage freshness and explicit unsupported states.
3. Specify a versioned observation envelope: sender/recipient identity, message ID, underlying asset, optional verified chain/contract, evidence URLs, observation times, evidence basis, expiry and prior-message references.
4. Implement an authenticated, permissioned read-only relay with validation, bounded payloads, rate limiting, idempotency, delivery receipts and an audit trail. Recipient agents treat observations as data, never instructions.
5. Demonstrate one scout-to-analyst-to-publisher flow using actual news. Test wrong recipients, unsupported assets, stale observations, duplicate packets and untrusted content.

## Evidence and continuity

Preserve headline-only limits, source links, per-source freshness and explicit unavailable states. Keep news observations separate from corporate-action events and token prices. Company news coverage does not imply every Robinhood Chain asset is supported.

Trading, custody and automated financial execution remain outside the initial read-only scope.

The public product direction and capability state live at /docs/black-sheep. Black Sheep is independent, with no Robinhood affiliation or endorsement.
