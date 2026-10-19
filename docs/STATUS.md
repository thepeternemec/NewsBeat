# Where the project is

Last verified: **2026-09-14** against production. Every number was read from the live system.

## What this is

An agent asks a topic and a cursor, and gets back either **"nothing moved"** or **a small pack of
cited stories**. Read-only. No credential required; a key is optional and metered.

## What exists

One API, one worker, one website. Nine packages became two.

| | |
| --- | --- |
| `apps/api` | `GET /v2/topics`, `/v2/news`, `/v2/changes`, `/v2/tools`, `/mcp`, `/health` |
| `apps/worker` | Ingestion: provider → English filter → dedupe → store |
| `packages/contracts` | Every wire shape as a zod schema — the single source of truth |
| `packages/db` | A Postgres client, and nothing else |
| `apps/web` | The site |
| `db/schema.sql` | Three tables and one function |

`apps/api` is a Hono app mounted at `/api/*` by the Next app, so the site and the API are one
Vercel deployment. There is no generated code and no second runtime.

## Verified working

- `/v2/topics` — **2,030 topics**: 1,528 US-listed equities (the S&P 500, the S&P 400, the S&P 600,
  and IPOs the indices have not caught up with) plus 502 crypto assets by market cap. Paginated, and
  each carries `beat_id`, `label`, `ticker`, `asset`, `status`, `article_count` and `recent_12h`
- `/v2/news` — **~57,600 articles** from **Google News RSS**, free and key-less, 24-hour window
- Ingestion is **free**: no API key, no quota. `NEWSGRAPH_PROVIDER=newsapi` switches back to the
  paid provider, which is no longer the default precisely so it stops burning credits
- `/v2/changes` — signed, topic-bound cursors; a replay returns nothing rather than duplicates
- `/v2/brief` — the top three headlines **verbatim**, with source and UTC time. Deliberately not a
  summary: a brief that paraphrases can be wrong while reading well
- `/v2/stories` — **the events behind a topic rather than the coverage of it.** Groups
  near-identical headlines and orders by how many publishers carried each, so eleven reports of one
  court ruling appear as one story with `source_count: 36`
- **`POST /v2/watch`** — up to 50 topics in one call. The product's loop is a question asked on a
  schedule; asking it about fifty topics was fifty round trips per cycle, 4,800 a day. Each watch
  is independent, so one expired cursor fails only its own result
- `/v2/tools` and `/mcp` — the same handlers, in OpenAI and MCP shape
- **Rate limits** — 120 requests/minute anonymous, 1200 with a key. Keys are optional and unlock no
  data; they raise a ceiling
- The site: landing, pricing, six docs pages, FAQ, dashboard, connect, `auth.md`

**Ingestion is stopped.** The Vercel Cron was removed from `apps/web/vercel.json` on
2026-09-22 and the definitions are now empty, so nothing calls `/api/cron/ingest`. Topics hold
their last successful check and will report `stale` once they pass their freshness SLO. The data
already stored is intact and the API serves it unchanged.

To restart: put the schedule back and redeploy.

```json
"crons": [{ "path": "/api/cron/ingest", "schedule": "*/15 * * * *" }]
```

The live presentation was stopped with it, because motion is a claim that something is arriving:
the landing's `STREAMING` badge reads `sample`, its scrolling headline tickers are static rows,
and the dashboard no longer polls on a timer.

## Duplicates

The feed was producing duplicates and the cause was not what it looked like. Two
defects wore one symptom:

1. **Google mints a fresh URL for the same item on every cycle.** Deduplication was
   `on conflict (beat_id, url)`, so it never fired. One topic accumulated 599 identical
   rows — `| Benalla Ensign`, re-fetched every fifteen minutes for a week.
2. **The headline was the publisher's name.** `stripPublisherSuffix` only knew separators
   with a space before them (`" | Publisher"`), and Google had written `"|Publisher"`. What
   survived the strip was the publisher, dressed as a headline.

Both fixed at the source:

- `append_news_articles` collapses repeats inside a batch (`distinct on`) and refuses a
  headline it already holds for the topic from the same publisher, whatever URL Google
  gave it this time. Indexed on `(beat_id, lower(trim(title)), lower(trim(source)))`.
- The parser handles spaced and unspaced separators, and `isDegenerateTitle` drops a
  headline that is empty, under twelve characters, or the publisher's name with
  punctuation removed.

Backfill removed **57,067 redundant rows** (8.6% of the table). After it and a full
ingest: **0 duplicate sets inside the 30-day window**. 45 sets remain that span 32 days
— the check is window-scoped, so a headline repeating after a month is permitted, and
retention deletes those rows at 35 days anyway.

`npm run db:dedupe` reports; `-- --apply` deletes. Dry by default, because it deletes.

## What the site claims, and the numbers behind it

Two statements were true when written and stopped being true when keys were metered:

- **"A key raises it to 1200"** — and is charged. A visitor read that as "faster, free",
  then hit a 402 after burning the trial. Every surface that described a key now says
  it is metered from a $5.00 trial and returns 402 when empty.
- **`AGENTS.md` said "There is no billing."** The guide an agent reads first. It now
  describes the trial, the per-call prices and the 402.
- **`auth.md` said keys were "issued by hand today — there is no self-serve endpoint."**
  Untrue since `/api/keys/authorize` shipped.

The landing's refresh metric was a claim with a disclaimer bolted on —
*"Scheduled refresh interval; check topic freshness"* — which reads defensively and says
two things. It is one claim now: **"15m · How often every topic is re-checked"**.

Measured before asserting it: 2,030 of 2,030 topics re-checked within 15 minutes, newest
10 minutes old, oldest 13. The cron reports `deferred: 0`. If the catalog ever outgrows
the ingestion budget, `deferred` becomes non-zero and this claim stops being true — it is
a measurement, not a promise.

**117 orphan rows** in `news_ingestion_status` were also removed: status for topics that
left the catalog, the oldest checked 31 days ago. Row count now equals the catalog.

## Data growth

Articles accumulate at roughly **24,000 a day** and the table reached **1.27 GB**. The API serves a
30-day window, so anything older was unreachable but never removed.

`npm run db:retain` deletes articles past the retention window — 35 days by default, deliberately
past the API's own cut-off so a run can never remove a row a request in flight could still reach.
The cron calls it once a day at 03:00 UTC rather than every fifteen minutes: deleting by an age
boundary is idempotent, and there is no reason to pay for the scan 96 times.

Deleting is separate from ingesting on purpose. Fetching news and forgetting news are different
jobs, and the destructive one should be easy to find and easy to turn off.

## Not built

- **WebSocket push.** Clients poll; there is no subscribe. `changes` already has the cursor
  semantics a push would need.
- **Write access.** Everything is read-only, by design rather than by omission.
- **Article ledes.** Google News carries no prose, so an item is a headline and nothing else.
- **Self-serve keys.** A key is issued by `npm run key:issue` on the server. There is no account,
  no sign-in and no form, so an agent cannot obtain a higher limit without a human.
- **Registration.** `auth.md` is published and states plainly that no registration is required
  *and* none is offered. The OAuth machinery the protocol describes does not exist.

## What to build next

Ordered by what unblocks the most. Each is scoped to one pull request.

1. **Self-serve keys, via WorkOS AuthKit.** The gap a real user hits first: the API is free and
   public, but the higher limit needs a human to run a script. AuthKit gives users accounts so they
   can hold their own key. This is the largest item here and the only one that needs a dependency.
2. **Article ledes.** One request per article, so it needs a budget and a decision about which
   articles are worth it. Everything downstream — clustering, a real brief — is blocked on it.
3. **A Python client.** `packages/sdk` was a thin TypeScript wrapper and has been removed. A Python
   one would be used by more people than anything else on this list.
4. **Push instead of poll.** `changes` already has the cursor semantics WebSocket needs.
5. **Cover the last 68 topics.** Thin small-caps with no 24-hour coverage. Either widen their
   keywords, lengthen their window, or accept that quiet is the answer.

## Known issues

- **A test file was previously vacuous.** `docs.test.ts`'s tool guard iterated over tool names it
  expected to find in the docs; no doc named one, so the loop never ran and the check could not
  fail. It is two-way now, but the shape is worth remembering: a guard that cannot fail is worse
  than no guard, because it reads as coverage.
- **Code samples are now guarded, and the guard needed three fixes to be honest.** A sample could
  name a route the API does not serve, or import a package that does not exist — which is how
  `/connect` advertised `@newsgraph/sdk` for weeks after it was deleted. `routes.test.ts` now
  derives the documented routes from the documents themselves, checks the site's samples against
  the mounted app, and verifies every import resolves against the workspace. Note what the first
  version got wrong: it kept a hand-maintained copy of the route list and called it "exactly what
  AGENTS.md says", which made it a second source of truth rather than a check; and it read only the
  root `package.json`, so it flagged `react` and `lucide-react` as missing packages.
- **Four topics carry no articles**, not the 68 this file used to name — ingestion caught up. They
  are `FIGR_HELOC`, `BFUSD`, `EUTBL` and `U`: stablecoin and T-bill assets whose Google News queries
  return zero results. The diagnosis matters, because the two causes need opposite fixes: fetched
  0 means genuinely quiet, fetched >0 but matched 0 would mean the headline filter is too strict.
  One of the four fetched 2 articles and matched neither, which is the filter behaving correctly on
  an asset nobody writes headlines about.

## Verify any of this yourself

No credential, and the first three need no database.

```bash
git clone https://github.com/thepeternemec/NewsGraph.git
cd NewsGraph && npm install && npm run build:packages && npm test
```

```bash
NEWS=https://newsgraph.vercel.app/api
curl "$NEWS/v2/topics"                              # 4 topics
curl "$NEWS/v2/news?beat_id=b_bb964843350e"         # NVIDIA
```

If the site ever disagrees with these commands, **the site is wrong** — open an issue.

## How this stays true

**Never let the site or the docs claim more than the code does.** If you ship something, update
this file and the README in the same pull request.
