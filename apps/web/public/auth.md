# auth.md

This service requires **no registration and no credential to use**. There is no
session to establish and no token to refresh. This file exists so an agent does not
spend a turn looking for an auth flow that does not exist — and so that the one
optional flow that does exist is not a surprise.

Host: `www.newsbeat.dev` · API base: `https://www.newsbeat.dev/api`

## 1. Register

Skip this step. There is no `/agent/identity`, no `/oauth2/token`, and no claim
ceremony. `POST` to any of them returns `404`.

Black Sheep is a **public read-only news API**. Access is not gated, so there is no
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

A key lets you run a **seven-day trial** of Black Sheep in your agent, beginning
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

Returns the seven calls in OpenAI function-call shape:

| Tool | Use it to |
| --- | --- |
| `newsbeat_topics` | Find a topic. Never invent a `beat_id` |
| `newsbeat_news` | Read a topic and take a baseline cursor |
| `newsbeat_changes` | Ask what is new since that cursor |
| `newsbeat_brief` | The top headlines verbatim, with source and UTC time |
| `newsbeat_stories` | The events behind a topic, not the coverage — near-identical headlines grouped |
| `newsbeat_summary` | Short explanations based on headlines, with source links; original headlines if generation is unavailable |
| `newsbeat_watch` | Many topics in one call — the batch form of `changes` |

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
