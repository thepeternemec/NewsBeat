# Measured market timing

NewsBeat separates source interpretation from quantitative measurement. A small model proposes one grounded market hypothesis; deterministic code measures information delta, price response, participation and observed liquidity. A `review_now` record asks an agent to investigate. It does not execute a trade.

## Data and identity

| News topic | Measured USD venue pair | Comparison |
| --- | --- | --- |
| NVIDIA | Kraken NVDAxUSD | QQQxUSD |
| Apple | Kraken AAPLxUSD | QQQxUSD |
| Microsoft | Kraken MSFTxUSD | QQQxUSD |
| Alphabet | Kraken GOOGLxUSD | QQQxUSD |
| Bitcoin | Kraken XBTUSD | Equal-weight ETHUSD and SOLUSD |
| Ethereum | Kraken ETHUSD | Equal-weight XBTUSD and SOLUSD |

Pair metadata must match the configured base, USD quote, asset class and online state. xStocks are venue-traded tokenized equities; these prices are not a consolidated underlying-share tape, NAV, redemption quote or verified onchain identity. The crypto proxy excludes the asset itself and is not a broad market index.

Public Kraken [AssetPairs](https://docs.kraken.com/api-reference/market-data/get-tradable-asset-pairs), [OHLC](https://docs.kraken.com/api-reference/market-data/get-ohlc-data) and [Depth](https://docs.kraken.com/api-reference/market-data/get-order-book) endpoints supply metadata, five-minute bars and ten book levels. xStock price requests explicitly select `asset_class=tokenized_asset`. Credentials are not required.

The always-uncommitted final OHLC row is excluded. Invalid or duplicated timestamps fail validation. Asset and proxy bars must match exactly; missing prices are never filled. The endpoint provides about 720 recent bars, not a full historical backtest. Closed bars are retained on first observation for 30 days; the worker uses a rolling 72-hour read. Historical bars downloaded at startup are context, not proof the system observed a signal then.

## Information delta

The current immutable thesis revision is compared with its preceding revision. A changed reported development, reporting state, economic channel, direction or trigger state requires newly cited reporting before it is a meaningful revision delta. Repeated coverage and adding a first interpretation to old reporting do not create a fresh information edge. Materiality wording alone does not qualify.

The knowledge anchor is the later of the thesis revision time and newly cited reports' first-indexed times. This is when NewsBeat knew the thesis, not the publisher's claimed market arrival time. The first complete five-minute bucket after that anchor is used for the post-thesis window. Pre-anchor price action is checked separately to avoid presenting an existing run-up as a new signal.

## Baseline and measured response

The estimator fits `asset log return = intercept + beta × proxy log return + residual` on up to 240 aligned five-minute returns. A minimum of 60 samples, non-flat proxy and bounded beta are required. The decision baseline ends 30 minutes before its knowledge anchor. Changing later prices cannot change that fitted model. The overview baseline instead ends before the displayed one-hour window; the API distinguishes these fits.

Residual returns remove the fitted proxy exposure and intercept. Residual z scores scale the accumulated residual by the pre-information residual volatility and square root of the number of buckets, with a 0.5 bp per-bucket volatility floor. These normalized deviations are descriptive; they are not calibrated statistical probabilities, causal attribution or evidence that a development was unexpected by the market.

Relative volume compares the latest 30 minutes with the median of nonoverlapping pre-information 30-minute windows. A missing or zero-volume baseline cannot confirm participation. The displayed path compares matched-candle asset and proxy returns; a crypto proxy compounds equal-weight five-minute peer returns.

## Versioned timing policy

`market-timing-v1` applies all source, interpretation and context checks, plus:

| Condition | Initial threshold |
| --- | --- |
| Fresh meaningful information | Knowledge anchor no older than 60 minutes |
| Complete post-information observation | At least one full five-minute bucket |
| Directional residual confirmation | 1.25 to less than 3 residual sigma in the thesis direction |
| Minimum residual move | At least 20 bp and twice estimated two-sided book impact |
| Relative volume | At least 1.5 times baseline |
| Recent participation | Traded in at least half the latest six buckets; at least three trades |
| Last actual traded bucket | No older than 15 minutes, including proxy components |
| Snapshot and latest closed bar | No older than ten minutes |
| Quoted spread | At most 35 bp |
| Estimated $1,000 two-sided book impact | At most 75 bp |
| Qualitative hypothesis | Medium/high materiality and supportive/adverse direction |

A directional pre-information move of at least 2 sigma or a recent move of at least 3 sigma is extended. Opposing residual confirmation leads to reassessment; a reversal in the last bucket can mark confirmation as fading. Context mismatch suppresses a signal. Denials, disputed premises, pending model work, missing baselines, sparse trades, discontinuities and expensive books hold alerts.

Book impact walks observed bid and ask depth for $1,000 on each side. It excludes fees, latency and future liquidity; insufficient displayed depth produces no estimate. Quote depth is not a substitute for actual traded demand.

Thresholds are explicit research heuristics, not a fitted profitable strategy. R-squared, sample size, training times, source timestamps, information delta and individual hold reasons are exposed. Public reads can downgrade expired decisions but never generate new alerts.

## Prospective evaluation

Each eligible thesis version/context/policy freezes an all-construction record at its first fresh book snapshot, including held cases. A separately qualified review alert freezes its own record when it qualifies. Identity, decision, beta, intercept, midpoint references and each component's quote timestamp are immutable. The cohorts can have different entry times and selection; their means are descriptive, not a controlled experiment.

15-, 60- and 240-minute outcomes wait for a future closed, traded, exactly aligned asset/proxy candle at or after the due time and within ten minutes. `market_at` identifies the chosen candle close; `observed_at` is when the worker recorded it. Missing observations expire and are counted separately, never assigned zero. Outcome updates cannot change the recorded decision or model.

The API exposes raw asset/proxy/residual returns and direction-aligned excess-return means for all cases and review alerts. Adverse theses flip the excess-return sign; mixed/unclear directions are excluded from that mean. Counts include observed, pending and expired records. This is snapshot-mid reference performance before fees, not executable P&L. No win rate, calibration, backtest or outperformance claim is inferred from a small sample.

## Runtime and boundaries

The existing Vercel Node cron refreshes six pilot news topics and processes at most two model jobs every five minutes. Each call has a 25-second timeout and 4,000 output-token cap. `grounded-signals-v3` sends one concise development and four relevant prior contexts; only supplied report IDs are citable. Truncated, ungrounded and malformed results fail closed. Redundant unchanged reporting is discarded without refreshing the thesis.

A separate authenticated market cron runs one minute later, with a 120-second limit and a three-minute PostgreSQL lease. Market I/O spaces request starts at least 1.1 seconds apart under the venue’s [public rate guidance](https://support.kraken.com/articles/206548367-what-are-the-api-rate-limits-), retries a transient failure at most once and has bounded concurrency/timeouts; computation does not call a model. Cached public REST/MCP reads do not fetch market data, generate analysis or write records. New unprocessed article arrivals hold alerts even before the next model scheduler runs. Revisions resolve earlier alert versions. Existing qualitative-only alert records remain stored but are not emitted as measured timing alerts.

Next research inputs are richer primary-source facts, expectation changes, broader factors, corporate-action checks, calibrated thresholds and longer prospective records. Notifications and trade execution are not connected.
