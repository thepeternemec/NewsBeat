"use client";

import { useEffect, useRef, useState } from "react";

const CHAPTERS = [
  { id: "agent-workflow", label: "Intelligence" },
  { id: "market-timing", label: "Timing" },
  { id: "real-intelligence", label: "In practice" },
  { id: "connect-agent", label: "Your agent" },
] as const;

/** Reading navigation works independently of decorative motion preferences. */
export default function LandingChapters() {
  const [active, setActive] = useState(0);
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;
    const chapters = CHAPTERS.map(chapter => document.getElementById(chapter.id));
    const update = () => {
      frame = 0;
      const trigger = window.innerHeight * .4;
      let next = 0;
      chapters.forEach((section, index) => { if (section && section.getBoundingClientRect().top <= trigger) next = index; });
      setActive(previous => previous === next ? previous : next);
      const start = chapters[0] ? chapters[0].getBoundingClientRect().top + window.scrollY - 144 : 0;
      const end = Math.max(start + 1, document.documentElement.scrollHeight - window.innerHeight);
      nav.current?.style.setProperty("--chapter-progress", String(Math.max(0, Math.min(1, (window.scrollY - start) / (end - start)))));
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <nav className="home-chapters" ref={nav} aria-label="Explore NewsBeat features">
    <div className="wrap"><span>Inside NewsBeat</span><div>{CHAPTERS.map((chapter, index) => <a key={chapter.id} href={"#" + chapter.id} aria-current={active === index ? "location" : undefined}>{chapter.label}</a>)}</div></div>
    <i aria-hidden="true" />
  </nav>;
}
