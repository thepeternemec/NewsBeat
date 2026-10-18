# What came from FomoX, and what did not

FomoX is the terminal product built on this service. It spent time on the same
Google News feed and learned some things the hard way. This records what
transferred, what was deliberately rejected, and what is still worth taking.

## Taken

**Headline sentiment — `apps/worker/src/sentiment.ts`, wired into `googlenews.ts`.**

Google returns no sentiment; the paid provider does. `ProviderArticleSchema` has
the field, so Google-sourced rows carried `undefined` and every consumer had to
branch on the provider. The port fills it from the headline, which is the only
text there is.

Tested against real headlines, and against the live feed: 9/9 GameStop articles
scored.

## Rejected: publisher URL resolution

FomoX spent a while learning to resolve `news.google.com/rss/articles/…` to the
publisher's own URL. It works — two requests per article, `/rss/articles/{id}`
returns the `data-n-a-sg` signature, `DotsSplashUi/batchexecute` returns the
destination — and gets ~99% on a warm cache.

It is **not** in this repository, because `AGENTS.md` says the opposite:

> The URL is a Google News link that resolves to the article — cite it as-is...
> Do not describe that URL as the publisher's own.

The base64 `publisherUrlFromId` in `googlenews.ts` returns `null` for every item
now — the id decodes to a ~39-byte token, not a protobuf containing a URL — but
that failure is *consistent with the contract*: the caller falls back to the
Google link, which is what this service documents. It is not a bug to fix unless
the contract changes.

If it ever does change, know the costs first: two extra requests per article, and
`batchexecute` rate-limits (429) after a few hundred lookups in a burst. FomoX
learned to cache resolutions permanently and to treat a sustained run of 429s as
"stop asking", not "this article has no URL".

## Worth taking, not taken

**The 100-item cap, and how to measure past it.** Google's RSS returns at most 100
items. Above that the count is censored, not large: bitcoin answers 100 for one
hour, six hours, twelve hours and a day alike. Any volume metric built on those
counts measures nothing at the top of the distribution.

The workaround is to walk windows widest-first and stop at the first count below
the cap, then extrapolate to a daily rate. FomoX measured 30 tickers this way:

    BTC 188/day · ETH 106 · XRP 78 · NVDA 39 · XOM 9

That is a real quantity; `article_count` from a single 24h query is not.

**Per-ticker baselines.** A rank by raw story count is a rank of editorial
attention. BTC is in the news every day, so a hundred Bitcoin stories is an
ordinary day, while twelve stories about a quiet name is an event. Comparing each
ticker against its own expected coverage is what makes the ranking mean
something; on FomoX that moved the volume-score correlation from 0.79 to 0.49.

## Free sources, verified

Called from a machine, not read from documentation.

| Works, no key | Result |
| --- | --- |
| Yahoo Finance `query1.finance.yahoo.com/v8/finance/chart` | `200`, AAPL quote and 79 intraday candles. No CORS, so server-side only. |
| Binance `api.binance.com/api/v3` | ticker, klines, `fapi` funding. CORS `*`. |
| CoinGecko | `200`, CORS `*`. |
| alternative.me fear & greed | `200`, CORS `*`. |

| Closed to scraping | Result |
| --- | --- |
| Stocktwits | `403` on both hostnames, browser UA. |
| Reddit JSON | `403` unauthenticated. `.rss` returns `200` once then `429`. |
| CryptoPanic | `403` without a token. |

## Environment note

Google News RSS sends no `access-control-allow-origin`, so no browser can read it.
Anything that consumes it has to run server-side — which is what this service
does, and why FomoX had to crawl in Node rather than from the page.
