import assert from "node:assert/strict";
import { test } from "node:test";
import type { MarketContext, MarketResearch } from "@newsbeat/contracts";
import { quantitativeResearchEvidence, researchFreshness } from "./research-market.js";

const now = Date.parse("2026-11-07T12:00:00Z");
const at = "2026-11-07T11:59:00Z";
function fixture() {
  const market: MarketContext = {
    policy_version: "test", status: "ready", observed_at: at,
    instrument: { id: "test", kind: "crypto", venue: "kraken", pair: "XBTUSD", source_url: "https://www.kraken.com", beat_id: "b_06c91290de1c" } as MarketContext["instrument"],
    benchmark: { label: "peer", methodology: "test", components: [] }, last_trade_at: at, last_bar_at: at, book: null,
    windows: [{ minutes: 15, start_at: "2026-11-07T11:44:00Z", end_at: at, asset_return: .02, benchmark_return: .01, excess_return: .01, residual_return: .008, residual_z: null, active_fraction: 1, trades: 50, volume: 20 }],
    fit: null, volume_ratio: 1.5, return_acceleration: null, curve: [], quality: [], limitations: [],
  };
  const research: MarketResearch = {
    detector_version: "test", scanned_at: at, status: "ready", headline: "test", explanation: "test",
    windows: [{ minutes: 15, status: "unusual", start_at: "2026-11-07T11:44:00Z", end_at: at, direction: "up",
      residual_return: .008, residual_z: null, historical_windows: 60, historical_exceedances: 1,
      empirical_tail_fraction: .0167, volume_ratio: 1.5, fit: null, regime: "stable", volatility_ratio: 1, checks: [] }],
    reporting: { status: "unmatched", signal_ids: [], note: "" }, records: [], note: "",
  };
  return { market, research };
}

test("question evidence reuses residuals, participation and independent anomaly context", () => {
  const facts = quantitativeResearchEvidence("b_06c91290de1c", fixture(), now);
  assert.equal(facts.length, 3);
  assert.ok(facts.every(fact => fact.freshness === "fresh"));
  assert.ok(facts.some(fact => fact.text.includes("fitted residual return: 0.8000%")));
  assert.ok(facts.some(fact => fact.text.includes("1.5000 times")));
  assert.ok(facts.some(fact => fact.text.includes("0.0167") && fact.text.includes("not a probability of future profit")));
});

test("a fresh read cannot make old market windows or held discovery fresh", () => {
  const quant = fixture();
  quant.market.windows[0]!.end_at = "2026-11-07T10:00:00Z";
  quant.research.status = "data_hold";
  const facts = quantitativeResearchEvidence("b_06c91290de1c", quant, now);
  assert.equal(facts.find(fact => fact.id.startsWith("market:"))?.freshness, "stale");
  assert.equal(facts.find(fact => fact.id.startsWith("discovery:"))?.freshness, "stale");
  assert.equal(researchFreshness("fresh", "2026-11-08T00:00:00Z", 600_000, now), "stale");
  assert.equal(researchFreshness("fresh", null, 600_000, now), "unavailable");
});
