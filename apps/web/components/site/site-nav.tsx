/**
 * Plain anchors remount each page's scroll and reveal controllers on navigation.
 */
import ThemeToggle from "./theme-toggle";
import BrandMark from "./brand-mark";
import MobileNavigation from "./mobile-navigation";
import "./mobile-navigation.css";

const LINKS = [
  { href: "/intelligence", label: "Market checks", description: "See which developments passed the market checks" },
  { href: "/pricing", label: "Pricing", description: "See the Rarebird Pro membership" },
  { href: "/docs", label: "Developers", description: "Connect with MCP and REST" },
];

export default function SiteNav({ active }: { active?: string }) {
  return (
    <nav className="nav nav-site" aria-label="Main navigation">
      <div className="nav-pill">
        <a className="nav-logo" href="/" aria-label="Rarebird home">
          <BrandMark className="brand-beat" />
          RAREBIRD
        </a>
        <span className="nav-links">
          {LINKS.map(link => (
            <a key={link.href} className="nav-link" href={link.href} aria-current={active === link.href ? "page" : undefined} style={active === link.href ? { color: "var(--text-primary)" } : undefined}>{link.label}</a>
          ))}
        </span>
        <span className="nav-desktop-theme"><ThemeToggle /></span>
        <a className="nav-cta" href="/#real-intelligence">
          <span className="nav-cta-wide">Live briefing</span>
          <span className="nav-cta-compact">Briefing</span>
        </a>
        <MobileNavigation links={LINKS} active={active} />
      </div>
    </nav>
  );
}
