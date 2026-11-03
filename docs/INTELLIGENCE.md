# Contextual signal construction

NewsBeat is building signals that explain potential market drivers and define when context warrants attention. Summaries and duplicate reduction prepare evidence; signal construction adds a hypothesis, trigger, invalidation and a decision to review, watch, suppress or reassess.

## First implementation

The authenticated worker covers NVIDIA, Apple, Microsoft, Alphabet, Bitcoin and Ethereum. Fresh headline snapshots support:
- A market channel: revenue, demand, margins, supply, capital cost, liquidity, adoption, policy or security.
- Qualitative direction, materiality and time horizon.
- A conditional mechanism and why the market may ignore it.
- An observable trigger, bound to a cited report and matching headline excerpt when reported.
- An invalidation condition and useful follow-up checks.

The model receives no price response, benchmark return, consensus estimate or backtest. These are hypotheses, not measured market impact. `market_reaction.status` remains `unmeasured`.

## Context and alert policy

| Context | Focus | Trigger report window |
| --- | --- | --- |
| `fundamentals` | Revenue, demand, margins, supply | 180 minutes |
| `liquidity` | Liquidity, financing cost, supply | 120 minutes |
| `risk` | Adoption, policy, security | 180 minutes |

An alert requires a valid construction, matching context, fresh collection, completed analysis within 90 minutes, a high-materiality hypothesis with an identified direction, a grounded reported trigger inside the context window, a substantive interpretation change and a reported premise that is not denied or disputed.

A matching excerpt binds an observation to a headline. It does not independently verify reporting or establish causality. Multiple publishers do not establish independent confirmation. Materiality and horizon are qualitative estimates, not calibrated probabilities or expected returns.

Actions are `review_now`, `keep_watching`, `no_alert` and `reassess`. An unobserved condition stays on watch; context mismatch suppresses an alert; contradiction or denial requires reassessment. Repeated coverage alone cannot create another alert.

## Persistence

The existing intelligence tables preserve source-signal identity and interpretation revisions. A market assessment is part of meaning; changing only a citation ID is not a new meaning version. Legacy explanations remain readable but cannot pass construction gates until assessed.

The authenticated worker bootstraps additive schema changes. Jobs track completed and attempted pipeline versions, allowing a bounded upgrade pass at unchanged article watermarks while retaining retry delay after failed attempts.

`newsbeat_signal_alerts` records one review alert per source signal, context and interpretation version. A revised premise resolves older alert records in the same transaction as the new interpretation. Historical alert timestamps do not establish current eligibility. Public reads do not write alerts, run models or create tables.

Evidence selection is separate from summary selection: up to 24 reports combine newly indexed coverage (with reserved space for denials and withdrawals) and ranked story context. This keeps contradictory reporting eligible for analysis even when a digest would omit it. The 200-report source scan and selected evidence are bounded; inspect partial-coverage flags.

Bounds remain two asset jobs per five-minute run, one model call per job, 25-second timeout, 4,000 output tokens and 15-minute retry delay. A strict JSON response schema limits the model to two concise constructions per batch. Truncated, malformed, ungrounded or context-free output is rejected with a specific analysis error code; prior memory is retained. No new credentials, payment method or budget is configured.

## Interfaces

```bash
curl 'https://www.newsbeat.dev/api/v2/intelligence?beat_id=b_bb964843350e&context=fundamentals'
```

MCP: `newsbeat_intelligence({ "beat_id": "b_bb964843350e", "context": "fundamentals" })`.

Responses preserve `signals` and add `context`, `constructions` and `alerts`. Inspect gate reasons, freshness, analysis state/times, partial coverage and market-reaction status. Track stable alert IDs in authorized monitoring workflows.

The workbench on `/intelligence` selects an asset and context, shows why an alert passes or is held, and exposes evidence and review-alert history.

## Next quantitative inputs

Price and benchmark confirmation, historical comparisons, expectation changes, strategy-specific contexts and threshold calibration are future work. Notification delivery and trade execution are not connected. This release records conditional review alerts rather than claiming verified alpha.

## Verification

Unit tests cover context mismatch, freshness, missing/unsupported trigger evidence, thresholds, contradiction, repeat coverage and version identity. Disposable PostgreSQL checks cover alert idempotency, resolving revised premises, pipeline upgrades, persistence and concurrent leases. Main-branch verification waits for real stored market constructions, checks context selection, protocol discovery and cron authentication.
