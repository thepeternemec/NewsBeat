"use client";

import { usePathname } from "next/navigation";

const GROUPS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: "Get started",
    links: [
      { href: "/docs", label: "How it works" },
      { href: "/docs/quickstart", label: "Use with your assistant" },
      { href: "/docs/data", label: "Understand the news" },
      { href: "/faq", label: "Common questions" },
    ],
  },
  {
    title: "For developers",
    links: [
      { href: "/docs/connect", label: "MCP & API reference" },
    ],
  },
  {
    title: "Project",
    links: [
      { href: "https://github.com/thepeternemec/NewsBeat", label: "GitHub ↗" },
    ],
  },
];

export default function DocsSide() {
  const pathname = usePathname();

  return (
    <aside className="docs-side">
      <a className="docs-home" href="/docs"><span>N / B</span> The field guide</a>
      {GROUPS.map((group) => (
        <div key={group.title}>
          <div className="docs-side-group">{group.title}</div>
          {group.links.map((link) => {
            const external = link.href.startsWith("http");
            const active = !external && pathname === link.href;
            return (
              <a
                key={link.href}
                className={`docs-link${active ? " active" : ""}`}
                href={link.href}
                aria-current={active ? "page" : undefined}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
              >
                {link.label}
              </a>
            );
          })}
        </div>
      ))}
      <a className="docs-start" href="/connect">Connect NewsBeat <span aria-hidden="true">↗</span></a>
    </aside>
  );
}
