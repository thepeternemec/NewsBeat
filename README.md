<div align="center">

# NewsBeat

### The news behind stocks and crypto.

A news feed for AI agents. Get recent headlines, short source-linked updates, and what changed since your last check.

**1,528 US stocks · 502 crypto assets · MCP + REST API**

[Explore the news](https://www.newsbeat.dev/dashboard) · [Connect your agent](https://www.newsbeat.dev/docs/quickstart) · [Developer docs](https://www.newsbeat.dev/docs) · [Service status](https://www.newsbeat.dev/status)

[![CI](https://github.com/thepeternemec/NewsBeat/actions/workflows/ci.yml/badge.svg)](https://github.com/thepeternemec/NewsBeat/actions/workflows/ci.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-black)](LICENSE)

Free public access during early access. No account, API key or credit card needed.

</div>

## Why NewsBeat

Your agent can reason about a stock or cryptocurrency. NewsBeat supplies the recent reporting behind it.

Ask “What happened with Nvidia?” or “What changed with Bitcoin since my last check?” NewsBeat returns headlines, publishers, publication times and links, with coverage freshness on every lookup. Similar reports can be grouped into stories, and headline-based summaries give a short starting point for further research.

The mission is to build an agent feed for stocks and crypto, including the underlying assets behind tokenized markets. Today, NewsBeat resolves news topics by company or cryptocurrency; verified token-to-asset mapping is planned.

## Try it before you connect

Open the **[news explorer](https://www.newsbeat.dev/dashboard)**. Search by name or ticker, read the available reporting, expand a story’s sources, or choose **Summarize headlines** for a short update. The homepage also offers a live lookup and a prompt builder for your connected assistant.

News is collected on a **15-minute schedule**. Coverage varies by asset; every response reports freshness. Summaries use headline metadata, and the original reporting stays linked.

## Connect your agent

Add this remote Streamable HTTP MCP endpoint to a compatible assistant:

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

Then ask: **“What happened with Nvidia? Give me a short update with sources and dates.”**

Setup varies by host. Follow the [quickstart](https://www.newsbeat.dev/docs/quickstart) or use the [connection check](https://www.newsbeat.dev/connect). A host must support custom remote MCP or an API integration; a native listing in every assistant’s directory is not implied.

## Make your first API request

Read recent Nvidia headlines:

```bash
curl "https://www.newsbeat.dev/api/v2/news?beat_id=b_bb964843350e"
```

Get a short headline-based update:

```bash
curl "https://www.newsbeat.dev/api/v2/summary?beat_id=b_bb964843350e"
```

Find another asset:

```bash
curl "https://www.newsbeat.dev/api/v2/topics?q=bitcoin&limit=5"
```

The primary REST base is `https://www.newsbeat.dev/api`. Use the primary domain for new integrations.

## Seven news tools

| MCP tool | Purpose |
| --- | --- |
| `newsbeat_topics` | Find supported stocks and crypto; inspect coverage |
| `newsbeat_news` | Read headlines with sources, dates and a cursor |
| `newsbeat_changes` | Get newly indexed items since the previous cursor |
| `newsbeat_brief` | Get three ranked recent headlines verbatim |
| `newsbeat_stories` | Group similar headlines with their original reports |
| `newsbeat_summary` | Get up to three short headline-based explanations |
| `newsbeat_watch` | Check up to 50 assets in one request |

Function-calling schemas are available at [`/api/v2/tools`](https://www.newsbeat.dev/api/v2/tools). See the [model-loop example](examples/README.md).

For follow-up checks: resolve an asset, read a baseline, save its cursor, and ask for changes. Process each page before advancing the cursor, and continue while `has_more` is true. An empty page is a valid “nothing new.” Topic-bound cursors distinguish stock and crypto assets that share a ticker.

## What you can build

- **Research assistants** that bring recent stock and crypto reporting into an answer.
- **Personal briefings** with short updates, dates and links.
- **Watchlist workflows** that check multiple assets and forward new items to your own bot.
- **Tokenized-asset research** that starts with news about the underlying company or cryptocurrency.

A separate [crypto context page](https://www.newsbeat.dev/crypto) shows sourced reference prices, sentiment, chain readings and positioning data. Its REST endpoints include `/api/v2/market`, `/api/v2/prices`, `/api/v2/sentiment`, `/api/v2/chain`, `/api/v2/token`, `/api/v2/signals` and `/api/v2/ask`. These are separate from the seven hosted MCP news tools. Each panel reports its source and age.

## Evidence and freshness

NewsBeat collects English-language headline metadata through Google News RSS. Items include a headline, publisher, publication time and a link that resolves to the reporting. Full article bodies are not included.

Story grouping is approximate and preserves source reports. Ranking favors concrete developments and recency; publisher counts measure coverage, not independent corroboration or price impact.

Summaries report `basis: "headlines_only"`, `freshness` and `coverage_truncated`. The `method` is `generated` when headline-based generation succeeds or `extractive` when original headlines are returned. Generation runs on demand through Vercel AI Gateway and falls back on failure. Read the linked reporting for details.

MCP story snapshots return up to 40 ranked groups from 200 recent reports. REST scans 200 reports by default, with a configurable limit up to 500. Group IDs can change as the snapshot rolls; use article cursors to track arrivals.

## Access

Public MCP and REST reads are free during early access, with an anonymous limit of **120 requests per minute**.

Optional GitHub-issued keys provide a **seven-day REST evaluation**, starting on the first metered request, with up to **$6 in usage credit** and **1,200 requests per minute**. Inspect `GET /api/keys/trial` for the deadline and remaining credit. Keyed requests stop with a 402 response after time or credit runs out; rotating a key does not restart the trial. Public access remains available without a key. Paid checkout is not live.

## Roadmap

**Available:** asset discovery, headlines, source-linked summaries, grouped stories, change tracking, batch checks, seven MCP news tools, a browser news explorer, and REST crypto context.

**Planned:** verified tokenized-asset mapping, broader news search, saved-watch notifications, more connector options, and ready-to-use Telegram and Discord relays. Availability depends on implementation, configuration and each host’s supported interfaces.

[Current capabilities](docs/STATUS.md) · [Changelog](CHANGELOG.md) · [Suggest an integration](https://github.com/thepeternemec/NewsBeat/discussions)

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

The site runs at `http://localhost:3000`. News reads require PostgreSQL and a cursor-signing secret; copy `.env.example` and follow [GO-LIVE.md](docs/GO-LIVE.md). Use development credentials for local work.

| Directory | Purpose |
| --- | --- |
| `apps/web` | Next.js website, news explorer, API and cron routes |
| `apps/api` | Hono REST API, MCP transport, GitHub sign-in and rate limiting |
| `apps/worker` | News ingestion, filtering and normalization |
| `packages/contracts` | Shared schemas, asset catalog and news tool definitions |
| `packages/db` | PostgreSQL access, keys and account billing |
| `db` | Schema and operator maintenance scripts |
| `examples` | Function-calling adapter and OpenRouter example |

[Agent guide](AGENTS.md) · [Architecture](docs/ARCHITECTURE.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

Built in the open. [Open an issue](https://github.com/thepeternemec/NewsBeat/issues/new), contribute, or follow [@newsbeat_](https://x.com/newsbeat_).

Contact: [contact@newsbeat.dev](mailto:contact@newsbeat.dev)

MIT licensed. See [LICENSE](LICENSE).
