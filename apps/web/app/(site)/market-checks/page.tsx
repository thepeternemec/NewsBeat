import { ArrowRight, ArrowUpRight } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import InteriorPage from "@/components/site/interior-page";
import "../product-features.css";

export const metadata = { title: "Market checks — NewsBeat", description: "How NewsBeat checks unusual moves, market participation and timing across its six-asset intelligence pilot.", alternates: { canonical: "https://www.newsbeat.dev/market-checks" } };
const CHECKS = [
  ["01", "Is the move unusual?", "Compare the asset with its market baseline, rather than treating every price change as a signal."],
  ["02", "Is there support?", "Check traded volume, spread and available liquidity before treating a move as confirmed."],
  ["03", "Is the timing useful?", "Look for a move that is developing, already extended or fading. Missing or stale data can hold a review."],
];
export default function MarketChecks() {
  return <><SiteNav active="/market-checks" /><InteriorPage className="nb-product-page">
    <section className="nb-product-hero wrap">
      <div><span className="nb-product-eyebrow">MARKET CHECKS / SIX-ASSET PILOT</span><h1>A headline is a clue.<br /><span>Check the move.</span></h1><p>NewsBeat looks at market behavior alongside the reporting. Your agent gets a reason to investigate—and a reason to wait.</p><a className="btn-primary" href="/intelligence#real-signal">Inspect a real signal <ArrowRight size={16} /></a></div>
      <figure className="nb-market-illustration"><figcaption>THE COMPARISON <span>Illustration · not live prices</span></figcaption><svg viewBox="0 0 480 250" role="img" aria-label="Illustration of an asset diverging from a comparison market"><path className="nb-chart-grid" d="M20 60H460 M20 120H460 M20 180H460" /><path className="nb-comparison-line" d="M20 180L60 170L100 177L140 156L180 162L220 147L260 150L300 136L340 140L380 125L420 130L460 116" /><path className="nb-asset-line" d="M20 183L60 169L100 175L140 154L180 158L220 139L260 145L300 102L340 113L380 67L420 78L460 35" /><circle cx="460" cy="35" r="5" className="nb-chart-dot" /></svg><div className="nb-chart-legend"><span>— Asset move</span><span>– – Market comparison</span></div><p>The question: is the asset moving differently from its market?</p></figure>
    </section>
    <section className="wrap nb-checks-section" aria-labelledby="checks-title"><span className="nb-product-eyebrow">DELTA / CONFIRMATION / TIMING</span><h2 id="checks-title">Three checks. A better question.</h2><div className="nb-product-cards">{CHECKS.map(([n,title,text])=><article key={n}><span className="nb-product-number">{n}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="wrap nb-product-details"><div><span className="nb-product-eyebrow">THE DATA BEHIND IT</span><h2>Know what you’re looking at.</h2><p>The measured pilot covers NVIDIA, Apple, Microsoft, Alphabet, Bitcoin and Ethereum. Stock measurements use identified Kraken xStock markets; Bitcoin and Ethereum use spot markets on the same venue.</p><p>These are venue observations, not a consolidated stock-exchange price feed. The intelligence workspace shows the sources, measurement times and holds.</p><a href="/docs/intelligence">Read the measurement guide <ArrowUpRight size={16} /></a></div><div className="nb-check-record"><span className="nb-product-eyebrow">A SIGNAL CAN WAIT</span><h3>No fresh data?<br />No forced conclusion.</h3><p>Old prices, thin markets or an incomplete baseline can block a review alert. An unusual move alone does not establish its cause or predict a return.</p><a href="/intelligence">Open the intelligence workspace <ArrowRight size={16} /></a></div></section>
  </InteriorPage><SiteFooter /></>;
}
