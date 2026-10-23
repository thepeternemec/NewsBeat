/**
 * Plain anchors remount each page's scroll and reveal controllers on navigation.
 */
import ThemeToggle from "./theme-toggle";
import MobileNavigation from "./mobile-navigation";
import "./mobile-navigation.css";

const LINKS = [
  { href: "/connect", label: "Connect", description: "Bring the news to your assistant" },
  { href: "/keys", label: "Get a key", description: "Try a seven-day REST workflow" },
  { href: "/docs", label: "Docs", description: "Get started, one step at a time" },
  { href: "/faq", label: "FAQ", description: "Answers to common questions" },
  { href: "/pricing", label: "Pricing", description: "Free public access and API limits" },
];

export default function SiteNav({ active }: { active?: string }) {
  const inTerminal = active === "/dashboard";
  return (
    <nav className="nav nav-site" aria-label="Main navigation">
      <div className="nav-pill">
        <a className="nav-logo" href="/">NEWSBEAT</a>
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
