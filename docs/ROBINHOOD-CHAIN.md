# Robinhood Chain direction

Status: product alignment and integration plan, 29 October 2026. No chain integration is released by this change.

## Positioning

**Black Sheep — The intelligence layer for Stock Tokens.**

Give agents and applications source-linked company and crypto news, then connect that context to tokenized assets on Robinhood Chain. The initial audience is developers building research assistants, portfolio explanations and watchlist workflows.

Robinhood Chain describes an open, EVM-compatible network for traditional markets, crypto and tokenized real-world assets. Our proposed role is the context around those assets. This is our product direction, not an announced Robinhood partnership.

Black Sheep is the new product identity. Preserve the black, white and grey design and the existing Black Sheep connection identifiers. See BLACK-SHEEP.md for the tokenized-asset research direction and proposed agent network.

## Available versus planned

| Area | State |
| --- | --- |
| Supported-company and crypto headlines, grouping, summaries, change cursors | Available through existing MCP and REST tools |
| Token contract to underlying-company mapping | Planned |
| Corporate-action API ingestion and multiplier-event reconciliation | Planned |
| Separately sourced token prices and optional read-only wallet balances | Planned |
| Transaction execution, custody, gas sponsorship, autonomous trading | Outside the initial read-only scope |

Existing news coverage does not imply coverage of every Robinhood Chain asset. News refreshes on the existing fifteen-minute ingestion schedule; it is not a trading-grade real-time feed.

## First complete flow

1. Resolve a selected stock token using the official asset catalog.
2. Validate the asset UID and its chain-ID/contract deployment.
3. Match its underlying company to a supported Black Sheep asset ID using verified entity mapping.
4. Return existing news and summary results with publisher links, publication times and freshness.
5. Retain the existing news cursor for follow-up article arrivals.
6. Return explicit unsupported or stale results when the mapping or sources cannot support the request.

Do not infer a contract identity from a symbol alone. Do not assume the current company catalog and chain token catalog are identical. Expose a new public tool only when its handler, shared schema and verified data source exist.

Acceptance for this first integration:
- One supported token resolves end to end to the intended company and its actual news.
- Same-symbol and unknown-contract cases cannot silently select the wrong asset.
- Wrong-chain, inactive-asset and upstream-unavailable cases are explicit.
- Publication times, news freshness and registry observation times are retained independently.
- Current MCP/REST tools and cursor behavior remain compatible.

## Follow-on phases

**Corporate events.** Read the documented corporate-action API; reconcile completed actions with onchain multiplier updates and effective timestamps. Distinguish pending and completed actions. A news report about a dividend is not proof of a token adjustment. Use stable upstream identities for deduplication.

**Market context.** Read documented prices with source timestamps and freshness checks. REST bid/ask values describe the underlying equity and require the asset multiplier for token-equivalent values. Documented onchain Chainlink values already include it. Never apply it twice. Use decimal-safe arithmetic, feed decimals, sequencer checks and stale-source handling.

**Portfolio context.** Add opt-in read-only balance lookup after the asset workflow is verified. Keep token balance, UI-adjusted exposure and price units distinct. Wallet transaction permissions and account abstraction are separate future work.

Use testnet for initial network verification and recheck official deployments before production activation. Configure production RPC through the normal server-side environment workflow. No wallet keys or signing permissions are needed for the initial flow.

## Evidence contract

An eventual combined response should keep these separate:
- Token identity: upstream asset UID, chain ID, contract, underlying company and Black Sheep asset ID.
- News evidence: existing items, source links, publication times, freshness and coverage limits.
- Corporate events: upstream IDs, status, effective time and provenance.
- Market observations: origin, units, multiplier basis and source update time.
- Retrieval state: checked time plus explicit missing, stale or unavailable components.

These are design requirements, not shipped fields or endpoints. News summaries remain headline-based. Do not infer price causality, investment merit or market impact from a headline.

## Product copy

Hero: **The intelligence layer for Stock Tokens.**

Description: Research the companies behind Stock Tokens, including NVIDIA, Alphabet (Google), Apple and more. Bring source-linked news into your agent through MCP or API. Robinhood Chain token integration is planned; company news is available today.

Integration label: **Planned / Robinhood Chain** until verified code is released.

Stock Tokens provide economic exposure under their issuer’s terms, not direct ownership of underlying shares. Asset availability and trading access vary. Keep these distinctions in documentation and do not imply universal access.

## Official sources

- [Vision and ecosystem](https://docs.robinhood.com/chain/)
- [Network configuration](https://docs.robinhood.com/chain/connecting/)
- [Stock Token APIs](https://docs.robinhood.com/chain/stock-token-apis/)
- [Building with Stock Tokens](https://docs.robinhood.com/chain/building-with-stock-tokens/)
- [Oracle and feed checks](https://docs.robinhood.com/chain/oracles-and-price-feeds/)
- [Brand guidelines](https://docs.robinhood.com/chain/brand-guidelines/)

Black Sheep is an independent project with no Robinhood affiliation or endorsement. Use the full name “Robinhood Chain”; preserve Black Sheep’s own branding.

