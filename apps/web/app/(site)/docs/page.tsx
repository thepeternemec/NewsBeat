export const metadata = {
  title: "How NewsBeat works",
  description: "Try live company news for free, connect your assistant, or build with the API. Start with a question and follow the sources.",
};

export default function DocsOverview() {
  return (
    <>
      <div className="docs-head">
        <span className="sec-eyebrow">The NewsBeat guide</span>
        <h1>Start with the news you need.</h1>
        <p className="docs-lead">
          Try a real company or crypto lookup in your browser. Then connect NewsBeat to your
          assistant so it can check the news when your question needs it.
        </p>
      </div>

      <h2>Try it in a minute</h2>
      <p>
        Open the <a href="/docs/try">free live demo</a>, search by company name or ticker,
        and select a match. You will see three recent headlines with publisher links and dates.
        Choose <strong>Summarize what happened</strong> to request a short headline-based update.
        No NewsBeat sign-in, key or card is needed.
      </p>
      <p>
        This is a real read from the public API. The demo checks NewsBeat’s news data; connecting
        an assistant is a separate step. If your assistant has no custom MCP setting, you can
        still use the demo or the <a href="/dashboard">news terminal</a>.
      </p>
      <p><a href="/docs/try">Try NewsBeat for free →</a></p>

      <h2>Ask your assistant</h2>
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
        The browser demo, public MCP connection and REST reads are free during early access.
        They need no NewsBeat account, API key or card and allow up to 120 requests a minute.
        Your assistant or model provider may charge separately.
      </p>
      <p>
        An optional key gives developers a seven-day metered REST evaluation with up to $6 in
        credit and a higher request limit. The clock starts on the first metered REST request.
        The key unlocks no additional news; public access stays free without it.
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
        <li><a href="/docs/try">Try a live lookup</a> — search, read and summarize news in the browser.</li>
        <li><a href="/docs/quickstart">Use it with your assistant</a> — setup, example questions and a reusable instruction.</li>
        <li><a href="/docs/data">Understand the news</a> — coverage, sources and what “nothing new” means.</li>
        <li><a href="/faq">Read the FAQ</a> — common questions in plain language.</li>
        <li><a href="/docs/connect">Build an integration</a> — MCP, API requests and technical details.</li>
      </ul>
      <div className="docs-nav-foot">
        <span />
        <a href="/docs/try">Try a live lookup →</a>
      </div>
    </>
  );
}
