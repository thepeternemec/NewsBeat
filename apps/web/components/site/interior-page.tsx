"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Content stays visible without JavaScript. Motion runs once as each block enters. */
export default function InteriorPage({ children, className = "" }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches || !root.current) return;
    const animations = new Set<Animation>();
    const targets = root.current.querySelectorAll<HTMLElement>(
      ".intro-copy > *, .intro-visual, .docs-head, .docs-body > h2, .docs-body > .code, .docs-body > .table-scroll, .scaffold .sec-head, .feature, .faq details, .section-aside, .access-plan, .terminal-heading, .metrics-grid > *, .quickstart-step, .quickstart-autopilot, .quickstart-explore, .quickstart-help"
    );
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (preference.matches) return;
        const animation = entry.target.animate(
          [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "translateY(0)" }],
          { duration: 650, delay: Number((entry.target as HTMLElement).dataset.enterDelay ?? 0), easing: "cubic-bezier(.22,1,.36,1)" },
        );
        animations.add(animation);
        void animation.finished.then(() => animations.delete(animation)).catch(() => {});
      });
    }, { threshold: 0.06 });
    targets.forEach((target, index) => {
      if (target.parentElement?.classList.contains("intro-copy")) target.dataset.enterDelay = String(Math.min(index * 55, 220));
      observer.observe(target);
    });
    const stop = () => { if (preference.matches) animations.forEach(animation => animation.cancel()); };
    preference.addEventListener("change", stop);
    return () => { observer.disconnect(); animations.forEach(animation => animation.cancel()); preference.removeEventListener("change", stop); };
  }, []);

  return <main ref={root} className={`interior-page ${className}`}>{children}</main>;
}
