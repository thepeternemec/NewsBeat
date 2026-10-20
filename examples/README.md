# NewsBeat integration examples

The examples use the public REST API and function schemas. No workspace SDK is published or required.

## Function-calling adapter

`openrouter-tools.mjs` loads the current schemas from `GET /api/v2/tools` and dispatches all six tools: `newsbeat_topics`, `newsbeat_news`, `newsbeat_changes`, `newsbeat_brief`, `newsbeat_stories` and `newsbeat_watch`. Watch uses POST; the others use GET. Cached tool names from before the rename are also accepted.

## OpenRouter model loop

Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` to your provider credentials and a tool-capable model, then run:

```bash
NEWSBEAT_API_BASE_URL=https://newsgraph.vercel.app/api node examples/openrouter-agent.mjs "What is new with Nvidia?"
```

The model loop is limited to five model requests and five tool calls per response. Model inference incurs your provider’s charges. Anonymous news reads remain subject to rate limits.

After newsbeat.dev is connected, set `NEWSBEAT_API_BASE_URL=https://newsbeat.dev/api`. The previous environment-variable name is accepted during migration.

## Remote MCP

Connect your host directly to the current deployment’s `/api/mcp` URL; it does not need these example files. Use the connection screen to verify the transport. Test each assistant separately before claiming compatibility or directory availability.

General-search, Grok API and Telegram/Discord relay examples are part of the pending connector expansion in [PR #11](https://github.com/thepeternemec/NewsBeat/pull/11).
