import SpotlightCard from "@/components/ui/spotlight-card/spotlight-card";
import "./site-footer.css";

/** Desktop groups links; mobile keeps each destination visible in one tap. */
const COLUMNS = [
  {
    head: "Product",
    links: [
      { href: "/dashboard", label: "Terminal" },
      { href: "/connect", label: "Connect" },
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
      { href: "/faq", label: "FAQ" },
      { href: "/keys", label: "Get a key" },
      { href: "https://github.com/thepeternemec/NewsBeat", label: "GitHub" },
    ],
  },
  {
      head: "Legal",
      links: [
        { href: "/legal/terms", label: "Terms" },
        { href: "/legal/cookies", label: "Cookies" },
        { href: "mailto:contact@newsbeat.dev", label: "Contact" },
      ],
    },
] as const;

// Contact already sits beside the brand on mobile, so keep it out of the grid.
const MOBILE_LINKS = COLUMNS.flatMap(
  (column): Array<{ href: string; label: string }> => [...column.links],
).filter((link) => link.href !== "mailto:contact@newsbeat.dev");

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
                <span className="footer-co">NEWSBEAT</span>
                <a className="footer-mobile-contact" href="mailto:contact@newsbeat.dev">Contact <span aria-hidden="true">↗</span></a>
              </div>
              <p className="footer-tag">The news layer for AI agents.</p>
              <p className="footer-address">
                read-only · no credential required
              </p>
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
            <span>MCP + REST · free early access</span>
            <span>no seat licence · no lock-in</span>
          </div>
        </SpotlightCard>
      </div>
    </footer>
  );
}
