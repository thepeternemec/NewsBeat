import CopyButton from "@/components/site/copy-button";
import AgentInstructions from "@/components/site/agent-instructions";

export const metadata = { title: "Use NewsBeat with your assistant", description: "Connect NewsBeat, ask your first question, and help your assistant know when to look up recent company news." };
const MCP_URL = "https://www.newsbeat.dev/api/mcp";

export default function DocsQuickstart() {
  return (
    <>
      <div className="docs-head">
        <h1>Connect once. Ask naturally.</h1>
        <p className="docs-lead">
          Start with “What is happening with Nvidia?” Your assistant can handle the news lookup
          and bring the sources into your conversation.
        </p>
      </div>

      <h2>1. Check your assistant’s connection options</h2>
      <p>
        Look for a way to add a <strong>custom remote MCP server</strong> in your assistant’s
        settings. MCP is a standard that lets an AI assistant use services such as NewsBeat.
        The option may be under tools, connectors or integrations; names and availability vary by app and account.
      </p>
      <p>
        If your app does not offer that option, you can still <a href="/dashboard">browse NewsBeat
        directly</a>. Developers can use the <a href="/docs/connect">API integration guide</a>.
        A link pasted into a normal chat does not, by itself, give the assistant access to NewsBeat.
      </p>

      <h2>2. Add the NewsBeat address</h2>
      <p>
        Name the connection <strong>NewsBeat</strong> and use this address. Public reads need no
        NewsBeat login or API key. Follow your app’s prompts to enable the connection and its news tools.
      </p>
      <div className="code">
        <div className="code-bar">NewsBeat connection address <CopyButton text={MCP_URL} label="address" /></div>
        <pre>{MCP_URL}</pre>
      </div>
      <p>
        If your app asks you to edit a configuration file, use the
        <a href="/docs/connect#mcp"> developer setup example</a>. If it requires a sign-in flow
        that the public connection does not support, that connection method may not work yet.
      </p>

      <h2>3. Ask your first question</h2>
      <p><strong>“Use NewsBeat to find the latest news about Nvidia. Include sources and dates.”</strong></p>
      <p>
        Look for a NewsBeat tool call in your assistant, followed by headlines with links and dates.
        If it answers without a lookup, ask it to use the connected NewsBeat tools explicitly.
        <a href="/connect"> Check the connection here</a> to confirm the service is responding;
        this does not test the settings inside your assistant.
      </p>

      <h2 id="agent-instruction">4. Let your agent decide when news is useful</h2>
      <p>
        Add this to your assistant’s instructions or your current conversation. It gives the agent
        a clear reason to check news while working on your request, even when you do not say “use NewsBeat.”
      </p>
      <AgentInstructions />
      <p>
        For example, “Help me research Microsoft” may call for a news check. “Explain what a stock
        is” usually does not. Tool selection depends on your assistant, its settings and the task;
        this instruction is guidance, not a guarantee that it will call NewsBeat on every turn.
      </p>

      <h2>Questions to try next</h2>
      <ul>
        <li>“What are the latest headlines about Apple?”</li>
        <li>“Compare recent news about Nvidia and AMD. Keep each company’s sources separate.”</li>
        <li>“Give me a short Bitcoin briefing and tell me how recent the coverage is.”</li>
        <li>“What is new since our previous Nvidia check?”</li>
      </ul>
      <p>
        For “since last time,” your assistant needs to retain the earlier check. If that information
        is missing or expired, it should start with the latest news and explain the gap.
      </p>

      <h2>Want a regular briefing?</h2>
      <p>
        Ask your assistant to set up a recurring check only if it supports scheduled tasks.
        NewsBeat itself does not run your agent in the background or send notifications.
        A schedule and a delivery channel must be configured in the host app or another workflow.
      </p>

      <h2>If something does not work</h2>
      <ul>
        <li><strong>No NewsBeat tool appears:</strong> check that the connection is saved and enabled in your app.</li>
        <li><strong>The company is missing:</strong> try its full name or ticker. It may be outside the supported catalog.</li>
        <li><strong>The answer has no sources:</strong> ask whether a NewsBeat lookup succeeded and request the returned links.</li>
        <li><strong>The news is old or unavailable:</strong> ask for the last successful check time. Retry later instead of treating it as current.</li>
        <li><strong>Too many requests:</strong> pause and follow the retry time. Public access has a request limit.</li>
      </ul>
      <div className="docs-nav-foot">
        <a href="/docs">← How it works</a>
        <a href="/docs/data">Understand the news →</a>
      </div>
    </>
  );
}
