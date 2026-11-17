import { BrandWordmark } from "./brand-mark";
import { EARLY_ACCESS_END } from "./access-offer";
import SpotlightCard from "@/components/ui/spotlight-card/spotlight-card";
import "./site-footer.css";

/** Desktop groups links; mobile keeps each destination visible in one tap. */
const COLUMNS = [
  {
    head: "Product",
    links: [
      { href: "/app", label: "Open app" },
      { href: "/app/forecasts", label: "Forecasts" },
      { href: "/intelligence#opportunities", label: "Market checks" },
      { href: "/crypto", label: "Crypto indicators" },
      { href: "/tokens", label: "Token contracts" },
      { href: "/ask", label: "Ticker research" },
      { href: "/pricing", label: "Pricing" },
      { href: "/status", label: "Service status" },
    ],
  },
  {
    head: "API",
    links: [
      { href: "/docs/quickstart", label: "Quickstart" },
      { href: "/docs", label: "Docs" },
      { href: "/llms", label: "llms.txt" },
    ],
  },
  {
    head: "More",
    links: [
      { href: "/#build-history", label: "Build history" },
      { href: "/faq", label: "FAQ" },
      { href: "/keys", label: "Get a key" },
      { href: "https://github.com/thepeternemec/rarebird", label: "GitHub" },
    ],
  },
  {
      head: "Legal",
      links: [
        { href: "/legal/terms", label: "Terms" },
        { href: "/legal/cookies", label: "Cookies" },
        { href: "mailto:contact@rarebird.network", label: "Contact" },
      ],
    },
] as const;

// Contact already sits beside the brand on mobile, so keep it out of the grid.
const MOBILE_LINKS = COLUMNS.flatMap(
  (column): Array<{ href: string; label: string }> => [...column.links],
).filter((link) => link.href !== "mailto:contact@rarebird.network");

export default function SiteFooter() {
  return (
    <footer className="site">
      <div className="wrap">
        <SpotlightCard
          className="footer-panel"
          spotlightColor="rgba(255,255,255,0.09)"
          spotlightSize={420}
        >
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-brand-line">
                <a className="footer-co footer-wordmark" href="/" aria-label="Rarebird home">
                  <BrandWordmark className="brand-wordmark" width={136} />
                </a>
                <a className="footer-mobile-contact" href="mailto:contact@rarebird.network">Contact <span aria-hidden="true">↗</span></a>
              </div>
              <p className="footer-tag">Know what’s worth watching.</p>
            </div>

            {COLUMNS.map((column) => (
              <nav className="footer-col footer-desktop-col" key={column.head} aria-label={column.head}>
                <span className="footer-head">{column.head}</span>
                {column.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    {...(link.href.startsWith("http")
                      ? { target: "_blank", rel: "noreferrer" }
                      : {})}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            ))}
          </div>

          <nav className="footer-mobile-links" aria-label="Footer links">
            {MOBILE_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                {...(link.href.startsWith("http")
                  ? { target: "_blank", rel: "noreferrer" }
                  : {})}
              >
                {link.href === "/status" ? "Status" : link.label}
              </a>
            ))}
          </nav>

          <div className="footer-base">
            <span>App and agent free through {EARLY_ACCESS_END}</span>
            <span>Market intelligence for stocks and crypto</span>
            <a href="https://github.com/thepeternemec/rarebird" aria-label="Rarebird on GitHub">Open source on GitHub ↗</a>
          </div>
        </SpotlightCard>
      </div>
    </footer>
  );
}

