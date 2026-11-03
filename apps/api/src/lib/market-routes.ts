/**
 * Market and sentiment routes, exposed exactly like the news routes.
 *
 * Same `/v2` prefix, same JSON-error shape, same cache headers on every response. An
 * agent that already knows how to read `/v2/news` can read `/v2/market/overview` without
 * learning anything new.
 */

import { Hono } from "hono";
import { chainTvl, DEFAULT_PRICE_IDS, fearGreed, overview, prices } from "./market.js";
import { chainPulse, contractToken } from "./chain.js";
import { ask } from "./ask.js";
import { signals } from "./signals.js";

export const marketRoutes = new Hono();

marketRoutes.onError((error, c) => {
  console.error("market request failed", error instanceof Error ? error.message : error);
  return c.json(
    { error: { code: "service_unavailable", message: "Market data is temporarily unavailable. Try again shortly." } },
    503,
  );
});

/**
 * Attribution travels in headers as well as in the body, so a proxy or a caching layer
 * can show where a number came from without parsing it.
 */
function attributed(c: {
  header: (name: string, value: string) => void;
}, source: string, fetchedAt: string, ttlSeconds: number) {
  c.header("X-NewsBeat-Source", source);
  c.header("X-NewsBeat-Fetched-At", fetchedAt);
  // One second of browser caching, because a caller who refreshes should get a fresh
  // number from the edge cache rather than a stale one from their own disk.
  c.header("Cache-Control", `public, max-age=1, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 4}`);
}

const clamp = (raw: string | undefined, fallback: number, max: number) => {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
};

marketRoutes.get("/market", async (c) => {
  const payload = await overview();
  const sources = [payload.fear_greed, payload.tvl, payload.prices]
    .filter((part) => "source" in part)
    .map((part) => part.source);
  attributed(c, [...new Set(sources)].join(","), new Date().toISOString(), 90);
  return c.json(payload);
});

marketRoutes.get("/sentiment", async (c) => {
  const payload = await fearGreed(clamp(c.req.query("limit"), 7, 30));
  attributed(c, payload.source, payload.fetched_at, payload.ttl_seconds);
  return c.json(payload);
});

marketRoutes.get("/tvl", async (c) => {
  const payload = await chainTvl(clamp(c.req.query("limit"), 12, 100));
  attributed(c, payload.source, payload.fetched_at, payload.ttl_seconds);
  return c.json(payload);
});

marketRoutes.get("/prices", async (c) => {
  const raw = (c.req.query("ids") ?? "").trim();
  // `ids` is a comma-separated CoinGecko id list ("bitcoin", not "BTC"), because that is
  // what the upstream uses and guessing gives people the wrong asset.
  const ids = raw ? raw.split(",") : [...DEFAULT_PRICE_IDS];
  const payload = await prices(ids);
  attributed(c, payload.source, payload.fetched_at, payload.ttl_seconds);
  return c.json(payload);
});

marketRoutes.get("/chain", async (c) => {
  const payload = await chainPulse();
  attributed(c, payload.source, payload.fetched_at, payload.ttl_seconds);
  return c.json(payload);
});

marketRoutes.get("/token", async (c) => {
  const asset = (c.req.query("asset") ?? "").trim();
  if (!asset) {
    return c.json({ error: { code: "invalid_request", message: "asset is required, as chain:address or a 0x address." } }, 400);
  }
  const payload = await contractToken(asset);
  attributed(c, payload.source, payload.fetched_at, payload.ttl_seconds);
  return c.json(payload);
});

marketRoutes.get("/ask", async (c) => {
  const query = (c.req.query("q") ?? "").trim();
  if (!query) {
    return c.json({ error: { code: "invalid_request", message: "q is required, e.g. ?q=nvidia or ?q=0x…" } }, 400);
  }
  const payload = await ask(query);
  // The slowest part sets the envelope: news is on a fifteen-minute cycle, chain on eight
  // seconds, so five seconds is a safe edge cache for the combined answer.
  attributed(c, "mixed", new Date().toISOString(), 5);
  return c.json(payload);
});

marketRoutes.get("/signals", async (c) => {
  const payload = await signals();
  const sources = [payload.funding, payload.dex_volume, payload.stablecoins]
    .filter((part) => "source" in part)
    .map((part) => part.source);
  attributed(c, [...new Set(sources)].join(","), new Date().toISOString(), 60);
  return c.json(payload);
});
