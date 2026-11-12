import assert from "node:assert/strict";
import { test } from "node:test";
import type { AssetMarket, PricesPayload, Sourced } from "@newsbeat/contracts";
import { briefingMarket } from "./market-briefing.js";

const now = Date.parse("2026-11-12T12:00:00Z");
const at = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();
const asset = (id: string, change: number, age: number): AssetMarket => ({
  id, name: id, symbol: id.toUpperCase(), observed_at: at(age), change_24h: change,
  price_usd: 10, market_cap_usd: 1000, volume_24h_usd: 500,
});
const feed = (assets: AssetMarket[]): Sourced<PricesPayload> => ({
  source: "coingecko", source_url: "https://www.coingecko.com", fetched_at: at(0),
  ttl_seconds: 90, freshness: { status: "fresh", age_seconds: 0, refresh_in_seconds: 90 },
  data: { assets, unsupported: [] },
});

test("briefing counts only unique current tracked moves and cites the correct observation", () => {
  const market = briefingMarket(feed([
    asset("bitcoin", -0.03, 1), asset("ethereum", 0.02, 2), asset("solana", 0, 0),
    asset("bitcoin", 0.99, 1), asset("arbitrum", 0.25, 20), asset("sui", -0.9, -5),
    asset("outside-basket", 0.9, 1), asset("ripple", NaN, 0),
  ]), now);
  assert.ok(market);
  assert.deepEqual([market.tracked, market.up, market.down, market.flat], [12, 1, 1, 1]);
  assert.equal(market.source.observed_at, at(2));
  assert.equal(market.leader.name, "bitcoin");
  assert.equal(market.leader.source.observed_at, at(1));
});

test("a fresh fetch cannot turn an old price observation into a current briefing", () => {
  assert.equal(briefingMarket(feed([asset("bitcoin", 0.1, 11)]), now), null);
});
