# NewsBeat project status

Updated **2026-11-07** from the current main-branch implementation. Counts describe the bundled catalog, not a guarantee of live article coverage.

## Product direction

NewsBeat is building meaningful signals for AI agents. The source-linked news foundation is live; a first general signal-construction pilot is implemented for six assets. Task-specific relevance, broader context and stronger verification remain planned. Stocks and crypto describe coverage. [Read the product direction](INTELLIGENCE.md).

## Current main branch

| Capability | Status |
| --- | --- |
| Independent discovery | Past-only 15/30/60-minute market scans, descriptive historical rarity, volatility context and frozen episode outcomes; no headline thesis required |
| Intelligence pilot | Persistent thesis revisions, measured information deltas, pre-information beta/residuals, participation/liquidity gates and prospective outcomes for NVIDIA, Apple, Microsoft, Alphabet, Bitcoin and Ethereum |
| Asset catalog | **2,030 topics**: 1,528 US-listed equities and 502 crypto assets |
| Headline reads | Source-linked articles with freshness, bounded pages and history cursors |
| Change monitoring | Signed, asset-bound cursors; clients poll for newly indexed items |
| Briefs | Up to three distinct ranked recent headlines verbatim, with source and UTC time |
| Stories | Approximate headline grouping, ranked by relevance, with original reports and source links |
| Question research | Evidence-led answers, conditional reasoning, unknowns and next checks across the catalog; missing market data explicit |
| Batched watch | Up to 50 assets per request; each result can succeed or fail independently |
| REST and function calling | 16 research operations plus explicit collection control and schemas at `/api/v2/tools` |
| Hosted MCP | 17 tools over Streamable HTTP at `/api/mcp`, 16 research operations plus the explicit `newsbeat_collection` control |
| Supporting reference utilities | Sourced crypto prices, sentiment, chain readings, contract prices and positioning, retained through REST and MCP |
| Intelligence workbench | Full-width measured market path, context selection, thesis/evidence inspector, timing reasons and forward observation cohorts. The former `/crypto` page redirects here. |
| Web news explorer | Asset search, grouped stories, source expansion, Show more controls and on-demand research questions |
| Self-serve keys | GitHub sign-in; signing in again rotates the existing key |
| Account billing | Keyed REST usage is metered; anonymous reads are free and rate limited |
| Ingestion | Google News RSS by default; Vercel cron configured every 10 minutes |
| Retention | 30-day API window; maintenance retains 35 days by default |

The scheduled worker uses a time budget and prioritizes overdue assets. A schedule is not proof that every fetch succeeded: inspect `status`, `last_success_at`, article counts and the cron’s deferred/error counts. Empty coverage can be legitimate for quiet assets.

## Question research and ranked coverage

Use `newsbeat_research` or `POST /api/v2/research` with the actual question. Identity resolution, relevant reporting and available market checks feed a direct answer, cited conditional reasoning, unknowns and next checks. The news catalog is available on demand; measured quantitative coverage stays at six assets. Ambiguous identities return candidates, and missing measurements cannot establish timing or a price reaction.

Generation uses the existing gateway with an 18-second timeout, a 1,600-token output cap, a five-minute per-instance cache and bounded per-instance concurrency. Invalid, unavailable or failed model output returns evidence_only, never an invented successful answer. Existing GET intelligence reads remain stored reads. No collection session, schedule, notification or trade is created. [Details](RESEARCH.md).

Generated headline summarization is retired. The legacy summary route and tool remain deprecated compatibility reads returning verbatim headlines only.

REST story snapshots scan 200 reports by default (`limit` 1–500). MCP returns up to 40 ranked groups from 200 reports. Grouping retains every report in the returned snapshot and can still miss paraphrases or combine unrelated coverage. Source counts describe coverage, not independent corroboration. Use article-level cursors for follow-up arrivals; group IDs can change as the snapshot rolls.

## Brand and domain

The product and repository are **NewsBeat**, live at **https://www.newsbeat.dev**. The public mission is meaningful signals for AI agents. The live news foundation covers stocks and crypto. Pilot xStock exchange pairs are verified against the venue directory; onchain contract, redemption and consolidated underlying-stock verification remain planned. Use `https://www.newsbeat.dev/api` for REST and `https://www.newsbeat.dev/api/mcp` for MCP. The `news-beat.vercel.app` host remains an alternate service address. Public reads are free during early access; no API key or credit card is needed. Account keys have a **seven-day evaluation** from the first metered REST call, with up to **$6 in trial credit**. The start is recorded per account in the usage ledger, so rotating a key does not reset it. Existing accounts keep their balances and start their seven-day window on their next metered call after this release. `GET /api/keys/trial` reports the deadline and spendable credit. When the trial ends, unused trial credit becomes unavailable and keyed reads return `402 trial_expired`; public anonymous reads continue. Stripe checkout is not live.

New discovery uses `newsbeat_*` tool names. Old tool names, deployed environment-variable names and existing signed cursors retain compatibility. Workspace package names use `@newsbeat/*` and `newsbeat-*`.

## Planned connector expansion

[PR #11](https://github.com/thepeternemec/NewsBeat/pull/11) implements eight shared MCP/REST operations, general news search and source-record lookup, named independent keys, atomic account metering, OAuth resource-server verification, saved watches and signed webhooks. It also includes Telegram/Discord relay and Grok API examples.

PR #11 was closed without merging. Its implementation remains a reference for future work and is not available on main. Shipping those capabilities requires additive database migration, environment configuration and end-to-end activation. An external OAuth authorization server and platform-specific consent/client registration must be configured separately.

## Remaining limits

- Main-branch MCP calls do not yet share the full REST billing boundary; PR #11 addresses this.
- General event interpretation is a limited headline-based model pilot, not verified causal analysis. Task-aware relevance and broad signal intelligence remain planned.
- Summaries are based only on headlines. Output checks reduce some errors but do not establish truth, read full articles or verify market impact.
- No full article bodies, article ledes, trade execution, prediction-market prices or Polymarket account integration.
- No general-news query search or server-scheduled notifications on main yet; the existing watch endpoint is client polling.
- Stripe checkout is not implemented here. Trial credit and operator balance grants are separate from payment collection.
- No claim of approval in ChatGPT, Claude, Muse or Grok consumer directories.
- Source/article totals vary over time. Historical measurements are not current coverage guarantees.

## Verify

```bash
npm ci
npm run build
npm test
```

Check `/api/health`, `/api/v2/topics?limit=5`, `/api/v2/news?beat_id=b_bb964843350e`, and `/api/v2/summary?beat_id=b_bb964843350e` on the target deployment. Confirm the summary’s method, source links, freshness and coverage limit. Use the connection screen for a live MCP round-trip check. Never test billing or destructive maintenance against production accounts merely to validate a preview.

Update this file and the README whenever capabilities change.

## Contextual signal construction

The six-asset pilot adds three decision contexts, market-channel hypotheses, observable trigger evidence, invalidation and explicit reasons to wait. Deterministic checks gate review alerts; an idempotent journal records qualifying versions and closes earlier alerts when a premise is revised. REST and the existing MCP intelligence tool expose constructions and review-alert records. Kraken xStock and crypto venue data add measured timing checks and frozen prospective outcome records. Threshold calibration, expectation changes, custom contexts and notification delivery remain planned. See [quantitative methodology](QUANTITATIVE.md).
