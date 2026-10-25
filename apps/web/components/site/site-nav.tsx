/**
 * Plain anchors remount each page's scroll and reveal controllers on navigation.
 */
import ThemeToggle from "./theme-toggle";
import MobileNavigation from "./mobile-navigation";
import "./mobile-navigation.css";

const LINKS = [
  { href: "/connect", label: "Connect", description: "Bring the news to your assistant" },
  { href: "/docs/try", label: "Try free", description: "Run a real news lookup in your browser" },
  { href: "/docs", label: "Docs", description: "Get started, one step at a time" },
  { href: "/faq", label: "FAQ", description: "Answers to common questions" },
  { href: "/pricing", label: "Pricing", description: "Free public access and API limits" },
];

export default function SiteNav({ active }: { active?: string }) {
  const inTerminal = active === "/dashboard";
  return (
    <nav className="nav nav-site" aria-label="Main navigation">
      <div className="nav-pill">
        <a className="nav-logo" href="/" aria-label="NewsBeat home">
          <svg className="brand-beat" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="3" y="12" width="6" height="12" rx="3" />
            <rect x="13" y="4" width="6" height="25" rx="3" />
            <rect x="23" y="9" width="6" height="17" rx="3" />
          </svg>
          NEWSBEAT
        </a>
        <span className="nav-links">
          {LINKS.map(link => (
            <a key={link.href} className="nav-link" href={link.href} aria-current={active === link.href ? "page" : undefined} style={active === link.href ? { color: "var(--text-primary)" } : undefined}>{link.label}</a>
          ))}
        </span>
        <span className="nav-desktop-theme"><ThemeToggle /></span>
        <a className="nav-cta" href={inTerminal ? "/" : "/dashboard"}>
          <span className="nav-cta-wide">{inTerminal ? "Home" : "Open terminal"}</span>
          <span className="nav-cta-compact">{inTerminal ? "Home" : "Terminal"}</span>
        </a>
        <MobileNavigation links={LINKS} active={active} />
      </div>
    </nav>
  );
}
