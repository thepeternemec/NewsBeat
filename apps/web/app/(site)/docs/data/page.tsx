export const metadata = { title: "Understand the news", description: "Learn what Black Sheep covers, where headlines come from, and how to interpret freshness and follow-up updates." };

export default function DocsData() {
  return (
    <>
      <div className="docs-head">
        <span className="sec-eyebrow">Coverage &amp; freshness</span>
        <h1>Understand the news.</h1>
        <p className="docs-lead">
          A useful news answer should tell you what was reported, who reported it, and how recent
          the information is. Here is what Black Sheep gives your agent.
        </p>
      </div>

      <h2 id="which-companies-can-i-ask-about">Which companies can I ask about?</h2>
      <p>
        Black Sheep currently supports 1,528 US-listed equities and 502 crypto assets. Search by
        company name or ticker. A ticker is a short market symbol, such as NVDA for Nvidia.
      </p>
      <p>
        A “topic” or “beat” means one supported company or crypto asset. Some names and tickers
        overlap, so your agent should confirm it found the right asset. If there is no match,
        it should say the company is not covered. General news search and broader coverage are in development.
      </p>
      <p><a href="/docs/try">Search the live catalog for free</a> to see whether your asset is supported and what coverage is available.</p>

      <h2 id="where-does-the-news-come-from">Where does the news come from?</h2>
      <p>
        Black Sheep collects English-language headline metadata through Google News RSS. Each item
        carries a headline, publisher, publication time and a link that leads to the reporting.
        Current links may redirect through Google News.
      </p>
      <p>
        Black Sheep does not include the full article. Your assistant can explain the headlines it
        receives, but it should not claim to have read the complete reporting. Open the sources
        for detail; publisher subscriptions may apply.
      </p>

      <h2 id="how-fresh-is-latest">How fresh is “latest”?</h2>
      <p>
        Source checks are scheduled every fifteen minutes. A check may be delayed or fail, and
        some companies receive little coverage. Black Sheep reports the time of the last successful
        check alongside the news. This is different from the time a publisher released an article.
      </p>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Status</th><th>What it means for your answer</th></tr></thead>
          <tbody>
            <tr><td>Fresh</td><td>A source check succeeded recently. The headlines themselves may be older.</td></tr>
            <tr><td>Stale</td><td>The last successful check is older than expected. Treat the coverage as potentially out of date.</td></tr>
            <tr><td>Unavailable</td><td>No successful coverage check is available. The agent should explain the gap.</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="what-does-nothing-new-mean">What does “nothing new” mean?</h2>
      <p>
        It means no new items were found in the window checked. It does not prove that nothing
        happened. Your agent should distinguish quiet coverage from a delayed or unavailable source.
      </p>

      <h2 id="how-does-since-last-time-work">How does “since last time” work?</h2>
      <p>
        Think of it as a bookmark. After reading the news, your agent can save where it stopped.
        On the next check, Black Sheep uses that bookmark to return newly indexed items. Developers
        call the bookmark a <code>cursor</code>; you do not need to handle it yourself.
      </p>
      <p>
        The bookmark belongs to one asset and expires after thirty days. If your assistant loses
        it, switches to another chat without saved context, or waits too long, it needs a new
        starting point. It should tell you when it cannot reconstruct the full gap.
      </p>

      <h2 id="why-are-similar-headlines-grouped">Why are similar headlines grouped?</h2>
      <p>
        In the terminal, select an asset and choose “Summarize headlines” for a short answer to
        what the recent headlines report. Each point links to its publishers. When an automatic
        summary is unavailable, Black Sheep shows original headlines and labels the result. These
        sentences only reflect headlines, so open the reports for the full context.
      </p>
      <p>
        Several publishers may cover the same development. The feed shows one original headline
        for similar reports, with a “view sources” link underneath. Open it to see each report’s
        headline, publisher, publication time and link. No reporting is deleted.
      </p>
      <p>
        Grouping uses headline similarity within a 24-hour window. It keeps obvious differences
        in figures, outcomes and uncertainty separate, but it is approximate and can still miss
        a match or group unrelated reporting. A publisher count describes coverage, not proof.
        The feed reads up to 200 recent reports per asset; it is not a complete archive.
      </p>

      <h2 id="can-i-ask-for-older-news">Can I ask for older news?</h2>
      <p>
        The API has a thirty-day window for available indexed articles. It is not a complete
        historical archive, and coverage within that window varies by asset. The latest-news view
        starts with recent items; older pages are available through the API’s history controls.
      </p>

      <h2 id="what-should-a-good-answer-include">What should a good answer include?</h2>
      <ul>
        <li>The correct company or crypto asset.</li>
        <li>The reported headlines or a cautious explanation grounded in them.</li>
        <li>Publisher names, dates and links you can open.</li>
        <li>A clear note when coverage is stale, missing or too limited to answer the question.</li>
      </ul>
    </>
  );
}
