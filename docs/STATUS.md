# NewsBeat project status

Updated **2026-10-21** from the current main-branch implementation. Counts describe the bundled catalog, not a guarantee of live article coverage.

## Current main branch

| Capability | Status |
| --- | --- |
| Asset catalog | **2,030 topics**: 1,528 US-listed equities and 502 crypto assets |
| Headline reads | Source-linked articles with freshness, bounded pages and history cursors |
| Change monitoring | Signed, asset-bound cursors; clients poll for newly indexed items |
| Briefs | Up to three distinct ranked recent headlines verbatim, with source and UTC time |
| Stories | Approximate headline grouping, ranked by relevance, with original reports and source links |
| Summaries | Up to three short explanations based only on headlines; generated text or labeled original-headline fallback |
| Batched watch | Up to 50 assets per request; each result can succeed or fail independently |
| REST and function calling | Seven read operations and schemas at `/api/v2/tools` |
| Hosted MCP | Seven tools over Streamable HTTP at `/api/mcp`, including `newsbeat_summary` |
| Web terminal | Asset search, grouped stories, source expansion, Show more controls and on-demand headline summaries |
| Self-serve keys | GitHub sign-in; signing in again rotates the existing key |
| Account billing | Keyed REST usage is metered; anonymous reads are free and rate limited |
| Ingestion | Google News RSS by default; Vercel cron configured every 15 minutes |
| Retention | 30-day API window; maintenance retains 35 days by default |

The scheduled worker uses a time budget and prioritizes overdue assets. A schedule is not proof that every fetch succeeded: inspect `status`, `last_success_at`, article counts and the cron’s deferred/error counts. Empty coverage can be legitimate for quiet assets.

## Headline summaries and ranked coverage

Choose **Summarize headlines** in the [terminal](https://www.newsbeat.dev/dashboard), call `newsbeat_summary` over MCP, or use `GET /api/v2/summary?beat_id=…`. Resolve a company or ticker with the topic catalog first.

The digest selects up to three distinct stories from a snapshot of the latest 200 reports within 24 hours. It favors headlines describing concrete developments and uses the existing ranking and diversity heuristics. It can return fewer than three items. This is approximate selection, not a prediction of market impact or a guarantee of relevance.

Every result reports `basis: "headlines_only"`, source reports with links and publication times, `freshness`, and `coverage_truncated`. `method: "generated"` means headline-based model generation succeeded and passed the output checks. `method: "extractive"` means original headlines are shown instead. Neither mode includes full article text.

Generation runs on demand through Vercel AI Gateway. It uses server-side OIDC on Vercel or `AI_GATEWAY_API_KEY` in another runtime, with a 20-second timeout and an in-memory cache of up to five minutes per running instance. Model use consumes the project owner’s allowance or credits; it does not add a user checkout.

REST story snapshots scan 200 reports by default (`limit` 1–500). MCP returns up to 40 ranked groups from 200 reports. Grouping retains every report in the returned snapshot and can still miss paraphrases or combine unrelated coverage. Source counts describe coverage, not independent corroboration. Use article-level cursors for follow-up arrivals; group IDs can change as the snapshot rolls.

## Brand and domain

The product and repository are **NewsBeat**, live at **https://www.newsbeat.dev**. Use `https://www.newsbeat.dev/api` for REST and `https://www.newsbeat.dev/api/mcp` for MCP. The `news-beat.vercel.app` host remains an alternate service address. Public reads are free during early access; no API key or credit card is needed. Account keys have a **seven-day evaluation** from the first metered REST call, with up to **$6 in trial credit**. The start is recorded per account in the usage ledger, so rotating a key does not reset it. Existing accounts keep their balances and start their seven-day window on their next metered call after this release. `GET /api/keys/trial` reports the deadline and spendable credit. When the trial ends, unused trial credit becomes unavailable and keyed reads return `402 trial_expired`; public anonymous reads continue. Stripe checkout is not live.

New discovery uses `newsbeat_*` tool names. Old tool names, deployed environment-variable names and existing signed cursors retain compatibility. Workspace package names use `@newsbeat/*` and `newsbeat-*`.

## Connector expansion — preview, not production

[PR #11](https://github.com/thepeternemec/NewsBeat/pull/11) implements eight shared MCP/REST operations, general news search and source-record lookup, named independent keys, atomic account metering, OAuth resource-server verification, saved watches and signed webhooks. It also includes Telegram/Discord relay and Grok API examples.

That work passed its preview checks but still needs its additive database migration, environment configuration and end-to-end activation. It is not merged into main. An external OAuth authorization server and platform-specific consent/client registration must be configured separately.

## Remaining limits

- Main-branch MCP calls do not yet share the full REST billing boundary; PR #11 addresses this.
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
