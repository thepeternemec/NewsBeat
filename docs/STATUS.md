# NewsBeat project status

Updated **2026-10-20** from the current main-branch implementation. Counts describe the bundled catalog, not a guarantee of live article coverage.

## Current main branch

| Capability | Status |
| --- | --- |
| Asset catalog | **2,030 topics**: 1,528 US-listed equities and 502 crypto assets |
| Headline reads | Source-linked articles with freshness, bounded pages and history cursors |
| Change monitoring | Signed, asset-bound cursors; clients poll for newly indexed items |
| Briefs | Top three headlines verbatim, with source and UTC time |
| Stories | Approximate headline clustering; not independent confirmation |
| Batched watch | Up to 50 assets per request; each result can succeed or fail independently |
| REST and function calling | Six read operations and schemas at `/api/v2/tools` |
| Hosted MCP | Six tools over Streamable HTTP at `/api/mcp` |
| Web terminal | Asset search, headlines, clusters, pagination and refresh |
| Self-serve keys | GitHub sign-in; signing in again rotates the existing key |
| Account billing | Keyed REST usage is metered; anonymous reads are free and rate limited |
| Ingestion | Google News RSS by default; Vercel cron configured every 15 minutes |
| Retention | 30-day API window; maintenance retains 35 days by default |

The scheduled worker uses a time budget and prioritizes overdue assets. A schedule is not proof that every fetch succeeded: inspect `status`, `last_success_at`, article counts and the cron’s deferred/error counts. Empty coverage can be legitimate for quiet assets.

## Brand and domain

The product and repository are **NewsBeat**, live at **https://www.newsbeat.dev**. Use `https://www.newsbeat.dev/api` for REST and `https://www.newsbeat.dev/api/mcp` for MCP. The `news-beat.vercel.app` host remains an alternate service address. Public reads are free during early access; no API key or credit card is needed. Optional keyed REST usage retains its trial-credit metering.

New discovery uses `newsbeat_*` tool names. Old tool names, deployed environment-variable names and existing signed cursors retain compatibility. Workspace package names use `@newsbeat/*` and `newsbeat-*`.

## Connector expansion — preview, not production

[PR #11](https://github.com/thepeternemec/NewsBeat/pull/11) implements eight shared MCP/REST operations, general news search and source-record lookup, named independent keys, atomic account metering, OAuth resource-server verification, saved watches and signed webhooks. It also includes Telegram/Discord relay and Grok API examples.

That work passed its preview checks but still needs its additive database migration, environment configuration and end-to-end activation. It is not merged into main. An external OAuth authorization server and platform-specific consent/client registration must be configured separately.

## Remaining limits

- Main-branch MCP calls do not yet share the full REST billing boundary; PR #11 addresses this.
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

Check `/api/health`, `/api/v2/topics?limit=5`, and `/api/v2/news?beat_id=b_bb964843350e` on the target deployment. Use the connection screen for a live MCP round-trip check. Never test billing or destructive maintenance against production accounts merely to validate a preview.

Update this file and the README whenever capabilities change.
