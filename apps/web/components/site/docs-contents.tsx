"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, BookOpen } from "lucide-react";

type Entry = { id: string; label: string };

export default function DocsContents() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<Entry[]>([]);
  const [active, setActive] = useState("");

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".docs-body h2"));
    const used = new Set<string>();
    const entries = elements.map((heading, index) => {
      const base = heading.id || heading.textContent?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `section-${index}`;
      let id = base;
      while (used.has(id)) id += `-${index}`;
      used.add(id);
      heading.id = id;
      return { id, label: heading.textContent ?? "" };
    });
    setHeadings(entries);
    setActive(entries[0]?.id ?? "");
    const observer = new IntersectionObserver(changes => {
      for (const entry of changes) if (entry.isIntersecting) setActive(entry.target.id);
    }, { rootMargin: "-15% 0px -65% 0px", threshold: 0 });
    elements.forEach(heading => observer.observe(heading));
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <aside className="docs-contents">
      <nav aria-label="On this page"><span className="rail-label"><BookOpen size={13} /> On this page</span>
        {headings.map(heading => <a key={heading.id} href={`#${heading.id}`} className={active === heading.id ? "is-current" : undefined} aria-current={active === heading.id ? "location" : undefined}>{heading.label}</a>)}
      </nav>
      <a className="docs-help" href="mailto:contact@newsbeat.dev"><span>Need a hand?</span>Talk to the team <ArrowUpRight size={14} /></a>
    </aside>
  );
}
