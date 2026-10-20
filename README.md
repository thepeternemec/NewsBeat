<div align="center">

# NewsBeat

### The news layer for AI agents.

Source-linked market news. Only what changed. Ready for your agent.

**Free during early access · No API key or credit card needed for public reads**

[Connect your agent](https://www.newsbeat.dev/connect) · [Explore live news](https://www.newsbeat.dev/dashboard) · [Read the docs](https://www.newsbeat.dev/docs)

[![CI](https://github.com/thepeternemec/NewsBeat/actions/workflows/ci.yml/badge.svg)](https://github.com/thepeternemec/NewsBeat/actions/workflows/ci.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Early access](https://img.shields.io/badge/status-free_early_access-brightgreen)](https://www.newsbeat.dev)

</div>

Ask your assistant “What is happening with Nvidia?” Or let it look up recent news whenever that would help with your task. [Start with the assistant guide](https://www.newsbeat.dev/docs/quickstart).

Your agent should know what happened since its last check. NewsBeat turns equity and crypto headlines into compact, source-linked updates over **MCP and REST**. Give it an asset and a cursor; get new headlines, or a clear “nothing new.”

Built for developers bringing news into trading research, prediction-market analysis, personal assistants and monitoring workflows.

| Coverage | Agent tools | Change tracking | Source code |
| --- | --- | --- | --- |
| **2,030 assets** — 1,528 US equities + 502 crypto | **6 tools** over MCP and REST | Signed cursors + checks for up to **50 assets** per request | **MIT licensed** |

## Try it in 30 seconds

No account required. Make your first request:

```bash
curl "https://www.newsbeat.dev/api/v2/news?beat_id=b_bb964843350e"
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

Then ask: **“Find Nvidia in NewsBeat and show me its latest headlines with sources.”**

Use the [connection guide](https://www.newsbeat.dev/connect) for setup and a live transport check. For function-calling agents, load schemas from [`/api/v2/tools`](https://www.newsbeat.dev/api/v2/tools). See the [model-loop example](examples/README.md).

## What you can build

- **Market research agents:** bring equity and crypto headlines into analysis alongside your own price data and models.
- **Prediction-market research:** follow relevant company and crypto developments as one input to your research.
- **Personal briefings:** ask for the top three headlines on an asset, with sources and timestamps.
- **Watchlist bots:** check up to 50 assets at once and pass new items into your own Telegram, Discord or other workflow.

NewsBeat supplies news context. It does not execute trades, provide prediction-market prices or connect to Polymarket accounts. Dedicated messaging integrations are on the roadmap.

## One API, six tools

| MCP tool | What it does |
| --- | --- |
| `newsbeat_topics` | Find supported assets and inspect coverage |
| `newsbeat_news` | Read headlines with sources, timestamps and a cursor |
| `newsbeat_changes` | Get newly indexed items since your last cursor |
| `newsbeat_brief` | Return the top three headlines verbatim |
| `newsbeat_stories` | Group similar headlines into approximate story clusters |
| `newsbeat_watch` | Check up to 50 assets in one request |

Choose an asset, read a baseline, save the cursor, then check for changes. Process each page before advancing its cursor and continue while `has_more` is true. An empty page is a valid result.

Ingestion is scheduled every 15 minutes. Responses report per-asset `freshness`, so your agent can distinguish a quiet topic from stale coverage. Items include headline metadata and links to the original reporting through Google News; full article bodies are not included.

## Free to start, open to build on

**Public reads are currently free during early access.** No sign-up, API key or credit card is required. Anonymous requests are rate limited to 120 per minute. Start with the public endpoint above.

Optional GitHub-issued API keys use a separate metered REST path with $5 in trial credit and a higher request limit. Stripe checkout is not live. See [current service status](docs/STATUS.md) for the exact limits and billing behavior.

The primary service is **[www.newsbeat.dev](https://www.newsbeat.dev)**:

| Interface | Primary URL |
| --- | --- |
| REST base | `https://www.newsbeat.dev/api` |
| MCP | `https://www.newsbeat.dev/api/mcp` |
| Agent instructions | `https://www.newsbeat.dev/skill.md` |

The Vercel host remains available as an alternate: `https://news-beat.vercel.app/api` for REST and `https://news-beat.vercel.app/api/mcp` for MCP. New integrations should use the primary domain.

## Building in the open

**Live today:** asset discovery, source-linked headlines, change cursors, briefs, story grouping, batched checks, hosted MCP and the web terminal.

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

- [Current capabilities and limitations](docs/STATUS.md)
- [Agent integration guide](AGENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/GO-LIVE.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

MIT licensed. See [LICENSE](LICENSE).
