import { ArrowDown, ArrowRight, ArrowUpRight, CalendarClock, Check, CircleHelp, Link2, MessageSquare, Plug, Sparkles } from "lucide-react";
import CopyButton from "@/components/site/copy-button";
import AgentInstructions from "@/components/site/agent-instructions";
import "./quickstart.css";

export const metadata = { title: "Use NewsBeat with your assistant", description: "Connect NewsBeat in three steps. Add the connection address, ask a news question, and get sources and dates in your assistant." };
const MCP_URL = "https://www.newsbeat.dev/api/mcp";
const FIRST_QUESTION = "Use NewsBeat to find the latest news about Nvidia. Include sources and dates.";
const questions = [
  { label: "Follow a company", text: "What are the latest headlines about Apple?" },
  { label: "Compare the coverage", text: "Compare recent news about Nvidia and AMD. Keep each company’s sources separate." },
  { label: "Get a quick briefing", text: "Give me a short Bitcoin briefing and tell me how recent the coverage is." },
  { label: "Pick up where you left off", text: "What is new since our previous Nvidia check?" },
];
const help = [
  { question: "I can’t find a place to add NewsBeat", answer: <>Look in your assistant’s tools, connectors or integrations settings for a custom remote MCP connection. Availability varies by app and account. If your app does not support it, <a href="/docs/try">try a live lookup in your browser</a> or use the <a href="/docs/connect">developer integration guide</a>. Pasting the address into a chat does not enable the tools.</> },
  { question: "My assistant isn’t using the connection", answer: <>Check that NewsBeat is saved and enabled, including its news tools. Then ask it to “use NewsBeat” explicitly. You can <a href="/connect">check that the service is responding</a> here; this checks NewsBeat, rather than the settings inside your assistant. If your app requires a sign-in flow that the public connection does not support, that connection method may not work yet.</> },
  { question: "The company or its news is missing", answer: <>Try the company’s full name or ticker. It may be outside the supported catalog. If news is old or unavailable, ask for the last successful check time and retry later. If you hit the public request limit, pause and follow the retry time.</> },
  { question: "The answer doesn’t include sources", answer: <>Ask whether the NewsBeat lookup succeeded, then request the links, publishers and dates returned by the tool. NewsBeat provides headlines and source links, so the answer should stay within what those headlines support.</> },
];

export default function DocsQuickstart() {
  return (
    <div className="quickstart-guide">
      <header className="docs-head quickstart-head">
        <div className="quickstart-eyebrow"><span>QUICKSTART</span><span>Free public access</span></div>
        <h1>Connect once.<br /><span>Ask naturally.</span></h1>
        <p className="docs-lead">The next time you ask “What is happening with Nvidia?”, let your assistant bring the news, sources and dates into the conversation.</p>
        <div className="quickstart-assurances"><span><Check size={13} /> No NewsBeat account</span><span><Check size={13} /> No API key</span></div>
      </header>

      <div className="quickstart-try">
        <div><strong>Want to see the answer first?</strong><span>Search a company and request a headline summary in the browser. It takes no setup.</span></div>
        <a href="/docs/try">Try NewsBeat free <ArrowUpRight size={14} /></a>
      </div>

      <nav className="quickstart-route" aria-label="Setup steps">
        <a href="#choose-assistant"><span>01</span> Choose your assistant <ArrowRight size={14} /></a>
        <a href="#add-newsbeat"><span>02</span> Add NewsBeat <ArrowRight size={14} /></a>
        <a href="#first-question"><span>03</span> Ask a question <ArrowDown size={14} /></a>
      </nav>

      <div className="quickstart-steps">
        <section className="quickstart-step" aria-labelledby="choose-assistant">
          <div className="quickstart-step-heading"><span className="quickstart-number">01</span><div><span className="quickstart-kicker">START IN YOUR ASSISTANT</span><h2 id="choose-assistant">Choose your assistant.</h2></div><Plug className="quickstart-step-icon" size={22} /></div>
          <div className="quickstart-step-body">
            <p>Open your assistant’s settings and look for <strong>tools, connectors or integrations</strong>. You need an option to add a custom remote MCP server.</p>
            <div className="quickstart-note"><CircleHelp size={16} /><p><strong>What is MCP?</strong> A standard way for an AI assistant to use a service like NewsBeat. Support depends on your app and account.</p></div>
            <a className="quickstart-text-link" href="/docs/try">No connector option? Try a company lookup in your browser <ArrowUpRight size={14} /></a>
          </div>
        </section>

        <section className="quickstart-step quickstart-connection" aria-labelledby="add-newsbeat">
          <div className="quickstart-step-heading"><span className="quickstart-number">02</span><div><span className="quickstart-kicker">ONE ADDRESS. YOUR NEWS CONNECTION.</span><h2 id="add-newsbeat">Add the NewsBeat address.</h2></div><Link2 className="quickstart-step-icon" size={22} /></div>
          <div className="quickstart-step-body">
            <p>Add a new connection named <strong>NewsBeat</strong>. Paste this address, then follow your app’s prompts to enable its news tools.</p>
            <div className="quickstart-endpoint">
              <div className="quickstart-endpoint-top"><span>REMOTE MCP ADDRESS</span><CopyButton text={MCP_URL} label="Copy address" /></div>
              <code>{MCP_URL}</code>
              <dl><div><dt>Connection name</dt><dd>NewsBeat</dd></div><div><dt>Authentication</dt><dd>No API key needed</dd></div></dl>
            </div>
            <a className="quickstart-text-link" href="/docs/connect#mcp">Need a configuration file? Open developer setup <ArrowUpRight size={14} /></a>
          </div>
        </section>

        <section className="quickstart-step" aria-labelledby="first-question">
          <div className="quickstart-step-heading"><span className="quickstart-number">03</span><div><span className="quickstart-kicker">BACK TO THE CONVERSATION</span><h2 id="first-question">Ask what’s happening.</h2></div><MessageSquare className="quickstart-step-icon" size={22} /></div>
          <div className="quickstart-step-body">
            <p>Try this in your chat to make your first lookup explicit.</p>
            <div className="quickstart-prompt"><div><span>YOUR FIRST QUESTION</span><CopyButton text={FIRST_QUESTION} label="Copy question" /></div><p>“{FIRST_QUESTION}”</p></div>
            <div className="quickstart-answer"><span>WHAT TO LOOK FOR</span><div><span><Check size={14} /> A NewsBeat tool call</span><span><Check size={14} /> Source links</span><span><Check size={14} /> Dates &amp; freshness</span></div></div>
            <p className="quickstart-small">If the assistant answers from memory, ask it to use the connected NewsBeat tools.</p>
          </div>
        </section>
      </div>

      <section className="quickstart-autopilot" aria-labelledby="agent-instruction">
        <div className="quickstart-section-label"><Sparkles size={16} /><span>MAKE IT FEEL NATURAL</span></div>
        <h2 id="agent-instruction">You shouldn’t have to say “check the news.”</h2>
        <p>Add a preference to your assistant’s instructions or the current chat so it knows when a news lookup would help.</p>
        <details className="quickstart-instruction"><summary>Copy a ready-to-use instruction <span aria-hidden="true">+</span></summary><div><AgentInstructions /><p>“Help me research Microsoft” may need recent news. “Explain what a stock is” usually does not. Your assistant decides when to use tools based on its settings and the task.</p></div></details>
      </section>

      <section className="quickstart-explore" aria-labelledby="questions-to-try">
        <div className="quickstart-section-label"><MessageSquare size={16} /><span>YOUR NEXT CONVERSATION</span></div>
        <h2 id="questions-to-try">Start with a better question.</h2>
        <div className="quickstart-question-grid">{questions.map(question => <div className="quickstart-question" key={question.label}><span>{question.label}</span><p>“{question.text}”</p><CopyButton text={question.text} label="Copy prompt" /></div>)}</div>
        <p className="quickstart-small">For “since last time,” your assistant needs to retain the earlier check. If it cannot, it should start with the latest news and explain the gap.</p>
        <div className="quickstart-schedule"><CalendarClock size={20} /><div><h3>Make it a regular briefing.</h3><p>If your assistant supports scheduled tasks, ask it to set up a recurring check. The host app or another workflow handles the schedule and delivery; NewsBeat does not send notifications itself.</p></div></div>
      </section>

      <section className="quickstart-help" aria-labelledby="setup-help">
        <div className="quickstart-section-label"><CircleHelp size={16} /><span>A LITTLE HELP, IF YOU NEED IT</span></div>
        <h2 id="setup-help">Something not clicking?</h2>
        <div className="quickstart-help-list">{help.map(item => <details key={item.question}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div>
        <div className="quickstart-contact"><span>We’re here to help you get connected.</span><a href="mailto:contact@newsbeat.dev">Contact NewsBeat <ArrowUpRight size={14} /></a></div>
      </section>

      <div className="docs-nav-foot"><a href="/docs">← How it works</a><a href="/docs/data">Understand the news →</a></div>
    </div>
  );
}
