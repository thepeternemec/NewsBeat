# Rarebird examples

[Back to Rarebird](../README.md) · [API reference](../AGENTS.md) · [Connect with MCP](https://www.rarebird.network/docs/quickstart)

Start with the public API. These requests need no installation, account or API key.

## Find a company or cryptocurrency

```bash
curl "https://www.rarebird.network/api/v2/topics?q=nvidia&limit=5"
```

Save the returned `beat_id`. Company and crypto tickers can overlap, so use the asset's ID for follow-up requests.

## Get the reporting

```bash
curl "https://www.rarebird.network/api/v2/news?beat_id=b_bb964843350e"
```

Each item includes a headline, source, publication time and report link. Read the response's freshness before describing it as current.

For a short headline-based update:

```bash
curl "https://www.rarebird.network/api/v2/summary?beat_id=b_bb964843350e"
```

## Read the intelligence pilot

```bash
curl "https://www.rarebird.network/api/v2/intelligence?beat_id=b_bb964843350e&context=fundamentals"
```

Choose `fundamentals`, `liquidity` or `risk`. Pilot assets are NVIDIA, Apple, Microsoft, Alphabet, Bitcoin and Ethereum.

Look at the reported change, constructions, market checks, freshness and analysis timestamps together. Pending analysis may include older stored interpretations. A reason to keep watching is a valid result.

## Use JavaScript

Requires Node.js 22 or 24:

```js
const base = "https://www.rarebird.network/api";
const response = await fetch(
  `${base}/v2/intelligence?beat_id=b_bb964843350e&context=fundamentals`
);
if (!response.ok) throw new Error(`Rarebird returned ${response.status}`);

const result = await response.json();
console.log(result.status, result.analysis);
console.log(result.constructions);
```

## Check for new arrivals

1. Read `/v2/news?beat_id=...` and save its `cursor`.
2. On your next check, call `/v2/changes?beat_id=...&cursor=...`.
3. Process every page before advancing the cursor; continue while `has_more` is true.
4. Save the latest cursor for that same asset.

An empty result means no new matching items. It does not require a retry. See [AGENTS.md](../AGENTS.md) for error handling and batched watches.

## Connect an assistant

Use the remote MCP endpoint directly:

```text
https://www.rarebird.network/api/mcp
```

No example script is required. Follow the [quickstart](https://www.rarebird.network/docs/quickstart) and try:

> Use Rarebird to check Ethereum. Does the recent reporting change the view, and what is still unconfirmed?

<details>
<summary>Reference OpenRouter adapter — limited news-tool coverage</summary>

[openrouter-tools.mjs](openrouter-tools.mjs) and [openrouter-agent.mjs](openrouter-agent.mjs) are reference code for an application-owned model loop.

The dispatcher currently handles six news operations: `rarebird_topics`, `rarebird_news`, `rarebird_changes`, `rarebird_brief`, `rarebird_stories` and `rarebird_watch`. Discovery exposes a wider tool catalog, so filter discovered schemas to those supported names or extend the dispatcher before using the loop. Intelligence and summary dispatch are not implemented in this adapter.

The model loop requires your own `OPENROUTER_API_KEY` and a tool-capable `OPENROUTER_MODEL`. Model inference uses your provider's billing. For an immediately usable integration, use remote MCP or the API recipes above.

</details>

[Development setup](../docs/DEVELOPMENT.md) · [Research limits](../docs/QUANTITATIVE.md)
