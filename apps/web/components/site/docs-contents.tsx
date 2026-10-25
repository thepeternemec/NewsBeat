"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp, ChevronDown, List } from "lucide-react";

type Entry = { id: string; label: string };

export default function DocsContents() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<Entry[]>([]);
  const [active, setActive] = useState("");
  const disclosure = useRef<HTMLDetailsElement>(null);

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
    if (disclosure.current) disclosure.current.open = false;
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = entries[0]?.id ?? "";
      for (const heading of elements) {
        if (heading.getBoundingClientRect().top <= 190) current = heading.id;
        else break;
      }
      setActive(current);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return (
    <aside className="docs-contents">
      <nav className="docs-desktop-index" aria-label="On this page"><span className="rail-label"><List size={14} aria-hidden="true" /> On this page</span>
        {headings.map(heading => <a key={heading.id} href={`#${heading.id}`} className={active === heading.id ? "is-current" : undefined} aria-current={active === heading.id ? "location" : undefined}>{heading.label}</a>)}
      </nav>
      <a className="docs-back-top" href="#docs-content"><ArrowUp size={13} aria-hidden="true" /> Back to top</a>
      <details className="docs-mobile-index" ref={disclosure} onKeyDown={event => {
        if (event.key === "Escape" && disclosure.current?.open) {
          disclosure.current.open = false;
          disclosure.current.querySelector("summary")?.focus();
        }
      }}>
        <summary><List size={15} aria-hidden="true" /><span>On this page</span><ChevronDown size={14} aria-hidden="true" /></summary>
        <nav aria-label="Sections on this page">
          {headings.map(heading => <a key={heading.id} href={`#${heading.id}`} aria-current={active === heading.id ? "location" : undefined} onClick={event => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            // Close before measuring the target: the expanded menu changes its position.
            event.preventDefault();
            event.stopPropagation();
            if (disclosure.current) disclosure.current.open = false;
            const target = document.getElementById(heading.id);
            if (!target) return;
            target.tabIndex = -1;
            target.focus({ preventScroll: true });
            target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
            window.history.pushState(window.history.state, "", `#${heading.id}`);
            setActive(heading.id);
          }}>{heading.label}</a>)}
        </nav>
      </details>
    </aside>
  );
}
