# Develop NewsBeat locally

[Documentation](README.md) · [Contributing](../CONTRIBUTING.md) · [Repository](../README.md)

The website, REST API and MCP endpoint run in one Next.js application. PostgreSQL stores local news, intelligence and account data. You can work on the interface and run the standard checks before configuring services.

## 1. Install and build

Use Node.js 22 or 24 and npm:

```bash
git clone https://github.com/thepeternemec/NewsBeat.git
cd NewsBeat
npm ci
npm run build
npm test
```

The repository uses npm workspaces. Build shared packages before starting the development server.

## 2. Start the website

```bash
npm run dev
```

Open http://localhost:3000. The API is mounted at http://localhost:3000/api; a separate API process is not required.

Without a database, pages can render but local news endpoints cannot return stored news. To explore populated data immediately, use the [hosted service](https://www.newsbeat.dev).

## 3. Configure local news data

Create an empty development PostgreSQL database using your preferred local or hosted provider. From the repository root:

```bash
cp .env.example apps/web/.env.local
```

Set these values in `apps/web/.env.local`:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Connection string for your development database |
| `NEWSBEAT_CURSOR_SECRET` | A stable random value used to sign article cursors |

Generate a cursor secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Next.js loads the file from `apps/web`. Standalone database and worker scripts need it passed explicitly.

## 4. Apply the schema and collect headlines

Run from the repository root after building:

```bash
node --env-file=apps/web/.env.local db/migrate.mjs
node --env-file=apps/web/.env.local apps/worker/dist/cli.js
```

The schema is idempotent. The default collector uses Google News RSS and needs no news-provider key. Collection is budgeted; inspect the results for failures or deferred topics rather than expecting every asset to update in one pass.

Restart `npm run dev` after changing environment values, then check:

```bash
curl "http://localhost:3000/api/health"
curl "http://localhost:3000/api/v2/topics?q=nvidia&limit=5"
curl "http://localhost:3000/api/v2/news?beat_id=b_bb964843350e"
```

A successful collection can contain no matching articles. Freshness describes the collection check; article counts describe available coverage.

## 5. Optional services

| Capability | Configuration |
| --- | --- |
| Generated summaries and pilot analysis | Server-side Vercel AI Gateway credentials; `AI_GATEWAY_API_KEY` outside Vercel, or the deployment's OIDC identity on Vercel |
| Pilot scheduled routes | `CRON_SECRET`; send the matching bearer authorization when invoking them |
| Manual general ingestion | `NEWSBEAT_CRON_SECRET` |
| GitHub-issued account keys | `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`; callback at your local origin's `/api/keys/callback` |
| Optional NewsAPI.ai collection | `NEWSBEAT_PROVIDER=newsapi` and `NEWSAPI_API_KEY` |

Model requests consume the operator's provider allowance or credits. Reading stored intelligence does not run the analysis model. A fresh local database will not contain pilot interpretations until the authenticated analysis worker runs.

Keep optional services unconfigured unless your change needs them. Use the public MCP endpoint when testing an agent connection against populated data.

## 6. Verify your change

```bash
npm run build
npm test
```

CI runs the same build and standard suite, plus persistence checks in a disposable PostgreSQL service. The exact commands and test database configuration live in [ci.yml](../.github/workflows/ci.yml).

## Common setup questions

| Symptom | Check |
| --- | --- |
| A workspace import cannot be resolved | Run `npm ci` and `npm run build` from the repository root |
| A script reports `missing DATABASE_URL` | Pass `--env-file=apps/web/.env.local`; standalone scripts do not auto-load Next.js environment files |
| A local asset has no news | Apply the schema, run collection and inspect the topic's freshness and count |
| A cursor stops working after setup changes | Keep the cursor secret stable, or fetch a new baseline |
| Intelligence is pending or unavailable | Check analysis timestamps and worker configuration; news collection alone does not create interpretations |

[Architecture](ARCHITECTURE.md) · [Intelligence design](INTELLIGENCE.md) · [Market methodology](QUANTITATIVE.md)
