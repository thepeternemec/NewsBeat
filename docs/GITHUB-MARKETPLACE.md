# GitHub Marketplace webhook

Black Sheep currently offers free public news and MCP access. The Marketplace receiver records plan notifications; it does not bill customers, grant credits, restrict public access, or provision paid plans. Keep the listing free until paid-plan provisioning and reconciliation are implemented and tested.

## Listing configuration

Under **GitHub Marketplace → Black Sheep Agent → Webhook**, use:

| Field            | Value                                                                   |
| ---------------- | ----------------------------------------------------------------------- |
| Payload URL      | `https://www.newsbeat.dev/api/webhooks/github/marketplace`              |
| Content type     | `application/json`                                                      |
| Secret           | The same random value as production `GITHUB_MARKETPLACE_WEBHOOK_SECRET` |
| SSL verification | Enabled                                                                 |
| Active           | Checked                                                                 |

Use a dedicated, high-entropy secret, separate from GitHub OAuth credentials and cron secrets. Configure it as a sensitive, production-only Vercel variable and deploy before saving the hook. Never put it in source, a URL, screenshots, or browser-visible environment variables. Preview deployments fail closed unless explicitly given their own test secret.

After saving, check **Recent deliveries**. GitHub's signed `ping` should receive HTTP `200` with `status: recorded`. Redelivering the same event returns `status: duplicate`. Both mean the delivery was saved successfully. GitHub does not automatically redeliver failed Marketplace deliveries: investigate failures and use **Redeliver** after fixing the cause.

## Receiver behavior

- `POST` only; JSON only, up to 1 MiB. Reads are bounded and time out after five seconds.
- Validates `X-Hub-Signature-256` using HMAC SHA-256 over the exact request bytes and constant-time comparison before parsing or accessing the database.
- Requires a valid `X-GitHub-Delivery` UUID. Records `ping` and `marketplace_purchase` deliveries before returning success. Unrelated signed event types are acknowledged as ignored.
- Records purchases, cancellations, changes, pending changes and cancelled pending changes, including their effective dates. A ledger preserves delayed and out-of-order notifications without overwriting an account's state.
- A unique delivery ID prevents duplicate writes, including concurrent redeliveries. Reusing an ID for a different body or event returns `409`.
- Saves only the delivery ID, event, body digest, action, numeric account/plan IDs, account type, previous plan ID, effective date and receipt time. It does not save the raw payload, sender details, billing email, OAuth tokens or secret.
- Database failure returns `503`, never a successful acknowledgement. Missing server secret also returns `503`; missing or incorrect signatures return `401`.
- Uses `public.blacksheep_marketplace_deliveries`. The signed receiver bootstraps this additive table; it is also included in `db/schema.sql`. No production database credentials need to be copied locally.

## Check deliveries as an operator

Use the database's authenticated SQL console, never a public endpoint:

```sql
select delivery_id, event, action, github_account_id, plan_id,
       effective_at, received_at
from public.blacksheep_marketplace_deliveries
order by received_at desc
limit 50;
```

The webhook completes this listing configuration step. It does not verify that a separately registered GitHub App's installation/OAuth setup is complete. Test the actual install and onboarding flow before submitting for review. Black Sheep's agent integration is MCP; a Marketplace listing does not itself add an `@newsbeat-agent` Copilot chat command.

## Before offering paid Marketplace plans

Implement account linking for the registered Marketplace app, verify purchases through GitHub's Marketplace API, reconcile missed deliveries, and apply entitlements according to effective dates. Scheduled downgrades must not revoke access early. Handle cancellation and trial expiry, and keep GitHub billing separate from any Stripe billing. This receiver intentionally does not enable those flows.

References: [Webhook configuration](https://docs.github.com/en/apps/github-marketplace/listing-an-app-on-github-marketplace/configuring-a-webhook-to-notify-you-of-plan-changes), [signature validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries), [Marketplace purchase flows](https://docs.github.com/en/apps/github-marketplace/using-the-github-marketplace-api-in-your-app).
