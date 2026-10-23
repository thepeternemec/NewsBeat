"use client";

import InteriorPage from "@/components/site/interior-page";
import PageVisual from "@/components/site/page-visual";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Copy } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import LiveResponse from "@/components/site/live-response";

const API_BASE = "https://www.newsbeat.dev/api";

const OPTIONS = [
  {
    id: "mcp",
    title: "MCP",
    blurb: "Point an assistant at one URL. Nothing to install.",
  },
  {
    id: "http",
    title: "HTTP",
    blurb: "REST endpoints. Works in any language.",
  },
  {
    id: "tools",
    title: "Tool calling",
    blurb: "Hand a model the schemas and let it decide when to look.",
  },
] as const;

type OptionId = (typeof OPTIONS)[number]["id"];

const SNIPPETS: Record<OptionId, string> = {
  mcp: `{
  "mcpServers": {
    "newsbeat": {
      "url": "${API_BASE}/mcp"
    }
  }
}`,
  http: `# 1. find the topic
curl -s "${API_BASE}/v2/topics?q=nvidia"

# 2. read it, and keep the cursor
curl -s "${API_BASE}/v2/news?beat_id=b_bb964843350e"

# 3. later: ask what is new since that cursor
curl -s "${API_BASE}/v2/changes?beat_id=b_bb964843350e&cursor=<cursor>"

# or go straight to headlines
curl -s "${API_BASE}/v2/brief?beat_id=b_bb964843350e"`,
  tools: `// The schemas are served, not vendored — they cannot drift from the API.
const { tools } = await fetch("${API_BASE}/v2/tools").then((r) => r.json());

// Pass them to your model, execute what it calls, send the results back.
// Seven tools: newsbeat_topics, newsbeat_news, newsbeat_changes,
// newsbeat_brief, newsbeat_stories, newsbeat_summary, newsbeat_watch.`,
};

export default function Connect() {
  const [selected, setSelected] = useState<OptionId>("mcp");
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState("");
  /** One entry per round trip, in milliseconds. Drawn as bars, tallest = slowest. */
  const [bars, setBars] = useState<number[]>([]);

  const [apiBase, setApiBase] = useState(API_BASE);
  useEffect(() => { setApiBase(`${window.location.origin}/api`); }, []);
  const snippet = SNIPPETS[selected].replaceAll(API_BASE, apiBase);

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setResult("Copy is unavailable in this browser. Select the text below instead.");
    }
  }

  /**
   * A real request, so "connected" means connected — then eight more, drawn as they
   * land.
   *
   * The handshake alone answers "reachable?" with a sentence. Eight timed round trips
   * answer "how does it feel?", which is what someone about to point an agent at this
   * actually wants to know. Each bar is one request and its height is the latency, so
   * a slow tail is visible rather than averaged away.
   */
  async function verify() {
    setChecking(true);
    setResult("");
    setBars([]);
    const timings: number[] = [];
    try {
      const response = await fetch(`/api/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "newsbeat-connect-check", version: "1.0.0" },
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.result?.serverInfo) throw new Error();

      // Eight more, sequentially: concurrent requests would all inherit whichever one
      // was slowest and the bars would be a flat line.
      for (let i = 0; i < 8; i += 1) {
        const started = performance.now();
        try {
          const ping = await fetch(`/api/health`, { cache: "no-store" });
          if (!ping.ok) throw new Error("Health check failed");
          timings.push(Math.round(performance.now() - started));
        } catch {
          timings.push(0);
        }
        setBars([...timings]);
        await new Promise((resolve) => setTimeout(resolve, 70));
      }

      const good = timings.filter((ms) => ms > 0);
      const avg = good.length ? Math.round(good.reduce((a, b) => a + b, 0) / good.length) : 0;
      const worst = good.length ? Math.max(...good) : 0;
      setResult(
        good.length === 8
          ? `Reached ${data.result.serverInfo.name} · 8 of 8 round trips · ${avg} ms average, ${worst} ms worst. Now ask it about a ticker.`
          : `Reached ${data.result.serverInfo.name}, but ${8 - good.length} of 8 round trips failed. Try again shortly.`,
      );
    } catch {
      setResult("Could not reach the endpoint. Try again shortly.");
    } finally {
      setChecking(false);
    }
  }

  const active = OPTIONS.find((o) => o.id === selected) ?? OPTIONS[0];

  return (
    <>
      <SiteNav active="/connect" />
      <InteriorPage className="connect-page">
        <div className="page-head">
          <div className="wrap intro-grid">
            <div className="intro-copy">
            <span className="sec-eyebrow">Connect</span>
            <h1 className="sec-title">Start in one request.</h1>
            <p className="sec-sub">
              No key, no signup, and the anonymous tier is free. Point your agent at the endpoint below and ask it about
              a ticker — 2,000+ equities and cryptos covered, refreshed every fifteen minutes.
            </p>
            <div className="hero-cta">
              <a className="btn-primary" href="/docs/quickstart">
                Read the quickstart <ArrowRight size={14} />
              </a>
              <LiveResponse />
            </div>
            <p className="hero-tiny">
                public MCP and REST access is free · optional seven-day keyed REST trial
            </p>
            </div>
            <PageVisual kind="connect" />
          </div>
        </div>

        <section className="scaffold" id="ways">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">Three ways in</span>
              <h2 className="sec-title">Pick the one that fits.</h2>
              <p className="sec-sub">
                All three reach the same seven tools. Nothing here is a client library —
                there is no SDK to install, and no version to keep in step.
              </p>
            </div>

            <div className="connect-workbench">
            <div className="connect-methods" role="group" aria-label="Connection method">
              {OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`feature connect-option${option.id === selected ? " is-active" : ""}`}
                  aria-pressed={option.id === selected}
                  aria-controls="connection-code"
                  onClick={() => {
                    setSelected(option.id);
                    setResult("");
                  }}
                  style={{ minHeight: 150, textAlign: "left" }}
                >
                  <span className="feature-tag" style={{ marginTop: 0, paddingTop: 0 }}>
                    {option.id === selected ? "selected" : `0${OPTIONS.indexOf(option) + 1}`}
                  </span>
                  <h3 className="feature-title">{option.title}</h3>
                  <p className="feature-desc">{option.blurb}</p>
                </button>
              ))}
            </div>

            <div className="connect-console">
            <div className="code" id="connection-code">
              <div className="code-bar">
                {active.title}
                <button type="button" className="copy-btn" onClick={copy} aria-label="Copy">
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "copied" : "copy"}
                </button>
              </div>
              <pre key={selected} className="snippet-content">{snippet}</pre>
            </div>

            <div className="oss-row">
              <button type="button" className="btn-primary" onClick={verify} disabled={checking}>
                {checking ? "Checking…" : "Check the connection"}
                {!checking && <ArrowRight size={14} />}
              </button>
            </div>
            {(bars.length > 0 || checking) && (
              <div className="conn-bars" role="img" aria-label="Round trip latency">
                {/* Scaled to the slowest trip in this run, so the spread is visible.
                    Against a fixed 260 ms ceiling every bar landed between 55% and
                    67% and the chart showed eight identical rectangles. */}
                {Array.from({ length: 8 }, (_, i) => {
                  const ms = bars[i];
                  const slowest = Math.max(...bars.filter((value) => value > 0), 1);
                  const height =
                    ms === undefined ? 6 : ms === 0 ? 10 : Math.min(100, Math.max(22, (ms / slowest) * 100));
                  return (
                    <span
                      key={i}
                      className={`conn-bar${ms === undefined ? " is-pending" : ms === 0 ? " is-failed" : ""}`}
                      style={{ height: `${height}%` }}
                      title={ms === undefined ? "waiting" : ms === 0 ? "failed" : `${ms} ms`}
                    />
                  );
                })}
              </div>
            )}
            {result && <p className="hero-tiny connection-result" role="status">{result}</p>}
            <p className="connection-help">Need a walkthrough? <a href="/docs/quickstart">Follow the setup guide <ArrowRight size={12} /></a></p>
            </div>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="wrap">
            <h2 className="cta-title">Then ask it something.</h2>
            <p className="cta-sub">
              The first useful call is the smallest one: has this ticker moved since I last looked?
              An empty answer is a useful answer: nothing new was indexed in that window.
            </p>
            <div className="cta-row">
              <a className="btn-primary" href="/docs/quickstart">
                Follow the quickstart <ArrowRight size={14} />
              </a>
              <a className="btn-ghost" href="/docs">All the docs</a>
            </div>
          </div>
        </section>
      </InteriorPage>
      <SiteFooter />
    </>
  );
}
