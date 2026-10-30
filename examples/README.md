# Black Sheep integration examples

The examples use the public REST API and function schemas. No workspace SDK is published or required.

## Function-calling adapter

`openrouter-tools.mjs` loads the current schemas from `GET /api/v2/tools` and dispatches all six tools: `blacksheep_topics`, `blacksheep_news`, `blacksheep_changes`, `blacksheep_brief`, `blacksheep_stories` and `blacksheep_watch`. Watch uses POST; the others use GET. Cached tool names from before the rename are also accepted.

## OpenRouter model loop

Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` to your provider credentials and a tool-capable model, then run:

```bash
BLACKSHEEP_API_BASE_URL=https://www.newsbeat.dev/api node examples/openrouter-agent.mjs "What is new with Nvidia?"
```

The model loop is limited to five model requests and five tool calls per response. Model inference incurs your provider’s charges. Anonymous news reads remain subject to rate limits.

The primary service is `https://www.newsbeat.dev`. The alternate base is `https://news-beat.vercel.app/api`. The previous environment-variable name is still accepted.

## Remote MCP

Connect your host directly to the current deployment’s `/api/mcp` URL; it does not need these example files. Use the connection screen to verify the transport. Test each assistant separately before claiming compatibility or directory availability.

General-search, Grok API and Telegram/Discord relay examples are part of the pending connector expansion in [PR #11](https://github.com/thepeternemec/black-sheep/pull/11).
