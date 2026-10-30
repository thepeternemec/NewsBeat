import { ArrowDown, ArrowRight, Check, FileText, KeyRound, Radio, ShieldCheck } from "lucide-react";
import CopyButton from "./copy-button";

type Kind = "connect" | "pricing" | "keys" | "faq" | "reference" | "legal";

export default function PageVisual({ kind }: { kind: Kind }) {
  if (kind === "pricing") return (
    <aside className="intro-visual access-preview" aria-label="Public early access">
      <div className="visual-top"><span className="visual-indicator" /> Public early access <span className="visual-tag">AVAILABLE NOW</span></div>
      <div className="access-price">$0<span>to start</span></div>
      <p>Connect your agent.<br />Keep the news in context.</p>
      <div className="visual-stats"><div><strong>120</strong><span>requests / minute</span></div><div><strong>7</strong><span>news tools</span></div></div>
      <div className="visual-bottom"><Check size={14} /> No API key or credit card required</div>
    </aside>
  );
  if (kind === "keys") return (
    <aside className="intro-visual key-preview" aria-label="Optional key access">
      <div className="visual-top"><KeyRound size={15} /> An identity for your agent</div>
      <div className="key-token" aria-hidden="true">ng_<span>•••• •••• •••• ••••</span><ShieldCheck size={20} /></div>
      <div className="limit-comparison"><div><span>Public</span><strong>120</strong></div><ArrowRight size={20} /><div><span>With a key</span><strong>1,200</strong></div></div>
      <p className="visual-caption">Requests per minute</p>
      <div className="visual-bottom"><Check size={14} /> $6 trial credit · Keyed requests are metered</div>
    </aside>
  );
  if (kind === "reference" || kind === "legal") return (
    <aside className="intro-visual reference-preview" aria-label={kind === "legal" ? "Service information" : "Agent reference files"}>
      <div className="visual-top">{kind === "legal" ? <ShieldCheck size={15} /> : <FileText size={15} />}{kind === "legal" ? "Clarity at every step" : "The agent reading room"}</div>
      <div className="reference-mark" aria-hidden="true"><FileText size={38} strokeWidth={1} /><span /><span /><span /></div>
      <div className="reference-links">{(kind === "legal" ? [["/legal/terms", "Terms of service"], ["/legal/cookies", "Cookies & storage"], ["https://x.com/blacksheep_", "Contact us"]] : [["/llms.txt", "llms.txt"], ["/skill.md", "skill.md"], ["/auth.md", "auth.md"]]).map(([href, label]) => <a key={href} href={href}>{label}<ArrowRight size={14} /></a>)}</div>
    </aside>
  );
  return (
    <aside className="intro-visual connection-preview" aria-label="From your question to a sourced answer">
      <div className="visual-top"><Radio size={15} /> From question to context <span className="visual-tag">MCP + API</span></div>
      <div className="question-preview"><span>YOU ASK</span><p>“What happened<br />with Nvidia?”</p></div>
      <div className="preview-route" aria-hidden="true"><span /><ArrowDown size={16} /><span /></div>
      <div className="answer-preview"><span>BLACK SHEEP BRINGS</span><div><Check size={14} /> Recent headlines</div><div><Check size={14} /> Publisher links</div><div><Check size={14} /> Dates & freshness</div></div>
      {kind === "connect" ? <div className="visual-endpoint"><code>blacksheep.vercel.app/api/mcp</code><CopyButton text="https://blacksheep.vercel.app/api/mcp" label="MCP address" /></div> : <a className="visual-bottom visual-link" href="https://x.com/blacksheep_">Still have a question? Contact us <ArrowRight size={14} /></a>}
    </aside>
  );
}
