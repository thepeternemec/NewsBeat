# Changelog

Not a version history — the project is one deployment, not a set of releases. This
is a record of decisions, because the reasoning is the thing that gets lost.

## 2026-10-21

- **Polished interior pages.** Connection, pricing, FAQ, key, reference and legal pages use balanced hero layouts and clearer sections. Documentation has a centered reading column and an active contents rail. The terminal has structured metric cards and theme-aware headings. Subtle entrance and hover motion respects reduced-motion preferences; layouts adapt to phone and tablet screens.
- **“What happened?” summaries are live.** The terminal’s **Summarize headlines** button, `GET /api/v2/summary?beat_id=…`, and the `newsbeat_summary` MCP tool return up to three short explanations grounded in recent publisher headlines. Each item retains report links and publication times.
- **Honest generation fallback.** Responses state `basis: "headlines_only"` and `method: "generated"` or `"extractive"`. Failed generation or rejected output returns original headlines. Story IDs keep sentences attached to their sources even when the model changes their order; output checks also reject new numeric figures and missing selected uncertainty cues.
- **Relevance ranking and distinct stories.** Grouped coverage and briefs favor concrete developments, recent reports and publisher coverage, while downranking routine ownership notices and shopping headlines. Digests prioritize development headlines and avoid treating “looks back” or “send money back” as investment events. These are heuristics, not market-impact judgments.
- **Grouped feed with source expansion.** Similar headlines appear under one original lead; users can inspect each publisher, headline, link and time. Original reporting is retained. The terminal initially shows 24 stories and offers **Show more stories**.
- **Snapshot limits are explicit.** Summaries and briefs select from up to 200 recent reports in 24 hours. MCP story reads return up to 40 ranked groups from 200 reports; REST supports scans of 1–500. Check `coverage_truncated` and `freshness`; keep using article cursors for newly indexed arrivals.
- **Seven MCP tools.** Agent discovery and documentation now include summaries alongside topic lookup, news, changes, verbatim briefs, grouped stories and watchlist checks.
- **Generation operations.** Vercel AI Gateway runs the headline model on demand using server-side OIDC or an environment API key, a 20-second timeout and a five-minute per-instance cache. Public reads remain free during early access; the project owner supplies model allowance or credits.
- **Verified after deployment.** The website, REST endpoint and MCP tool returned generated summaries with source links. The full test run completed with 77 passing tests and four database-dependent skips.

### Current service context

- **NewsBeat is the current brand**, with `https://www.newsbeat.dev` as the primary site and API host, and `news-beat.vercel.app` as an alternate. The bundled catalog contains 2,030 assets: 1,528 US-listed equities and 502 crypto assets.
- **Clearer onboarding and contact.** The README, FAQ and docs explain assistant setup and everyday company-news questions. Contact is [contact@newsbeat.dev](mailto:contact@newsbeat.dev).
- **Early access stays public.** No API key or credit card is required for anonymous reads. Optional keyed REST metering remains separate; Stripe checkout and the expanded connectors in draft [PR #11](https://github.com/thepeternemec/NewsBeat/pull/11) are not live.

## 2026-09-22

- **`/v2/stories`** — the events behind a topic, not the coverage of them.
  Near-identical headlines are grouped and ordered by how many publishers carried
  each, so eleven reports of one court ruling appear as one story. Deliberately
  not an LLM: token overlap is deterministic, free and testable. On SPCX, 165
  articles screen down to 72 stories, the largest carried by 42 publishers.
- **`?q=` matches tickers.** It matched company names only, so `?q=spcx` found
  nothing while `?q=space` found SpaceX. Every ticker tested until then happened
  to appear inside its own company name.
- **The catalog is 1035 topics**, including SPCX. It is built from index
  constituents, which cannot see a recent IPO — a blind spot now written down.
- **Monetization plan** in `docs/MONETIZATION.md`: $0.20/day as a prepaid balance,
  because Stripe's fee exceeds a $0.20 charge. Phase 1 (a usage ledger that
  records and does not enforce) is live.

## 2026-09-21

- **Monetization groundwork** — `docs/MONETIZATION.md`, and the tables it needs.
- **The site was checked against the API and largely did not match.** The
  quickstart described a system three catalogs old; `/connect` advertised an SDK
  package that had been deleted; the FAQ promised stablecoin payments that were
  never built; the hero claimed 150,000 publishers, a number with no source.
  Fabricated numbers and stale claims are treated as bugs here.

## 2026-09-20

- **Guard rails, both earned the hard way.** A `pre-push` hook refuses to rewrite
  `main`, and branch protection enforces it server-side, because a pushed commit
  was amended once and came within one command of erasing a contributor's work. A
  `pre-commit` hook refuses code that does not compile, because a build was twice
  run with its output sent to `/dev/null` and the next command tested a stale
  artefact.
- **Drift guards.** Tests that assert the docs against the code: stated catalog
  sizes, tool lists both ways, and that no doc describes the pre-Google-News item
  shape. Every stale claim found that day was wrong for weeks and broke no test.

## 2026-09-19

- **1035 topics**: the S&P 500, the S&P 400, and the top 100 crypto assets.
- **Rate limiting with optional keys** — 120 requests/minute anonymous, 1200 with a
  key. Keys raise a ceiling; they unlock no data.
- **`/v2/brief`** — the top three headlines verbatim, with no synthesis. A brief
  that paraphrases can be wrong while reading well.
- **`/v2/topics` pagination**, and `article_count` / `recent_12h` per topic.
