/**
 * Plain anchors remount each page's scroll and reveal controllers on navigation.
 */
import ThemeToggle from "./theme-toggle";
import BrandMark from "./brand-mark";
import MobileNavigation from "./mobile-navigation";
import "./mobile-navigation.css";

const LINKS = [
  { href: "/#agent-workflow", label: "How it works", description: "News, intelligence and timing—in one guided view" },
  { href: "/intelligence", label: "Intelligence", description: "Check current opportunities and their evidence" },
  { href: "/crypto", label: "Crypto", description: "See the market, activity and crypto reporting" },
  { href: "/tokens", label: "Tokens", description: "Research a token by chain and contract" },
  { href: "/for-agents", label: "For agents", description: "Connect, ask and follow what changed" },
  { href: "/docs", label: "Docs", description: "Start building with MCP and REST" },
  { href: "/status", label: "Status", description: "Check the current news service" },
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
        <a className="nav-cta" href="/ask" aria-current={active === "/ask" ? "page" : undefined}>
          <span className="nav-cta-wide">Ask Rarebird</span>
          <span className="nav-cta-compact">Ask</span>
        </a>
        <MobileNavigation links={LINKS} active={active} />
      </div>
    </nav>
  );
}
