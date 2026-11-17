<p align="center">
  <a href="https://rarebird.network">
    <img src="brand/newsbeat-github.svg" alt="Rarebird — Market intelligence for stocks and crypto." width="100%">
  </a>
</p>

<p align="center">
  <strong>Market timing, risk and position sizing for stocks and crypto.</strong><br>
  An open-source market intelligence network for traders and their AI agents.
</p>

<p align="center">
  <a href="https://github.com/thepeternemec/NewsBeat/actions/workflows/ci.yml"><img src="https://github.com/thepeternemec/NewsBeat/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-181818?labelColor=303030" alt="MIT license"></a>
</p>

<p align="center">
  <a href="https://rarebird.network"><strong>rarebird.network</strong></a> ·
  <a href="https://www.newsbeat.dev/app">Open the live preview</a> ·
  <a href="https://www.newsbeat.dev/intelligence">Explore a signal</a> ·
  <a href="https://www.newsbeat.dev/docs/quickstart">Connect your agent</a> ·
  <a href="https://www.newsbeat.dev/docs">Docs</a> ·
  <a href="https://www.newsbeat.dev/status">Service status</a>
</p>

---

Rarebird is an open-source market intelligence network for stocks and crypto. The goal is to build an agent you can check throughout the trading day for three decisions: **when to act, what could go wrong, and how much risk to take**.

| Decision | What Rarebird does today | Where it’s going |
| --- | --- | --- |
| **Market timing** | Finds new developments across 2,030 stock and crypto topics. A six-asset pilot checks unusual moves, volume and liquidity. BTC and ETH have hourly move-risk forecasts with a public scorecard. | Broader measured coverage and timing signals evaluated against outcomes and trading costs. |
| **Risk management** | Ticker briefs show adverse evidence, gaps and what would invalidate the current view. Measured checks flag stale data and weak confirmation. | Monitor exposures and show which positions need another look as conditions change. |
| **Position sizing** | Research provides asset-level context such as observed volatility and liquidity where coverage is available. | Estimate hypothetical position sizes from a user-defined loss budget, an invalidation level, liquidity and existing exposure. |

The aim is to help traders spot opportunities and limit avoidable losses. A useful answer might be to investigate a move, reduce exposure or wait for confirmation. Today Rarebird provides research and experimental forecasts. Portfolio-aware risk and position sizing are planned.

[Get started](#get-started) · [How it works](#how-it-works) · [Build history](#build-history) · [Project status](#project-status) · [Run locally](#run-locally) · [Contribute](#contribute)

## Get started

### 1. Explore in your browser

Open the [Rarebird app](https://www.newsbeat.dev/app) to see market developments and hourly crypto forecasts. Search by company or ticker, then follow the evidence into the market checks, research briefs, news map or token lookup.

**No setup, account or API key required for public reads.**

### 2. Connect your AI agent

Add this URL as a remote MCP server in an assistant that supports **Streamable HTTP**:

```text
https://www.newsbeat.dev/api/mcp
```

<details>
<summary>JSON configuration for compatible MCP clients</summary>

```json
{
  "mcpServers": {
    "newsbeat": {
      "url": "https://www.newsbeat.dev/api/mcp"
    }
  }
}
```

Configuration varies by client. Follow the [connection guide](https://www.newsbeat.dev/docs/quickstart) or run the [connection check](https://www.newsbeat.dev/connect). Your assistant needs custom remote MCP support.

</details>

Then ask:

> Use Rarebird to check NVIDIA. What changed, why could it matter, and what still needs confirmation?

### 3. Make an API request

Find an asset:

```bash
curl "https://www.newsbeat.dev/api/v2/topics?q=nvidia&limit=5"
```

Ask an evidence-led question:

```bash
curl -X POST "https://www.newsbeat.dev/api/v2/research" \\
  -H "Content-Type: application/json" \\
  -d '{"question":"What could change the outlook for NVIDIA?"}'
```

Use the returned `beat_id` for other assets. The intelligence pilot currently covers **NVIDIA, Apple, Microsoft, Alphabet, Bitcoin and Ethereum**. Question research works across the catalog; missing market measurements are explicit. [Research flow and limits](docs/RESEARCH.md).

[More examples](examples/README.md) · [API and MCP reference](AGENTS.md) · [Live tool schemas](https://www.newsbeat.dev/api/v2/tools)

## How it works

**Your question → Relevant evidence → Market checks → Answer → Next check**

Rarebird collects source-linked headlines, reduces repeated coverage and tracks new information. The pilot builds a conditional interpretation, checks observed market activity and stores the result for agents to read.

| Your agent receives | What it helps answer |
| --- | --- |
| The reported change, source and time | What happened? |
| A contextual interpretation | Why could this matter? |
| Market confirmation and reasons to wait | Is there enough evidence to review it now? |
| Invalidation and a next check | What would change the view? |

A signal can say **review**, **keep watching**, **no alert** or **reassess**. Waiting is a useful result when evidence is missing, old or unconfirmed. Repeated headlines alone do not justify a new review alert.

<details>
<summary>Evidence, market data and research limits</summary>

- Reporting comes from English-language Google News RSS metadata. Full article bodies remain with publishers; interpretations are based on headlines.
- The stock pilot observes Kraken xStock markets against QQQx. Bitcoin and Ethereum use crypto venue data and peer comparisons. These are venue observations, not consolidated stock prices or verified token redemption values.
- Timing checks include relative market moves, participation, liquidity and data freshness. Thresholds are research heuristics awaiting calibration.
- Prospective outcome records help evaluate constructions and review alerts over time. They do not establish profitable performance or executable returns.
- Rarebird records qualifying review alerts. Notification delivery and trade execution are not connected.

See the [methodology](docs/QUANTITATIVE.md) for the measurements, thresholds and limitations.

</details>

Rarebird also scans the market independently of reporting: it looks for unusual relative moves, compares them with earlier behavior and records what happened next. The same existing venue data powers this discovery layer; a headline is not required to start an investigation. [How discovery works](docs/QUANTITATIVE.md#independent-discovery-market-discovery-v1)

## Build history

The repository records **50+ merged pull requests**. These milestones show how the product responded to requests for faster discovery, better evidence, and forecasts that can be checked.

| What users wanted to do | What shipped | Implementation |
| --- | --- | --- |
| What changed, and where’s the evidence? | Sourced ticker briefs and help for configured Telegram groups | [Ticker briefs](https://github.com/thepeternemec/NewsBeat/pull/121) |
| What’s worth looking at right now? | Proactive news discovery across 2,030 stocks and crypto assets, with source and collection times | [Market discovery](https://github.com/thepeternemec/NewsBeat/pull/131) |
| Am I looking at the right token? | Chain-and-contract lookup with pool-level evidence | [Token intelligence](https://github.com/thepeternemec/NewsBeat/pull/125) |
| How do I know the forecast is useful? | Hourly BTC and ETH move-risk forecasts evaluated against a historical baseline | [Forecast evaluation](https://github.com/thepeternemec/NewsBeat/pull/130) |
| Can I follow the original evidence? | Direct issuer filing checks for four pilot issuers | [SEC filing evidence](https://github.com/thepeternemec/NewsBeat/pull/119) |

[Commit history](https://github.com/thepeternemec/NewsBeat/commits/main/) · [Merged pull requests](https://github.com/thepeternemec/NewsBeat/pulls?q=is%3Apr+is%3Amerged) · [Changelog](CHANGELOG.md) · [Build checks](https://github.com/thepeternemec/NewsBeat/actions) · [Live service status](https://www.newsbeat.dev/status)

## Project status

**Early development · active research pilot · MIT licensed**

| Stage | Available today |
| --- | --- |
| News foundation | A bundled catalog of 2,030 stock and crypto topics; headlines, grouping, freshness and change tracking |
| Question research | Direct answers, cited reasoning, unknowns and next checks across the catalog; available market checks included |
| Agent access | Public MCP and REST interfaces; asset discovery and batched watchlist reads |
| Intelligence pilot | Six assets, three contexts, persistent interpretations, market checks and a review-alert journal |
| Independent discovery | 15/30/60-minute anomaly scans, past-only comparisons, volatility context and an episode journal |
| Evaluation | Prospective observations for comparing all constructions with selected review alerts, plus an hourly BTC/ETH forecast scorecard |

**Next:** expand measured coverage, evaluate signals against outcomes and costs, and develop portfolio risk and position sizing with explicit user limits. Saved watches, notification delivery and verified tokenized-asset mapping are planned.

The catalog is scheduled every 10 minutes. One-minute news collection for a priority asset starts only on explicit request, lasts 15 minutes and never auto-renews. Analysis and market measurements remain on five-minute schedules. Read freshness and analysis timestamps: schedules do not guarantee fresh results for every asset.

[Current capabilities](docs/STATUS.md) · [Product direction](docs/INTELLIGENCE.md) · [Changelog](CHANGELOG.md)

## Run locally

Use **Node.js 22 or 24** and npm.

```bash
git clone https://github.com/thepeternemec/NewsBeat.git rarebird
cd rarebird
npm ci
npm run build
npm test
npm run dev
```

Open **http://localhost:3000**. You can build, run the standard tests and work on the interface without service credentials. Local news reads need a development PostgreSQL database and cursor secret.

Follow the [development guide](docs/DEVELOPMENT.md) to configure local data, run ingestion and test the API. Hosted public reads are the fastest way to try Rarebird.

<details>
<summary>Repository map</summary>

| Path | Purpose |
| --- | --- |
| `apps/web` | Next.js website, API mount and scheduled routes |
| `apps/api` | Hono REST API, MCP transport and intelligence pipeline |
| `apps/worker` | Collection, filtering and normalization |
| `packages/contracts` | Shared schemas, asset catalog and tool definitions |
| `packages/db` | PostgreSQL access, accounts and metering |
| `db` | Schema and maintenance scripts |
| `examples` | API recipes and a reference model adapter |
| `docs` | Development, methodology and operations |

[Architecture](docs/ARCHITECTURE.md) · [Documentation index](docs/README.md)

</details>

## Optional one-minute collection

On the intelligence page, choose **Request 1-min news · 15 min** for the selected priority asset. Or explicitly ask your agent for one-minute collection; `newsbeat_collection` starts the bounded session only with `action: "start"` and `interval_seconds: 60`. Status reads and ordinary news lookups do not activate it. You can stop your own session early. [Request and API details](docs/COLLECTION.md)

## Access

Public MCP and REST reads are free during early access, with an anonymous limit of **120 requests per minute**. An API key is optional.

Optional account keys offer a seven-day REST evaluation, starting on the first metered request, with up to $6 in credit and a higher rate limit. Paid checkout is not live. [Access details](https://www.newsbeat.dev/docs)

## Contribute

Tell the project what you were trying to do and where the evidence, timing or workflow came up short. Contributions could include:

- Improve a setup step, example or explanation.
- Report a confusing signal or asset match, including the source and time.
- Improve accessibility, source grounding or market-data checks.
- Help evaluate outcomes or extend measured coverage.

Read [CONTRIBUTING.md](CONTRIBUTING.md), [open an issue](https://github.com/thepeternemec/NewsBeat/issues/new/choose), or [start a discussion](https://github.com/thepeternemec/NewsBeat/discussions). Small, focused pull requests are welcome.

[MIT license](LICENSE) · [Code of conduct](CODE_OF_CONDUCT.md) · [Security](SECURITY.md)

<p align="center">
  <a href="https://rarebird.network">Rarebird Network</a> · <a href="https://www.newsbeat.dev">Live preview</a> · <a href="https://x.com/newsbeat_">@newsbeat_</a> · <a href="mailto:contact@newsbeat.dev">contact@newsbeat.dev</a>
</p>
