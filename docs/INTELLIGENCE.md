# Event intelligence v1

The first intelligence layer is implemented above the noise-reduced news feed.

It interprets reported developments, retains event memory, and returns conditional implications, transmission mechanisms, uncertainty and follow-up checks. It does not turn headline volume, sentiment or prices into a claimed trading signal.

## Data flow

1. The existing ingestion pipeline persists de-duplicated headlines.
2. Every five minutes, the authenticated intelligence worker compares article watermarks for a six-asset pilot.
3. It leases at most two dirty assets, reads up to 200 recent reports, and selects up to eight diverse story groups with up to three reports each.
4. A bounded model call proposes up to four events. Output must pass the typed schema and citation/entity/number checks.
5. A transaction stores event memory and meaning revisions, then advances the processed watermark.
6. Public REST, MCP and the dashboard read the stored output. Reads never start model work.

## Pilot and bounds

Initial assets: **NVIDIA, Apple, Microsoft, Alphabet, Bitcoin and Ethereum**.

- Two asset jobs per five-minute worker run; concurrent runs use expiring leases and row locks.
- One model request per claimed asset, a 25-second timeout and at most 4,000 output tokens.
- Repeated input fingerprints skip generation.
- A failed or invalid analysis is retried after 15 minutes; the feed remains available.
- The current model is `google/gemini-2.5-flash-lite`, using the existing Vercel AI Gateway integration and server-side credentials.
- Sources must be fresh before interpretation. Selection is bounded, and partial coverage is reported.

This is a general event-research pilot. Custom task lenses, broad entity graphs, verified causal analysis, full-article evidence and cross-asset propagation are future work.

## Signal contents

| Field | Meaning |
| --- | --- |
| `what_changed` | An exact cited headline, supplied by the server |
| `category`, `event_state` | Typed event classification; reported, planned, alleged, denied or disputed |
| `affected_entities` | Names present in the event’s cited reporting |
| `attention`, `attention_reason` | Qualitative model judgment with a reason, not a probability or market-impact score |
| `implications` | Conditional hypotheses, a mechanism, an observable follow-up and source IDs |
| `unknowns`, `next_checks` | Missing evidence and questions for the agent to investigate |
| `evidence` | Original headlines, publishers, URLs and publication times |
| `id`, `version`, timestamps | Persistent identity and interpretation history |

Interpretations are explicitly labeled `model_inference`, with a `headline_metadata` basis. Multiple publishers do not establish independent verification. Structural checks reduce some errors; they cannot prove a hypothesis true.

## Event memory

New evidence can attach to an existing event through a supplied previous ID or an overlapping report. Repeated coverage updates the evidence timestamp while preserving the interpretation version. A substantive update requires new cited reporting and a change reason. An explicit denial cannot silently be treated as unchanged evidence.

Meaning revisions are stored in `newsbeat_intelligence_revisions`; the latest evidence and interpretation live in `newsbeat_intelligence_events`. Evidence needed by prior implications stays pinned when the retained source list is bounded. Event matching is approximate and can still miss equivalent developments.

## Interfaces

```bash
curl "https://www.newsbeat.dev/api/v2/intelligence?beat_id=b_bb964843350e"
```

MCP: `newsbeat_intelligence({ "beat_id": "b_bb964843350e" })`.

Responses expose `pilot`, `status`, source `freshness`, analysis timestamps, partial coverage and `signals`. Status is `ready`, `pending`, `unavailable` or `not_in_pilot`. A successful empty analysis is valid. Older stored signals can accompany pending/unavailable state and must not be presented as a fresh interpretation.

The dashboard adds an Event intelligence panel above the existing news map and summaries.

## Deployment and storage

The new additive tables are included in `db/schema.sql`. The authenticated worker also bootstraps them so this release does not require production credentials in a local session.

The worker route is `/api/cron/intelligence`, configured in `apps/web/vercel.json`. It fails closed without `CRON_SECRET` and requires the actual bearer credential; user-agent text does not authenticate this route. Public reads do not create tables or enqueue arbitrary model work.

Vercel OIDC or `AI_GATEWAY_API_KEY` authenticates generation. Model use consumes the project owner’s Gateway allowance or credits. Pilot scope, per-run limits, input fingerprints and retry delay bound work; no new payment method or budget is configured.

## Validation

Run `npm run build` and `npm test`. The intelligence tests cover source binding, invented entities/numbers, conditional interpretations, event revisions, repeated coverage, contradictory reporting, citation retention and cross-asset identity separation.

CI also exercises the real worker against a dedicated disposable PostgreSQL database, including revisions, leases and failure recovery. On main, a read-only deployment check waits for stored analysis and verifies source citations, tool discovery and cron authentication.

After deployment, wait for the scheduled worker and read the pilot endpoint. Check actual generation, persisted event IDs, analysis times and original evidence before expanding the pilot.
