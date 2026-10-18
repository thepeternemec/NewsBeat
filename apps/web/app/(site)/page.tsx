"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Code2,
  Layers3,
  Network,
  Radio,
  Terminal,
  Workflow,
} from "lucide-react";
import CopyButton from "@/components/site/copy-button";
import { API_BASE } from "@/components/site/content";
import s from "./landing.module.css";

type Topic = {
  beat_id: string;
  label: string;
  ticker?: string;
  status: string;
  asset?: string;
};
type Article = {
  id: string;
  title: string;
  source: string;
  url: string;
  published_at: string;
};
type NewsPage = {
  items: Article[];
  cursor?: string;
  freshness?: { status: string };
};
const GITHUB = "https://github.com/thepeternemec/NewsGraph";
const BASE = "https://newsgraph.vercel.app/api";
const SNIPPETS = {
  REST: `# Find a topic\ncurl "${BASE}/v2/topics?q=nvidia"\n\n# Get headlines and save the returned cursor\ncurl "${BASE}/v2/news?beat_id=b_bb964843350e"`,
  MCP: `{\n  "mcpServers": {\n    "newsgraph": {\n      "url": "${BASE}/mcp"\n    }\n  }\n}`,
  "Tool calling": `const { tools } = await fetch(\n  "${BASE}/v2/tools"\n).then(response => response.json());\n\n// Pass the schemas to your model.\n// Execute its calls and return the results.`,
};
const QUESTIONS = [
  [
    "Do I need an API key?",
    "No. The public API works without a key or signup. An optional key raises the rate limit from 120 to 1,200 requests per minute.",
  ],
  [
    "What news does NewsGraph cover?",
    "English-language financial news across US-listed equities and major crypto assets, collected through Google News RSS. Browse the live catalog in the terminal to see the topics and their freshness.",
  ],
  [
    "How does my agent know what is new?",
    "Read a topic once and save the cursor. Send that cursor to the changes endpoint on your next check. You receive the items that appeared since that position, plus a new cursor to save. An empty result means nothing new.",
  ],
  [
    "Do responses include full articles?",
    "No. Items include a headline, publisher name, publication time, and a link that resolves to the article. Current links use Google News redirects. Read the full story on the publisher’s site.",
  ],
  [
    "Is it free to use?",
    "Yes. The public API is free during early access, and billing is not active. See the pricing page for planned pricing.",
  ],
];

function Logo() {
  return (
    <a className={s.logo} href="/" aria-label="NewsGraph home">
      <Network size={24} strokeWidth={1.6} />
      <span>NewsGraph</span>
    </a>
  );
}

function NewsPreview() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selected, setSelected] = useState<Topic | null>(null);
  const [page, setPage] = useState<NewsPage | null>(null);
  const [view, setView] = useState<"headlines" | "json">("headlines");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadCatalog() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_BASE}/v2/topics?limit=1000`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("catalog");
        const data = (await response.json()) as { topics: Topic[] };
        const featured = ["NVDA", "AAPL", "BTC", "TSLA", "ETH"]
          .map((ticker) => data.topics.find((t) => t.ticker === ticker))
          .filter((t): t is Topic => Boolean(t));
        const list = featured.length ? featured : data.topics.slice(0, 5);
        if (!controller.signal.aborted) {
          setTopics(list);
          setSelected(list[0] ?? null);
          if (!list.length) {
            setError("No topics are available right now.");
            setLoading(false);
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("The preview couldn’t connect. Try again in a moment.");
          setLoading(false);
        }
      }
    }
    void loadCatalog();
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    if (!selected) return;
    const beatId = selected.beat_id;
    const controller = new AbortController();
    setLoading(true);
    setPage(null);
    setError("");
    async function loadNews() {
      try {
        const response = await fetch(
          `${API_BASE}/v2/news?beat_id=${encodeURIComponent(beatId)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("news");
        const result = (await response.json()) as NewsPage;
        if (!controller.signal.aborted) setPage(result);
      } catch {
        if (!controller.signal.aborted)
          setError("Headlines are temporarily unavailable. Please try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadNews();
    return () => controller.abort();
  }, [selected]);

  const freshness = page?.freshness?.status;
  return (
    <div className={s.preview} id="preview">
      <div className={s.previewBar}>
        <span>
          <Terminal size={15} /> NewsGraph / explorer
        </span>
        <span className={s.previewBadge}>
          <i /> Public API
        </span>
      </div>
      <div className={s.previewBody}>
        <aside className={s.sidebar} aria-label="Preview topics">
          <span className={s.smallLabel}>YOUR TOPICS</span>
          <div className={s.topicList}>
            {topics.length ? (
              topics.map((topic) => (
                <button
                  type="button"
                  key={topic.beat_id}
                  aria-pressed={topic.beat_id === selected?.beat_id}
                  onClick={() => setSelected(topic)}
                  className={
                    topic.beat_id === selected?.beat_id ? s.topicActive : ""
                  }
                >
                  <span className={s.topicSymbol}>
                    {topic.ticker?.slice(0, 1) ?? topic.label[0]}
                  </span>
                  <span>
                    <b>{topic.ticker ?? topic.label}</b>
                    <small>{topic.label}</small>
                  </span>
                  <ChevronDown size={12} />
                </button>
              ))
            ) : (
              <p className={s.sidebarNote}>
                {loading ? "Loading catalog…" : "Catalog unavailable"}
              </p>
            )}
          </div>
          <a href="/dashboard" className={s.allTopics}>
            Explore all topics <ArrowUpRight size={14} />
          </a>
          <div className={s.sidebarBottom}>
            <Layers3 size={16} />
            <span>
              Equities + crypto
              <br />
              <small>One consistent API</small>
            </span>
          </div>
        </aside>
        <div className={s.newsPanel}>
          <div className={s.newsToolbar}>
            <div>
              <span className={s.smallLabel}>TOPIC INTELLIGENCE</span>
              <h3>{selected?.label ?? "Explore the signal"}</h3>
            </div>
            <div className={s.viewToggle} aria-label="Response format">
              <button
                type="button"
                aria-pressed={view === "headlines"}
                onClick={() => setView("headlines")}
              >
                Headlines
              </button>
              <button
                type="button"
                aria-pressed={view === "json"}
                onClick={() => setView("json")}
              >
                JSON
              </button>
            </div>
          </div>
          <div className={s.newsContent} aria-live="polite" aria-busy={loading}>
            {loading ? (
              <div className={s.loading}>
                <Radio size={21} />
                <p>Reading the latest topic snapshot…</p>
              </div>
            ) : error ? (
              <div className={s.loading}>
                <p>{error}</p>
                <button
                  type="button"
                  className={s.textButton}
                  onClick={() => setRetry((n) => n + 1)}
                >
                  Retry connection <ArrowRight size={14} />
                </button>
              </div>
            ) : view === "json" ? (
              <pre className={s.json}>{JSON.stringify(page, null, 2)}</pre>
            ) : page?.items.length ? (
              page.items.slice(0, 3).map((article, index) => (
                <a
                  className={s.article}
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={s.articleNumber}>0{index + 1}</span>
                  <span>
                    <span className={s.articleMeta}>
                      {article.source}
                      <span>·</span>
                      <time dateTime={article.published_at}>
                        {new Date(article.published_at).toLocaleString(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "UTC",
                          },
                        )}{" "}
                        UTC
                      </time>
                    </span>
                    <strong>{article.title}</strong>
                  </span>
                  <ArrowUpRight size={16} />
                </a>
              ))
            ) : (
              <div className={s.loading}>
                <Check size={24} />
                <p>No headlines in this snapshot.</p>
              </div>
            )}
          </div>
          <div className={s.responseFooter}>
            <span>
              <span
                className={freshness === "fresh" ? s.freshDot : s.neutralDot}
              />
              {loading
                ? "Requesting snapshot"
                : error
                  ? "Connection unavailable"
                  : `Freshness: ${freshness ?? "unknown"}`}
            </span>
            <span>Headline · source · timestamp · link</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [integration, setIntegration] = useState<keyof typeof SNIPPETS>("REST");
  return (
    <div className={s.landing}>
      <a className={s.skip} href="#main">
        Skip to content
      </a>
      <header className={s.header}>
        <div className={s.container}>
          <Logo />
          <nav aria-label="Main navigation">
            <a href="#how">How it works</a>
            <a href="/docs">Docs</a>
            <a href="/pricing">Pricing</a>
            <a className={s.headerGithub} href={GITHUB}>
              GitHub <ArrowUpRight size={13} />
            </a>
          </nav>
          <a className={s.headerCta} href="/dashboard">
            Open terminal <ArrowUpRight size={14} />
          </a>
        </div>
      </header>
      <main id="main">
        <section className={s.hero}>
          <div className={s.container}>
            <a className={s.announcement} href={GITHUB}>
              <span>OPEN SOURCE</span> Built for the next generation of agents{" "}
              <ArrowRight size={13} />
            </a>
            <h1>
              Your agent’s edge.
              <br />
              <span>Knowing what changed.</span>
            </h1>
            <p className={s.heroDescription}>
              Give your AI agents the latest market context.
              <br className={s.desktopBreak} /> Follow a topic. Get the new
              headlines. Cite every source.
            </p>
            <div className={s.heroActions}>
              <a className={s.primary} href="/docs/quickstart">
                Start building <ArrowRight size={16} />
              </a>
              <a className={s.secondary} href="#preview">
                <Terminal size={16} /> Explore the news
              </a>
            </div>
            <p className={s.heroNote}>
              <Check size={12} /> No API key <span>·</span> No signup{" "}
              <span>·</span> Free during early access
            </p>
            <NewsPreview />
            <div className={s.integrationsStrip}>
              <span>ONE NEWS LAYER. YOUR STACK.</span>
              <b>
                <Code2 size={19} /> REST API
              </b>
              <b>
                <Network size={19} /> MCP
              </b>
              <b>
                <Workflow size={19} /> Tool calling
              </b>
              <a href="/connect">
                Connect your agent <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </section>
        <section className={`${s.section} ${s.how}`} id="how">
          <div className={s.container}>
            <div className={s.sectionHeading}>
              <div>
                <p className={s.eyebrow}>LESS NOISE. MORE CONTEXT.</p>
                <h2>
                  The news moves.
                  <br />
                  Your agent stays in sync.
                </h2>
              </div>
              <p>
                A simple loop turns the news into useful context. Your agent
                receives what appeared since its last check, with the sources to
                back it up.
              </p>
            </div>
            <div className={s.steps}>
              <article>
                <div className={s.stepTop}>
                  <span>01</span>
                  <Layers3 size={22} />
                </div>
                <h3>Choose what matters.</h3>
                <p>
                  Follow companies and crypto assets with stable topic IDs. Keep
                  your agent focused on its watchlist.
                </p>
                <div className={s.topicChips}>
                  <span>NVDA</span>
                  <span>AAPL</span>
                  <span>BTC</span>
                  <span>+ more</span>
                </div>
              </article>
              <article>
                <div className={s.stepTop}>
                  <span>02</span>
                  <Radio size={22} />
                </div>
                <h3>Ask what changed.</h3>
                <p>
                  Save a cursor. Send it on the next check. Get new items, or a
                  clear answer that nothing has changed.
                </p>
                <div className={s.deltaVisual}>
                  <span>Last check</span>
                  <ArrowRight size={16} />
                  <b>New items only</b>
                </div>
              </article>
              <article>
                <div className={s.stepTop}>
                  <span>03</span>
                  <ArrowUpRight size={22} />
                </div>
                <h3>Put the signal to work.</h3>
                <p>
                  Build research briefs, monitoring agents, and alerts with
                  headlines, timestamps, and links to the reporting.
                </p>
                <div className={s.citationVisual}>
                  <Check size={15} /> Every headline has a source
                </div>
              </article>
            </div>
          </div>
        </section>
        <section className={`${s.section} ${s.developer}`} id="connect">
          <div className={`${s.container} ${s.developerGrid}`}>
            <div>
              <p className={s.eyebrow}>FROM IDEA TO FIRST REQUEST</p>
              <h2>
                A small API.
                <br />A lot of possibilities.
              </h2>
              <p className={s.bodyCopy}>
                Use plain HTTP, connect through MCP, or hand your model the tool
                schemas. The same news, in the shape your agent needs.
              </p>
              <ul className={s.checkList}>
                <li>
                  <Check size={15} /> Read-only by design
                </li>
                <li>
                  <Check size={15} /> Bounded responses for your context window
                </li>
                <li>
                  <Check size={15} /> Freshness included in the response
                </li>
              </ul>
              <a className={s.textButton} href="/connect">
                Find your integration <ArrowRight size={16} />
              </a>
            </div>
            <div className={s.codeBox}>
              <div className={s.codeTabs} aria-label="Integration examples">
                {(Object.keys(SNIPPETS) as Array<keyof typeof SNIPPETS>).map(
                  (name) => (
                    <button
                      type="button"
                      key={name}
                      aria-pressed={integration === name}
                      onClick={() => setIntegration(name)}
                    >
                      {name}
                    </button>
                  ),
                )}
                <CopyButton
                  key={integration}
                  text={SNIPPETS[integration]}
                  label="snippet"
                />
              </div>
              <pre
                tabIndex={0}
                aria-label={`${integration} integration example`}
              >
                {SNIPPETS[integration]}
              </pre>
              <div className={s.codeFooter}>
                <span className={s.freshDot} /> No credentials required{" "}
                <span>Ready when you are.</span>
              </div>
            </div>
          </div>
        </section>
        <section className={s.section} id="faq">
          <div className={`${s.container} ${s.faqGrid}`}>
            <div>
              <p className={s.eyebrow}>GOOD QUESTIONS</p>
              <h2>
                A few things
                <br />
                worth knowing.
              </h2>
              <a className={s.textButton} href="/docs">
                Read the documentation <ArrowRight size={15} />
              </a>
            </div>
            <div className={s.questions}>
              {QUESTIONS.map(([question, answer]) => (
                <details key={question}>
                  <summary>
                    {question}
                    <ChevronDown size={17} />
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section className={s.finalSection}>
          <div className={s.container}>
            <div className={s.finalCard}>
              <div>
                <p className={s.eyebrow}>THE WORLD DOESN’T WAIT.</p>
                <h2>Keep your agent in the loop.</h2>
                <p>Start with one topic. Build from there.</p>
              </div>
              <div>
                <a className={s.primary} href="/docs/quickstart">
                  Make your first request <ArrowRight size={16} />
                </a>
                <span>Open source. Free to get started.</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className={s.footer}>
        <div className={s.container}>
          <div>
            <Logo />
            <p>The news layer for AI agents.</p>
          </div>
          <nav aria-label="Footer navigation">
            <a href="/docs">Documentation</a>
            <a href="/connect">Connect</a>
            <a href="/pricing">Pricing</a>
            <a href={GITHUB}>
              GitHub <ArrowUpRight size={12} />
            </a>
          </nav>
          <span>Open source · MIT licensed</span>
        </div>
      </footer>
    </div>
  );
}
