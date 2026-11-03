import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "./motion.css";
import "./motion-components.css";
import "./theme.css";
import "./interior.css";
import "./refinement.css";
import "./newsbeat-brand.css";
import SoftAurora from "@/components/soft-aurora";
import ScrollReveal from "@/components/scroll-reveal";
import SmoothScroll from "@/components/smooth-scroll";
import MotionEnhance from "@/components/motion";
import Noise from "@/components/motion/noise";
import GridField from "@/components/site/grid-field";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.newsbeat.dev"),
  title: "NewsBeat — Stock and crypto news for AI agents",
  description:
    "Stock and crypto news for AI agents. Recent headlines, source-linked summaries and updates since your last check, through MCP and REST.",
  openGraph: {
    type: "website",
    url: "https://www.newsbeat.dev",
    siteName: "NewsBeat",
    title: "NewsBeat — Stock and crypto news for AI agents",
    description:
      "The news behind stocks and crypto. Recent headlines, short updates and source-linked context for your AI agent.",
  },
  twitter: {
    card: "summary_large_image",
    title: "NewsBeat — Stock and crypto news for AI agents",
    description:
      "Stock and crypto news for your AI agent. Headlines, sources and timestamps on every update.",
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

