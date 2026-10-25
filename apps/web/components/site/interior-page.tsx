"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Content stays visible without JavaScript. Motion runs once as each block enters. */
export default function InteriorPage({ children, className = "" }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLElement>(null);
  const progress = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches || !root.current) return;
    const animations = new Set<Animation>();
    const targets = root.current.querySelectorAll<HTMLElement>(
      ".intro-copy > *, .intro-visual, .docs-head, .docs-body > h2, .docs-body > p, .docs-body > ul, .docs-body > .code, .docs-body > .table-scroll, .docs-pagination, .docs-path-card, .docs-developer-path, .docs-section > h2, .docs-section > p, .docs-flow, .docs-callout, .docs-prompt-card, .docs-facts > *, .try-guide > h2, .try-guide > p, .try-guide > .code, .try-guide > .try-steps > li, .try-guide > .news-preview, .scaffold .sec-head, .feature, .faq details, .section-aside, .access-plan, .terminal-heading, .metrics-grid > *, .quickstart-try, .quickstart-step, .quickstart-autopilot, .quickstart-explore, .quickstart-help"
    );
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (preference.matches) return;
        const animation = entry.target.animate(
          [{ opacity: 0.64, transform: "translate3d(0, 20px, 0)" }, { opacity: 1, transform: "translate3d(0, 0, 0)" }],
          { duration: 780, delay: Number((entry.target as HTMLElement).dataset.enterDelay ?? 0), easing: "cubic-bezier(.22, 1, .36, 1)" },
        );
        animations.add(animation);
        void animation.finished.then(() => animations.delete(animation)).catch(() => {});
      });
    }, { rootMargin: "0px 0px -5% 0px", threshold: 0.08 });
    targets.forEach((target, index) => {
      if (target.parentElement?.classList.contains("intro-copy")) target.dataset.enterDelay = String(Math.min(index * 55, 220));
      else if (["features", "metrics-grid", "quickstart-steps", "try-steps"].some(group => target.parentElement?.classList.contains(group))) {
        target.dataset.enterDelay = String(Math.min(Array.from(target.parentElement!.children).indexOf(target) * 55, 165));
      }
      observer.observe(target);
    });
    const stop = () => { if (preference.matches) animations.forEach(animation => animation.cancel()); };
    preference.addEventListener("change", stop);
    return () => { observer.disconnect(); animations.forEach(animation => animation.cancel()); preference.removeEventListener("change", stop); };
  }, []);

  useEffect(() => {
    if (!progress.current) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      const amount = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0;
      if (progress.current) progress.current.style.transform = `scaleX(${amount})`;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <main ref={root} className={`interior-page ${className}`}>
    {className.includes("documentation-page") && <span ref={progress} className="reading-progress" aria-hidden="true" />}
    {children}
  </main>;
}
