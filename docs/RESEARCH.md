# Question-driven research

Ask NewsBeat a question about a supported stock or crypto asset. It resolves identity, selects relevant reporting, checks available measurements and returns an answer with conditional reasoning, unknowns and observable next checks.

Try it at https://www.newsbeat.dev/docs/try or connect https://www.newsbeat.dev/api/mcp and call `newsbeat_research`.

```bash
curl -X POST https://www.newsbeat.dev/api/v2/research \
  -H 'Content-Type: application/json' \
  -d '{"question":"Compare the risks in AMD and NVIDIA."}'
```

## Request

- `question`: 3–600 characters; pass the actual question.
- `beat_ids`: optional, one to three exact catalog IDs. Use topic discovery to disambiguate.
- `context`: fundamentals (default), liquidity or risk.

The catalog contains 2,030 identities. Ambiguous tickers return candidates; questions with no identified asset request a scope instead of substituting a crypto overview. Comparisons support up to three assets. A selected ID explicitly scopes research; the system does not silently expand a question to every asset.

## Response

| Field | Meaning |
| --- | --- |
| answer | Direct answer, reasoning with evidence IDs, unknowns and next checks; null when generation is unavailable |
| evidence | Original reports or identified measurements, with asset ID, source, URL, observation time and freshness |
| assets | Per-asset news and market coverage, scan counts and truncation |
| flow | Identity, retrieval, market checks and reasoning coverage |
| status | ready, partial, needs_clarification or unavailable |
| method | reasoned, measured (direct identified quote read), or evidence_only |
| limitations | Missing measurements, source boundaries and incomplete coverage |
| generation_error | A bounded failure code when no validated answer is returned; no credentials or raw model output |

A partial answer can be useful: news may support a conditional business mechanism while current market measurements are missing. It cannot establish a measured move, anomaly or timing signal from headlines alone. An evidence_only response is deliberately not labeled a successful generated answer.

## What the flow does

For each asset it scans up to 200 latest-day reports and considers up to 40 ranked story groups. Up to eight entity-qualified leads are selected by question-term relevance and existing news ranking. Reporting remains original; grouping and ranking reduce noise rather than pretending to measure impact.

Existing six-asset pilot measurements provide identified reference quotes, venue returns, fitted residuals, participation and independent anomaly scans when fresh. Historical rarity is descriptive rather than a probability of future profit; stale windows and held discovery are excluded from reasoning. Bitcoin, Ethereum and Solana can also use their explicit CoinGecko reference mappings alongside any pilot instrument, with separate provenance and timestamps. Other assets do not receive unrelated crypto prices. News freshness and measurement timestamps are evaluated separately. Old evidence stays visible but is excluded from generation.

Source roles distinguish approximate ownership, opinion, price-commentary and reported-development evidence before generation. Explicit evidence-scope gates rule out fundamental-risk rankings without statements, expectation changes without consensus data, and reaction claims from generic return windows. A quiet news window cannot prove an asset has lower risk.

Straightforward current-price questions read identified quotes directly, preserving numeric values, source and observation time without a model call. Historical, causal, risk, forecast and mixed news questions continue through reasoning. News headlines cannot substitute for a missing current quote.

For other research questions the model distinguishes reports from interpretation, considers alternative explanations and names a next check. Each interpretation cites the evidence it uses. Where no substantive catalyst is supported, the answer explains which check is missing. Schema validation, known fresh citation IDs, verbatim observations and numeric checks reject malformed or unsupported output. Numeric formatting normalizes thousands separators and trailing zeros while preserving signs and magnitudes. Exact cited observation timestamps are recognized separately from market quantities. A numeric validation failure can trigger one rewrite that asks for qualitative reasoning and leaves the figures in the sources. The rewrite passes the same validation checks.

## Limits

News uses headline metadata, not full articles. Retrieval is a bounded latest-day window, not arbitrary historical search, comprehensive fundamentals, consensus estimates or a whole-market tape. Quantitative anomaly and timing coverage remains NVIDIA, Apple, Microsoft, Alphabet, Bitcoin and Ethereum. Stock pilot observations are tokenized-equity venue data, not a consolidated underlying-share tape. No model can fill those evidence gaps reliably.

This is not a profitable-performance claim. Review alerts, notification delivery and execution are separate.

## Runtime

Research is explicit POST/MCP work and uses Vercel AI Gateway. The question path defaults to the full GPT-4.1 model for evidence reasoning, independently of the scheduled pilot model; set NEWSBEAT_RESEARCH_MODEL to a verified Gateway model ID to override it. Full-model requests cost more than the mini model. Provider pricing and availability must be checked before changing the deployment setting. Both attempts share an 18-second deadline, and each has a 1,600-token output cap. Identical question/evidence fingerprints share a five-minute in-memory cache and one in-flight request chain. At most four analyses run concurrently per instance. Existing public request limits apply. A missing credential, provider failure, timeout or unresolved validation failure returns evidence_only.

GET intelligence remains a stored read. Research does not generate or mutate stored signal constructions, start fast collection, create a schedule, send notifications or place trades.

## Repeatable quality checks

Run `node .github/scripts/mcp-live.mjs` to check the deployed MCP tool catalog, a ticker collision and a Bitcoin investment brief. The Bitcoin check records elapsed time, coverage and the validation outcome. With fresh evidence it requires a reasoned answer with fresh citations and a next check. During a coverage gap it requires a wait stance.

For a head-to-head review, ask each assistant the same question in a fresh conversation within the same market window. Record model, timestamp, elapsed time, answer and source links. Review whether each answer identifies the asset, attributes claims to the right sources, preserves numbers and time windows, separates observation from inference, and gives a check that could change the conclusion.

## Compatibility

Generated headline summarization is retired. The legacy summary endpoint and tool remain available as deprecated verbatim reads so existing clients do not break. New clients should call research. The legacy ask utility remains a data bundle, now restricted to relevant asset-specific reference data; it is not the question-answering entry point.
