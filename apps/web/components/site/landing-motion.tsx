"use client";

import { useEffect } from "react";

/** Enhance visible content; nothing is hidden while JavaScript loads. */
export default function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector(".bs-home");
    if (!root) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches) return;
    const animations = new Set<Animation>();
    const enter = (node: Element, delay = 0) => {
      const animation = node.animate([
        { opacity: 0.5, transform: "translate3d(0, 22px, 0)" },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ], { duration: 850, delay, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
      animations.add(animation);
      void animation.finished.then(() => animations.delete(animation)).catch(() => {});
    };
    root.querySelectorAll(".bs-hero-copy > *, .bs-hero-grid > .mission-builder").forEach((node, index) => enter(node, index * 65));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        enter(entry.target, Number((entry.target as HTMLElement).dataset.motionDelay || 0));
      });
    }, { threshold: 0.12 });
    root.querySelectorAll(".bs-proof .wrap > div, .bs-crypto-head > div, .bs-crypto-stage, .bs-crypto-foot, .bs-section-head, .bs-principles article, .bs-live-grid > div, .bs-build-grid > div, .bs-closing .wrap > *").forEach(node => {
      const index = Array.from(node.parentElement?.children ?? []).indexOf(node);
      (node as HTMLElement).dataset.motionDelay = String(Math.min(index, 3) * 70);
      observer.observe(node);
    });
    const stop = () => { if (preference.matches) { observer.disconnect(); animations.forEach(animation => animation.cancel()); } };
    preference.addEventListener("change", stop);
    return () => { observer.disconnect(); animations.forEach(animation => animation.cancel()); preference.removeEventListener("change", stop); };
  }, []);
  return null;
}
