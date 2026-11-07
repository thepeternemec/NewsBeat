"use client";

import { useEffect } from "react";
import type LenisClass from "lenis";

/** Smooth the document while keeping touch, nested panels and reduced motion native. */
export default function SmoothScroll() {
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let generation = 0;
    let lenis: LenisClass | null = null;

    async function syncPreference() {
      const current = ++generation;
      lenis?.destroy();
      lenis = null;
      if (preference.matches) return;

      const { default: Lenis } = await import("lenis");
      if (disposed || current !== generation || preference.matches) return;
      lenis = new Lenis({
        autoRaf: true,
        autoResize: true,
        lerp: 0.14,
        smoothWheel: true,
        syncTouch: false,
        allowNestedScroll: true,
        anchors: { offset: -96 },
      });
    }

    // Images, fonts and restored browser pages can change the scrollable height.
    const resize = () => lenis?.resize();
    const sync = () => { void syncPreference().catch(() => { /* Native scrolling remains available. */ }); };
    sync();
    preference.addEventListener("change", sync);
    window.addEventListener("load", resize);
    window.addEventListener("pageshow", resize);
    void document.fonts.ready.then(() => { if (!disposed) resize(); });

    return () => {
      disposed = true;
      generation++;
      preference.removeEventListener("change", sync);
      window.removeEventListener("load", resize);
      window.removeEventListener("pageshow", resize);
      lenis?.destroy();
    };
  }, []);

  return null;
}
