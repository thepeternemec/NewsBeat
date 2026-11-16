/**
 * Plain anchors remount each page's scroll and reveal controllers on navigation.
 */
import ThemeToggle from "./theme-toggle";
import { BrandWordmark } from "./brand-mark";
import MobileNavigation from "./mobile-navigation";
import "./mobile-navigation.css";

const LINKS = [
  { href: "/intelligence", label: "Market checks", description: "See which developments passed the market checks" },
  { href: "/app#how-it-works", label: "How it works", description: "See how sources become market intelligence" },
  { href: "/pricing", label: "Pricing", description: "See the Rarebird Pro membership" },
  { href: "/docs", label: "Developers", description: "Connect with MCP and REST" },
];

export default function SiteNav({ active }: { active?: string }) {
  return (
    <nav className="nav nav-site" aria-label="Main navigation">
      <div className="nav-pill">
        <a className="nav-logo" href="/" aria-label="Rarebird home">
          <BrandWordmark className="brand-wordmark" />
        </a>
        <span className="nav-links">
          {LINKS.map(link => (
            <a key={link.href} className="nav-link" href={link.href} aria-current={active === link.href ? "page" : undefined} style={active === link.href ? { color: "var(--text-primary)" } : undefined}>{link.label}</a>
          ))}
        </span>
        <span className="nav-desktop-theme"><ThemeToggle /></span>
        <a className="nav-cta" href="/app" aria-current={active === "/app" ? "page" : undefined}>
          Open app
        </a>
        <MobileNavigation links={LINKS} active={active} />
      </div>
    </nav>
  );
}
