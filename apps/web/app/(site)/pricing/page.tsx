import { ArrowRight, ArrowUpRight, Bot, Terminal } from "lucide-react";
import InteriorPage from "@/components/site/interior-page";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import BrandMark from "@/components/site/brand-mark";
import { EARLY_ACCESS_END, PRO_MONTHLY_PRICE } from "@/components/site/access-offer";
import "./pricing.css";

export const metadata = {
  title: "Pricing | Rarebird",
  description: `Use the app and agent free through ${EARLY_ACCESS_END}. Rarebird Pro is planned at ${PRO_MONTHLY_PRICE} USD per month for both.`,
  alternates: { canonical: "/pricing" },
};

export default function Pricing() {
  return <>
    <SiteNav active="/pricing" />
    <InteriorPage className="pricing-page rb-pricing">
      <section className="wrap rb-pricing-intro" aria-labelledby="pricing-title">
        <p className="rb-price-kicker">Pricing</p>
        <h1 id="pricing-title">The app and the agent.<br /><span>One membership.</span></h1>
        <p>Research stocks and crypto in the Rarebird workspace or through a connected AI assistant. Both are free through {EARLY_ACCESS_END}.</p>
      </section>

      <section className="wrap rb-pricing-offer" id="later" aria-labelledby="pro-title">
        <div className="rb-price-card">
          <div className="rb-price-plan">
            <BrandMark size={56} />
            <p className="rb-price-kicker">Early access · Free today</p>
            <h2 id="pro-title">Rarebird Pro</h2>
            <p className="rb-price"><strong>{PRO_MONTHLY_PRICE}</strong> <span>USD / month</span></p>
            <p className="rb-price-status">Planned price after early access.</p>
          </div>
          <div className="rb-price-features">
            <article>
              <Terminal size={23} aria-hidden="true" />
              <div><h3>Rarebird app</h3><p>Explore recent stock and crypto developments, research tickers, and check the original evidence and forecast outcomes.</p></div>
            </article>
            <article>
              <Bot size={23} aria-hidden="true" />
              <div><h3>Rarebird agent</h3><p>Use the same market intelligence in a compatible assistant through MCP. Ask about timing, risk and what could change the outlook.</p></div>
            </article>
            <div className="rb-price-actions">
              <a className="btn-primary" href="/app">Open the app <ArrowUpRight size={16} aria-hidden="true" /></a>
              <a href="/docs/quickstart">Connect your agent <ArrowRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap rb-pricing-dev" id="today" aria-labelledby="developer-access">
        <h2 id="developer-access">Developer access</h2>
        <p>Public MCP and REST reads are free during early access. Developers who need a REST key can try the separate seven-day evaluation, with up to $6 in usage credit.</p>
        <a href="/docs/connect">Integration guide</a> · <a href="/keys">REST trial details</a>
      </section>
    </InteriorPage>
    <SiteFooter />
  </>;
}
