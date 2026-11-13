import InteriorPage from "@/components/site/interior-page";
import { ArrowRight } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import "./pricing.css";

export const metadata = {
  title: "Rarebird Pricing",
  description: "Read the live Rarebird briefing during early access. See the planned $8.99 monthly Rarebird Pro membership.",
};

export default function Pricing() {
  return <>
    <SiteNav active="/pricing" />
    <InteriorPage className="pricing-page rb-pricing">
      <section className="wrap rb-pricing-intro">
        <h1 className="sec-title">One briefing. A clearer next check.</h1>
        <p className="sec-sub">See how Rarebird follows developments in crypto and tokenized stocks, checks the market, and shows the evidence behind each watch.</p>
        <a className="btn-ghost" href="/#real-intelligence">Read the live briefing <ArrowRight size={15} aria-hidden="true" /></a>
      </section>

      <section className="wrap rb-pricing-offer" id="later" aria-labelledby="pro-title">
        <div className="rb-price-card">
          <div>
            <p className="rb-price-status">Planned membership</p>
            <h2 id="pro-title">Rarebird Pro</h2>
            <p className="rb-price"><strong>$8.99</strong> <span>USD / month</span></p>
            <p>Designed for traders who follow crypto and tokenized stocks.</p>
          </div>
          <div>
            <ul>
              <li>A briefing that opens with what changed.</li>
              <li>Market checks, links to the evidence, and timestamps.</li>
              <li>A next check for developments that pass the review criteria.</li>
            </ul>
            <a className="btn-primary" href="mailto:contact@newsbeat.dev?subject=Rarebird%20Pro%20early%20access">Request Pro early access <ArrowRight size={15} aria-hidden="true" /></a>
            <p className="rb-price-status">Checkout opens later. Early-access requests are by email.</p>
          </div>
        </div>
      </section>

      <section className="wrap rb-pricing-dev" id="today" aria-labelledby="developer-access">
        <h2 id="developer-access">Developer access</h2>
        <p>The public MCP and REST connection is free during early access. A separate seven-day REST trial includes up to $6 in usage credit.</p>
        <a href="/docs/connect">Integration guide</a> · <a href="/keys">Start a REST trial</a>
      </section>
    </InteriorPage>
    <SiteFooter />
  </>;
}
