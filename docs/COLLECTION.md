# News collection frequency

NewsBeat's catalog is scheduled every **10 minutes**. Faster news checks are optional for NVIDIA, Apple, Microsoft, Alphabet, Bitcoin and Ethereum.

## Request one-minute checks

On the intelligence page, select an asset and choose **Request 1-min news · 15 min**. Only that button starts a session. Loading the page, changing the focus, reading news or checking status does not start one.

An agent must use `newsbeat_collection` only when the user explicitly asks for one-minute collection:

```json
{ "action": "start", "beat_id": "b_bb964843350e", "interval_seconds": 60 }
```

The session lasts **15 minutes**, does not renew automatically and can be stopped early using the returned `session_token`. Keep that token private. Duplicate requests share the asset's active session; they do not extend its expiry or create more provider jobs. Another caller does not receive the owner's cancellation token.

## REST

Status is a read and never opts in:

```http
GET /api/v2/collection?beat_id=b_bb964843350e
```

Start explicitly:

```bash
curl -X POST "https://www.newsbeat.dev/api/v2/collection" \
  -H "Content-Type: application/json" \
  -d '{"action":"start","beat_id":"b_bb964843350e","interval_seconds":60}'
```

Stop with a JSON body containing `action: "stop"`, the same `beat_id` and your `session_token`. Do not put the token in URLs or logs. MCP supports the same `status`, `start` and `stop` actions.

## What changes

| Component | Schedule |
| --- | --- |
| Catalog news collection | Every 10 minutes |
| Requested priority news collection | Every minute while a 15-minute request is active |
| Headline interpretation jobs | Every 5 minutes, processing bounded jobs when needed |
| Market measurements and anomaly scan | Every 5 minutes, using closed 5-minute candles |

The authenticated priority cron claims only active requests and makes no provider requests when none exist. One asset has at most one active shared session. Worker leases prevent overlapping runs from repeating the same job. A check already in progress may finish after cancellation; subsequent checks stop.

The one-minute target describes collection scheduling, not guaranteed publication-to-signal latency. Google News indexing, provider failures, retries, deferred work and later analysis add delay. Fast sessions use the Google News collector and do not enable paid-provider polling. No notifications or trades are created.

[MCP setup](https://www.newsbeat.dev/docs/quickstart) · [Development](DEVELOPMENT.md)
