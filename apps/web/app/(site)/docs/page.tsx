import { ArrowRight, Check, Code2, Play, Plug } from "lucide-react";
import CopyButton from "@/components/site/copy-button";
import DocsDeveloperStart from "@/components/site/docs-developer-start";

export const metadata = {
  title: "NewsBeat docs — Build on the news foundation",
  description: "Connect to stock and crypto news through MCP and REST. Copy working requests, discover 15 agent tools, and track changes with sources and freshness.",
};

const QUESTIONS = [
  { label: "Follow a company", text: "What is happening with Nvidia? Check NewsBeat for recent news." },
  { label: "Catch up on crypto", text: "Give me a short Bitcoin update, with the dates of the reports." },
  { label: "Research with context", text: "I’m researching Microsoft. Check the recent news before answering." },
  { label: "Keep the conversation going", text: "What changed with Apple since our last NewsBeat check?" },
];

export default function DocsOverview() {
  return (
    <div className="docs-overview">
      <header className="docs-head">
        <span className="sec-eyebrow">NEWSBEAT / DEVELOPER DOCS</span>
        <h1>Build on<br />the evidence.</h1>
        <p className="docs-lead">
          Connect your agent to NewsBeat’s current news foundation through MCP or REST. Discover an asset,
          retrieve the reporting, and track what changed. The six-asset intelligence pilot also adds market context and reasons to review, wait or reassess.
        </p>
        <div className="docs-free-note"><Check size={14} aria-hidden="true" /> Free public access <span>·</span> No account, key or card</div>
      </header>

      <div className="docs-callout"><strong>From reporting to meaningful signals.</strong><p>Explore a reported change, why it could matter and what your agent should check next. The pilot adds measured market checks while keeping detailed calculations optional. <a href="/intelligence">See a real signal.</a> <a href="/docs/intelligence">Understand the measurements.</a></p></div>

      <section className="docs-section" aria-labelledby="developer-quickstart">
        <h2 id="developer-quickstart">Your first request.</h2>
        <p>Try a public catalog lookup or add the remote MCP server to your client. 15 tools are available; news is collected on a fifteen-minute schedule.</p>
        <DocsDeveloperStart />
      </section>

      <section className="docs-section" aria-labelledby="choose-your-path">
        <h2 id="choose-your-path">Choose where to start</h2>
        <div className="docs-start-grid">
          <a className="docs-path-card" href="/docs/try">
            <span className="docs-path-icon"><Play size={20} aria-hidden="true" /></span>
            <span className="docs-path-label">SEE IT WORK</span>
            <h3>Try live news</h3>
            <p>Search a company, read the headlines and get a short update. Right in your browser.</p>
            <span className="docs-path-action">Make your first lookup <ArrowRight size={15} aria-hidden="true" /></span>
          </a>
          <a className="docs-path-card" href="/docs/quickstart">
            <span className="docs-path-icon"><Plug size={20} aria-hidden="true" /></span>
            <span className="docs-path-label">BRING IT INTO YOUR CHAT</span>
            <h3>Connect your agent</h3>
            <p>Add NewsBeat to an assistant that supports custom MCP connections. Then ask naturally.</p>
            <span className="docs-path-action">Follow the setup guide <ArrowRight size={15} aria-hidden="true" /></span>
          </a>
        </div>
        <a className="docs-developer-path" href="/docs/connect"><Code2 size={19} aria-hidden="true" /><span><strong>Building your own integration?</strong><span>Find the MCP endpoint, API tools and working requests.</span></span><ArrowRight size={16} aria-hidden="true" /></a>
      </section>

      <section className="docs-section" aria-labelledby="how-it-works">
        <h2 id="how-it-works">One question. Useful context.</h2>
        <ol className="docs-flow">
          <li><span>01</span><div><h3>You ask in your own words</h3><p>A company name is enough. Your agent finds the matching stock or crypto asset.</p></div></li>
          <li><span>02</span><div><h3>Your agent checks NewsBeat</h3><p>It retrieves headlines or a short headline-based summary, with publishers and dates.</p></div></li>
          <li><span>03</span><div><h3>The news becomes part of your answer</h3><p>Your agent explains what was reported and how fresh the coverage is. Follow up when you need more.</p></div></li>
        </ol>
        <div className="docs-callout"><strong>Let your agent know when to check.</strong><p>Add our <a href="/docs/quickstart#agent-instruction">ready-to-use instruction</a> so it can choose NewsBeat when recent developments matter. Your assistant controls tool access and may ask for permission.</p></div>
      </section>

      <section className="docs-section" aria-labelledby="questions-to-ask">
        <h2 id="questions-to-ask">Start a conversation</h2>
        <p>Once connected, try one of these in your assistant.</p>
        <div className="docs-prompt-grid">
          {QUESTIONS.map(question => <div className="docs-prompt-card" key={question.label}>
            <span>{question.label}</span><p>“{question.text}”</p><CopyButton text={question.text} label="Copy question" />
          </div>)}
        </div>
        <p className="docs-caption">For “since last time,” your agent needs to keep the previous check. If it has no saved context, it should start with the latest news.</p>
      </section>

      <section className="docs-section" aria-labelledby="what-to-expect">
        <h2 id="what-to-expect">Know what you’re getting</h2>
        <div className="docs-facts">
          <div><h3>Stock and crypto coverage</h3><p>The catalog includes 1,528 US-listed equities and 502 crypto assets. <a href="/docs/try">Search the live catalog</a> to check your company.</p></div>
          <div><h3>Headlines, with context</h3><p>NewsBeat uses English-language headline metadata. Summaries are based on headlines; full article text is not included.</p></div>
          <div><h3>A clear freshness signal</h3><p>Source checks are scheduled every fifteen minutes. Check times and publication dates help your agent explain when coverage is delayed.</p></div>
          <div><h3>News when you ask</h3><p>NewsBeat responds to lookups. Recurring briefings need scheduling in your assistant or workflow. Built-in alerts are still in development.</p></div>
        </div>
        <a className="docs-text-action" href="/docs/data">Understand coverage and freshness <ArrowRight size={14} aria-hidden="true" /></a>
      </section>

      <section className="docs-section" aria-labelledby="free-access">
        <h2 id="free-access">Start free. Explore at your pace.</h2>
        <p>The demo, public MCP connection and public REST reads are free during early access, with up to 120 requests a minute. No NewsBeat account, key or card is needed. Your assistant or model provider may charge separately.</p>
        <p>Testing a higher-volume workflow? An optional key provides a seven-day REST trial with up to $6 in usage credit and a limit of 1,200 requests per minute. It starts on your first metered REST request and ends when the time or credit runs out. The news coverage is the same.</p>
        <a className="docs-text-action" href="/docs/connect#access-and-limits">Read about access and limits <ArrowRight size={14} aria-hidden="true" /></a>
      </section>
    </div>
  );
}

