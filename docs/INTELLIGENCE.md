# Contextual signal construction

NewsBeat is building signals that explain potential market drivers and define when context warrants attention. Summaries and duplicate reduction prepare evidence; signal construction adds a hypothesis, trigger, invalidation and a decision to review, watch, suppress or reassess.

## First implementation

The authenticated worker covers NVIDIA, Apple, Microsoft, Alphabet, Bitcoin and Ethereum. Fresh headline snapshots support:
- A market channel: revenue, demand, margins, supply, capital cost, liquidity, adoption, policy or security.
- Qualitative direction, materiality and time horizon.
- A conditional mechanism and why the market may ignore it.
- An observable trigger, bound to a cited report and matching headline excerpt when reported.
- An invalidation condition and useful follow-up checks.

The model receives no price response, benchmark return, consensus estimate or backtest. Its output remains a hypothesis. A separate quantitative layer measures verified venue prices, information delta, pre-information beta/residuals, participation and liquidity. `market_reaction.status` can be `observed` for an aligned post-thesis window without establishing causality. See [methodology and thresholds](QUANTITATIVE.md).

## Context and alert policy

| Context | Focus | Trigger report window |
| --- | --- | --- |
| `fundamentals` | Revenue, demand, margins, supply | 180 minutes |
| `liquidity` | Liquidity, financing cost, supply | 120 minutes |
| `risk` | Adoption, policy, security | 180 minutes |

An alert requires a valid construction, matching context, fresh collection, completed analysis within 90 minutes, medium/high materiality with an identified direction, a grounded reported trigger, a fresh substantive information delta and a premise that is not denied or disputed. The measured layer additionally requires a valid pre-information baseline, directional residual confirmation, unusual participation and acceptable observed liquidity. Interpretation alone cannot create a timing alert.

A matching excerpt binds an observation to a headline. It does not independently verify reporting or establish causality. Multiple publishers do not establish independent confirmation. Materiality and horizon are qualitative estimates, not calibrated probabilities or expected returns.

Actions are `review_now`, `keep_watching`, `no_alert` and `reassess`. An unobserved condition stays on watch; context mismatch suppresses an alert; contradiction or denial requires reassessment. Repeated coverage alone cannot create another alert.

## Persistence

The existing intelligence tables preserve source-signal identity and interpretation revisions. A market assessment is part of meaning; changing only a citation ID is not a new meaning version. Legacy explanations remain readable but cannot pass construction gates until assessed.

The authenticated worker bootstraps additive schema changes. Jobs track completed and attempted pipeline versions, allowing a bounded upgrade pass at unchanged article watermarks while retaining retry delay after failed attempts.

The measured journal records one review alert per source signal, context, interpretation version and quantitative policy. A revised premise resolves older measured alerts during the next market run. Legacy qualitative-only alerts remain stored but are not returned as measured alerts. Historical timestamps do not establish current eligibility. Public reads do not write alerts, run models or create tables.

Evidence selection is separate from summary selection: up to 24 reports combine newly indexed coverage (with reserved space for denials and withdrawals) and ranked story context. This keeps contradictory reporting eligible for analysis even when a digest would omit it. The 200-report source scan and selected evidence are bounded; inspect partial-coverage flags.

Bounds remain two asset jobs per five-minute run, one initial model call plus at most one correction for rejected output per job, a shared 25-second timeout, and at most 4,000 output tokens per attempt and 15-minute retry delay. A strict JSON response schema limits the model to one concise construction per batch and four relevant prior contexts. Prior memory supplies no extra citable report IDs. Truncated, malformed, ungrounded or context-free output is rejected with a specific error code and schema field path; prior memory is retained. Unchanged known reporting is discarded as a no-op. No new credentials, payment method or budget is configured.

## Interfaces

```bash
curl 'https://www.newsbeat.dev/api/v2/intelligence?beat_id=b_bb964843350e&context=fundamentals'
```

MCP: `newsbeat_intelligence({ "beat_id": "b_bb964843350e", "context": "fundamentals" })`.

Responses preserve `signals` and add `context`, `constructions`, measured `alerts` and `quantitative`. Inspect gate reasons, freshness, analysis state/times, partial coverage and market-reaction status. The quantitative bundle includes verified pair metadata, matched price paths, information deltas, decision fits, frozen reference records and forward outcome cohorts. Track stable alert IDs in authorized monitoring workflows.

The workbench on `/intelligence` selects an asset and context, shows why an alert passes or is held, and exposes evidence and review-alert history.

## Quantitative inputs and next work

Price/proxy confirmation, pre-information historical baselines, participation, book costs and prospective outcome records are implemented for the six-asset pilot. Expectation changes, richer source verification, strategy-specific contexts and threshold calibration remain future work. Notification delivery and trade execution are not connected. This release records measured review decisions without claiming verified alpha.

## Verification

Unit tests cover context mismatch, freshness, missing/unsupported trigger evidence, thresholds, contradiction, repeat coverage and version identity. Disposable PostgreSQL checks cover alert idempotency, resolving revised premises, pipeline upgrades, persistence and concurrent leases. Main-branch verification waits for real stored market constructions, checks context selection, protocol discovery and cron authentication.

A constructed signal and a confirmed review alert are separate outputs. The workspace opens a constructed signal that matches the selected focus when available and shows why timing is waiting. Missing timing, unfinished interpretation, failed analysis and absent price confirmation are distinct states; a watch decision is a valid intelligence output.

Jobs are claimed by oldest attempt rather than permanently prioritizing one asset. A generator-version change allows one attempt past the prior failure backoff, so a deployed correction can recover stalled assets; subsequent failures retain the normal retry delay. Live deployment verification checks successful analysis across all six pilot assets, including schema-error recovery.
