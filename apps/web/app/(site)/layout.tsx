import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "./motion.css";
import "./motion-components.css";
import "./theme.css";
import "./interior.css";
import "./refinement.css";
import "./black-sheep-brand.css";
import SoftAurora from "@/components/soft-aurora";
import ScrollReveal from "@/components/scroll-reveal";
import SmoothScroll from "@/components/smooth-scroll";
import MotionEnhance from "@/components/motion";
import Noise from "@/components/motion/noise";
import GridField from "@/components/site/grid-field";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.newsbeat.dev"),
  title: "Black Sheep — Intelligence for tokenized assets",
  description:
    "Black Sheep follows the news behind tokenized assets. Source-linked company intelligence for AI agents, with Robinhood Chain asset mapping and agent coordination planned.",
  openGraph: {
    type: "website",
    url: "https://www.newsbeat.dev",
    siteName: "Black Sheep",
    title: "Black Sheep — Intelligence for tokenized assets",
    description:
      "Follow the news behind tokenized assets. Company headlines, linked sources and fresh context for your AI agent.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Black Sheep — Intelligence for tokenized assets",
    description:
      "Company news and source-linked context for your AI agent. Follow the real-world stories behind tokenized assets.",
  },
};

/**
 * Runs during parse, before React. Without it the page paints dark and then flips,
 * which is worse than not offering a choice.
 */
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem("blacksheep-theme")||localStorage.getItem("newsbeat-theme");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}})();`;

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

