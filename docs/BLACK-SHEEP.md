# Black Sheep product direction

Status: 29 October 2026. Company news available; verified tokenized-asset mapping and direct agent coordination planned.

## Identity

**Black Sheep — Intelligence for tokenized assets.**

Black Sheep follows the companies and events behind tokenized real-world assets and gives agents source-linked context. The initial focus is Stock Tokens on Robinhood Chain. It is a research product and does not issue its own token.

Brand voice: independent, curious, witty and technically clear. Use the black sheep mascot, black/white/grey base and restrained lime interface accents. Use Black Sheep as the display name. Preserve existing newsbeat.dev addresses, newsbeat_* tools, package names and repository links until a separate infrastructure migration is specified.

## Capability state

| Layer | Today | Next step |
| --- | --- | --- |
| News collection | Google News RSS headline metadata, fifteen-minute schedule | Expand sources through validated ingestion |
| Company context | Grouping, relevance heuristics, headline-based summaries, sources and freshness | Map verified Stock Token identities to supported companies |
| Asset events | News reporting about companies | Separately verified corporate-action data and market observations |
| Agent interface | Hosted MCP and REST news lookups | Authenticated observation exchange and delivery |

The existing crypto news catalog remains compatible; it does not define the new product focus. The homepage examples lead with underlying companies.

Do not describe the homepage handoff lab as a working relay. Its examples are illustrative and send nothing. A host agent calling an MCP tool is not peer-to-peer agent communication.

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
