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

### Opportunity brief

The brief includes `catalysts` from `GET /api/v2/catalysts` and `newsbeat_catalysts`. The authenticated intelligence scheduler checks one of four SEC issuer records per tick. A fresh snapshot can surface a material filing category or periodic report accepted within 72 hours. Each item carries its accession, timestamp and original filing link. The freshness limit is 30 minutes, and a failed refresh marks the previous snapshot stale. The `coverage` arrays explain which sources and market checks are available.

Financial comparisons use entity-wide US-GAAP XBRL facts. The current period must match the reported fiscal period in an identified 10-Q or 10-K. The comparison uses the same concept, USD units and a comparable prior-year duration from a filing available before the current filing. A missing period or currency match leaves the metric unavailable. Historical reported results establish the year-over-year change. Guidance revisions, consensus surprise and market impact require separate evidence.

`GET /api/v2/opportunities?context=fundamentals&limit=6` and `newsbeat_opportunities` read current stored intelligence for the six measured assets. The same response separates active, fresh review alerts from independent 30-minute anomalies in a watch lane. Each asset appears at most once. Review order favors recent triggers, then lower book cost. Watch order uses historical rarity at the same horizon. Coverage distinguishes market holds from a quiet market. Re-read before acting because new reports or revised evidence can invalidate a review before its market evidence expires.

The 60-minute scorecard in `quantitative.evaluation.review_cost_scenario` uses the first review for an event within the last 30 days and scores supportive directions. It selects non-overlapping 70-minute windows before checking their outcomes and caps the cohort at 300 records. The scenario deducts the frozen estimated $1,000 entry-book impact on both sides and an illustrative 25 bp fee per side from the later candle return. Older records without a frozen book estimate and missing forward outcomes have separate counts. Mean adjusted return and positive fraction require at least 20 scored observations. The result describes the sample under these assumptions. Exit liquidity, fills and actual fees are unmeasured.

Catalog news collection is scheduled every ten minutes. The one-minute priority collector runs provider checks only for explicitly requested, unexpired 15-minute sessions; ordinary reads never activate it. The separate Vercel Node analysis cron processes at most two model jobs every five minutes and no longer performs unconditional pilot news collection. Each call has a 25-second timeout and 4,000 output-token cap. `grounded-signals-v3` sends one concise development and four relevant prior contexts; only supplied report IDs are citable. Truncated, ungrounded and malformed results fail closed. Redundant unchanged reporting is discarded without refreshing the thesis.

A separate authenticated market cron runs one minute later, with a 120-second limit and a three-minute PostgreSQL lease. Market I/O spaces request starts at least 1.1 seconds apart under the venue’s [public rate guidance](https://support.kraken.com/articles/206548367-what-are-the-api-rate-limits-), retries a transient failure at most once and has bounded concurrency/timeouts; computation does not call a model. Cached public REST/MCP reads do not fetch market data, generate analysis or write records. New unprocessed article arrivals hold alerts even before the next model scheduler runs. Revisions resolve earlier alert versions. Existing qualitative-only alert records remain stored but are not emitted as measured timing alerts.

Next research inputs are richer primary-source facts, expectation changes, broader factors, corporate-action checks, calibrated thresholds and longer prospective records. Notifications and trade execution are not connected.

## Independent discovery: market-discovery-v1

The market worker now runs a news-independent 15/30/60-minute scan using the same stored 72-hour aligned venue history. Each current window has an OLS fit using earlier returns only. Up to 96 earlier non-overlapping comparison windows each receive their own pre-window fit; incomplete blocks and blocks with sparse trades are excluded. A window needs at least 24 comparisons. The current window never enters its comparison set.

A candidate requires an absolute residual of at least 20 bp, an absolute residual z-score of at least 2.5 and an add-one empirical tail fraction of at most 5%: `(1 + earlier magnitudes at least as large) / (1 + comparison count)`. This is an exploratory rank, not a calibrated p-value. Horizons share observations; serial dependence, changing volatility and repeated scanning prevent an independent-test interpretation. A preceding-hour residual-volatility ratio describes quiet, stable or volatile conditions; it does not establish a tradable regime. Relative volume is reported against the earlier comparison-window median.

`quantitative.research` is available even when no headline thesis exists. Recent checked headline interpretations can be linked by direction, with explicit pending/mixed/opposing/unmatched states. These links do not establish causality. Discovery does not raise a news review alert, choose a profitable direction or change existing timing gates.

Each newly detected instrument/horizon/direction episode freezes a fresh midpoint reference, proxy references and timestamps, the initial window, fit and estimated book cost. A partial unique index prevents repeat scans from creating another active episode. A measured reset or direction change closes it; missing data does not. A new episode can begin after a reset. Future 15/60/240-minute aligned traded candles are measured using the frozen model, including episodes that later clear. Missing outcomes expire explicitly. Return observations exclude fees and execution; neither continuation nor reversal is assumed profitable. This journal is the foundation for subsequent prospective strategy evaluation, not evidence of an edge.

## Hourly BTC and ETH forecasts

`GET /api/v2/forecasts` and the `forecasts` field in the public market briefing and its MCP tool serve stored Kraken BTC/USD and ETH/USD forecasts. At most one call per market and UTC hour is issued in the first eight minutes, using the exact hour-open reference from the preceding closed five-minute candle. The target is the close at the next hour boundary. The event is strictly above reference. A tie resolves below the threshold.

The model measures RSI (14-period simple averages), distance to EMA (20 periods), 30-minute momentum, ATR (14-period simple average divided by price), and relative 30-minute volume versus the median of the previous eight half hours. These features describe similarity, with changes in price expressed relative to recent range. It searches up to 30 days of past whole-hour windows with outcomes observable as of the reference. At least 36 complete examples and 12 close matches are required. The estimate mixes up to 24 matches with 20 observations' worth of the full-sample historical rate. Reported return percentiles describe the matches and are not predictive intervals. An empty slot can indicate stale, sparse, or unfamiliar market data.

Each call records its probability, equally timed historical base-rate forecast and reference before the target. Both forecasts are scored by mean squared probability error (Brier score) on the same settled calls. The scorecard separates pending and missing outcomes. The exact target candle must contain a trade and be observed within six hours. Missing targets are never replaced with later prices. These are single-venue directional estimates and do not model fees, execution, or profitability.

## Hourly move risk

The default forecast estimates whether the exact next Kraken spot hourly close will be at least 1% above or below the reference. The reference is the preceding closed five-minute candle. An intrahour touch alone does not qualify. The feature is past-hour realized volatility, the square root of the sum of twelve squared five-minute log returns. The buckets are separated at 0.3%, 0.5%, 0.8%, and 1.2% and require twelve consecutive traded changes. Over up to thirty prior days, the model mixes the same-bucket event rate with twenty observations' worth of the overall base rate. At least 240 past eligible hours are required. The existing eight-minute issuance window and exact-close settlement apply separately to both forecasts and their scorecards.

### Historical replay

The replay evaluates the same code used for live move risk. Each hour uses observations whose targets end by its reference time. The baseline is the rolling 30-day event rate on the same eligible windows. Kraken USD spot was the deployment-market replay. Binance USDT spot is a second venue check over substantially the same market regime. Correlated markets and model selection limit what the replay can establish. Treat these as research results pending prospective confirmation.

| Venue and pair | 2026 test period in UTC | Scored hours | Move risk Brier | Base rate Brier |
| --- | --- | ---: | ---: | ---: |
| Kraken BTC/USD | Jul–Sep | 2,206 | 0.02022 | 0.02049 |
| Kraken ETH/USD | Jul–Sep | 2,206 | 0.04517 | 0.04590 |
| Binance BTC/USDT | Jul–Oct | 2,952 | 0.02046 | 0.02062 |
| Binance ETH/USDT | Jul–Oct | 2,952 | 0.04326 | 0.04437 |

A separate directional benchmark took a simulated long observation only when the probability from a rolling sign-of-last-hour model was at least 55%. It used the first trade in the five-minute candle starting ten minutes after the reference as an entry proxy and used the exact hourly close as the exit proxy. All four evaluations were negative at even a 20-basis-point round-trip cost assumption, the least costly scenario tested. This is an illustrative scenario using candle prices and fixed costs. It does not simulate fills, market impact, or profitability for the move-risk forecast.

To reproduce, build the API, extract the exchange archives, then run:

```sh
node scripts/replay-move-risk.mjs kraken <csv-directory> 2026-07-01 2026-10-01
node scripts/replay-move-risk.mjs binance <csv-directory> 2026-07-01 2026-11-01
```

Use the Kraken Q2 and Q3 five-minute CSVs for XBTUSD and ETHUSD and name quarterly copies `kraken-2-XBTUSD_5.csv`, `kraken-3-XBTUSD_5.csv`, and equivalent ETH files. Use the Binance monthly five-minute BTCUSDT and ETHUSDT CSVs from June through October inclusive for price history. The command takes an exclusive end date. Sources are the [Kraken historical archive](https://support.kraken.com/articles/360047124832-downloadable-historical-ohlcvt-open-high-low-close-volume-trades-data) and [Binance public spot archive](https://github.com/binance/binance-public-data).
