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
            <nav className="footer-social" aria-label="Social media">
              <a
                href="https://x.com/newsbeat_"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="NewsBeat on X"
                title="NewsBeat on X"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                  <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.847h-7.406l-5.8-7.584-6.635 7.584H.476l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.933Zm-1.29 19.493h2.039L6.486 3.24H4.298L17.61 20.646Z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/newsbeat-/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="NewsBeat on LinkedIn"
                title="NewsBeat on LinkedIn"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.35V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.37-1.85 3.602 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124ZM7.119 20.452H3.555V9h3.564v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451c.979 0 1.778-.773 1.778-1.729V1.729C24 .774 23.201 0 22.222 0h.003Z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/newsbeat__/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="NewsBeat on Instagram"
                title="NewsBeat on Instagram"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false">
                  <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
                  <circle cx="12" cy="12" r="4.2" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
            </nav>
          </div>
        </SpotlightCard>
      </div>
    </footer>
  );
}
