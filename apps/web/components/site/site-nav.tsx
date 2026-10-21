/**
 * Site navigation. Plain anchors rather than next/link on purpose: a full load
 * guarantees each page mounts cleanly, so the scroll-reveal controller and the
 * code-box animations initialise the same way on every route.
 */
import ThemeToggle from "./theme-toggle";

const LINKS = [
  { href: "/connect", label: "Connect" },
  { href: "/keys", label: "Get a key" },
  { href: "/docs", label: "Docs" },
  { href: "/faq", label: "FAQ" },
  { href: "/pricing", label: "Pricing" },
];

export default function SiteNav({ active }: { active?: string }) {
  return (
    <nav className="nav">
      <div className="nav-pill">
        <a className="nav-logo" href="/">
          NEWSBEAT
        </a>
        <span className="nav-links">
          {LINKS.map((link) => (
            <a
              key={link.href}
              className="nav-link"
              href={link.href}
              style={active === link.href ? { color: "var(--text-primary)" } : undefined}
            >
              {link.label}
            </a>
          ))}
        </span>
          <ThemeToggle />
        <a className="nav-cta" href="/dashboard">
          Open terminal
        </a>
      </div>
    </nav>
  );
}
