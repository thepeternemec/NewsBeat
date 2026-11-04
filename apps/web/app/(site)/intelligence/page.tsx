import { ArrowUpRight } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import SignalInspector from "@/components/site/signal-inspector";
import "../landing.css";
import "../newsbeat.css";
import "../newsbeat-polish.css";
import "../quantitative.css";

export const metadata = {
  title: "NewsBeat intelligence — Delta, market response and timing",
  description: "Track source-grounded thesis changes, benchmark-adjusted venue returns, participation and liquidity. Inspect timing conditions and prospective outcome records for stocks and crypto.",
  alternates: { canonical: "https://www.newsbeat.dev/intelligence" },
};
const METHODS = [
  { number: "01", title: "Find the information delta.", text: "Separate a changed thesis or new reported development from repeated coverage and added interpretation." },
  { number: "02", title: "Measure the relative move.", text: "Fit the asset’s relationship to a named proxy before the thesis was known, then examine the residual response." },
  { number: "03", title: "Check timing and liquidity.", text: "Inspect participation, sparse prints, spread and book impact. A move may be developing, extended, fading or diverging." },
  { number: "04", title: "Keep a forward record.", text: "Freeze the decision and reference quotes first. Observe later price responses as their measurement windows close." },
];
export default function IntelligencePage() {
  return <>
    <SiteNav active="/intelligence" />
    <main className="landing-home bs-home nb-home ni-quant-home">
      <section className="wrap ni-quant-head">
        <div><span className="bs-kicker">THE INTELLIGENCE WORKBENCH</span><h1>Know the delta.<br /><span>Measure the timing.</span></h1></div>
        <div className="ni-quant-intro"><p>Understand what changed in the thesis, what the market is doing relative to its proxy, and whether participation and liquidity support attention now.</p><p className="ni-quant-scope">Six-asset research pilot. Stock measurements use identified xStocks venue markets; company reporting informs the thesis. Crypto measurements use spot markets.</p><a className="bs-text-link" href="/docs/quickstart">Bring the measurements to your agent <ArrowUpRight size={15} /></a></div>
      </section>
      <section className="wrap ni-quant-workspace" aria-label="Delta and market timing"><SignalInspector /></section>
      <section className="wrap ni-quant-method" aria-labelledby="quant-method-heading">
        <div className="ni-quant-method-head"><span className="bs-kicker">HOW THE LAYER WORKS</span><h2 id="quant-method-heading">A thesis. A measurement. A record.</h2><a className="bs-text-link" href="https://github.com/thepeternemec/NewsBeat/blob/main/docs/QUANTITATIVE.md" target="_blank" rel="noopener noreferrer">Read the methodology <ArrowUpRight size={15} /></a></div>
        <div className="ni-quant-method-grid">{METHODS.map(item => <article key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
        <p className="ni-quant-method-note">The thresholds are research heuristics. Forward observations will support calibration as the record grows. Market response alone does not establish what caused a move.</p>
      </section>
    </main>
    <SiteFooter />
  </>;
}
