import { ArrowUpRight } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import CryptoOverview from "@/components/site/crypto-overview";
import "./crypto.css";

export const metadata = {
  title: "Crypto market overview | Rarebird",
  description: "See crypto market breadth, 24-hour moves, DEX activity, perpetual funding, and the source-linked headlines behind the day.",
  alternates: { canonical: "/crypto" },
};

export default function CryptoPage() {
  return <>
    <SiteNav active="/crypto" />
    <main className="crypto-overview">
      <div className="crypto-overview-shell">
        <header className="crypto-overview-heading">
          <div>
            <p className="crypto-overview-kicker">Crypto market overview</p>
            <h1>See the bigger picture.</h1>
            <p>See how widely crypto is moving, where trading is active, and which stories deserve a closer look.</p>
          </div>
          <a href="/tokens">Look up a token contract <ArrowUpRight size={16} aria-hidden="true" /></a>
        </header>
        <CryptoOverview />
      </div>
    </main>
    <SiteFooter />
  </>;
}
