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
| method | reasoned or evidence_only |
| limitations | Missing measurements, source boundaries and incomplete coverage |
| generation_error | A bounded failure code when no validated answer is returned; no credentials or raw model output |

A partial answer can be useful: news may support a conditional business mechanism while current market measurements are missing. It cannot establish a measured move, anomaly or timing signal from headlines alone. An evidence_only response is deliberately not labeled a successful generated answer.

## What the flow does

For each asset it scans up to 200 latest-day reports and considers up to 40 ranked story groups. Up to eight entity-qualified leads are selected by question-term relevance and existing news ranking. Reporting remains original; grouping and ranking reduce noise rather than pretending to measure impact.

Existing six-asset pilot measurements provide identified venue returns, fitted residuals, participation and independent anomaly scans when fresh. Historical rarity is descriptive rather than a probability of future profit; stale windows and held discovery are excluded from reasoning. Bitcoin, Ethereum and Solana can also use their explicit CoinGecko reference mappings when no pilot instrument is attached. Other assets do not receive unrelated crypto prices. News freshness and measurement timestamps are evaluated separately. Old evidence stays visible but is excluded from generation.

One bounded gateway call answers the question, distinguishes reports from interpretation, considers alternative explanations and names a next check. Reasoning entries interpret cited evidence rather than repeating headline lists. Where no substantive catalyst is supported, the answer must explain that insufficient-evidence conclusion and the missing check. Schema validation, known fresh citation IDs, verbatim observations and numeric checks reject malformed or unsupported output. These checks do not prove semantic truth or causality; conditional reasoning still requires review.

## Limits

News uses headline metadata, not full articles. Retrieval is a bounded latest-day window, not arbitrary historical search, comprehensive fundamentals, consensus estimates or a whole-market tape. Quantitative anomaly and timing coverage remains NVIDIA, Apple, Microsoft, Alphabet, Bitcoin and Ethereum. Stock pilot observations are tokenized-equity venue data, not a consolidated underlying-share tape. No model can fill those evidence gaps reliably.

This is not a profitable-performance claim. Review alerts, notification delivery and execution are separate.

## Runtime

Research is explicit POST/MCP work and uses the existing Vercel AI Gateway model. No new database or provider is required. One generation has an 18-second timeout and 1,600-token output cap. Identical question/evidence fingerprints share a five-minute in-memory cache; at most four generations run concurrently per instance. Cache and concurrency are per server instance, not a global spend budget. Existing public request limits apply. A missing credential, provider failure, timeout or validation failure returns evidence_only without inventing an answer.

GET intelligence remains a stored read. Research does not generate or mutate stored signal constructions, start fast collection, create a schedule, send notifications or place trades.

## Compatibility

Generated headline summarization is retired. The legacy summary endpoint and tool remain available as deprecated verbatim reads so existing clients do not break. New clients should call research. The legacy ask utility remains a data bundle, now restricted to relevant asset-specific reference data; it is not the question-answering entry point.
