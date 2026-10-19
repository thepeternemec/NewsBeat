# NewsGraph agent integrations

All interfaces call one shared executor. MCP and REST validate the same schemas and apply the
same account pricing. API discovery and topics are free. Read responses contain a usage receipt;
failed requests and failed batch entries cost zero. Anonymous reads remain free and rate limited.

## Connect

- **ChatGPT:** use the custom MCP connection flow where your account supports it, with
  `https://newsgraph.vercel.app/api/mcp`. Public distribution requires a separate plugin submission.
  Official guide: https://developers.openai.com/plugins/build/app-quickstart
- **Claude:** add that URL as a custom remote connector.
  https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp
- **Grok API:** run `node examples/grok.mjs` with XAI_API_KEY. This is an API integration,
  not a claim that NewsGraph is listed in the consumer Grok connector directory.
- **Muse:** submit a working connector at https://platform.muse.ai/. No submission or approval
  is implied by this repository. Meta AI's separate preview is at https://dev.meta.ai/products/connectors.
- **Other frameworks:** GET /api/v2/tools for function schemas or /api/openapi.json for OpenAPI 3.1.
  `server.json` contains metadata ready to validate with the MCP Registry publisher.

## Search and fetch

`GET /api/v2/search?query=central%20bank&language=en&country=US&limit=8`

Optional `since`, `until` (ISO timestamps) and `source` restrict results. The provider returns a
bounded window; this is not exhaustive historical search. Queries are cached for fifteen minutes.
Save `cursor` to detect new indexed matches, or pass `history_cursor` as `before` to page backwards.
Cursors are bound to the full query and filters. Page size can change without invalidating them.
Read `freshness` and `coverage`; an empty result is not proof no event occurred.

`GET /api/v2/story?id=<id returned by search>` retrieves the stable source record, within retention.
IDs derive from normalized URLs. They identify source records, not independently verified events.
Headlines can be updated at the same URL; the initial change stream reports new records, not every
editorial revision. No full article body is provided.

## Saved watches and notification delivery

Use an account API key. OAuth clients need both news:read and watches:write scopes.
Create a subscription with POST /api/v2/subscriptions:

```json
{
  "label": "Central bank watch",
  "operation": "search",
  "arguments": {"query": "central bank", "language": "en", "country": "US"},
  "webhook_url": "https://YOUR-RECEIVER.example/newsgraph",
  "interval_minutes": 15
}
```

For ticker batches use operation `watch` and arguments `{"watches":[{"beat_id":"b_bb964843350e"}]}`.
Without a starting cursor the first check delivers a baseline. Store the webhook_secret returned
at creation; only encrypted material is retained. HTTPS port 443 is required. Private, local,
reserved or mixed public/private DNS answers are rejected. DNS is rechecked and pinned for each
delivery; redirects are not followed.

- GET /api/v2/subscriptions lists your watches and latest check error.
- POST /api/v2/subscriptions/:id/pause stops future checks and pending delivery attempts.
- POST /api/v2/subscriptions/:id/resume restarts them.
- Failed checks preserve the last cursor. Expired cursors establish a fresh baseline on retry.
- Cursor advancement and creation of the delivery record happen in the same transaction.
- Acknowledged delivery requires HTTP 2xx. Failed deliveries retry with backoff, at most eight attempts.
- Delivery is at least once. Dedupe `X-Newsgraph-Delivery`; do not send duplicate user notifications.
- Verify `X-Newsgraph-Signature: v1=<hex>` against HMAC-SHA256(secret, timestamp + "." + raw_body),
  with X-Newsgraph-Timestamp within five minutes. Use a constant-time comparison.
- Retries do not repeat the billed news operation. Successful new scheduled checks use account credit.
- At most five subscriptions and five deliveries are processed per minute in this initial worker.
  Watch lag should be monitored before increasing volume; this is not an unlimited real-time service.

`examples/notification-relay.mjs` is a signed receiver forwarding headlines to Telegram and/or
Discord using your bot credentials. Configure the destination IDs in its environment. Put it
behind HTTPS and point the watch at `/newsgraph`. It does not create bot accounts for you.
For n8n, use its Webhook node with raw-body capture, verify the signature, dedupe delivery IDs in
persistent storage, then use the Telegram or Discord node. Never skip signature verification.

## OAuth operator setup

Use an established OAuth 2.1 authorization server with PKCE, resource indicators, and either
pre-registered clients, CIMD or dynamic client registration. Configure:

- NEWSGRAPH_OAUTH_ISSUER: exact token issuer.
- NEWSGRAPH_OAUTH_JWKS_URL: trusted HTTPS signing-key endpoint.
- NEWSGRAPH_OAUTH_RESOURCE: https://newsgraph.vercel.app/api/mcp (must match the access-token audience).
- Access tokens: RS256 or ES256, with sub, exp, iat, and scope containing news:read.
- Add watches:write only for clients allowed to create billable scheduled watches.
- Optionally set NEWSGRAPH_REQUIRE_MCP_AUTH=true after verifying the consent flow.

NewsGraph is a resource server, not an authorization server. The metadata endpoint returns 503
until configuration is complete. OAuth identities receive their own account; no automatic
email-based merging with GitHub accounts is performed. Account consolidation needs an explicit,
authenticated linking flow before moving an existing GitHub balance to an OAuth identity.

## Release prerequisites

1. Run `npm run db:migrate:agents` (db/migrations/20261019-agent-connectors.sql) with a privileged server DB role. It is additive,
   idempotent, and enables RLS on new private tables. Test against a separate preview database first.
2. Set CRON_SECRET in Vercel so both cron endpoints require the platform-provided Bearer header.
   NEWSGRAPH_CRON_SECRET is accepted only as a legacy/manual ingestion secret. User-Agent is never auth.
3. Set NEWSGRAPH_WEBHOOK_SECRET to a random secret of at least 32 characters. Keep it stable: it
   encrypts stored destination signing secrets. Use distinct secrets per environment.
4. Set GitHub OAuth callback to the correct environment origin. Sessions expire after twelve hours.
5. Configure OAuth above if needed. Add specific browser origins through NEWSGRAPH_MCP_ORIGINS.
   Do not weaken the origin check to fix browser preview access.
6. Run npm test, npm run test:integration, npm run build. Verify a real MCP tools/call, search cursor,
   account isolation, balance receipt, and signed webhook delivery in the preview environment.
7. Stage production using its own environment, verify, then promote. Preview tests must not use
   production accounts, balances, bot destinations or subscription data.

The payment-provider checkout/webhook implementation is a separate integration. This release
uses the existing account balance and grants; it does not claim to complete Stripe checkout.
