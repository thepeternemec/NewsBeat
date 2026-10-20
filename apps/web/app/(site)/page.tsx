"use client";

import { ArrowRight, Bell, Coins, FileCheck, Filter, Plug, Zap } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import Marquee from "@/components/ui/marquee/marquee";
import CopyButton from "@/components/site/copy-button";
import { useNewsBeatStats } from "@/components/site/use-stats";
import { FAQ, PRICES } from "@/components/site/content";

/** Benefit-led, in the order a buyer cares about them. */
const FEATURES = [
  {
    icon: Zap,
    title: "Know what changed",
    desc: "Get new stories since your last check, so your agent can focus on the latest developments.",
    tag: "a question, not a feed",
    viz: (
      <>
        <div className="viz-line"><span className="viz-dot on" /><span className="viz-key">NVIDIA</span><span className="viz-val">3 new</span></div>
        <div className="viz-line"><span className="viz-dot" /><span>published</span><span className="viz-val">06:41Z</span></div>
        <div className="viz-line"><span className="viz-dot on" /><span>indexed</span><span className="viz-val">06:43Z</span></div>
        <div className="viz-bar"><i style={{ width: "86%" }} /></div>
      </>
    ),
  },
  {
    icon: Filter,
    title: "Keep context compact",
    desc: "Up to eight stories per answer, ready to fit into your agent's research and analysis workflow.",
    tag: "≤8 stories",
    viz: (
      <>
        <div className="viz-line"><span className="viz-key">pack · b_bb964843350e</span><span className="viz-val">3 of 8</span></div>
        <div className="viz-dots">
          <i className="on" /><i className="on" /><i className="on" /><i /><i /><i /><i /><i />
        </div>
        <div className="viz-line"><span>ranked by publication time</span></div>
      </>
    ),
  },
  {
    icon: Coins,
    title: "Check on your schedule",
    desc: "Let your agent ask regularly. A clear answer when nothing changed is useful too.",
    tag: "keep the latest cursor",
    viz: (
      <>
        <div className="viz-line"><span className="viz-key">scheduled checks</span><span className="viz-val">your cadence</span></div>
        <div className="viz-bar"><i style={{ width: "93%" }} /></div>
        <div className="viz-line"><span>nothing changed</span><span className="viz-val">a useful answer</span></div>
      </>
    ),
  },
  {
    icon: FileCheck,
    title: "Follow the source",
    desc: "Every item includes a headline, publisher, timestamp, and link so you can investigate further.",
    tag: "link on every item",
    viz: (
      <>
        <div className="viz-line"><span className="viz-key">Reuters</span><span className="viz-val">cited</span></div>
        <div className="viz-line"><span>headline · source · timestamp</span></div>
        <div className="viz-line"><span>no body</span><span className="viz-val">article link</span></div>
      </>
    ),
  },
  {
    icon: Bell,
    title: "Pay for usage",
    desc: "Usage-based pricing with no seat licences. Choose the plan that fits the way your agents work.",
    tag: "no seat licences",
    viz: (
      <>
        <div className="viz-line"><span className="viz-key">pricing</span><span className="viz-val">usage-based</span></div>
        <div className="viz-bar"><i style={{ width: "97%" }} /></div>
        <div className="viz-line"><span>published plans</span><span className="viz-val">no seat licences</span></div>
      </>
    ),
  },
  {
    icon: Plug,
    title: "Connect to your stack",
    desc: "Use REST, OpenAI-compatible tools, or MCP to bring news into the agents you already run.",
    tag: "REST · tools · MCP",
    viz: (
      <>
        <div className="viz-chips">
          <span className="viz-chip on">REST</span>
          <span className="viz-chip on">tools</span>
          <span className="viz-chip on">MCP</span>
        </div>
        <div className="viz-line"><span>one payload shape</span><span className="viz-val">same handlers</span></div>
      </>
    ),
  },
];

const SOURCES = [
  // Wires and financial press
  "Reuters",
  "Bloomberg",
  "The Associated Press",
  "Financial Times",
  "The Wall Street Journal",
  "CNBC",
  "The Economist",
  "BBC News",
  "Nikkei Asia",
  "Al Jazeera",
  "South China Morning Post",
  // Technology
  "TechCrunch",
  "The Verge",
  "Ars Technica",
  "Wired",
  // Crypto desks
  "CoinDesk",
  "Cointelegraph",
  "The Block",
  "Decrypt",
  "Blockworks",
  "DL News",
  "Unchained",
  "The Defiant",
  "Bitcoin Magazine",
  "Protos",
];
const STEPS = [
  {
    n: "1",
    title: "Pick your topics",
    desc: "Choose from 2,000+ equities and cryptos. Each has a stable ID your agent can keep in its watchlist.",
    tag: "2,000+ topics",
  },
  {
    n: "2",
    title: "Your agent asks what changed",
    desc: "It sends the topic and the cursor from last time. The answer is either nothing moved, or a short pack of what did.",
    tag: "two possible answers",
  },
  {
    n: "3",
    title: "Bring the news into your workflow",
    desc: "Carry new headlines and their sources into research, alerts, and market analysis. Store the latest cursor for the next check.",
    tag: "research · alerts · analysis",
  },
];

export default function Home() {
  const { stats, stamp, items, ticker } = useNewsBeatStats();

  return (
    <>
      <SiteNav active="/" />
      <main>
        {/* HERO */}
        <section className="hero" id="top">
          <div className="wrap">
            <span className="eyebrow">
              <span className="eyebrow-tag">For trading &amp; prediction-market research</span>
              <span className="eyebrow-stat">{stats?.beats ?? "…"} topics</span>
              <span className="eyebrow-stat">
                <span className="eyebrow-sep">·</span> MCP + REST API
              </span>
              <span className="eyebrow-stat eyebrow-stat-optional">
                <span className="eyebrow-sep">·</span> no key required
              </span>
            </span>

            <h1>The news layer for AI agents.</h1>
            <p className="lede">
              Give your agents the news behind the market. Track equities and crypto, see what
              changed, and bring source-linked headlines into your trading and prediction-market research.
              Connect through MCP or API for a concise update when new stories appear, or a clear
              answer when nothing changed.
            </p>
            <p className="hero-tiny">
              <strong>Usage-based pricing. No seat licences.</strong> Open source.
            </p>

            <div className="code hero-curl">
              <div className="code-bar">
                one request, right now
                <CopyButton text={`curl -s "https://newsgraph.vercel.app/api/v2/stories?beat_id=b_7883c6d63df4"`} />
              </div>
              <pre>{`curl -s "https://newsgraph.vercel.app/api/v2/stories?beat_id=b_7883c6d63df4"`}</pre>
            </div>

            <div className="hero-cta">
              <a className="btn-primary" href="/connect">
                Connect your agent <ArrowRight size={14} />
              </a>
              <a className="btn-ghost" href="/dashboard">
                Explore live news
              </a>
              <a className="btn-ghost" href="https://github.com/thepeternemec/NewsBeat">
                Source
              </a>
            </div>

            <div className="mock" style={{ marginTop: 46 }}>
              <div className="mock-bar">
                <span className="mock-dots"><span /><span /><span /></span>
                <span className="mock-title">newsbeat — your agent asks, newsbeat answers</span>
                <span className="mock-live">live headlines</span>
              </div>
              <div className="mock-body">
                <div className="mock-ticker">
                  <Marquee speed={55} gap="3.5rem" pauseOnHover>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {ticker.map((it, i) => (
                        <span key={i} style={{ whiteSpace: "nowrap", font: "11px var(--font-mono), monospace", color: "#bdbdbd" }}>
                          <span style={{ color: "#fff", fontWeight: 600 }}>{it.beat_label}</span>
                          <span style={{ margin: "0 12px", color: "#333" }}>·</span>
                          {it.lede}
                        </span>
                      ))}
                    </div>
                  </Marquee>
                  </div>
                  <div className="mock-feed">
                  <div className="mock-row">
                    <span className="k">your agent</span>
                    <span className="v">{`{"task": "due diligence on Nvidia China exposure"}`}</span>
                    <span className="s">free</span>
                  </div>
                  <div className="mock-row">
                    <span className="k">→ topic</span>
                    <span className="v">b_bb964843350e · NVIDIA</span>
                    <span className="s">ready</span>
                  </div>
                  <div className="mock-row">
                    <span className="k">ask</span>
                    <span className="v">has this moved since I last looked?</span>
                    <span className="s">check</span>
                  </div>
                  <div className="mock-row">
                    <span className="k">answer</span>
                    <span className="v">moved · 3 new stories · cited</span>
                    <span className="s">new stories</span>
                  </div>
                  {items.slice(0, 3).map((it, i) => (
                    <div key={i} className="mock-row">
                      <span className="k">{it.beat_label}</span>
                      <span className="v">{it.lede}</span>
                      <span className="s">{it.source}</span>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="mock-row">
                      <span className="k">awaiting</span>
                      <span className="v">Loading the latest headlines. Explore the terminal for topic status.</span>
                      <span className="s">system</span>
                    </div>
                  )}
                </div>
                <div className="mock-foot">
                  <span>read-only · public</span>
                  <span>MCP + API</span>
                  <span style={{ marginLeft: "auto" }}>{stamp ? `updated ${stamp}` : "connecting…"}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* NUMBERS */}
        <section className="metrics">
          <div className="wrap">
            <div className="metrics-grid">
              <div>
                <div className="metric-num">2,000+</div>
                <div className="metric-label">Equities and cryptos tracked</div>
              </div>
              <div>
                <div className="metric-num">0</div>
                <div className="metric-label">Seat licences required</div>
              </div>
              <div>
                <div className="metric-num">≤8</div>
                <div className="metric-label">Stories per answer, ready for your agent</div>
              </div>
              <div>
                <div className="metric-num">15m</div>
                  <div className="metric-label">How often every topic is re-checked</div>
              </div>
            </div>
            <p className="hero-tiny" style={{ marginTop: 34 }}>
              {stats?.live
                ? `live · ${stats.beats} topics · ${stats.live} with articles · updated ${stamp || "\u2026"}`
                : "2,000+ equities and cryptos · loading live status"}
            </p>
          </div>
        </section>

        {/* COVERAGE */}
        <section className="marquee-strip">
          <div className="wrap">
            <span className="marquee-strip-label">Coverage includes</span>
          </div>
          <Marquee speed={52} gap="2.75rem" pauseOnHover>
            <div className="rail-items">
              {SOURCES.map((source) => (
                <span key={source} className="rail-item"><i />{source}</span>
              ))}
            </div>
          </Marquee>
        </section>

        {/* FEATURES */}
        <section className="scaffold" id="features">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">What you get</span>
              <h2 className="sec-title">Give every decision current context.</h2>
              <p className="sec-sub">
                Track the companies and crypto assets that matter to your strategy. Get a compact
                set of new headlines, with sources and timestamps, ready for research, alerts, and market analysis.
              </p>
            </div>
            <div className="features">
              {FEATURES.map(({ icon: Icon, title, desc, tag, viz }) => (
                <div key={title} className="feature viz-card">
                  <div className="viz">{viz}</div>
                  <div className="feature-body">
                    <span className="feature-icon"><Icon size={15} strokeWidth={1.75} /></span>
                    <h3 className="feature-title">{title}</h3>
                    <p className="feature-desc">{desc}</p>
                    <span className="feature-tag">{tag}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* THE HYPER-NEWS AGENT */}
        <section className="scaffold" id="agent">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">Trading &amp; prediction markets</span>
              <h2 className="sec-title">Keep your agent watching the market.</h2>
              <p className="sec-sub">
                From a stock watchlist to a crypto thesis or a Polymarket research workflow,
                give your agent a repeatable way to check the news.
              </p>
            </div>

            <div className="showcase">
              <div>
                <h3>Follow the stories behind your watchlist.</h3>
                <p>
                  Follow relevant companies and assets, collect new headlines, and carry the sources
                  into your analysis. Combine NewsBeat with your market data and probability models
                  to investigate what changed—and whether it changes your view.
                </p>
                <ul>
                  <li>Check your watchlist on a schedule that fits your workflow</li>
                  <li>Bring source-linked headlines into your research</li>
                  <li>Nothing changed is a useful answer too</li>
                  <li>Store the latest cursor so your next check picks up where you left off</li>
                </ul>
              </div>
              <div className="mock">
                <div className="mock-bar">
                  <span className="mock-dots"><span /><span /><span /></span>
                  <span className="mock-title">example agent loop · one topic</span>
                  <span className="mock-live">read-only</span>
                </div>
                <div className="mock-feed">
                  <div className="mock-row">
                    <span className="k">06:00 wake</span>
                    <span className="v">check NVIDIA</span>
                    <span className="s">check</span>
                  </div>
                  <div className="mock-row">
                    <span className="k">06:00 nothing</span>
                    <span className="v">nothing moved · cursor held</span>
                    <span className="s">check</span>
                  </div>
                  <div className="mock-row">
                    <span className="k">06:30 wake</span>
                    <span className="v">three new stories · sources included</span>
                    <span className="s">new stories</span>
                  </div>
                  <div className="mock-row">
                    <span className="k">06:30 cite</span>
                    <span className="v">Reuters · published 06:21 · indexed 06:28</span>
                    <span className="s">cited</span>
                  </div>
                  <div className="mock-row">
                    <span className="k">06:31 write</span>
                    <span className="v">memo to the desk, link only</span>
                    <span className="s">no bodies</span>
                  </div>
                </div>
                <div className="mock-foot">
                  <span>your watchlist</span>
                  <span>your schedule</span>
                  <span style={{ marginLeft: "auto" }}>source-linked updates</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="scaffold" id="how">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">How it works</span>
              <h2 className="sec-title">Choose your topics. Connect your agent. Stay informed.</h2>
              <p className="sec-sub">
                Choose what matters, ask what changed, and bring the answer into your workflow.
              </p>
            </div>
            <div className="features">
              {STEPS.map((step) => (
                <div key={step.n} className="feature" style={{ minHeight: 220 }}>
                  <span className="feature-icon">{step.n}</span>
                  <h3 className="feature-title">{step.title}</h3>
                  <p className="feature-desc">{step.desc}</p>
                  <span className="feature-tag">{step.tag}</span>
                </div>
              ))}
            </div>
            <p className="more"><a href="/docs/quickstart">Follow the quickstart</a></p>
          </div>
        </section>

        {/* PRICING */}
        <section className="scaffold" id="pricing">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">Usage-based pricing</span>
              <h2 className="sec-title">Pay for usage. No seat licences.</h2>
              <p className="sec-sub">
                Choose the plan that fits your agents. Published prepaid plans start at $0.20 a day
                for up to fifty tickers. The API is free during early access; Stripe checkout is coming soon.
              </p>
            </div>
            <div className="features grid-4">
              {PRICES.map((p) => (
                <div key={p.label} className="feature" style={{ minHeight: 190 }}>
                  <span className="feature-tag" style={{ marginTop: 0, paddingTop: 0 }}>{p.label}</span>
                  <div className="metric-num" style={{ fontSize: 30, margin: "14px 0 10px" }}>{p.price}</div>
                  <p className="feature-desc">{p.desc}</p>
                </div>
              ))}
            </div>
            <p className="more"><a href="/pricing">View pricing</a></p>
          </div>
        </section>

        {/* WHY NOW */}
        <section className="scaffold" id="why-now">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">Why now</span>
              <h2 className="sec-title">Markets move. Keep your agent&rsquo;s context current.</h2>
              <p className="sec-sub">
                Your agent needs a way to bring new developments into its analysis. NewsBeat adds
                repeatable news checks to the data and tools your strategy already uses.
              </p>
            </div>
            <div className="features">
              <div className="feature" style={{ minHeight: 220 }}>
                <h3 className="feature-title">Bring in new developments</h3>
                <p className="feature-desc">
                  Supplement your model&rsquo;s existing knowledge with news about the companies
                  and assets you follow.
                </p>
                <span className="feature-tag">current context</span>
              </div>
              <div className="feature" style={{ minHeight: 220 }}>
                <h3 className="feature-title">Keep track of what changed</h3>
                <p className="feature-desc">
                  Keep a cursor for each topic. Your next check asks for the stories that appeared
                  since, giving your agent a consistent starting point.
                </p>
                <span className="feature-tag">updates since your last check</span>
              </div>
              <div className="feature" style={{ minHeight: 220 }}>
                <h3 className="feature-title">Built for agent workflows</h3>
                <p className="feature-desc">
                  Use compact, structured answers with sources and timestamps in your prompts,
                  tools, research notes, and alerts.
                </p>
                <span className="feature-tag">structured and source-linked</span>
              </div>
            </div>
          </div>
        </section>

        {/* WHERE WE ARE */}
        <section className="scaffold" id="status">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">Where we are</span>
              <h2 className="sec-title">Built today. Coming next.</h2>
              <p className="sec-sub">
                Your tools. Your channels. Your news. Connect through MCP or API today, with
                more integrations on the way.
              </p>
            </div>
            <div className="features grid-4">
              <div className="feature" style={{ minHeight: 200 }}>
                <span className="feature-tag" style={{ marginTop: 0, paddingTop: 0 }}>Shipped</span>
                <p className="feature-desc" style={{ marginTop: 14 }}>
                  2,000+ equities and cryptos, refreshed every fifteen minutes. REST API,
                  OpenAI-compatible tools, and hosted MCP, with cursors, briefs, and topic freshness status.
                </p>
              </div>
              <div className="feature" style={{ minHeight: 200 }}>
                <span className="feature-tag" style={{ marginTop: 0, paddingTop: 0 }}>In progress</span>
                <p className="feature-desc" style={{ marginTop: 14 }}>
                  Publisher URLs instead of Google News redirects, and a lede for items that
                  currently carry only a headline.
                </p>
              </div>
              <div className="feature" style={{ minHeight: 200 }}>
                <span className="feature-tag" style={{ marginTop: 0, paddingTop: 0 }}>Next</span>
                <p className="feature-desc" style={{ marginTop: 14 }}>
                  Telegram, Discord, and more service integrations, bringing news updates into
                  the places where you research, collaborate, and act. Scheduled watches and push updates are also planned.
                </p>
              </div>
              <div className="feature" style={{ minHeight: 200 }}>
                <span className="feature-tag" style={{ marginTop: 0, paddingTop: 0 }}>Open</span>
                <p className="feature-desc" style={{ marginTop: 14 }}>
                  The contract, the schemas and the documentation are public. The catalog and the
                  tool definitions need no credential, so you can evaluate before you spend.
                </p>
              </div>
            </div>
            <p className="more"><a href="/faq">Full status and roadmap</a></p>
          </div>
        </section>

        {/* FAQ — the anchor the terminal's footer links to. Without this the
            link silently landed at the top of the page. */}
        <section className="scaffold" id="faq">
          <div className="wrap-tight">
            <div className="sec-head">
              <span className="sec-eyebrow">Questions</span>
              <h2 className="sec-title">Before you connect.</h2>
              <p className="sec-sub">
                Five answers here, and the rest on{" "}
                <a href="/faq" style={{ color: "#fff", borderBottom: "1px solid var(--border-strong)" }}>
                  the full FAQ
                </a>
                .
              </p>
            </div>
            <div className="faq">
              {FAQ.slice(0, 5).map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <div className="a">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* OPEN SOURCE */}
        <section className="scaffold" id="open-source">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">Open source</span>
              <h2 className="sec-title">MIT licensed. Built to be extended.</h2>
              <p className="sec-sub">
                All of it is public — the contract, the ingestion worker, the ledger and this site.
                Three things make it worth an afternoon.
              </p>
            </div>
            <div className="features">
              <div className="feature" style={{ minHeight: 210 }}>
                <h3 className="feature-title">Runs without infrastructure</h3>
                <p className="feature-desc">
                  Clone it and run the tests with no database, no API key and no news provider. The
                  interesting logic is pure by design, so it can be exercised on its own.
                </p>
                <span className="feature-tag">npm install &amp;&amp; npm test</span>
              </div>
              <div className="feature" style={{ minHeight: 210 }}>
                <h3 className="feature-title">Small enough to read</h3>
                <p className="feature-desc">
                  Five packages, one API and one worker. The architecture doc is a single page and
                  covers all of it, including why the billing rules live in SQL rather than in the
                  service.
                </p>
                <span className="feature-tag">one page of architecture</span>
              </div>
              <div className="feature" style={{ minHeight: 210 }}>
                <h3 className="feature-title">The catalog is open</h3>
                <p className="feature-desc">
                  2,000+ equities and cryptos covered today, and the list is
                  deliberately open. Proposing a ticker takes an issue and no code at all, which
                  makes it the cheapest real contribution here.
                </p>
                <span className="feature-tag">propose a topic</span>
              </div>
            </div>
            <div className="oss-row">
              <a className="btn-primary" href="https://github.com/thepeternemec/NewsBeat">
                Star it on GitHub <ArrowRight size={14} />
              </a>
              <a className="btn-ghost" href="https://github.com/thepeternemec/NewsBeat/blob/main/CONTRIBUTING.md">
                Your first pull request
              </a>
            </div>
            <p className="hero-tiny" style={{ textAlign: "left" }}>
              Python or Go SDKs, extra topics, documentation fixes and integration examples are all
              genuinely useful. There is no CLA.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <div className="wrap">
            <h2 className="cta-title">Give your agent a market to watch.</h2>
            <p className="cta-sub">
              Choose your topics, connect through MCP or API, and start building with news
              your agent can use.
            </p>
            <div className="cta-row">
              <a className="btn-primary" href="/connect">Connect your agent <ArrowRight size={14} /></a>
              <a className="btn-ghost" href="/dashboard">Explore live news</a>
            </div>
            <p className="cta-tiny">
              The news layer for AI agents · Usage-based pricing · No seat licences
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
