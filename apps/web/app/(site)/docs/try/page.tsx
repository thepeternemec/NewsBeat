import { ArrowRight } from "lucide-react";
import NewsPreview from "@/components/site/news-preview";
import CopyButton from "@/components/site/copy-button";
import "../../landing.css";
import "./try.css";

export const metadata = {
  title: "Try Black Sheep for free",
  description: "Search a company or crypto asset, read live headlines and request a source-linked summary. No account, key or card needed.",
};

const REQUEST = 'curl "https://blacksheep.vercel.app/api/v2/summary?beat_id=b_bb964843350e"';

export default function TryBlackSheep() {
  return (
    <div className="try-guide">
      <header className="docs-head">
        <span className="sec-eyebrow">A real lookup · no setup</span>
        <h1>Try the news before you connect.</h1>
        <p className="docs-lead">
          Search a company or crypto asset, read recent headlines, and ask for a short summary.
          This uses the same public news service your agent can call. No Black Sheep account, API key
          or credit card is needed.
        </p>
      </header>

      <NewsPreview />

      <h2 id="three-things-to-try">Three things to try</h2>
      <ol className="try-steps">
        <li><strong>Choose a company.</strong> Try Apple, Bitcoin or a name or ticker you follow. Select the right match if several assets share a name or symbol.</li>
        <li><strong>Read the coverage.</strong> Each headline links to its source and shows its publisher and publication time. A recent source check does not mean every headline is new.</li>
        <li><strong>Summarize what happened.</strong> The summary is requested only when you click the button. It is based on headlines, so open the linked reporting for full context.</li>
      </ol>

      <h2 id="want-to-ask-your-own-assistant">Want to ask your own assistant?</h2>
      <p>
        The lookup above shows Black Sheep’s data in your browser. To bring it into your chat, your
        assistant needs to support a custom remote MCP connection. Follow the guide, add the
        Black Sheep address, then ask “What happened with Nvidia? Include sources and dates.”
      </p>
      <a className="try-next" href="/docs/quickstart">Connect your assistant <ArrowRight size={15} /></a>

      <h2 id="prefer-to-test-the-api">Prefer to test the API?</h2>
      <p>Run this public REST request. It returns a short headline-based update and report links as JSON, without a key.</p>
      <div className="code">
        <div className="code-bar">Nvidia summary <CopyButton text={REQUEST} label="request" /></div>
        <pre>{REQUEST}</pre>
      </div>
      <p>
        Public MCP and REST reads are free during early access, with a limit of 120 requests per
        minute. The optional <a href="/keys">seven-day keyed REST trial</a> is for testing a
        higher-limit agent workflow; it does not unlock different news. Your assistant or model
        provider may have its own charges.
      </p>
    </div>
  );
}
