/**
 * Plain anchors remount each page's scroll and reveal controllers on navigation.
 */
import ThemeToggle from "./theme-toggle";
import BrandMark from "./brand-mark";
import MobileNavigation from "./mobile-navigation";
import "./mobile-navigation.css";

const LINKS = [
  { href: "/#live-news", label: "News", description: "Try the working company news engine" },
  { href: "/#agent-network", label: "Agents", description: "Explore the proposed agent handoff" },
  { href: "/docs/black-sheep", label: "Thesis", description: "Read the product and token concept" },
  { href: "/docs", label: "Docs", description: "Connect to the existing news tools" },
  { href: "/status", label: "Status", description: "Check the current news service" },
];

export default function SiteNav({ active }: { active?: string }) {
  const inTerminal = active === "/dashboard";
  return (
    <nav className="nav nav-site" aria-label="Main navigation">
      <div className="nav-pill">
        <a className="nav-logo" href="/" aria-label="Black Sheep home">
          <BrandMark className="brand-beat" />
          BLACK SHEEP
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
