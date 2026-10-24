<div align="center">

# NewsBeat

### Ask what happened. Know what matters.

Company and crypto headlines your agent can actually use: a short update, the original sources, and a clear check time.

**Free during early access · No API key or credit card needed for public reads**

[Try a live lookup](https://www.newsbeat.dev/docs/try) · [Connect your agent](https://www.newsbeat.dev/docs/quickstart) · [Read the docs](https://www.newsbeat.dev/docs)

Contact: [contact@newsbeat.dev](mailto:contact@newsbeat.dev)

[![CI](https://github.com/thepeternemec/NewsBeat/actions/workflows/ci.yml/badge.svg)](https://github.com/thepeternemec/NewsBeat/actions/workflows/ci.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Early access](https://img.shields.io/badge/status-free_early_access-brightgreen)](https://www.newsbeat.dev)

</div>

Ask your assistant “What happened with Nvidia?” It can look up recent news whenever it needs context for your question. Start with the [free live lookup](https://www.newsbeat.dev/docs/try): search by company name or ticker, read available headlines, and request a short source-linked summary. No account needed.

NewsBeat gives agents equity and crypto news through **MCP and REST**. Resolve an asset, get a short source-linked update, and check freshness. For follow-up checks, save a cursor and get only newly indexed headlines or a clear “nothing new.”

Built for developers bringing news into trading research, prediction-market analysis, personal assistants and monitoring workflows.

| Coverage | Agent tools | Change tracking | Source code |
| --- | --- | --- | --- |
| **2,030 assets** — 1,528 US equities + 502 crypto | **7 tools** over MCP and REST | Signed cursors + checks for up to **50 assets** per request | **MIT licensed** |

## See it work before you connect

**Start with your own question.** The free try page searches the supported catalog, shows live headlines, and lets you request an on-demand summary. The same news is available to your agent when connected. Follow the [assistant quickstart](https://www.newsbeat.dev/docs/quickstart) when you are ready.

- **Headline summaries:** up to three short explanations with publisher links, publication times and freshness. Choose **Summarize headlines** in the terminal, call `newsbeat_summary` over MCP, or use [the summary API](https://www.newsbeat.dev/api/v2/summary?beat_id=b_bb964843350e).
- **Grouped coverage:** similar reports appear as one story. Expand it to see the original headlines and sources; reporting is retained.
- **Relevance ranking:** concrete developments appear ahead of routine ownership notices and shopping headlines. Summaries favor developments and select distinct stories.
- **Clear evidence limits:** summaries use headlines only. If generation is unavailable or its output fails validation, original headlines are returned with `method: "extractive"`.
- **Free early access:** public MCP and REST reads need no account, key or card. An optional seven-day keyed REST evaluation is available for higher limits.

[Read the changelog](CHANGELOG.md) · [Current capabilities and limitations](docs/STATUS.md)

## Try the API in 30 seconds

No account required. Make your first request:

```bash
curl "https://www.newsbeat.dev/api/v2/news?beat_id=b_bb964843350e"
```

For a short headline-based explanation of what happened with Nvidia:

```bash
curl "https://www.newsbeat.dev/api/v2/summary?beat_id=b_bb964843350e"
```

Or add the hosted MCP endpoint to a client that supports remote Streamable HTTP:

```text
https://www.newsbeat.dev/api/mcp
```

For clients that accept this configuration format:

```json
{
  "mcpServers": {
    "newsbeat": {
      "url": "https://www.newsbeat.dev/api/mcp"
    }
  }
}
```

Then ask: **“What happened with Nvidia? Give me a short summary and link the sources.”**

Use the [connection guide](https://www.newsbeat.dev/connect) for setup and a live transport check. For function-calling agents, load schemas from [`/api/v2/tools`](https://www.newsbeat.dev/api/v2/tools). See the [model-loop example](examples/README.md).

## What you can build

- **Market research agents:** bring equity and crypto headlines into analysis alongside your own price data and models.
- **Prediction-market research:** follow relevant company and crypto developments as one input to your research.
- **Personal briefings:** ask what happened with an asset and get a short headline-based summary with sources and timestamps.
- **Watchlist bots:** check up to 50 assets at once and pass new items into your own Telegram, Discord or other workflow.

NewsBeat supplies news context. It does not execute trades, provide prediction-market prices or connect to Polymarket accounts. Dedicated messaging integrations are on the roadmap.

## One API, seven tools

| MCP tool | What it does |
| --- | --- |
| `newsbeat_topics` | Find supported assets and inspect coverage |
| `newsbeat_news` | Read headlines with sources, timestamps and a cursor |
| `newsbeat_changes` | Get newly indexed items since your last cursor |
| `newsbeat_brief` | Return three ranked recent headlines verbatim |
| `newsbeat_stories` | Group similar headlines into approximate story clusters |
| `newsbeat_summary` | Explain up to three recent stories from headlines, with source links |
| `newsbeat_watch` | Check up to 50 assets in one request |

Choose an asset, read a baseline, save the cursor, then check for changes. Process each page before advancing its cursor and continue while `has_more` is true. An empty page is a valid result.

Ingestion is scheduled every 15 minutes. Responses report per-asset `freshness`, so your agent can distinguish a quiet topic from stale coverage. Items include headline metadata and links to the original reporting through Google News; full article bodies are not included.

## Free to start, open to build on

**Public reads are currently free during early access.** No sign-up, API key or credit card is required. Anonymous requests are rate limited to 120 per minute. Start with the public endpoint above.

Optional GitHub-issued API keys give an agent a seven-day evaluation, beginning with its first metered REST request, with up to $6 in usage credit and a higher request limit. `GET /api/keys/trial` shows the exact deadline and credit left. Expired keys receive 402; public access remains free. Stripe checkout is not live. See [current service status](docs/STATUS.md) for the exact limits and billing behavior.

The primary service is **[www.newsbeat.dev](https://www.newsbeat.dev)**:

| Interface | Primary URL |
| --- | --- |
| REST base | `https://www.newsbeat.dev/api` |
| MCP | `https://www.newsbeat.dev/api/mcp` |
| Agent instructions | `https://www.newsbeat.dev/skill.md` |

The Vercel host remains available as an alternate: `https://news-beat.vercel.app/api` for REST and `https://news-beat.vercel.app/api/mcp` for MCP. New integrations should use the primary domain.

## Building in the open

**Live today:** asset discovery, source-linked headlines, approximate story grouping, relevance ranking, headline-based summaries, change cursors, verbatim briefs, batched checks, seven hosted MCP tools and the web terminal.

**In development:** broader news search, source-record lookup, multiple agent keys, OAuth connector support and saved-watch notifications. The work is tracked in [PR #11](https://github.com/thepeternemec/NewsBeat/pull/11) and still needs database migration, configuration and end-to-end activation before release.

**Next:** Telegram and Discord relays, more service integrations, and paid access through Stripe. Platform-specific connector setup and directory submissions remain separate work; compatibility depends on each host's MCP or tool-calling support.

Building something with NewsBeat? [Tell us what you need](https://github.com/thepeternemec/NewsBeat/issues/new), [suggest an integration](https://github.com/thepeternemec/NewsBeat/discussions), or [contribute](CONTRIBUTING.md). Star the repository to follow the project.

## Run locally

Use Node.js 22 or 24 and npm workspaces.

```bash
git clone https://github.com/thepeternemec/NewsBeat.git
cd NewsBeat
npm ci
npm run build
npm test
npm run dev
```

The site runs at `http://localhost:3000`. News reads require a PostgreSQL database and cursor-signing secret; copy `.env.example` and follow [GO-LIVE.md](docs/GO-LIVE.md). Do not use production credentials for local tests.

## Repository

| Directory | Purpose |
| --- | --- |
| `apps/web` | Next.js website, terminal and API/cron routes |
| `apps/api` | Hono REST API, MCP transport, GitHub sign-in and rate limiting |
| `apps/worker` | Provider ingestion, filtering and normalization |
| `packages/contracts` | Shared schemas, asset catalog and tool definitions |
| `packages/db` | PostgreSQL access, keys, rate limits and account billing |
| `db` | Schema and operator maintenance scripts |
| `examples` | Function-calling adapter and OpenRouter example |

## Documentation

- [What changed](CHANGELOG.md)
- [Current capabilities and limitations](docs/STATUS.md)
- [Agent integration guide](AGENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/GO-LIVE.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

MIT licensed. See [LICENSE](LICENSE).

## How grouping, ranking and summaries work

The terminal’s **Summarize headlines** button and `GET /api/v2/summary?beat_id=…` give a short, source-linked digest of up to three distinct ranked stories. Agents can call `newsbeat_summary` over MCP. The `basis` is always `headlines_only`; `method` is `generated` when generation is available or `extractive` when it displays original headlines. The original reports remain linked. Check `freshness` and `coverage_truncated` before describing the result as current or comprehensive.

The terminal and `GET /api/v2/stories?beat_id=…` show one original lead per group of similar headlines, ranked by headline relevance. Expand a story in the terminal to see each report’s publisher, link and publication time. The API returns these in `lead_article` and `reports`; stored articles are retained.

Matching is conservative and approximate: it uses a 24-hour window, headline overlap, and guards for changed numbers, outcomes and uncertainty. It can miss paraphrases or group unrelated reports. Publisher counts measure coverage, not independent verification.

REST scans up to 200 reports by default (`limit` 1–500); `newsbeat_stories` over MCP ranks up to 40 groups from a 200-report scan. The brief selects three distinct headlines from up to 200 recent reports. The ranking heuristic favors concrete developments and recency, and downranks routine ownership notices and shopping headlines. Ranking is an explainable heuristic, not a market impact prediction. Check `coverage_truncated`. Groups are snapshot views; use `/v2/news` and `/v2/changes` cursors for article arrivals rather than treating group IDs as stable subscriptions.

### Running summary generation

The summarizer calls `google/gemini-2.5-flash-lite` through Vercel AI Gateway on demand. On Vercel, it uses the Function request’s OIDC token; another runtime can supply `AI_GATEWAY_API_KEY`. Keep credentials server-side. Generation uses the project owner’s Gateway allowance or credits; public access remains free during early access.

Results are cached in memory for up to five minutes for the same selected report IDs. The cache is per running instance, not shared across the deployment. Generation has a 20-second timeout and falls back to original headlines on failure. The checks enforce matching story IDs, reject new numeric figures, and preserve selected uncertainty cues; they do not guarantee factual correctness. Always keep the source links and headline-only label visible.
