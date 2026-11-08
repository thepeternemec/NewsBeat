"use client";

import { useEffect } from "react";

/** Motion explains the page without hiding content before hydration. */
export default function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".nb-home.ni-home");
    if (!root) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cleanup: (() => void) | undefined;
    const sync = () => {
      cleanup?.();
      cleanup = undefined;
      if (preference.matches || typeof root.animate !== "function") return;
      const animations = new Set<Animation>();
      const animate = (node: Element, frames: Keyframe[], delay = 0, duration = 950) => {
        const animation = node.animate(frames, { duration, delay, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
        animations.add(animation);
        void animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
      };
      root.querySelectorAll("[data-hero-line]").forEach((node, index) => animate(node, [
        { opacity: .35, transform: "translate3d(0, 30px, 0) rotateX(16deg)", filter: "blur(6px)" },
        { opacity: 1, transform: "translate3d(0, 0, 0) rotateX(0)", filter: "blur(0)" },
      ], index * 120, 1150));
      root.querySelectorAll(".bs-hero-copy > .bs-kicker, .bs-hero-copy > .bs-lede, .bs-hero-copy > .hero-cta, .nb-home-cadence, .ni-stage-note, .nb-flow-cue").forEach((node, index) => animate(node, [
        { opacity: .4, transform: "translate3d(0, 16px, 0)" },
        { opacity: 1, transform: "none" },
      ], 100 + index * 65));
      const live = root.querySelector(".nb-live-stage");
      if (live) animate(live, [
        { opacity: .45, transform: "perspective(1200px) translate3d(0, 22px, 0) rotateY(-5deg) rotateX(2deg)" },
        { opacity: 1, transform: "perspective(1200px) translate3d(0, 0, 0) rotateY(0) rotateX(0)" },
      ], 150, 1250);
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          const siblings = Array.from(entry.target.parentElement?.children ?? []);
          const delay = Math.min(siblings.indexOf(entry.target), 2) * 80;
          animate(entry.target, [
            { opacity: .5, transform: "perspective(1400px) translate3d(0, 36px, 0) rotateX(4deg) scale(.985)" },
            { opacity: 1, transform: "perspective(1400px) translate3d(0, 0, 0) rotateX(0) scale(1)" },
          ], delay, 1050);
        }
      }, { threshold: .12 });
      root.querySelectorAll(".bs-crypto-head > div, .clarity-flow, .nb-coverage-scope, .bs-section-head, .nb-feature-links > a, .bs-closing .wrap > *").forEach(node => observer.observe(node));
      let frame = 0;
      const updateScroll = () => {
        frame = 0;
        root.style.setProperty("--landing-progress", String(Math.min(Math.max(window.scrollY / window.innerHeight, 0), 1)));
      };
      const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(updateScroll); };
      updateScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanup = () => {
        observer.disconnect();
        animations.forEach(animation => animation.cancel());
        window.removeEventListener("scroll", onScroll);
        if (frame) window.cancelAnimationFrame(frame);
        root.style.removeProperty("--landing-progress");
      };
    };
    sync();
    preference.addEventListener("change", sync);
    return () => { cleanup?.(); preference.removeEventListener("change", sync); };
  }, []);
  return null;
}
