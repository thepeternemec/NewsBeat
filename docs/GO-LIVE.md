# Going live

What has to be true before the site is serving real news, and how to check each one.

## The three things it needs

| | What | Where it goes |
| --- | --- | --- |
| 1 | A Postgres database | `DATABASE_URL` |
| 2 | The schema | `npm run db:setup` once |
| 3 | *(optional)* a newsapi.ai key | `NEWSAPI_API_KEY` — only for `RAREBIRD_PROVIDER=newsapi` |

Plus `RAREBIRD_CURSOR_SECRET`, which signs cursors. Rotating it invalidates every cursor already
issued, so treat it as long-lived.

## 1. Create the database

In the Vercel dashboard: **Storage → Create Database → Postgres**. Vercel injects `DATABASE_URL`
into the project automatically, for all environments.

This is standard Postgres and standard SQL, so nothing is locked in — but the Vercel integration
is the path of least setup, and it is the one this document assumes.

## 2. Apply the schema

```bash
DATABASE_URL="postgres://…" npm run db:setup
```

Three tables (`news_articles`, `news_ingestion_status`, `news_worker_keys`) and one function
(`append_news_articles`). It is idempotent, so re-running is safe.

Verify:

```bash
psql "$DATABASE_URL" -c '\dt'      # or: select table_name from information_schema.tables where table_schema='public'
```

## 3. Set the environment

Vercel → Project → Settings → Environment Variables (Production and Preview):

```
DATABASE_URL              (usually injected by the Storage integration)
NEWSAPI_API_KEY           your full-access key
RAREBIRD_CURSOR_SECRET   32 random bytes, hex
RAREBIRD_CRON_SECRET     optional; only for manual ingestion runs
```

## 4. Put the topics in

**This is the one file to edit:** `packages/contracts/src/seed.ts`.

```ts
{
  beat_id: "b_7c4e91f0a2d3",            // b_ + exactly 12 hex chars. Never reuse one.
  label: "Bitcoin",
  concept_uris: ["http://en.wikipedia.org/wiki/Bitcoin"],
  topic_filters: [],
  languages: ["eng"],
  excludes: "Price predictions and giveaway spam",
  state: "warm",
  refresh_interval_minutes: 15,
  freshness_slo_minutes: 30,
}
```

`npm test` checks every entry: the id format, that ids are unique, and that each concept URI is a
newsapi.ai-style Wikipedia URI. A malformed topic fails the build rather than failing in
production.

**`beat_id` is the key clients store cursors against.** Changing it for an existing topic silently
orphans every cursor already in the wild — so add, never renumber.

## 5. Run the first ingestion

```bash
curl -H "Authorization: Bearer $RAREBIRD_CRON_SECRET" \
     https://www.rarebird.network/api/cron/ingest
```

It returns one line per topic:

```json
{ "ok": true, "beats": 4, "inserted": 512,
  "results": [{ "label": "NVIDIA", "fetched": 50, "inserted": 47 }] }
```

The default provider is **Google News RSS**: free, key-less, English, last 24 hours, one request
per topic. The response says how many it made:

```json
{ "ok": true, "beats": 148, "calls": 30, "inserted": 497 }
```

Then check the topics:

```bash
curl https://www.rarebird.network/api/v2/topics
```

A topic that ingested successfully reads `fresh` or `stale`; one that has never run reads
`unavailable`. If a topic reports `error` in the ingestion response, the message is the provider's
— usually a bad concept URI or a key without access.

## 6. The schedule

`vercel.json` runs `/api/cron/ingest` every 10 minutes. Vercel signs its own cron requests, so no
secret is needed for those; `RAREBIRD_CRON_SECRET` only guards manual runs.

> **Hobby plan crons run once per day.** A 10-minute cadence needs Pro. If you are on Hobby,
> either change the schedule in `vercel.json` or drive it from GitHub Actions instead.

## Checklist

- [ ] `DATABASE_URL` set, and `npm run db:setup` has been run against it
- [ ] `NEWSAPI_API_KEY` set
- [ ] `RAREBIRD_CURSOR_SECRET` set
- [ ] Topics added to `packages/contracts/src/seed.ts`, and `npm test` passes
- [ ] First ingestion returned `ok: true` with a non-zero `inserted`
- [ ] `/api/v2/topics` shows `fresh` or `stale` rather than `unavailable`
- [ ] The cron cadence matches the plan you are on

## Self-serve API keys (GitHub OAuth)

Keys are issued by hand until this is configured. Two values, from an OAuth app
that **cannot be created by an API** — GitHub only exposes it as a settings form:

1. Open <https://github.com/settings/developers> → **New OAuth App**.
2. Name: anything. Homepage: `https://www.rarebird.network`.
3. **Authorization callback URL**: `https://www.rarebird.network/api/keys/callback`
   — it must match exactly, including the scheme and the path.
4. Copy the Client ID, generate a Client Secret.
5. Set both on Vercel as `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, then redeploy.

Until then `/api/keys/authorize` returns a page that says it is not configured and
tells the operator these same steps — it does not redirect somewhere broken.

What it asks GitHub for is `read:user` and nothing else. What it stores is the
GitHub numeric id, the login and the SHA-256 of the key — no email, no
repositories.

Signing in twice **rotates** the key and revokes the previous one in the same
transaction. An account holding five live keys has five times the allowance whether
it needs it or not, and the older ones are the ones nobody remembers holding.

For preview deployments, the callback is derived from the request origin, so each
deployment serves its own `/api/keys/callback`. GitHub allows one callback URL per
OAuth app, so a preview will refuse the redirect unless you register a second app.

## Rarebird production domain

The repository is [thepeternemec/rarebird](https://github.com/thepeternemec/rarebird). The canonical public host is [www.rarebird.network](https://www.rarebird.network).

- REST base: `https://www.rarebird.network/api`
- MCP endpoint: `https://www.rarebird.network/api/mcp`
- GitHub OAuth homepage: `https://www.rarebird.network`
- GitHub OAuth callback: `https://www.rarebird.network/api/keys/callback`

Set the callback on the GitHub OAuth application before enabling self-serve keys. If you run a separate OAuth application for a staging origin, set `RAREBIRD_GITHUB_OAUTH_ORIGIN` to its registered HTTPS origin in that environment. Use the same callback during authorization and code exchange.

Publish `RAREBIRD_*` configuration keys for new deployments. The server accepts older deployed keys as fallbacks and keeps existing cursor signatures, cached MCP tool calls and stored intelligence compatible. Local and hosted database data can be reused without a schema migration.

After deploying, check the home page, app, pricing, site icons, sitemap, `/api/health`, a real news read, and MCP initialization, tool discovery and one read. Check the OAuth and Telegram callbacks if those integrations are configured. Before adding a root-domain redirect, preserve unrelated mail and verification records at your DNS provider.
