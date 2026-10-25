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
import "./crypto-landing.css";

const DESCRIPTION = "Give your agent recent crypto headlines, short briefings and updates since its last check. Connect through MCP or API. Free public access, with company news available too.";
export const metadata = {
  title: "NewsBeat — The news edge for crypto agents",
  description: DESCRIPTION,
  openGraph: { title: "NewsBeat — The news edge for crypto agents", description: DESCRIPTION, url: "https://www.newsbeat.dev", siteName: "NewsBeat", type: "website" },
  twitter: { card: "summary_large_image", title: "NewsBeat — The news edge for crypto agents", description: DESCRIPTION },
};

const MCP_URL = "https://www.newsbeat.dev/api/mcp";
const REST_EXAMPLE =
  'curl -s "https://www.newsbeat.dev/api/v2/brief?beat_id=b_06c91290de1c"';
const STEPS = [
  {
    number: "01",
    icon: Plug,
    title: "Connect your agent",
    text: "Add NewsBeat to your assistant’s tools. Our setup guide walks you through the connection.",
  },
  {
    number: "02",
    icon: MessageSquare,
    title: "Ask in your own words",
    text: "“Catch me up on Bitcoin” or “What changed with Solana?” No tickers or special commands to remember.",
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
    title: "Brief me",
    text: "Short updates and grouped coverage help your assistant explain the main developments without repeating the same story.",
  },
  {
    icon: Clock3,
    title: "What changed?",
    text: "Ask what’s new since your last check. Your assistant can pick up from the previous update when it has saved that check.",
  },
  {
    icon: FileCheck,
    title: "Check the reporting",
    text: "Every headline includes its publisher, publication date and a link. Open the reporting and form your own view.",
  },
];
const QUESTIONS = [
  {
    label: "Catch up on Bitcoin",
    question:
      "Use NewsBeat to give me a short Bitcoin briefing, with sources and dates.",
  },
  {
    label: "Follow Ethereum",
    question:
      "Summarize the recent Ethereum coverage. Tell me how fresh the news is.",
  },
  {
    label: "Pick up where you left off",
    question:
      "What changed with Solana since our last NewsBeat check? If you have no saved check, start with the latest news.",
  },
];

export default function Home() {
  return (
    <>
      <SiteNav active="/" />
      <main className="landing-home crypto-home">
        <section className="hero" id="top">
          <div className="wrap landing-hero-grid">
            <div className="landing-hero-copy">
              <span className="landing-eyebrow">
                The news edge for crypto agents
              </span>
              <h1>
                <span>Know what changed.</span>
                <span>Bring context to<br />your next move.</span>
              </h1>
              <p className="lede">
                Give your agent recent crypto headlines, short briefings, and
                updates since its last check. Built for market research.
                Connected through MCP or API. Start free.
              </p>
              <div className="hero-cta">
                <a className="btn-primary" href="#research-desk">
                  Explore crypto news <ArrowRight size={15} />
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
              <a className="crypto-follow" href="https://x.com/newsbeat_" target="_blank" rel="noopener noreferrer">Follow the build on X <ArrowUpRight size={12} /></a>
            </div>
            <div className="crypto-research-desk" id="research-desk" tabIndex={-1}>
              <div className="crypto-desk-label"><span>NEWSBEAT / RESEARCH DESK</span><span>MCP + API</span></div>
              <NewsPreview cryptoFirst />
            </div>
          </div>
        </section>

        <section className="landing-proof" aria-label="NewsBeat at a glance">
          <div className="wrap">
            <div>
              <strong>500+</strong>
              <span>Supported crypto assets · company coverage also available</span>
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
              <span className="sec-eyebrow">Your research workflow</span>
              <h2 className="sec-title">From a question to a market briefing.</h2>
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
                Your news research toolkit
              </span>
              <h2 className="sec-title">Brief. Catch up. Check the story.</h2>
              <p className="sec-sub">
                Bring recent coverage into crypto research, market briefings and
                your next thesis. Keep the reporting behind each update close at hand.
              </p>
            </div>
            <div className="signal-workbench" aria-label="How NewsBeat turns recent coverage into an agent update">
              <div className="signal-stage">
                <span className="signal-label">01 / Recent coverage</span>
                <div className="signal-reports" aria-hidden="true">
                  <div><span>CRYPTO COVERAGE</span><i /><i /></div>
                  <div><span>COMPANY UPDATES</span><i /><i /></div>
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

        <section className="scaffold crypto-community" id="community">
          <div className="wrap crypto-community-grid">
            <div className="sec-head">
              <span className="sec-eyebrow">Building in the open</span>
              <h2 className="sec-title">Build your news edge with us.</h2>
              <p className="sec-sub">For people researching crypto and builders giving agents better context. Try the product, share your workflow, and help shape what comes next.</p>
              <div className="crypto-community-links">
                <a className="btn-primary" href="https://x.com/newsbeat_" target="_blank" rel="noopener noreferrer">Follow NewsBeat on X <ArrowUpRight size={15} /></a>
                <a href="https://github.com/thepeternemec/NewsBeat/commits/main" target="_blank" rel="noopener noreferrer">See what shipped <ArrowUpRight size={14} /></a>
              </div>
            </div>
            <div className="crypto-roadmap" aria-label="Product direction">
              <div><span className="crypto-phase">AVAILABLE TODAY</span><h3>News your agent can use.</h3><p>Live lookups, headline summaries, grouped coverage and follow-up checks through MCP and REST.</p></div>
              <div><span className="crypto-phase crypto-phase-future">EXPLORING NEXT</span><h3>Closer to your workflow.</h3><p>Broader coverage and delivery into messaging tools. These are development directions; availability and timing are not confirmed.</p><a href="mailto:contact@newsbeat.dev">Tell us what you need <ArrowRight size={13} /></a></div>
            </div>
          </div>
        </section>

        <section className="scaffold" id="questions">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">
                Start with what you want to know
              </span>
              <h2 className="sec-title">Start with the assets you follow.</h2>
              <p className="sec-sub">
                Once connected, copy a question into your agent or ask in your own words.
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
                    A short Bitcoin briefing{" "}
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
              Your agent.
              <br />
              Now with market context.
            </h2>
            <p className="cta-sub">
              Connect NewsBeat to an assistant with custom MCP support. Ask about
              the crypto assets and companies you follow, whenever current news matters.
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
