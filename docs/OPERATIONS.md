# Operational status

Public page: https://www.newsbeat.dev/status

- JSON: `GET https://www.newsbeat.dev/api/status`
- Atom: `GET https://www.newsbeat.dev/api/status/feed`
- Scheduled writer: `GET /api/cron/status`, every five minutes in production.

The writer requires `Authorization: Bearer $CRON_SECRET`. A user-agent header is
never accepted as authentication. Configure `CRON_SECRET` as a production-only
Vercel Secret; Vercel adds it to scheduled requests. Preview deployments do not
schedule monitoring. Do not expose the value or put it in public client config.

Each check makes an anonymous request to the fixed production news API, initializes
MCP and calls `blacksheep_brief` for Nvidia. It also reads the last successful
ingestion time for every catalog asset and compares it with that asset's configured
freshness window. Empty news results are valid. AI-generated summaries, GitHub OAuth
completion, payments, individual publisher availability and other assets' end-to-end
news requests are not probed. No LLM request is made.

Results are stored in `blacksheep_operation_checks`, one row per five-minute slot.
The authenticated writer bootstraps only this additive table with `CREATE TABLE IF
NOT EXISTS`; it is also included in `db/schema.sql` for normal setup. Concurrent
or repeated checks do not overwrite an existing observation. Rows older than 45
days are pruned by the scheduled writer using the primary-key time range.

The public interfaces read stored observations, never execute probes or create
tables. They are outside API-key billing and rate-limit storage middleware, and
have a 30-second shared-cache lifetime. The JSON response carries `generated_at`,
`status`, `monitoring`, `interval_minutes`, `latest` and `history`. History exposes
at most 48 observations from the last four hours; `latest` retains the last
observation even if older. Database errors return HTTP 503 with unknown status,
without internal errors or credentials.

A missing history starts as unknown. Checks more than 12 minutes old (or invalid
timestamps) also make current status unknown. Stored failures remain visible in
history. Missing windows are gray, never inferred as healthy. Aggregate status
is degraded when only some monitored components fail; topic collection is
degraded if any catalog topics are stale, unchecked or failed their last attempt.
The Atom feed contains observations with stable timestamp IDs, not manually
declared incidents or guaranteed outage intervals.

This is first-party monitoring, on the same Vercel deployment and database. It
cannot independently prove availability through a complete platform outage. Use
an external monitor for that requirement. No uptime percentage is claimed.

## Verification

Run `npm run build:packages`, `npm run build -w @blacksheep/api`, and
`node --test apps/api/dist/lib/operations-policy.test.js`. The normal `npm test`
also includes those tests. Build the web app and verify the `/status` page on
mobile and desktop. The public cron URL must reject unauthenticated requests,
including requests with a forged `vercel-cron` user agent.
