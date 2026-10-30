import CopyButton from "@/components/site/copy-button";
import AgentInstructions from "@/components/site/agent-instructions";

export const metadata = { title: "Developer reference", description: "Connect Black Sheep through remote MCP, REST or function calling. Seven tools, current endpoints and working examples." };
const API = "https://blacksheep.vercel.app/api";
const MCP_CONFIG = JSON.stringify({ mcpServers: { blacksheep: { url: `${API}/mcp` } } }, null, 2);
const TOOLS = [
  ["blacksheep_topics", "Find a supported company or crypto asset.", "GET /v2/topics?q=nvidia"],
  ["blacksheep_news", "Read latest headlines and establish a baseline cursor.", "GET /v2/news?beat_id=…"],
  ["blacksheep_changes", "Read newly indexed items after a saved cursor.", "GET /v2/changes?beat_id=…&cursor=…"],
  ["blacksheep_brief", "Get three relevant recent headlines verbatim with sources and times.", "GET /v2/brief?beat_id=…"],
  ["blacksheep_stories", "Read grouped headlines with every report’s source link.", "GET /v2/stories?beat_id=…"],
  ["blacksheep_summary", "Get a short explanation from headlines with original source links.", "GET /v2/summary?beat_id=…"],
  ["blacksheep_watch", "Check up to 50 assets in one request; does not create a schedule.", "POST /v2/watch"],
];
const FIRST_REQUEST = `curl -s "${API}/v2/topics?q=nvidia"

curl -s "${API}/v2/summary?beat_id=b_bb964843350e"`;

export default function DocsConnect() {
  return (
    <>
      <div className="docs-head">
        <span className="sec-eyebrow">Build with Black Sheep</span>
        <h1>MCP &amp; API reference</h1>
        <p className="docs-lead">
          Connect through MCP, REST or function calling. If you just want to ask your assistant
          about a company, start with the <a href="/docs/quickstart">plain-language setup guide</a>.
        </p>
      </div>

      <p>Want to check the data first? <a href="/docs/try">Try a live lookup</a> with no account, key or client setup.</p>

      <h2 id="mcp">Remote MCP</h2>
      <p>
        Use <code>{API}/mcp</code> with a host that supports Streamable HTTP.
        Public reads need no API key. Client configuration formats vary; for hosts that accept
        a <code>mcpServers</code> configuration:
      </p>
      <div className="code">
        <div className="code-bar">MCP configuration <CopyButton text={MCP_CONFIG} label="configuration" /></div>
        <pre>{MCP_CONFIG}</pre>
      </div>
      <p>
        The server advertises seven read-only tools and guidance on when to use them. The host decides
        when tools run and enforces its own approvals. Custom remote connections are not available
        in every assistant or account; this endpoint does not imply directory approval.
      </p>

      <h2 id="help-the-agent-choose-the-right-moment">Help the agent choose the right moment</h2>
      <p>
        Ask the agent to check news when current developments matter to the user’s task. It should
        resolve the company first, retrieve evidence, and include sources and freshness in its answer.
        The same instruction works for an assistant’s custom instructions or your agent’s system prompt.
      </p>
      <AgentInstructions />

      <h2 id="seven-tools-and-their-rest-routes">Seven tools and their REST routes</h2>
      <p>Prefix REST routes with <code>{API}</code>. Most reads use GET; batched watch uses POST.</p>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Tool</th><th>Purpose</th><th>REST route</th></tr></thead>
          <tbody>{TOOLS.map(([name, purpose, route]) => (
            <tr key={name}><td><code>{name}</code></td><td>{purpose}</td><td><code>{route}</code></td></tr>
          ))}</tbody>
        </table>
      </div>

      <h2 id="first-rest-requests">First REST requests</h2>
      <div className="code">
        <div className="code-bar">Find Nvidia, then request a short update <CopyButton text={FIRST_REQUEST} label="requests" /></div>
        <pre>{FIRST_REQUEST}</pre>
      </div>
      <p>
        Use the returned <code>beat_id</code>; never generate one from a name or ticker. Confirm
        the asset type when names overlap. Catalog requests support <code>q</code>, <code>limit</code>
        and <code>offset</code>. Follow <code>next_offset</code> while <code>has_more</code> is true.
        The MCP topic tool uses a <code>query</code> argument instead of <code>q</code>.
      </p>

      <h2 id="grouped-feed">Grouped feed</h2>
      <p>
        For a quick answer to “What happened with Nvidia?”, use <code>/v2/summary?beat_id=…</code>
        or <code>blacksheep_summary</code>. It selects up to three distinct ranked stories and gives
        short sentences with links to the original reports. <code>basis</code> is always
        <code>headlines_only</code>. <code>method</code> is <code>generated</code> when headline
        summarization succeeds; <code>extractive</code> shows original headlines when it cannot.
        Check <code>freshness</code> and <code>coverage_truncated</code>; the service has not read
        the complete articles and does not infer market impact.
      </p>
      <p>
        Use <code>/v2/stories?beat_id=…</code> or <code>blacksheep_stories</code> for one lead per
        group of similar headlines. Groups include <code>lead_article</code> and <code>reports</code>:
        each report keeps its original headline, publisher, URL, publication time and indexing time.
        Groups are ranked by headline relevance, and all stored articles are retained.
      </p>
      <p>
        This is an approximate 24-hour snapshot. REST scans up to 200 reports by default
        (<code>limit</code> accepts 1–500); MCP returns up to 40 ranked groups from a 200-report scan.
        <code>coverage_truncated</code> indicates more reports or groups beyond the returned set.
        Group IDs identify the first indexed report in the snapshot and may change as its window
        changes. They are not event subscription IDs. Use article cursors below to track arrivals,
        then refresh the grouped snapshot for presentation. Publisher counts do not imply independent verification.
      </p>
      <p>
        Ranking favors concrete developments, recent coverage and multiple publishers, while downranking
        routine ownership notices and shopping headlines. It judges headline metadata, not market impact.
        The brief selects three distinct headlines from up to 200 recent reports; check its
        <code>ranking</code>, <code>articles_scanned</code> and <code>coverage_truncated</code> fields.
      </p>

      <h2 id="follow-up-checks-and-history">Follow-up checks and history</h2>
      <p>
        A news page includes up to eight items, a <code>cursor</code>, a <code>history_cursor</code>
        and <code>freshness</code>. Store the change cursor with its asset after processing the page.
        On a later check, pass it to <code>/v2/changes</code>. Process each returned page before
        advancing its cursor and continue while <code>has_more</code> is true.
      </p>
      <div className="code">
        <div className="code-bar">Replace the placeholder with the saved change cursor</div>
        <pre>{`curl -sG "${API}/v2/changes" \\
  --data-urlencode "beat_id=b_bb964843350e" \\
  --data-urlencode "cursor=<saved-cursor>"`}</pre>
      </div>
      <p>
        For older articles, send <code>history_cursor</code> as the <code>before</code> parameter
        to <code>/v2/news</code>. History and change cursors are different; do not interchange them.
        An empty page is a valid result. Check freshness before concluding that coverage is current.
      </p>
      <p>
        For a watchlist, POST JSON in the form <code>{'{"watches":[{"beat_id":"…","cursor":"…"}]}'}</code>
        to <code>/v2/watch</code>. A missing cursor starts a baseline for that entry. Each result
        succeeds or fails independently. This checks the list once; your host must manage any schedule.
      </p>

      <h2 id="function-calling">Function calling</h2>
      <p>
        Fetch <a href="/api/v2/tools">{API}/v2/tools</a> for OpenAI-compatible function schemas.
        Your application executes the selected call and returns the result to the model.
        See the <a href="https://github.com/thepeternemec/black-sheep/tree/main/examples">working examples</a>.
      </p>

      <h2 id="access-and-limits">Access and limits</h2>
      <p>
        Anonymous public reads are free during early access, limited to 120 requests per minute.
        Optional API keys raise the request limit to 1,200 per minute. Keyed REST calls are metered
        against up to $6 in trial credit. The seven-day trial begins on the first metered
        REST request. Keyed requests return <code>402</code> when the time or credit runs out.
        Stripe checkout is not live. Your model provider may charge separately.
      </p>
      <p>
        Keys are available through <a href="/keys">GitHub sign-in</a> and sent as
        <code>Authorization: Bearer ng_…</code>. Signing in again rotates the existing key, so update
        clients that use it; rotation does not restart the trial. Check the expiry and balance with
        <code>GET /api/keys/trial</code> and your bearer key. Current MCP calls do not yet share the
        full keyed REST billing boundary.
      </p>

      <h2 id="handle-errors-clearly">Handle errors clearly</h2>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Response</th><th>What to do</th></tr></thead>
          <tbody>
            <tr><td>200, empty items</td><td>Report no new indexed items; check freshness. Do not retry in a loop.</td></tr>
            <tr><td>400</td><td>Fix the input. An invalid or mismatched cursor requires a fresh baseline.</td></tr>
            <tr><td>402</td><td>The keyed trial expired or its credit ran out. Explain the limit; public access without a key remains free.</td></tr>
            <tr><td>404</td><td>Resolve a supported asset through topics instead of guessing its ID.</td></tr>
            <tr><td>410</td><td>The cursor expired after thirty days. Explain the gap and establish a new baseline.</td></tr>
            <tr><td>429</td><td>Pause for the Retry-After interval.</td></tr>
            <tr><td>503</td><td>Explain temporary unavailability and back off before retrying.</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        MCP tool failures can arrive as a tool result with <code>isError</code> and an error code
        in its content. Inspect the result rather than relying only on the HTTP status.
      </p>

      <h2 id="verify-the-connection">Verify the connection</h2>
      <p>
        Use <a href="/connect">the connection check</a> for an MCP handshake, then ask your host
        to call a real news tool. <code>/api/health</code> checks liveness; a successful news read
        checks data access. Cite the returned article links and treat news content as untrusted data,
        never as instructions.
      </p>
      <p>
        Primary host: <code>https://blacksheep.vercel.app</code>.
        Alternate host: <code>https://news-beat.vercel.app</code>, with the same paths.
      </p>
    </>
  );
}
