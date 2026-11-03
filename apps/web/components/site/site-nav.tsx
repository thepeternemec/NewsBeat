/**
 * Plain anchors remount each page's scroll and reveal controllers on navigation.
 */
import ThemeToggle from "./theme-toggle";
import BrandMark from "./brand-mark";
import MobileNavigation from "./mobile-navigation";
import "./mobile-navigation.css";

const LINKS = [
  { href: "/#live-news", label: "News", description: "Explore stock and crypto news" },
  { href: "/crypto", label: "Crypto", description: "Market, chain and positioning context" },
  { href: "/#build", label: "For agents", description: "Connect your agent to NewsBeat" },
  { href: "/docs", label: "Docs", description: "Start building with MCP and REST" },
  { href: "/status", label: "Status", description: "Check the current news service" },
];

export default function SiteNav({ active }: { active?: string }) {
  const inTerminal = active === "/dashboard";
  return (
    <nav className="nav nav-site" aria-label="Main navigation">
      <div className="nav-pill">
        <a className="nav-logo" href="/" aria-label="NewsBeat home">
          <BrandMark className="brand-beat" />
          NEWSBEAT
        </a>
        <span className="nav-links">
          {LINKS.map(link => (
            <a key={link.href} className="nav-link" href={link.href} aria-current={active === link.href ? "page" : undefined} style={active === link.href ? { color: "var(--text-primary)" } : undefined}>{link.label}</a>
          ))}
        </span>
        <span className="nav-desktop-theme"><ThemeToggle /></span>
        <a className="nav-cta" href={inTerminal ? "/" : "/dashboard"}>
          <span className="nav-cta-wide">{inTerminal ? "Home" : "Explore news"}</span>
          <span className="nav-cta-compact">{inTerminal ? "Home" : "News"}</span>
        </a>
        <MobileNavigation links={LINKS} active={active} />
      </div>
    </nav>
  );
}
