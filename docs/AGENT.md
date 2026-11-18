# Market checks conversation

`POST /api/v2/agent` accepts a `question` (3–600 characters), optional `beat_ids` (up to three catalog identities), optional `market` (`equity` or `crypto`), and up to four recent `history` turns. Each turn carries `question`, `beat_ids`, and optional `answer`, `tools`, `context`, and `token_asset`.

The agent selects up to four existing capabilities: research, catalog developments, reporting, forecasts, review candidates, indicators, market data, chain activity, token contracts, issuer filings, investment briefs, or connection help. It returns a research-compatible answer with tool-level coverage, original evidence, timestamps, follow-up suggestions, and forecast panels when relevant. Partial failures preserve usable results. Ambiguous tickers require a choice; contract lookups require an explicit supported chain and address.

History identifies the subject and task. It never supplies current evidence. A named new asset replaces the previous scope; comparisons can retain it. Every turn checks current sources. When the planning gateway is unavailable, deterministic routing retains bounded subject and tool context. Unvalidated interpretation falls back to attributed source observations.

`GET /api/v2/agent` returns a cached, proactive briefing; optional `beat_id` and `market` narrow it. This GET performs only existing reads and never invokes planning or answer generation. The browser refreshes this briefing while the page is visible. It does not start collection, send notifications, connect wallets, or trade.

Market checks at `/intelligence` uses this interface for its conversation, follow-up context, relevant result cards, and suggested next questions. Existing dedicated app pages and manual inspectors remain available.
