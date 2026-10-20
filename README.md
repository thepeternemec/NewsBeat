# NewsBeat

**The news layer for AI agents.** Track equities and crypto, see what changed, and bring source-linked headlines into your agent’s research. Connect through MCP or REST. Usage-based pricing, no seat licence.

[Website: newsbeat.dev](https://newsbeat.dev) · [Current live deployment](https://newsgraph.vercel.app) · [Connect](https://newsgraph.vercel.app/connect) · [Project status](docs/STATUS.md)

> **Domain transition:** newsbeat.dev is the new domain and will be connected to Vercel separately. The current deployment and API address remain available during the move.

## Available now

- **2,030 assets:** 1,528 US-listed equities and 502 crypto assets in the catalog.
- Source-linked headlines, publisher names, UTC timestamps and explicit freshness status.
- Signed change cursors and history pagination; check what arrived since your last read.
- Three-headline briefs, approximate story grouping, and batched checks for up to 50 assets.
- Six tools exposed through hosted **MCP (Streamable HTTP)** and function-call schemas.
- A web terminal with asset search, headline coverage and story clusters.
- GitHub sign-in for self-serve API keys. Anonymous reads are free and rate limited; keyed REST calls use account credit with a $5 trial grant.
- Ingestion scheduled every 15 minutes, with a bounded work queue and retention maintenance. Read per-asset freshness rather than assuming every source is current.

NewsBeat supplies headline metadata, not full article bodies. Story grouping is approximate, not independent confirmation. It supplies research context; it does not place trades or provide prediction-market prices.

## Connect an agent

Use this remote MCP URL while the custom domain is being connected:

```text
https://newsgraph.vercel.app/api/mcp
```

```json
{
  "mcpServers": {
    "newsbeat": {
      "url": "https://newsgraph.vercel.app/api/mcp"
    }
  }
}
```

The advertised tools are `newsbeat_topics`, `newsbeat_news`, `newsbeat_changes`, `newsbeat_brief`, `newsbeat_stories` and `newsbeat_watch`. Existing clients using the previous tool-name prefix remain supported.

For function calling, load schemas from `GET /api/v2/tools`. See [examples](examples/README.md) and [the agent guide](AGENTS.md). A working MCP endpoint does not imply approval or listing in every assistant’s connector directory.

## Try the API

```bash
NEWSBEAT_API=https://newsgraph.vercel.app/api
curl "$NEWSBEAT_API/v2/topics?q=nvidia&limit=5"
curl "$NEWSBEAT_API/v2/news?beat_id=b_bb964843350e"
curl "$NEWSBEAT_API/v2/changes?beat_id=b_bb964843350e&cursor=<saved-cursor>"
```

Choose an asset, read its baseline, save the returned cursor, then poll for changes. Process each page before advancing the cursor and continue while `has_more` is true. An empty response means no new indexed items in that window; check `freshness` before drawing conclusions.

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

## In development

[PR #11](https://github.com/thepeternemec/NewsBeat/pull/11) contains general news search, source-record lookup, multiple agent keys, unified REST/MCP billing, OAuth resource-server support and signed saved-watch notifications. These are **preview work, not features activated by this branding release**. Database migration, environment setup and end-to-end activation remain required.

Stripe checkout and public platform-directory submissions are separate work. The current main branch does not promise billing parity between REST and MCP; the shared executor in PR #11 addresses that gap.

## Documentation

- [Current capabilities and limitations](docs/STATUS.md)
- [Agent integration guide](AGENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Deployment and domain cutover](docs/GO-LIVE.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

MIT licensed. See [LICENSE](LICENSE).
