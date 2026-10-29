import type { MetadataRoute } from "next";

const ORIGIN = "https://www.newsbeat.dev";

// Only public, indexable pages. API endpoints and generated image routes are omitted.
const PAGES = [
  "/",
  "/connect",
  "/dashboard",
  "/docs",
  "/docs/connect",
  "/docs/data",
  "/docs/quickstart",
  "/docs/robinhood-chain",
  "/docs/try",
  "/faq",
  "/keys",
  "/legal/cookies",
  "/legal/terms",
  "/llms",
  "/pricing",
  "/status",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({ url: `${ORIGIN}${path}` }));
}
