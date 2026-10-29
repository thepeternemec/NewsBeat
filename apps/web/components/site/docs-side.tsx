"use client";

import { useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Activity, ArrowUpRight, BookOpen, ChevronDown, Code2, FileText, GitBranch, CircleHelp, Mail, Play, Plug } from "lucide-react";
import { DOC_PAGES } from "./docs-links";

const ICONS = [BookOpen, Play, Plug, FileText, Code2, GitBranch];
const LINKS = DOC_PAGES.map((page, index) => ({ ...page, icon: ICONS[index] }));
const GROUPS = [
  {
    title: "Start here",
    links: LINKS.filter(page => page.group === "Start here"),
  },
  {
    title: "Go deeper",
    links: [
      ...LINKS.filter(page => page.group === "Go deeper"),
      { href: "/faq", label: "Common questions", icon: CircleHelp },
    ],
  },
];

export default function DocsSide() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const current = GROUPS.flatMap(group => group.links).find(link => link.href === pathname)?.label ?? "Documentation";

  return (
    <aside className="docs-navigation" data-open={open} onKeyDown={event => {
      if (event.key === "Escape" && open && window.matchMedia("(max-width: 850px)").matches) {
        setOpen(false);
        trigger.current?.focus();
      }
    }}>
      <button className="docs-nav-toggle" type="button" ref={trigger} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
        <BookOpen size={18} aria-hidden="true" />
        <span><span>Documentation</span><strong>{current}</strong></span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <div className="docs-nav-panel" id={id} data-lenis-prevent>
        <a className="docs-nav-brand" href="/docs">
          <span className="docs-nav-mark"><BookOpen size={19} strokeWidth={1.6} aria-hidden="true" /></span>
          <span><small>NEWSBEAT</small><strong>Documentation</strong></span>
        </a>
        <nav className="docs-nav-groups" aria-label="Documentation">
          {GROUPS.map(group => (
            <section key={group.title} aria-labelledby={`${id}-${group.title.replaceAll(" ", "-")}`}>
              <h2 id={`${id}-${group.title.replaceAll(" ", "-")}`}>{group.title}</h2>
              <ul>
                {group.links.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <a className="docs-nav-link" href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpen(false)}>
                      <Icon size={16} strokeWidth={1.6} aria-hidden="true" />
                      <span>{label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
        <div className="docs-nav-resources">
          <a href="https://github.com/thepeternemec/NewsBeat" target="_blank" rel="noopener noreferrer"><GitBranch size={15} aria-hidden="true" /> GitHub <ArrowUpRight size={12} aria-hidden="true" /></a>
          <a href="/status"><Activity size={15} aria-hidden="true" /> Status</a>
        </div>
        <a className="docs-nav-contact" href="mailto:contact@newsbeat.dev"><Mail size={15} aria-hidden="true" /><span>Need a hand? <strong>Contact us</strong></span><ArrowUpRight size={12} aria-hidden="true" /></a>
      </div>
      <noscript><style>{".docs-navigation .docs-nav-panel { display: block; } .docs-navigation .docs-nav-toggle { display: none; }"}</style></noscript>
    </aside>
  );
}
