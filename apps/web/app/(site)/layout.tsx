import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "./motion.css";
import "./motion-components.css";
import "./theme.css";
import SiteEffects from "@/components/site/site-effects";

export const metadata: Metadata = {
  title: "NewsGraph — The news layer for AI agents",
  description:
    "Give your AI agents current market context. Follow equities and crypto, get new headlines with sources, and connect through REST, MCP, or tool calling. Free during early access.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SiteEffects />
        {children}
        {/* Page views. Mounted at the root so every route is counted, including
            the docs and the dashboard. */}
        <Analytics />
      </body>
    </html>
  );
}
