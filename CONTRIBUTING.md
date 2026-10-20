# Contributing to NewsBeat

## The one rule that matters

**Do not claim more than the code does.** This is not a style preference. It is the
failure this repository keeps producing, and it is always the same shape: a thing
that looks true and is not.

Found and fixed in one week:

- the landing claimed **"150,000 publishers"**; nothing counted publishers, and the
  real number was 23,303
- `/connect` told developers to `import { NewsBeatClient } from "@newsbeat/sdk"`;
  that package had been deleted
- the quickstart described a catalog of **twenty topics**, three catalogs after it
  grew past a thousand
- the FAQ promised card, invoice and **stablecoin** payments; no payment code has
  ever existed
- `newsbeat_stories` was advertised in `tools/list` **with no handler**, so an
  agent that chose it got `unknown_tool`
- `/v2/news` ordered by an **id cast to text**, so it served month-old stories
  while current ones sat behind them

None of those broke a test. All of them were found by someone looking. If your
change makes a claim — in a doc, a comment, a commit message, a tool description —
check it against the running system before you write it down.

---

## Getting set up

```bash
git clone https://github.com/thepeternemec/NewsBeat.git
cd newsbeat
npm install          # also installs the git hooks, see "Guard rails"
npm run build        # contracts -> db -> api -> worker -> web
npm test             # 44 tests, no database required
npm run dev          # the site on http://localhost:3000
```

Node 20 or newer. The repo is an npm workspace with `apps/*` and `packages/*`.

**Most of it runs with no infrastructure.** `npm test` needs no database, no
network and no credentials. There is no separate API process to start: the API is
mounted inside the Next app at `/api/*`, so `npm run dev` gives you both.

To work against a real database, copy `.env.example` to `.env` and set
`DATABASE_URL`. Then:

```bash
npm run db:setup     # apply db/schema.sql — idempotent, safe to re-run
npm run ingest -w newsbeat-worker   # fetch news for every topic (free, no key)
npm run key:issue -- "my key"        # mint an API key
```

Ingestion uses Google News RSS, which is key-less and free. `NEWSBEAT_PROVIDER=newsapi`
switches to the paid provider; it is not the default and it costs money.

## Where things live

| Path | What it is |
| --- | --- |
| `packages/contracts` | Every wire shape as a zod schema, and the topic catalog in `seed.ts`. The source of truth. |
| `packages/db` | Typed database access, rate limiting, the usage ledger. |
| `apps/api` | The Hono app, mounted at `/api/*` by the Next app. Routes, cursors, clustering, billing costs. |
| `apps/worker` | Ingestion: query, filter on the headline, normalise, persist. |
| `apps/web` | The site and the terminal. **One** route group, `(site)`, and one root layout. |
| `db/schema.sql` | The schema, idempotent. Apply with `npm run db:setup`. |
| `docs/` | `STATUS.md` is the state of the project. Read it first. |

There is no SDK, no realtime package and no bots process. If you find a directory
suggesting otherwise, it is empty and should be deleted.

## Tests

```bash
npm test                                  # everything
npm run build -w @newsbeat/contracts && node --test packages/contracts/dist/*.test.js
```

The suite runs **without a database**. That is deliberate — it is why CI works
from a clean checkout — but it has a cost: a guard that needs a database is
skipped, and a skipped guard is not a guard. Where a rule can be pure, make it
pure; `cluster.ts` and the cursor signing are both testable without Postgres for
that reason.

**Prove a guard fails before you trust it.** Every guard in this repo was verified
by breaking the thing it protects and watching it catch. Three of them were
written, watched passing, and then found to be validating nothing: one looped over
an empty list, one read a file that did not exist and caught its own error, one
built the wrong workspace. A guard that cannot fail reads as coverage and is
worse than nothing.

## How to fix something

The order that works here:

1. **Reproduce it against the running system**, not against the code. Nine of the
   ten bugs above were invisible in the source.
2. **Check the docs for the same claim.** `grep` for the sentence, not the concept —
   the stale copy is usually in five files.
3. **Fix the cause, not the symptom.** The metric that read `1000` was a page
   length in four places; patching one would have left three.
4. **Write the guard**, then break the code and watch the guard fail.
5. **Update `docs/STATUS.md`.** It is the project's memory and its most valuable
   document.

### Prefer assertions over substitutions

Editing by string replacement has failed here more than any other technique.
A replacement that matches nothing reports success; an assertion that is wrong
fails loudly. When a substitution is fiddly — JSX nesting, multi-line blocks —
read the line numbers and assert the structure instead.

## Conventions

- **Contracts first.** If a shape appears on the wire it belongs in
  `packages/contracts` as a schema. Do not hand-roll a response object in a route.
- **One error shape.** `{ "error": { "code", "message" } }`, always. Codes are
  stable and come from `NewsError`; never make a caller match on a message string.
- **Money is integer micros.** `1000000` micros is one dollar. Never a float.
- **The database is not a cache.** Counts that a client reads per page belong in
  the schema with an index behind them, or they will be added later at 1.9s per call.
- **No article bodies, ever.** An item carries a headline, a link, the publisher's
  name and a timestamp. Google News returns no excerpt and no publisher URL; do not
  document either as present.
- **Do not paraphrase.** A brief quotes the publisher's own headlines. Grouping
  near-identical coverage is fine; rewriting it is not.

## Adding a topic

Topics live in `packages/contracts/src/seed.ts`. Append an entry with a `beat_id`
(md5 of `asset:ticker`), `label`, `ticker`, `keywords` and, for crypto, `asset`.

```bash
# the fastest way to get one right
npm run build:packages && npm test
```

Keywords must appear in a headline to match, so the **company or asset name matters
more than the ticker** — a serious story names the company. Never add a one- or
two-character keyword that is a common word.

`beat_id` must never change: clients store cursors against it.

## Adding an endpoint or a tool

A tool has to agree in **three** places, and the guards only cover two unless you
add the third:

1. `packages/contracts/src/news.ts` — `NEWS_TOOLS`, the schema an agent reads
2. `AGENTS.md` — the prose an agent reads *(the two-way guard checks both ways)*
3. `apps/api/src/lib/news-routes.ts` — `callNewsTool` *(the handler guard calls
   every advertised tool and fails on `unknown_tool`)*

Forgetting the third is how `newsbeat_stories` shipped broken.

## Guard rails

Two hooks install with `npm install`, and each exists because the thing it prevents
happened.

**`pre-push` refuses to force-push `main`.** A pushed commit was amended once and
came within one command of erasing a contributor's work. Branch protection enforces
the same rule server-side.

**`pre-commit` refuses code that does not compile.** Twice a build was run with its
output sent to `/dev/null`, both times it failed, and the next command tested a
stale artefact. It now builds `packages` *and* `apps/api`, because a version that
built only `packages` let a broken route onto `main`.

Both can be skipped with `--no-verify` when you have a reason. Not to tidy up.

## Reporting a security issue

Do not open a public issue for anything exploitable. Email the maintainer. There is
no bounty; there is a fix and a thank-you.

## License

Contributions are accepted under the MIT license in [LICENSE](LICENSE).
