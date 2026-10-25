import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  FileCheck,
  GitBranch,
  Link2,
  MessageSquare,
  Plug,
  Sparkles,
} from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import CopyButton from "@/components/site/copy-button";
import NewsPreview from "@/components/site/news-preview";
import { FAQ } from "@/components/site/content";
import "./landing.css";

const MCP_URL = "https://www.newsbeat.dev/api/mcp";
const REST_EXAMPLE =
  'curl -s "https://www.newsbeat.dev/api/v2/brief?beat_id=b_bb964843350e"';
const STEPS = [
  {
    number: "01",
    icon: Plug,
    title: "Connect your assistant",
    text: "Add NewsBeat to your assistant’s tools. Our setup guide walks you through the connection.",
  },
  {
    number: "02",
    icon: MessageSquare,
    title: "Ask in your own words",
    text: "“What’s happening with Nvidia?” or “Give me a Bitcoin briefing.” No tickers or special commands to remember.",
  },
  {
    number: "03",
    icon: Link2,
    title: "Understand the story",
    text: "Your assistant uses recent headlines to explain the story, with dates and links when you need to dig deeper.",
  },
];
const BENEFITS = [
  {
    icon: Sparkles,
    title: "See the story, not the repeats",
    text: "Short updates and grouped coverage help your assistant explain the main developments without repeating the same story.",
  },
  {
    icon: Clock3,
    title: "Catch up since your last check",
    text: "Ask what’s new since your last check. Your assistant can pick up from the previous update when it has saved that check.",
  },
  {
    icon: FileCheck,
    title: "Go straight to the source",
    text: "Every headline includes its publisher, publication date and a link. Open the reporting and form your own view.",
  },
];
const QUESTIONS = [
  {
    label: "Research a company",
    question:
      "What’s happening with Nvidia? Give me the latest news and sources.",
  },
  {
    label: "Compare competitors",
    question:
      "What’s new with Nvidia and AMD? Keep each company’s sources separate.",
  },
  {
    label: "Follow crypto",
    question:
      "Give me a short Bitcoin briefing and tell me how recent the coverage is.",
  },
];

export default function Home() {
  return (
    <>
      <SiteNav active="/" />
      <main className="landing-home">
        <section className="hero" id="top">
          <div className="wrap landing-hero-grid">
            <div className="landing-hero-copy">
              <span className="landing-eyebrow">
                Company &amp; crypto news for your agent
              </span>
              <h1>
                <span>Ask what happened.</span>
                <span>Know what matters.</span>
              </h1>
              <p className="lede">
                Give your AI agent the news behind the companies and crypto you
                follow. When a question needs current context, it can check
                NewsBeat and bring back a short, source-linked update. Try a live
                lookup here, then connect your agent.
              </p>
              <div className="hero-cta">
                <a className="btn-primary" href="/docs/try">
                  Try NewsBeat free <ArrowRight size={15} />
                </a>
                <a className="landing-secondary" href="/docs/quickstart">
                  Connect your agent <ArrowUpRight size={15} />
                </a>
              </div>
              <div className="landing-reassurance">
                <span>
                  <Check size={13} /> Free during early access
                </span>
                <span>
                  <Check size={13} /> No account or API key needed
                </span>
              </div>
              <a className="landing-how-link" href="#how">
                See how it works <ArrowRight size={12} />
              </a>
            </div>
            <NewsPreview />
          </div>
        </section>

        <section className="landing-proof" aria-label="NewsBeat at a glance">
          <div className="wrap">
            <div>
              <strong>2,000+</strong>
              <span>Supported companies &amp; crypto assets</span>
            </div>
            <div>
              <strong>120</strong>
              <span>Free requests per minute · no API key</span>
            </div>
            <div>
              <strong>1,200</strong>
              <span>REST requests per minute · seven-day trial key</span>
            </div>
          </div>
        </section>

        <section className="scaffold" id="how">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">News in the conversation</span>
              <h2 className="sec-title">News when your question needs it.</h2>
              <p className="sec-sub">
                Stay in the assistant you already use. When it calls NewsBeat,
                recent coverage is available in the conversation.
              </p>
            </div>
            <div className="features landing-steps">
              {STEPS.map(({ number, icon: Icon, title, text }) => (
                <div className="feature" key={number}>
                  <div className="landing-step-top">
                    <span>{number}</span>
                    <Icon size={20} strokeWidth={1.5} />
                  </div>
                  <h3 className="feature-title">{title}</h3>
                  <p className="feature-desc">{text}</p>
                </div>
              ))}
            </div>
            <p className="landing-compatibility">
              Your assistant needs to support custom remote MCP connections.
              Setup options vary by app and account.{" "}
              <a href="/docs/quickstart">
                Find your setup path <ArrowRight size={12} />
              </a>
            </p>
            <div className="landing-preference">
              <Sparkles size={20} />
              <div>
                <h3>Let your assistant know when to check.</h3>
                <p>
                  Add a news preference to its instructions so it can look up
                  recent developments whenever they help with your question.
                  Tool choices depend on your assistant and its settings.
                </p>
              </div>
              <a href="/docs/quickstart#agent-instruction">
                Copy the instruction <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </section>

        <section className="scaffold" id="features">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">
                Less searching. More understanding.
              </span>
              <h2 className="sec-title">Keep up without the headline overload.</h2>
              <p className="sec-sub">
                Bring recent developments into company research, trading and
                prediction-market research, with the sources close at hand.
              </p>
            </div>
            <div className="signal-workbench" aria-label="How NewsBeat turns recent coverage into an agent update">
              <div className="signal-stage">
                <span className="signal-label">01 / Recent coverage</span>
                <div className="signal-reports" aria-hidden="true">
                  <div><span>COMPANY NEWS</span><i /><i /></div>
                  <div><span>CRYPTO UPDATES</span><i /><i /></div>
                  <div><span>PUBLISHER REPORTS</span><i /><i /></div>
                </div>
                <p>Many reports. One place to check.</p>
              </div>
              <div className="signal-stage signal-engine">
                <span className="signal-label">02 / NewsBeat</span>
                <div className="signal-orbit" aria-hidden="true">
                  <div className="signal-core"><span /><span /><span /></div>
                </div>
                <p>Group the repeats. Surface the story.</p>
              </div>
              <div className="signal-stage">
                <span className="signal-label">03 / Your agent</span>
                <div className="signal-answer">
                  <MessageSquare size={18} strokeWidth={1.5} aria-hidden="true" />
                  <strong>What changed?</strong>
                  <span>A short headline-based update</span>
                  <div><span>Sources</span><span>Dates</span><span>Freshness</span></div>
                </div>
                <p>Context for the next question.</p>
              </div>
            </div>
            <div className="features">
              {BENEFITS.map(({ icon: Icon, title, text }) => (
                <div className="feature landing-benefit" key={title}>
                  <span className="feature-icon">
                    <Icon size={18} strokeWidth={1.5} />
                  </span>
                  <h3 className="feature-title">{title}</h3>
                  <p className="feature-desc">{text}</p>
                </div>
              ))}
            </div>
            <p className="landing-caption">
              Updates are based on headlines, not full article text. Your
              assistant should flag missing or out-of-date coverage.
            </p>
          </div>
        </section>

        <section className="scaffold landing-agent-economy" id="agent-economy">
          <div className="wrap landing-agent-economy-grid">
            <div className="sec-head">
              <span className="sec-eyebrow">Built for agents that use the web</span>
              <h2 className="sec-title">
                Agents can pay for data. Give them the news behind it.
              </h2>
              <p className="sec-sub">
                Agents are learning to use services as they work. NewsBeat gives
                them a way to check what changed at a company or crypto asset,
                get a short update from recent headlines, and bring the reporting
                into the conversation. Available today through MCP and REST.
              </p>
              <a className="landing-economy-link" href="/docs/quickstart">
                Connect your agent for free <ArrowRight size={14} />
              </a>
            </div>
            <aside className="landing-economy-proof" aria-label="Agent economy context">
              <span className="landing-economy-label">The shift is already underway</span>
              <strong>138M+</strong>
              <p>
                x402 transactions on Base by the end of Chainalysis’s 2026
                reporting period. As agents gain ways to buy digital services,
                timely news becomes another useful tool to call.
              </p>
              <a
                href="https://www.chainalysis.com/blog/north-america-crypto-adoption-2026/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read the Chainalysis report <ArrowUpRight size={13} />
              </a>
              <small>Industry transactions, not NewsBeat usage.</small>
            </aside>
          </div>
        </section>

        <section className="scaffold" id="questions">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">
                Start with what you want to know
              </span>
              <h2 className="sec-title">Start with a company you follow.</h2>
              <p className="sec-sub">
                Once connected, copy a question into your assistant or simply
                ask your own.
              </p>
            </div>
            <div className="landing-question-grid">
              {QUESTIONS.map((item) => (
                <div className="landing-question" key={item.label}>
                  <span>{item.label}</span>
                  <p>“{item.question}”</p>
                  <CopyButton text={item.question} label="Copy question" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="scaffold" id="developers">
          <div className="wrap landing-developer-grid">
            <div className="sec-head">
              <span className="sec-eyebrow">For builders, too</span>
              <h2 className="sec-title">
                Your agent. Your stack. The same news.
              </h2>
              <p className="sec-sub">
                Bring recent company and crypto news into your own agent with
                hosted MCP, REST or OpenAI-compatible tools.
              </p>
              <div className="landing-developer-links">
                <a href="/docs/connect">
                  Read the integration guide <ArrowRight size={14} />
                </a>
                <a href="https://github.com/thepeternemec/NewsBeat">
                  <GitBranch size={14} /> Open source on GitHub
                </a>
              </div>
            </div>
            <div className="landing-developer-console">
              <div className="code">
                <div className="code-bar">
                  MCP connection address{" "}
                  <CopyButton text={MCP_URL} label="Copy address" />
                </div>
                <pre>{MCP_URL}</pre>
              </div>
              <details className="landing-rest">
                <summary>
                  See a REST example <span aria-hidden="true">+</span>
                </summary>
                <div className="code">
                  <div className="code-bar">
                    A short Nvidia briefing{" "}
                    <CopyButton text={REST_EXAMPLE} label="Copy command" />
                  </div>
                  <pre>{REST_EXAMPLE}</pre>
                </div>
              </details>
              <p className="landing-caption">
                Public MCP and REST reads are free during early access. For a
                measured REST evaluation, <a href="/keys">start a seven-day key trial</a>
                {" "}with up to $6 in usage credit. Paid checkout is coming soon.
              </p>
            </div>
          </div>
        </section>

        <section className="scaffold" id="faq">
          <div className="wrap-tight">
            <div className="sec-head">
              <span className="sec-eyebrow">Before you start</span>
              <h2 className="sec-title">A few things worth knowing.</h2>
            </div>
            <div className="faq">
              {FAQ.filter((item) => [
                "Can I try NewsBeat before connecting an assistant?",
                "What does NewsBeat do?",
                "Do I need to know how to code?",
                "How do I connect it to my assistant?",
                "Is NewsBeat free?",
                "What is the seven-day API key trial?",
              ].includes(item.q)).map(
                (item) => (
                  <details key={item.q}>
                    <summary>{item.q}</summary>
                    <div className="a">{item.a}</div>
                  </details>
                ),
              )}
            </div>
            <p className="more">
              <a href="/faq">
                More questions? Read the full FAQ <ArrowRight size={13} />
              </a>
            </p>
          </div>
        </section>

        <section className="cta-section">
          <div className="wrap">
            <h2 className="cta-title">
              Your next question.
              <br />
              Now with the news.
            </h2>
            <p className="cta-sub">
              Connect NewsBeat to an assistant with custom MCP support. Ask about
              the companies and crypto you follow, whenever current news matters.
            </p>
            <div className="cta-row">
              <a className="btn-primary" href="/docs/quickstart">
                Connect NewsBeat <ArrowRight size={15} />
              </a>
              <a className="btn-ghost" href="/dashboard">
                Explore live news
              </a>
            </div>
            <p className="cta-tiny">
              Free public access · Optional seven-day REST trial · Open source
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
