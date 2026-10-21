"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Clusters to load articles for. One request each, so this stays small. */
const CLUSTER_LIMIT = 10;

/**
 * The tickers a visitor most likely wants. Everything else is one search away.
 * Chosen for recognition, not for volume.
 */
const POPULAR = ["NVDA", "AAPL", "MSFT", "TSLA", "GOOGL", "AMZN", "META", "AMD", "NFLX", "AVGO"];
import SignalField from "@/components/signal-field";
import FluidTabs from "@/components/ui/fluid-tabs/fluid-tabs";
import {
  AccordionRoot,
  AccordionItem,
  AccordionItemTrigger,
  AccordionItemContent,
} from "@/components/ui/accordion/accordion";
import StoryRow from "@/components/site/story-row";
import HeadlineSummary from "@/components/site/headline-summary";
import { loadStoryFeed, type FeedItem } from "@/components/site/story-feed";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "/api";

interface Topic {
  beat_id: string;
  label: string;
  ticker: string;
  /** Everything stored for this topic, and how much of it is from the last 12h. */
  article_count: number;
  recent_12h: number;
  status: string;
  last_success_at: string | null;
  last_checked_at: string | null;
}

type Article = FeedItem;

type View = "signals" | "clusters";

const TABS: Array<{ value: View; title: string }> = [
  { value: "signals", title: "Signals" },
  { value: "clusters", title: "Stories by asset" },
];

export default function Dashboard() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [articles, setArticles] = useState<Article[]>([]);
  const [feedNotice, setFeedNotice] = useState("Loading news…");
  const [visibleStories, setVisibleStories] = useState(24);
  // One entry per rendered cluster. Bounded on purpose: the catalog holds ~150
  // topics and one request each would be 150 calls from the browser.
  const [clusters, setClusters] = useState<Array<{ topic: Topic; articles: Article[] }>>([]);
  /** How many clusters to show. Grows when the reader asks for more. */
  const [clusterCount, setClusterCount] = useState(CLUSTER_LIMIT);
  const [view, setView] = useState<View>("signals");
  const [stamp, setStamp] = useState("");
  /** The ticker the signal field is showing. Defaults to the first with news. */
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  /** Article ids already on screen, so newly polled ones can be animated in. */
  const seen = useRef<Set<string>>(new Set());
  const [arrived, setArrived] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // One request for the whole catalog: the metrics sum across it and the
        // search filters it locally. A paging client would use the default 100.
        // 2000 was a round number below a 2,030 catalog: thirty topics never loaded,
        // so the search could not find them. The server clamps to the catalog.
        const res = await fetch(`${API_BASE}/v2/topics?limit=5000`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { topics?: Topic[]; total?: number };
        const list = data.topics ?? [];
        setTopics(list);
        // Paginated at 1000, so the array length is a page, not the catalog.
        setCatalogTotal(data.total ?? list.length);

        setStamp(new Date().toLocaleTimeString());


      } catch {
        /* paused */
      }
    }
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Clusters are one request each. Loaded in pages rather than all at once, and
  // fetched once when the tab opens rather than polled — polling them spent most
  // of an anonymous caller's budget on a list nobody was watching.
  useEffect(() => {
    if (view !== "clusters" || topics.length === 0) return;
    const withData = topics.filter((t) => t.status !== "unavailable").slice(0, clusterCount);
    // Only fetch the topics not already loaded, so "show more" costs ten requests
    // rather than re-fetching the ten already on screen.
    const have = new Set(clusters.map((c) => c.topic.beat_id));
    const missing = withData.filter((t) => !have.has(t.beat_id));
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      const loaded = await Promise.all(
        missing.map(async (topic) => {
          try {
            const page = await loadStoryFeed(API_BASE, topic.beat_id);
            return { topic, articles: page.items ?? [] };
          } catch {
            return { topic, articles: [] };
          }
        }),
      );
      if (cancelled) return;
      // Keep list order: topics is sorted, and appending would reorder on click.
      setClusters((prev) => {
        const merged = [...prev, ...loaded];
        const order = new Map(withData.map((t, i) => [t.beat_id, i]));
        return merged.sort((a, b) => (order.get(a.topic.beat_id) ?? 0) - (order.get(b.topic.beat_id) ?? 0));
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [view, topics, clusterCount, clusters]);

  /**
   * A pick from the search.
   *
   * In Signals it selects the field. In Article clusters it has to do more: the view
   * only holds the first N topics, so searching "AAPL" found the ticker but had
   * nothing to filter — the panel came back empty and the search looked broken. A pick
   * now fetches that topic's articles and puts it at the top of the list.
   */
  const pickTopic = useCallback(
    async (beatId: string) => {
      setSelected(beatId);
      // In clusters the query stays, because it is what narrows the list to this
      // topic — clearing it would put the other clusters straight back. Deleting
      // the search is how you get them back. Signals has nothing to filter.
      if (view !== "clusters") setQuery("");
      if (view !== "clusters") return;
      const topic = topics.find((t) => t.beat_id === beatId);
      if (!topic) return;
      if (clusters.some((c) => c.topic.beat_id === beatId)) return;
      try {
        const page = await loadStoryFeed(API_BASE, beatId);
        const entry = { topic, articles: page.items ?? [] };
        setClusters((prev) =>
          prev.some((c) => c.topic.beat_id === beatId) ? prev : [entry, ...prev],
        );
      } catch {
        /* leave the list as it was — the suggestion is still in the dropdown */
      }
    },
    [view, topics, clusters],
  );

  /**
   * Typing a ticker or a company name pins it, without waiting for a click.
   *
   * "apple" is not ambiguous, and asking the reader to move to the dropdown and click
   * the only sensible result is a step for no reason. It fires only on an exact
   * match — a full ticker, or a full label — and only when exactly one topic matches,
   * so partial typing never jumps the list around.
   */
  useEffect(() => {
    if (view !== "clusters") return;
    const text = query.trim().toLowerCase();
    if (text.length < 3) return;
    const exact = topics.filter(
      (t) => t.ticker.toLowerCase() === text || t.label.toLowerCase() === text,
    );
    if (exact.length !== 1) return;
    const id = setTimeout(() => void pickTopic(exact[0]!.beat_id), 420);
    return () => clearTimeout(id);
  }, [query, view, topics, pickTopic]);



  const funded = topics.filter((t) => t.status !== "unavailable");
  const active = selected ?? funded[0]?.beat_id ?? null;
  const activeTopic = topics.find((t) => t.beat_id === active);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setArticles([]);
    setVisibleStories(24);
    setFeedNotice("Loading news…");
    (async () => {
      try {
        const page = await loadStoryFeed(API_BASE, active);
        if (cancelled) return;
        const items = page.items ?? [];
        const fresh = new Set(items.filter((i) => !seen.current.has(i.id)).map((i) => i.id));
        // Only animate when there is a baseline — everything is "new" on first paint.
        setArrived(seen.current.size ? fresh : new Set());
        items.forEach((i) => seen.current.add(i.id));
        setArticles(items);
        setFeedNotice(page.coverage_truncated
          ? `Grouped from the latest 200 reports in the last 24 hours · ${page.freshness.status}. More coverage is available through the API.`
          : `Grouped coverage from the last 24 hours · ${page.freshness.status}.`);
      } catch {
        if (!cancelled) { setArticles([]); setFeedNotice("News coverage could not be loaded. Please try again."); }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  const live = topics.filter((t) => t.status !== "unavailable").length;
  /** Everything published in the last 12 hours, across the whole catalog. */
  // `status` says whether the last check succeeded; a topic can be `fresh` and
  // still carry nothing. The label promised "carrying articles", so this counts
  // articles — the number and the words now measure the same thing.
  const carrying = topics.filter((t) => (t.article_count ?? 0) > 0).length;
  // Floor, not round. 1031 of 1035 is 99.6%, which rounds to "100% of the
  // catalog" while four topics carry nothing — the metric overstating the thing
  // it is reporting, which is the defect this repository keeps finding.
  const carryingPct = catalogTotal ? Math.floor((carrying / catalogTotal) * 100) : 0;
  const movedRecently = topics.reduce((sum, t) => sum + (t.recent_12h ?? 0), 0);

  const term = query.trim().toLowerCase();
  const matches = term
    ? topics.filter((t) => t.ticker.toLowerCase().includes(term) || t.label.toLowerCase().includes(term))
    : [];
  const suggestions = matches.slice(0, 8);
  // With no query, show the curated ten plus whatever is selected, so the active
  // ticker is never hidden by not being popular.
  const visible = term
    ? matches.slice(0, 12)
    : [...POPULAR.map((k) => topics.find((t) => t.ticker === k)).filter((t): t is Topic => Boolean(t)),
       ...(activeTopic && !POPULAR.includes(activeTopic.ticker) ? [activeTopic] : [])];
  /** Clusters narrowed by the search. Filtering happens over what is loaded, so it
   *  cannot promise a topic that has not been fetched — the note above the list says
   *  so rather than silently returning nothing. */
  const filteredClusters = term
    ? clusters.filter(({ topic }) =>
        `${topic.ticker} ${topic.label}`.toLowerCase().includes(term))
    : clusters;
  const labelOf = new Map(topics.map((t) => [t.beat_id, t.label]));
  const counts: Record<View, number | undefined> = {
    signals: articles.length || undefined,
    clusters: catalogTotal || undefined,
  };

  return (
    <>
      <nav className="nav">
        <div className="nav-pill">
          <a className="nav-logo" href="/">
            NEWSBEAT
          </a>
          <span className="nav-links">
            {/* Sona UI's FluidTabs: the active surface slides between tabs rather
                than switching instantly, which makes the relation between the two
                views legible. It was already vendored and unused. */}
            <FluidTabs
              ariaLabel="Dashboard view"
              size="sm"
              variant="capsule"
              value={view}
              onValueChange={(next) => setView(next as View)}
              tabs={TABS.map((t) => ({
                value: t.value,
                title: (
                  <>
                    {t.title}
                    <span className="tab-count">{counts[t.value] ?? "…"}</span>
                  </>
                ),
              }))}
            />
          </span>
          <a className="nav-cta" href="/">← Home</a>
        </div>
      </nav>

      <main className="wrap dash-main">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 28 }}>
          <div>
            <span className="sec-eyebrow">Live graph · English only · one cluster per beat</span>
            <h1 style={{ margin: 0, fontSize: "clamp(30px, 4vw, 44px)", lineHeight: 1.05, letterSpacing: "-0.035em", color: "#fff", fontWeight: 600 }}>
              {TABS.find((t) => t.value === view)?.title}
            </h1>
          </div>
          <span style={{ font: "11px var(--font-mono), monospace", color: "var(--text-ghost)" }}>
            {stamp ? `updated ${stamp}` : "connecting…"}
          </span>
        </div>

        <div className="metrics" style={{ borderTop: 0, paddingTop: 0 }}>
          <div className="metrics-grid">
            <div>
              <div className="metric-num">{catalogTotal || "\u2026"}</div>
              <div className="metric-label">Equities and cryptos tracked</div>
            </div>
            <div>
              <div className="metric-num">{catalogTotal ? carrying : "\u2026"}</div>
              <div className="metric-label">
                Carrying articles{carrying ? ` \u00b7 ${carryingPct}% of the catalog` : ""}
              </div>
            </div>
            <div>
              <div className="metric-num">{topics.length ? movedRecently.toLocaleString() : "\u2026"}</div>
              <div className="metric-label">Articles moved in the last 12h</div>
            </div>
            <div>
              <div className="metric-num" style={{ fontFamily: "var(--font-mono)", fontSize: 22 }}>
                {stamp || "\u2014"}
              </div>
              <div className="metric-label">Last ingest</div>
            </div>
          </div>
          <p className="hero-tiny" style={{ marginTop: 30 }}>
            read-only · no credential · topics, news and changes since a cursor
          </p>
        </div>

        {/* Both views answer "which ticker?", so the search belongs to neither of
            them. Centred and larger: it is the first control a reader reaches for
            on a dashboard of 2,030 topics. In Signals a pick selects the field;
            in Clusters it opens that topic's cluster. */}
        <div className="catalog-search">
            <div className="ticker-search">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${catalogTotal || topics.length} tickers or companies…`}
                aria-label="Search tickers"
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  const first = suggestions[0];
                  if (first) void pickTopic(first.beat_id);
                }}
              />
              {query.trim().length > 0 && (
                <div className="ticker-suggest">
                  {suggestions.map((t) => (
                    <button
                      key={t.beat_id}
                      type="button"
                      className="ticker-suggest-row"
                      onClick={() => void pickTopic(t.beat_id)}
                    >
                      <span className="s-tick">{t.ticker}</span>
                      <span className="s-name">{t.label}</span>
                      <span className="s-status">{t.status}</span>
                    </button>
                  ))}
                  {suggestions.length === 0 && (
                    <div className="ticker-suggest-row is-empty">No ticker matches “{query.trim()}”</div>
                  )}
                </div>
              )}
            </div>
        </div>
        {query.trim().length > 0 && view === "clusters" && filteredClusters.length === 0 && (
          <p className="catalog-search-note">
            no loaded cluster matches “{query.trim()}” — show more, or open Signals for it
          </p>
        )}

        {view === "signals" ? (
          <>
            {/* Ten recognisable tickers, plus a search over all of them — a wall
                of 165 chips is not navigable. */}
            <div className="ticker-picker">

              <div className="ticker-bar">
                {visible.map((t) => (
                  <button
                    key={t.beat_id}
                    type="button"
                    className={`ticker-chip${t.beat_id === active ? " active" : ""}`}
                    onClick={() => setSelected(t.beat_id)}
                  >
                    <span className="c-tick">{t.ticker}</span>
                    <span className="c-name">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mock" style={{ marginTop: 18 }}>
              <div className="mock-bar">
                <span className="mock-dots"><span /><span /><span /></span>
                <span className="mock-title">
                  signal field · {activeTopic?.label ?? "no ticker selected"}
                  <span className="tz">all times UTC</span>
                </span>
                <span className="mock-live">{articles.length} stories</span>
              </div>
              <SignalField
                items={articles.map((a) => ({
                  beat_label: labelOf.get(a.beat_id) ?? "—",
                  lede: a.title,
                  source: a.source,
                  url: a.url,
                  published_at: a.published_at,
                }))}
              />
            </div>

            {active && articles.length > 0 && (
              <HeadlineSummary key={active} beatId={active} label={activeTopic?.label ?? "this asset"} base={API_BASE} />
            )}

            <div className="mock" style={{ marginTop: 24 }}>
              <div className="mock-bar">
                <span className="mock-dots"><span /><span /><span /></span>
                <span className="mock-title">grouped stories · {activeTopic?.ticker ?? "—"}<span className="tz">all times UTC</span></span>
                <span className="mock-live">{activeTopic?.article_count ?? "…"} stored</span>
              </div>
              <p className="story-feed-note" role="status">{feedNotice}</p>
              <div className="mock-feed">
                {articles.slice(0, visibleStories).map((it) => (
                  <StoryRow key={it.id} item={it} label={labelOf.get(it.beat_id) ?? "—"} />
                ))}
                {articles.length === 0 && !feedNotice.startsWith("Loading") && (
                  <div className="mock-row">
                    <span className="k">awaiting</span>
                    <span className="v">No stories to show for this asset in the current window.</span>
                    <span className="s">system</span>
                  </div>
                )}
              </div>
              {articles.length > visibleStories && (
                <div className="cluster-more">
                  <button type="button" className="btn-ghost" onClick={() => setVisibleStories(n => n + 24)}>
                    Show more stories
                    <span className="cluster-more-hint">{visibleStories} of {articles.length} shown</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mock" style={{ marginTop: 40 }}>
            <div className="mock-bar">
              <span className="mock-dots"><span /><span /><span /></span>
              <span className="mock-title">stories by asset · last 24 hours</span>
              <span className="mock-live">
                  {term ? `${filteredClusters.length} match` : `${clusters.length} of ${catalogTotal || "…"}`}
              </span>
            </div>
            <p className="story-feed-note">Grouped from up to 200 reports per asset in the last 24 hours. Expand a story to read its sources.</p>
            {/* Sona UI's Accordion, already vendored and unused. Ten clusters were
                rendered fully expanded, which is why the view was capped at ten —
                collapsed, the list is scannable and the cap is about requests
                rather than about room. */}
            <AccordionRoot
              // Clusters load after this mounts, and `defaultValue` is read once —
              // without the key the first panel was always closed on a first visit.
                key={`${view}-${clusters.length}-${active ?? ""}`}
              className="cluster-accordion"
              variant="animated"
                // Picking a ticker from the search re-mounts the accordion with that
                // panel open — the only way to drive an uncontrolled item.
                defaultValue={
                  active && clusters.some((c) => c.topic.beat_id === active)
                    ? [active]
                    : clusters[0]
                      ? [clusters[0].topic.beat_id]
                      : []
                }
            >
              {filteredClusters.map(({ topic, articles: items }) => (
                <AccordionItem key={topic.beat_id} value={topic.beat_id}>
                  <AccordionItemTrigger className="cluster-trigger">
                    <span className="cluster-line">
                      <span className="c-tick">{topic.ticker}</span>
                      <span className="c-name">{topic.label}</span>
                      {/* The panel holds the latest few; the topic holds the rest.
                          Showing only the page size made MU read "8 articles"
                          when it has 459. */}
                      <span className="c-count">
                        {items.length} stories
                      </span>
                      <span className="c-status">{topic.status}</span>
                    </span>
                  </AccordionItemTrigger>
                  <AccordionItemContent>
                    <div className="cluster-body">
                      {items.map((it) => (
                        <StoryRow key={it.id} item={it} />
                      ))}
                    </div>
                  </AccordionItemContent>
                </AccordionItem>
              ))}
            </AccordionRoot>

            {clusters.length > 0 && clusters.length < catalogTotal && (
              <div className="cluster-more">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setClusterCount((n) => n + CLUSTER_LIMIT)}
                >
                  Show {Math.min(CLUSTER_LIMIT, catalogTotal - clusters.length)} more
                  <span className="cluster-more-hint">
                    {catalogTotal - clusters.length} of {catalogTotal} still to load
                  </span>
                </button>
              </div>
            )}
            {clusters.length === 0 && (
              <div className="mock-feed">
                <div className="mock-row">
                  <span className="k">awaiting</span>
                  <span className="v">No clusters yet — open this tab once ingestion has run.</span>
                  <span className="s">system</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="site">
        <div className="wrap">
          <div className="footer-row">
            <div className="footer-brand-line">
              <span className="footer-co">NEWSBEAT</span>
              <span style={{ color: "var(--border-strong)" }}>/</span>
              <span className="footer-address">read-only · live graph</span>
            </div>
            <div className="footer-links">
              <a href="/">Home</a>
              <a href="/#contract">Contract</a>
              <a href="/#pricing">Pricing</a>
              <a href="/#faq">FAQ</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
