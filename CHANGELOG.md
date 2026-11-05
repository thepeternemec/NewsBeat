# Changelog

## 2026-11-05 — Quoted-headline schema compatibility

- Fixed a provider rejection caused by embedding quoted news headlines directly in strict-schema enum literals.
- Report and event IDs remain restricted to the supplied sources. Trigger quotes retain the same server-side grounding checks; headlines and quotes are not rewritten.
- Added a regression using a quoted headline and confirming that unrelated trigger text is still rejected.

## 2026-11-05 — Source-bound structured generation

- Replaced the repeatedly noncompliant lightweight generator with a live-catalog structured-output model through the existing AI Gateway connection.
- Bound report IDs, previous event IDs and complete trigger headlines to the request’s actual source metadata. Grounding, conditional interpretation and alert checks remain enforced.
- Retained the two-job limit, shared 25-second deadline, token bounds and at most one correction attempt.

## 2026-11-05 — Trigger citation feedback

- Confirmed Bitcoin recovery with fresh successful analysis. Full-pilot monitoring also caught an Alphabet trigger-citation failure.
- Added precise correction feedback for schema fields, source IDs, conditional hypotheses and trigger quotes. Missing evidence remains a hold; the server never rewrites citations or quotes into validity.

## 2026-11-05 — Precise grounding recovery

- Restored analysis for Apple, Microsoft and Ethereum after the citation-bound fix. The six-asset live check exposed a separate Bitcoin failure involving unsupported figures or prediction wording.
- Added exact numeric-token feedback for a single correction attempt and exposed headline figures as source metadata. Unsupported claims remain rejected; no figures are silently repaired.
- Prioritized eligible failed jobs so a corrected generator can restore an affected asset before processing a second healthy waiting job, while retaining retry backoff and fair scheduling.

## 2026-11-05 — Signal readiness and analysis recovery

- Distinguished a constructed signal from a confirmed timing alert. The intelligence workspace opens a relevant constructed signal and explains pending timing, failed analysis and missing hypotheses separately.
- Prevented an expired trigger from being mislabeled as an analysis outage, while preserving holds and alert suppression.
- Added one fully validated model correction within the existing 25-second deadline when structured generation fails. Oversized citation lists are regenerated rather than truncated; unsupported claims and citations remain rejected.
- Scheduled the oldest attempted asset first and allowed a revised generator one attempt past existing failure backoff. Live deployment checks now cover analysis recovery for all six pilot assets.
- Kept prior reference lists distinct from output citation fields to reduce repeated citation-limit failures.

## 2026-11-05 — Homepage company lookup

- Brought company and ticker search onto the landing page, with keyboard-accessible suggestions that distinguish stocks from crypto assets.
- Added a compact preview of real headlines, publishers, publication times and collection freshness, with optional additional headlines and visible-page refreshes.
- Kept the news-to-signal animation and connected the news preview to the intelligence workspace. No separate terminal is needed.

## 2026-11-05 — Clearer agent intelligence

- Added a motion-led, interactive explanation of how reporting becomes context for an agent, with pause controls and reduced-motion support.
- Made live intelligence readable by default: a reported change, a short interpretation, a next check and plain-language review/wait/reassess states.
- Moved calculations, thresholds, full reasoning, source history and forward observations into optional disclosures. The real price-comparison graph remains visible.
- Clarified the value of connecting an agent, added example questions and published a signals-and-measurements guide in the docs.


## 2026-11-05 — Collection Unicode fix

- Fixed a long headline that split an emoji at the text limit, causing PostgreSQL to reject an entire topic's collection batch and keep its status degraded.
- Headline, excerpt and publisher limits now preserve whole Unicode characters. Invalid upstream surrogates and NUL characters are normalized before JSON persistence.
- Added boundary tests and a disposable PostgreSQL regression that reproduces the old failure, persists the corrected batch and verifies collection freshness advances.
- Status bars retain their original recorded results; recovery is shown by new successful checks.

## 2026-11-03 — Agent intelligence direction

- Refocused the homepage, social metadata and GitHub presentation on meaningful signals for AI agents.
- Replaced the standalone crypto dashboard with an intelligence overview; existing /crypto links redirect to /intelligence.
- Distinguished the available news foundation from planned event context, task-specific relevance, implications and uncertainty-aware signals.
- Reframed raw prices, funding and chain readings as supporting reference utilities, preserving existing API compatibility.
- Added the product direction in docs/INTELLIGENCE.md and aligned roadmap, FAQ, agent guidance and tool descriptions.

## 2026-11-03 — NewsBeat website and project refresh

- Reframed the homepage around stock and crypto news for AI agents, with a live lookup in the hero and a separate agent prompt builder.
- Restored consistent NewsBeat language across navigation, the news explorer, footer, social preview and GitHub README.
- Improved landing-page text sizes, responsive spacing, dark/light styling and reduced-motion support.
- Added stock and crypto shortcuts and fixed lookup timeouts that could leave search or summaries loading indefinitely.
- Aligned agent discovery docs and reference tables with all 14 implemented MCP and REST tools.
- Kept tokenized-asset research on the roadmap, with verified token mapping described as planned.

Not a version history — the project is one deployment, not a set of releases. This
is a record of decisions, because the reasoning is the thing that gets lost.

## 2026-10-21

- **Mobile navigation rebuilt.** A compact header keeps the terminal one tap away, with an accessible expandable menu for the rest of the site. Phone layouts have less empty space above content, larger touch targets and immediately readable hero text. The terminal uses the shared header and keeps its view tabs beside the page content.
- **$6 trial credit.** New API-key accounts receive $6 of trial credit. Website, API key onboarding, README and agent documentation now state the same amount. Existing account balances retain their recorded credits and usage.
- **Guided assistant setup.** The quickstart now has three numbered setup cards, a prominent copyable MCP address, a first-question prompt and reusable question cards. Optional agent instructions and troubleshooting expand on demand. The layout works in both themes and on mobile, with entrance motion that respects reduced-motion preferences.
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
- **Clearer onboarding and contact.** The README, FAQ and docs explain assistant setup and everyday company-news questions. Contact is [@newsbeat_ on X](https://x.com/newsbeat_).
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
