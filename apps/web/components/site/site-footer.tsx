import SpotlightCard from "@/components/ui/spotlight-card/spotlight-card";

/**
 * The footer, on Sona UI's SpotlightCard.
 *
 * It was a single row of links with "Contribute" at the end — pointing at
 * `CONTRIBUTING-FIRST-PR.md`, which was deleted, so the last link in the footer of
 * every page was a 404. Removed rather than repointed: the contributing guide lives
 * in `CONTRIBUTING.md` and the footer is not where a reader goes to find it.
 *
 * The link set is grouped now. Nine links in one row is a row of words; grouped by
 * what they are for, it is a map of the product.
 */
const COLUMNS = [
  {
    head: "Product",
    links: [
      { href: "/dashboard", label: "Terminal" },
      { href: "/connect", label: "Connect" },
      { href: "/pricing", label: "Pricing" },
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
      { href: "https://github.com/thepeternemec/NewsGraph", label: "GitHub" },
    ],
  },
] as const;

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
              <span className="footer-co">NEWSGRAPH</span>
              <p className="footer-tag">The news layer for AI agents.</p>
              <p className="footer-address">
                read-only · no credential required
              </p>
            </div>

            {COLUMNS.map((column) => (
              <nav className="footer-col" key={column.head} aria-label={column.head}>
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

          <div className="footer-base">
            <span>spec v1 · usage-based pricing</span>
            <span>no seat licence · no lock-in</span>
          </div>
        </SpotlightCard>
      </div>
    </footer>
  );
}
