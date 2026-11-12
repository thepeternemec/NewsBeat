# auth.md

This service requires **no registration and no credential to use**. There is no
session to establish and no token to refresh. This file exists so an agent does not
spend a turn looking for an auth flow that does not exist — and so that the one
optional flow that does exist is not a surprise.

Host: `www.newsbeat.dev` · API base: `https://www.newsbeat.dev/api`

## 1. Register

Skip this step. There is no `/agent/identity`, no `/oauth2/token`, and no claim
ceremony. `POST` to any of them returns `404`.

Rarebird provides public read-only research and an explicit temporary collection-control endpoint. Access is not gated, so there is no
user to register and no scoped token to mint. An agent may call it on first use,
with no setup and no operator involvement.

## 2. Authenticate

Send no `Authorization` header. Every request succeeds without one.

```http
GET /v2/brief?beat_id=b_bb964843350e HTTP/1.1
Host: www.newsbeat.dev
```

Responses carry `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
and `X-RateLimit-Tier`.

## 3. If you are being rate limited

Anonymous callers get **120 requests a minute**, identified by calling address —
hashed, never stored. That ceiling is high enough for the intended loop: one
`changes` call per topic per schedule, not a poll.

A key lets you run a **seven-day trial** of Rarebird in your agent, beginning
with its first metered REST request. It includes **up to $6 in usage credit**
and a ceiling of 1200 requests a minute. A check that found nothing is $0.0005,
one that moved is $0.004, and a brief is $0.03. The credit covers up to twelve
thousand empty checks; the clock may end first.

When the credit runs out the key returns `402 payment_required`; when seven
days elapse it returns `402 trial_expired`. For example:

```
402  { "error": { "code": "trial_expired" }, "pricing": "/pricing" }
```

That is not a rate limit. Falling back to the anonymous tier is free and always
works, so an agent with an empty balance should degrade rather than fail.

To see your exact deadline and remaining credit, call `GET /api/keys/trial`
with your bearer key. Creating another key for the same account does not restart
the trial. Public news is still available without a key.

**Self-serve is available** at `https://www.newsbeat.dev/keys` — GitHub, scope
`read:user`, the key shown once. That is a browser flow: it needs a human to
authorise it, so an agent cannot complete it alone. The key is then a bearer token
in a header.

```http
GET /v2/topics?limit=1 HTTP/1.1
Host: www.newsbeat.dev
Authorization: Bearer ng_...
```

## 4. Discover the API instead

The discovery this service offers is about *content*, not identity. There is no
Protected Resource Metadata document, because there is no authorization server
for it to describe.

```http
GET /v2/tools HTTP/1.1
Host: www.newsbeat.dev
```

Returns 16 research calls plus one explicit collection-control call in OpenAI function-call shape:

| Tool | Purpose | REST route |
| --- | --- | --- |
| `newsbeat_research` | Question → asset-specific evidence → cited answer, uncertainty and next checks. Explicit on-demand model call; quantitative coverage is limited. | `POST /v2/research` |
| `newsbeat_investment` | The ticker brief shown on Ask Rarebird, with its stance, supporting evidence and limits. | `POST /v2/investment` |
| `newsbeat_collection` | Explicitly request one-minute collection for 15 minutes, read status, or stop with your token. | `GET/POST /v2/collection` |
| `newsbeat_intelligence` | Stored event memory, conditional implications and follow-up checks for the six-asset pilot | `GET /v2/intelligence?beat_id=` |
| `newsbeat_opportunities` | Review and watch shortlist across the six measured assets | `GET /v2/opportunities` |
| `newsbeat_catalysts` | Recent SEC filings and comparable reported results for four issuers | `GET /v2/catalysts` |
| `newsbeat_topics` | Find a supported stock or crypto asset. | `GET /v2/topics?q=…` |
| `newsbeat_news` | Read headlines and establish a baseline cursor. | `GET /v2/news?beat_id=…` |
| `newsbeat_changes` | Get new items since the saved cursor. | `GET /v2/changes?beat_id=…&cursor=…` |
| `newsbeat_brief` | Read three relevant recent headlines verbatim. | `GET /v2/brief?beat_id=…` |
| `newsbeat_stories` | Read grouped headlines and their sources. | `GET /v2/stories?beat_id=…` |
| `newsbeat_summary` | Deprecated verbatim compatibility read; no generated summary. | `GET /v2/summary?beat_id=…` |
| `newsbeat_watch` | Check up to 50 topics once. | `POST /v2/watch` |
| `newsbeat_ask` | Resolve an asset and gather news, prices and chain context. | `GET /v2/ask?q=bitcoin` |
| `newsbeat_market` | Read a sourced crypto market overview. | `GET /v2/market` |
| `newsbeat_prices` | Read crypto prices by CoinGecko ID. | `GET /v2/prices?ids=bitcoin` |
| `newsbeat_fear_greed` | Read the daily fear and greed index. | `GET /v2/sentiment` |
| `newsbeat_chain` | Read Ethereum and Solana chain state. | `GET /v2/chain` |
| `newsbeat_token` | Read a reference price by contract address. | `GET /v2/token?asset=…` |
| `newsbeat_token_intelligence` | Read exact-contract pool data, issuer mappings and available underlying reporting. | `GET /v2/tokens?asset=…` |
| `newsbeat_market_briefing` | Read the current crypto briefing and its sources. | `GET /v2/briefing` |
| `newsbeat_signals` | Read funding, DEX volume and stablecoin supply. | `GET /v2/signals` |

`GET /v2/topics?q=` searches by ticker or company name across +2000 topics —
US-listed equities and the largest crypto assets. A coin and a company can share a ticker
(Sui and Sun Communities are both `SUI`), so read `asset` to tell them apart.

## 5. Errors

| Status | Meaning | Action |
| --- | --- | --- |
| `200`, empty `items` | Nothing moved. Not an error | Report it plainly, do not retry |
| `400` | Malformed or expired cursor | Re-baseline with `/v2/news` |
| `404` | Unknown `beat_id` | Re-read `/v2/topics` |
| `429` | Rate limited | Wait for `Retry-After` |
| `503` | Storage unreachable | Back off. Never tight-loop |

## 6. What would change this file

Registration becomes meaningful only if the API stops being public — for example
if paid tiers are introduced alongside a free allowance. Billing is **not**
implemented, so that is not the case today.

If and when an authorization server exists, this file will be rewritten to the
full protocol: Protected Resource Metadata, `/agent/identity`, the claim
ceremony, and the RFC 7523 exchange. It will not describe them before they exist,
because an agent that follows a flow this service does not implement wastes a
turn and learns to distrust the file.

The intelligence tool accepts optional `context`: `fundamentals`, `liquidity` or `risk`. `constructions` contains context-qualified hypotheses and alert checks; `alerts` contains review records with stable IDs. Reads do not start generation or deliver notifications. The pilot adds `quantitative`: verified Kraken xStock/crypto prices, five-minute closed candles, a pre-information beta baseline, residual moves, relative volume and observed book costs. `constructions[].quantitative` explains information delta and timing gates; `market_reaction` can be `observed` when an aligned post-thesis window exists, without establishing causality. Missing, stale, thin or unprocessed data holds alerts. `evaluation` compares prospective all-construction and review-alert cohorts; `evaluations` freezes entry references and later 15/60/240-minute observations. Returns exclude fees and are not executable P&L. Thresholds are research heuristics awaiting calibration. Notification delivery and execution are not connected. See [methodology](https://github.com/thepeternemec/NewsBeat/blob/main/docs/QUANTITATIVE.md).
