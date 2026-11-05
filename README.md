<div align="center">

# NewsBeat

### Meaningful signals. Built for agents.

NewsBeat constructs signals from news and context: what could affect stocks and crypto, what would trigger a review alert, and what would invalidate the hypothesis.

**News evidence + measured market timing**

[Signal workbench](https://www.newsbeat.dev/intelligence) · [How signals are constructed](https://www.newsbeat.dev/#agent-workflow) · [Connect your agent](https://www.newsbeat.dev/docs/quickstart) · [Developer docs](https://www.newsbeat.dev/docs) · [Service status](https://www.newsbeat.dev/status)

[![CI](https://github.com/thepeternemec/NewsBeat/actions/workflows/ci.yml/badge.svg)](https://github.com/thepeternemec/NewsBeat/actions/workflows/ci.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-black)](LICENSE)

Free public access during early access. No account, API key or credit card needed.

</div>

## Why NewsBeat

An agent needs to understand which developments deserve attention. NewsBeat’s direction is to produce meaningful signals grounded in reporting: the change, its context, its relevance to the task, and the uncertainty around it.

The **live foundation** supplies source-linked headlines, approximate story grouping, headline-based summaries, freshness and changes since a previous check. Agents can use that evidence today.

The **six-asset intelligence pilot** combines a source-grounded thesis with measured market timing. It distinguishes new information from repeated coverage, estimates a pre-information beta and residual baseline, and checks price confirmation, relative volume, fresh trades and order-book costs. Signals can develop, fade, diverge or become extended. A review alert needs all applicable gates; headline interpretation alone cannot trigger one.

NVIDIA, Apple, Microsoft and Alphabet are measured through their USD xStock markets on Kraken against QQQx. Bitcoin and Ethereum use self-excluding crypto peers. These are observed venue markets, not consolidated stock prices or verified token redemption values. The [quantitative methodology](docs/QUANTITATIVE.md) documents sources, thresholds, timestamps and limits.

Every eligible construction and qualifying review alert gets a frozen reference snapshot for prospective 15-minute, one-hour and four-hour outcomes. The journal compares all cases with selected review alerts, including pending and missed observations. This is a research record, not a claim of profitable timing or superiority to another agent.

The broader news foundation covers 1,528 US stocks and 502 crypto assets. Wider quantitative coverage, expectations data and outcome calibration remain next steps. Read the [product direction](docs/INTELLIGENCE.md) and [current implementation status](docs/STATUS.md).

## Try it before you connect

Search a company name or ticker on the **[homepage](https://www.newsbeat.dev/#company-news)** to see real headlines, publishers, publication times and collection freshness. Stock and crypto matches remain distinct, and more headlines are available on demand.

Open the **[signal workbench](https://www.newsbeat.dev/intelligence)**. Select an asset and a decision context, inspect the hypothesis and trigger, then expand the checks behind the decision. The homepage animates how news becomes context and a signal.

The wider catalog is collected on a **15-minute schedule**; the six pilot topics and market measurements are scheduled every five minutes. Coverage varies by asset; every response reports freshness. Summaries use headline metadata, and the original reporting stays linked.

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

Then ask: **“Inspect Nvidia in the business fundamentals context. What could matter, what would trigger an alert, and what would change the view?”**

Setup varies by host. Follow the [quickstart](https://www.newsbeat.dev/docs/quickstart) or use the [connection check](https://www.newsbeat.dev/connect). A host must support custom remote MCP or an API integration; a native listing in every assistant’s directory is not implied.

## Make your first API request

Read Nvidia signal constructions and recorded review alerts:

```bash
curl "https://www.newsbeat.dev/api/v2/intelligence?beat_id=b_bb964843350e&context=fundamentals"
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

## Agent interfaces

| MCP tool | Purpose |
| --- | --- |
| `newsbeat_intelligence` | Read contextual constructions, alert checks, evidence and recorded review alerts for the six-asset pilot |
| `newsbeat_topics` | Find supported stocks and crypto; inspect coverage |
| `newsbeat_news` | Read headlines with sources, dates and a cursor |
| `newsbeat_changes` | Get newly indexed items since the previous cursor |
| `newsbeat_brief` | Get three ranked recent headlines verbatim |
| `newsbeat_stories` | Group similar headlines with their original reports |
| `newsbeat_summary` | Get up to three short headline-based explanations |
| `newsbeat_watch` | Check up to 50 assets in one request |
| `newsbeat_ask` | Resolve an asset and gather news, prices and chain context. |
| `newsbeat_market` | Read a sourced crypto market overview. |
| `newsbeat_prices` | Read crypto prices by CoinGecko ID. |
| `newsbeat_fear_greed` | Read the daily fear and greed index. |
| `newsbeat_chain` | Read Ethereum and Solana chain state. |
| `newsbeat_token` | Read a reference price by contract address. |
| `newsbeat_signals` | Read funding, DEX volume and stablecoin supply. |

Function-calling schemas are available at [`/api/v2/tools`](https://www.newsbeat.dev/api/v2/tools). See the [model-loop example](examples/README.md).

For follow-up checks: resolve an asset, read a baseline, save its cursor, and ask for changes. Process each page before advancing the cursor, and continue while `has_more` is true. An empty page is a valid “nothing new.” Topic-bound cursors distinguish stock and crypto assets that share a ticker.

## What you can build

- **Research assistants** that bring recent stock and crypto reporting into an answer.
- **Personal briefings** with short updates, dates and links.
- **Watchlist workflows** that check multiple assets and forward new items to your own bot.
- **Tokenized-asset research** that starts with news about the underlying company or cryptocurrency.

The implementation also retains reference utilities for crypto prices, sentiment, positioning and chain readings through MCP and REST. Those are supporting inputs. The product direction is the intelligence built from evidence; raw market metrics alone do not constitute a meaningful signal.

## Evidence and freshness

NewsBeat collects English-language headline metadata through Google News RSS. Items include a headline, publisher, publication time and a link that resolves to the reporting. Full article bodies are not included.

Story grouping is approximate and preserves source reports. Ranking favors concrete developments and recency; publisher counts measure coverage, not independent corroboration or price impact.

Summaries report `basis: "headlines_only"`, `freshness` and `coverage_truncated`. The `method` is `generated` when headline-based generation succeeds or `extractive` when original headlines are returned. Generation runs on demand through Vercel AI Gateway and falls back on failure. Read the linked reporting for details.

MCP story snapshots return up to 40 ranked groups from 200 recent reports. REST scans 200 reports by default, with a configurable limit up to 500. Group IDs can change as the snapshot rolls; use article cursors to track arrivals.

## Access

Public MCP and REST reads are free during early access, with an anonymous limit of **120 requests per minute**.

Optional GitHub-issued keys provide a **seven-day REST evaluation**, starting on the first metered request, with up to **$6 in usage credit** and **1,200 requests per minute**. Inspect `GET /api/keys/trial` for the deadline and remaining credit. Keyed requests stop with a 402 response after time or credit runs out; rotating a key does not restart the trial. Public access remains available without a key. Paid checkout is not live.

## Roadmap

**Available:** the source-linked news foundation, with asset discovery, headline-based summaries, approximate grouping, freshness, change tracking and agent access.

**Six-asset timing pilot:** bounded scheduled analysis, persistent thesis revisions, three contexts, beta-adjusted market response, liquidity and participation gates, a measured alert journal and prospective outcome cohorts.

**Next:** collect and calibrate prospective outcomes, add expectation changes and richer source evidence, and expand measured coverage.

**Longer-term applications:** saved watches, agent delivery, notifications and verified tokenized-asset mapping. Broader search and connector improvements support that direction.

[Product direction](docs/INTELLIGENCE.md) · [Current capabilities](docs/STATUS.md) · [Changelog](CHANGELOG.md)

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

## Contextual signal construction

Use `newsbeat_intelligence` with a `beat_id` and an optional `context`: `fundamentals`, `liquidity` or `risk`. REST accepts `GET /v2/intelligence?beat_id=...&context=fundamentals`. The response adds `context`, `constructions` and an `alerts` journal while preserving `signals`.

A construction explains the proposed market channel, direction, qualitative materiality, time horizon, observable trigger, invalidation and why a development may not move the market. Explicit checks return `review_now`, `keep_watching`, `no_alert` or `reassess`. Context mismatch, stale/pending analysis, old trigger reports, unobserved conditions and repeat coverage block new review alerts. Alert IDs are stable for a context and interpretation version; track them to avoid repeated notifications in your own authorized workflow.

The pilot records review alerts. Delivery integrations, custom strategy contexts, price/benchmark confirmation, historical comparisons and calibrated thresholds are future work. `market_reaction.status` is `unmeasured`; a model hypothesis does not establish that a price moved. Check original reporting before relying on a trigger.

