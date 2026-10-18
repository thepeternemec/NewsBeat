"use client";

import { usePathname } from "next/navigation";
import SoftAurora from "@/components/soft-aurora";
import ScrollReveal from "@/components/scroll-reveal";
import SmoothScroll from "@/components/smooth-scroll";
import MotionEnhance from "@/components/motion";
import Noise from "@/components/motion/noise";
import GridField from "@/components/site/grid-field";

/** Keep the existing subpage effects; the landing page uses native scrolling. */
export default function SiteEffects() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <>
      <GridField />
      <div className="aurora-layer" aria-hidden="true">
        <SoftAurora color1="#ffffff" color2="#6f6f6f" brightness={0.85} />
      </div>
      <Noise />
      <ScrollReveal />
      <SmoothScroll />
      <MotionEnhance />
    </>
  );
}
