/**
 * Plain anchors remount each page's scroll and reveal controllers on navigation.
 */
import ThemeToggle from "./theme-toggle";
import { BrandWordmark } from "./brand-mark";
import MobileNavigation from "./mobile-navigation";
import "./mobile-navigation.css";

const LINKS = [
  { href: "/", label: "Feeds", description: "Follow markets, companies and tokens" },
  { href: "/intelligence", label: "Market checks", description: "See which developments passed the market checks" },
  { href: "/for-agents", label: "Agent", description: "Connect Rarebird to your AI assistant" },
  { href: "/pricing", label: "Pricing", description: "See the Rarebird Pro membership" },
  { href: "/docs", label: "Developers", description: "Connect with MCP and REST" },
];

const MOBILE_LINKS = [
  ...LINKS.slice(0, 2),
  { href: "/ask", label: "Ticker research", description: "Research a stock or crypto asset" },
  { href: "/app/forecasts", label: "Forecasts", description: "Explore forecasts and recorded outcomes" },
  ...LINKS.slice(2),
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
        <MobileNavigation links={MOBILE_LINKS} active={active} />
      </div>
    </nav>
  );
}
