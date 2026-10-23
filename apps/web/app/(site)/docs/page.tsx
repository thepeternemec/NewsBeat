export const metadata = {
  title: "How NewsBeat works",
  description: "Ask your AI assistant what is happening with a company. Learn how NewsBeat brings recent news and sources into the conversation.",
};

export default function DocsOverview() {
  return (
    <>
      <div className="docs-head">
        <span className="sec-eyebrow">The NewsBeat guide</span>
        <h1>Ask your agent what’s happening.</h1>
        <p className="docs-lead">
          NewsBeat brings recent company and crypto news into the AI assistant you already use.
          Connect it once, then ask in your own words.
        </p>
      </div>

      <h2>Start with a question</h2>
      <ul className="question-grid">
        <li>“What is happening with Nvidia?”</li>
        <li>“Give me three recent headlines about Apple, with sources.”</li>
        <li>“I’m researching Microsoft. Check recent news before answering.”</li>
        <li>“What changed with Bitcoin since our last check?”</li>
      </ul>
      <p>
        Your agent finds the company or asset, looks up its news, and uses the results in its answer.
        You do not need to know a ticker, write code or handle the data yourself.
      </p>
      <p><a href="/docs/quickstart">Connect your assistant and ask your first question →</a></p>

      <h2>News when the answer needs it</h2>
      <p>
        You should not have to remember to ask for a news lookup every time. A connected agent can
        choose NewsBeat when recent developments matter to the task—for example, while researching
        a company or preparing a market briefing.
      </p>
      <p>
        Our <a href="/docs/quickstart#agent-instruction">suggested instruction</a> tells your
        assistant when to check. The assistant decides which tools to call and may ask for permission.
        NewsBeat cannot enable a connection or change those settings for you.
      </p>

      <h2>What happens behind your question?</h2>
      <ul>
        <li><strong>You ask.</strong> Use a company name, ticker or supported crypto asset.</li>
        <li><strong>Your agent checks.</strong> NewsBeat returns headlines, dates, publishers and links.</li>
        <li><strong>You get context.</strong> Your agent explains what it found and points you to the reporting.</li>
        <li><strong>You can follow up.</strong> If your agent saves the previous check, it can ask for only the new items next time.</li>
      </ul>
      <p>
        NewsBeat provides the news material; your assistant writes the response. Full article text
        is not included, so the assistant should avoid adding details the headlines do not support.
      </p>

      <h2>Try it for free</h2>
      <p>
        Public reads are free during early access. No NewsBeat account, API key or credit card is
        required. Your assistant may charge for its own service, and request limits apply.
        If you build a REST workflow for your own agent, an optional key includes
        seven days and up to $6 in usage credit. Its clock starts on the first
        metered REST request; the public MCP connection needs no key.
      </p>
      <p>
        Not ready to connect an assistant? <a href="/dashboard">Explore the news terminal</a> in
        your browser. Search for a company and open its headlines directly.
      </p>

      <h2>What is available today?</h2>
      <p>
        The catalog contains 1,528 US-listed equities and 502 crypto assets. Coverage is
        English-language and source checks are scheduled every fifteen minutes. Some topics
        may be delayed; your agent should report when the news was last checked.
      </p>
      <p>
        NewsBeat answers requests as they arrive. Background monitoring needs a scheduler in your
        assistant or workflow. Dedicated alerts, broader news search and ready-to-use messaging
        integrations are still in development.
      </p>

      <h2>Choose your next step</h2>
      <ul>
        <li><a href="/docs/quickstart">Use it with your assistant</a> — setup, example questions and a reusable instruction.</li>
        <li><a href="/docs/data">Understand the news</a> — coverage, sources and what “nothing new” means.</li>
        <li><a href="/faq">Read the FAQ</a> — common questions in plain language.</li>
        <li><a href="/docs/connect">Build an integration</a> — MCP, API requests and technical details.</li>
      </ul>
      <div className="docs-nav-foot">
        <span />
        <a href="/docs/quickstart">Use it with your assistant →</a>
      </div>
    </>
  );
}
