# NewsGraph connections

Build with `npm ci && npm run build:packages && npm run build -w newsgraph-api`.

Run `NEWSGRAPH_API_BASE_URL=https://newsgraph.vercel.app/api node examples/verify-integrations.mjs` to verify:

1. The TypeScript client: topic discovery, latest coverage, and changes.
2. The OpenRouter-compatible adapter: schemas, execution, and a model-compatible tool result. This does not run paid model inference or certify an OpenRouter app.
3. Hosted MCP using the official MCP client: initialization, tools/list, and tools/call.

For an actual model loop, set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` to a currently available tool-capable model, then run `node examples/openrouter-agent.mjs "What is new with Nvidia?"`. The loop is bounded to five model requests, with at most five tool calls per response. These model requests incur your normal provider charges.

The workspace SDK is not yet published to npm. Use it from this repository. MCP clients can connect without installing this SDK; add the remote URL ending in `/mcp`.

Test each agent host separately before claiming host-specific compatibility. The protocol check is not evidence of an installation in Claude, Cursor, or Codex.

The deployed `news-api` is currently protected. Set `NEWSGRAPH_API_TOKEN` to a valid project anonymous JWT when running the verification script against staging. Never use a service-role credential. All three interfaces passed against real articles on 2026-09-13; public access is pending release approval.

## What is covered

`openrouter-tools.mjs` handles **every tool the API advertises** — `newsgraph_topics`,
`newsgraph_news`, `newsgraph_changes`, `newsgraph_brief`, `newsgraph_stories` and
`newsgraph_watch`. It loads the schemas from `GET /v2/tools` rather than hard-coding
them, so a tool added to the API is dispatched here the moment it is mapped.

Watch the method: everything is a `GET` except `newsgraph_watch`, which posts a body
because fifty cursors do not fit in a URL.

Verified against the live API: `loaded 6 tools`, and one call each returns topics,
news, a brief, stories, zero changes on a fresh cursor, and a batched watch.
