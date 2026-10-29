import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "./motion.css";
import "./motion-components.css";
import "./theme.css";
import "./interior.css";
import "./refinement.css";
import SoftAurora from "@/components/soft-aurora";
import ScrollReveal from "@/components/scroll-reveal";
import SmoothScroll from "@/components/smooth-scroll";
import MotionEnhance from "@/components/motion";
import Noise from "@/components/motion/noise";
import GridField from "@/components/site/grid-field";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.newsbeat.dev"),
  title: "Black Sheep — A different breed of intelligence",
  description:
    "Black Sheep is a meme coin concept with a news intelligence engine for tokenized-asset research. Source-linked news today; agent coordination and token utility planned.",
  openGraph: {
    type: "website",
    url: "https://www.newsbeat.dev",
    siteName: "Black Sheep",
    title: "Black Sheep — A different breed of intelligence",
    description:
      "Ask what happened with the companies and crypto you follow. Recent headlines, short updates, and linked reporting for your AI agent.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Black Sheep — A different breed of intelligence",
    description:
      "Recent company and crypto news for your AI agent. Ask what happened and get a source-linked update.",
  },
};

/**
 * Runs during parse, before React. Without it the page paints dark and then flips,
 * which is worse than not offering a choice.
 */
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem("newsbeat-theme");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="antialiased">
        <GridField />
        <div className="aurora-layer" aria-hidden="true">
          {/* Neutral: the aurora reads as soft light, not colour. */}
          <SoftAurora color1="#ffffff" color2="#6f6f6f" brightness={0.85} />
        </div>
        <Noise />
        <ScrollReveal />
        <SmoothScroll />
        <MotionEnhance />
        {children}
        {/* Page views. Mounted at the root so every route is counted, including
            the docs and the dashboard. */}
        <Analytics />
      </body>
    </html>
  );
}
