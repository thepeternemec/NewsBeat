export const metadata = { title: "Beats and clusters" };

export default function DocsData() {
  return (
    <>
      <div className="docs-head">
        <h1>Beats and clusters</h1>
        <p className="docs-lead">
          A beat is a saved topic. Its articles form that beat&rsquo;s cluster. There is no hidden
          story-merging underneath, and nothing is grouped on your behalf.
        </p>
      </div>

      <h2>What a beat is</h2>
      <p>
        A beat is a standing query with a stable ID. Two agents describing the same task resolve to
        the same beat, so cursors stay valid across runtimes.
      </p>
      <div className="code">
        <div className="code-bar">GET /v2/topics · one topic</div>
        <pre>{`{
  "beat_id": "b_7c4e91f0a2d3",
  "label": "Bitcoin",
  "concept_uris": ["http://en.wikipedia.org/wiki/Artificial_Intelligence_Act"],
  "topic_filters": [],
  "languages": ["eng"],
  "state": "warm",
  "refresh_interval_minutes": 60,
  "freshness_slo_minutes": 90
}`}</pre>
      </div>

      <h3>Warm and cold</h3>
      <p>
        A warm beat is precomputed, so a poll is a read. A cold beat computes on demand and is
        slower. The catalog states which is which, so you can route on it rather than guess.
      </p>

      <h2>What an article cluster is</h2>
      <p>
        Every English article that matches a beat lands in that beat&rsquo;s cluster: deduplicated
        by URL, ordered by publication time, and nothing else. We do not re-cluster the world, and we
        do not merge stories into events you did not ask for.
      </p>
      <ul>
        <li>One cluster per beat, addressed by the beat ID</li>
        <li>English only, so there is no translation drift in the stream</li>
        <li>Newest first, behind a cursor that never repeats and never skips</li>
        <li>Source breadth — how many distinct publishers are in the cluster — is the number worth watching</li>
      </ul>

      <h2>English only, on purpose</h2>
      <p>
        The API serves <code>lang: "eng"</code> and nothing else. A mixed-language stream
        forces a translation decision on every item and makes a token budget meaningless. The desk
        rail is where other languages belong.
      </p>

      <h2>Events, not coverage</h2>
      <p>
        A topic with 118 articles in a day is rarely 118 things happening. It is a handful of things
        reported 118 times. <code>GET /v2/stories?beat_id=</code> groups near-identical headlines and
        reports how many distinct publishers carried each, so one court ruling appears once with{" "}
        <code>source_count: 36</code> rather than thirty-six times.
      </p>
      <ul>
        <li>Grouping is token overlap, not a model — deterministic, free, and testable</li>
        <li>Ordered by <code>source_count</code>: the most corroborated story first</li>
        <li>
          The <code>lead</code> is a publisher&rsquo;s own headline, chosen because it was first.
          Nothing is rewritten
        </li>
        <li>
          It is a known limitation that an outcome word does not separate two stories —{" "}
          <em>&ldquo;launch succeeds&rdquo;</em> and <em>&ldquo;launch aborted&rdquo;</em> share every token
          but the verb. The threshold is set to prefer a missed merge over a false one, because a
          false merge loses a story
        </li>
      </ul>

      <h2>Lead time</h2>
      <p>
        Every item carries <code>first_indexed_at</code> next to <code>published_at</code>. The gap
        between them is our lead time, measured per article rather than claimed in a deck. Beats
        refresh on a 60-minute target with a 90-minute freshness SLO, and market beats are built to
        tighten to 5–15 minutes.
      </p>
      <p>
        We publish a comparison board against Exa, Tavily, Brave, Serper and Perplexity grounding.
        Until the harness ships it is illustrative, and it is labelled that way on the site rather
        than presented as a measurement.
      </p>

      <h2>Depth</h2>
      <p>
        The API keeps a hard 30-day window. It is not a smaller archive — it is a different
        product. If you need everything about a topic back to 2014, that is the desk rail, and it is
        read-only and public.
      </p>

      <div className="docs-nav-foot">
        <a href="/docs">← Overview</a>
        <a href="/docs/quickstart">Back to the quickstart →</a>
      </div>
    </>
  );
}
