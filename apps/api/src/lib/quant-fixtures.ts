import { MARKET_INTERVAL_MS as I, INTELLIGENCE_VERSION, SIGNAL_CONTEXTS, type IntelligenceSignal, type MarketSnapshot, type MarketInstrument } from "@newsbeat/contracts";
import { MARKET_PROFILES } from "./quant-market.js";
import { constructSignal } from "./signal-construction.js";

export function quantitativeFixture(now = Date.now(), impulse = 0.0005) {
  const profile = MARKET_PROFILES[0]!, peer = MARKET_PROFILES.find(item => item.pair === "QQQxUSD")!;
  const end = Math.floor(now / I) * I, known = end - 20 * 60000;
  const instrument = (p: typeof profile): MarketInstrument => ({ id: p.id, pair: p.pair, base: p.base, symbol: p.base + "/USD", underlying_ticker: p.ticker,
    kind: p.kind, venue: "kraken", quote: "USD", status: "online", source_url: "https://example.com/venue", mapping_url: "https://example.com/mapping", verified_at: new Date(now).toISOString() });
  const asset: MarketSnapshot = { instrument: instrument(profile), observed_at: new Date(now).toISOString(), bars: [], book: null, error: null };
  const benchmark: MarketSnapshot = { instrument: instrument(peer), observed_at: new Date(now).toISOString(), bars: [], book: null, error: null };
  let a = 100, b = 100;
  for (let index = 0; index < 360; index++) {
    const marketReturn = Math.sin(index * 0.79) * 0.0008 + Math.cos(index * 0.17) * 0.0003;
    const noise = index >= 354 ? impulse : Math.sin(index * 1.7) * 0.0006 + Math.cos(index * 0.43) * 0.0006;
    const beforeA = a, beforeB = b;
    a *= Math.exp(1.2 * marketReturn + noise); b *= Math.exp(marketReturn);
    const time = end - (360 - index) * I;
    asset.bars.push({ time, open: beforeA, high: Math.max(beforeA, a), low: Math.min(beforeA, a), close: a, volume: index >= 354 ? 40 : 10, trades: 10 });
    benchmark.bars.push({ time, open: beforeB, high: Math.max(beforeB, b), low: Math.min(beforeB, b), close: b, volume: 100, trades: 10 });
  }
  for (const snapshot of [asset, benchmark]) {
    const mid = snapshot.bars.at(-1)!.close;
    snapshot.book = { observed_at: new Date(now).toISOString(), mid, bid: mid * 0.9999, ask: mid * 1.0001,
      spread_bps: 2, bid_depth_usd: 100000, ask_depth_usd: 100000, imbalance: 0, reference_notional_usd: 1000, buy_impact_bps: 1, sell_impact_bps: 1 };
  }
  const title = "Nvidia raises revenue guidance after new customer orders";
  const signal: IntelligenceSignal = {
    id: "sig_quant_test", beat_id: profile.beat_id!, version: 1, change_kind: "new", category: "guidance", event_state: "reported",
    what_changed: title, affected_entities: ["Nvidia"], attention: "priority", attention_reason: "Guidance could affect revenue.",
    implications: [{ hypothesis: "Guidance could imply stronger demand.", mechanism: "Orders may translate into sales.", watch_for: "Official guidance.", evidence_ids: ["r1"], basis: "inference" }],
    unknowns: ["Commercial terms."], next_checks: ["Read official guidance."],
    evidence: [{ id: "r1", title, source: "Publisher", url: "https://example.com/report", published_at: new Date(known - 60000).toISOString(), first_indexed_at: new Date(known - 30000).toISOString() }],
    first_detected_at: new Date(known).toISOString(), updated_at: new Date(known).toISOString(), evidence_updated_at: new Date(known).toISOString(),
    change_reason: "A new reported guidance change.", basis: "headline_metadata", interpretation: "model_inference", model: "test/model", pipeline_version: INTELLIGENCE_VERSION,
    market_assessment: { channel: "revenue", direction: "supportive", materiality: "medium", horizon: "days", market_relevance: "Guidance could affect revenue expectations.", why_it_may_not_move: "Costs may offset sales.", invalidation: "Withdrawal would weaken the premise.",
      trigger: { condition: "Nvidia reports increased revenue guidance.", status: "reported", report_id: "r1", headline_quote: title } },
  };
  const context = SIGNAL_CONTEXTS[0]!;
  const base = constructSignal(signal, context, { now: new Date(now).toISOString(), source_freshness: "fresh", analysis_ready: true, analysis_at: new Date(now).toISOString() });
  return { now, end, known, profile, asset, benchmark, snapshots: new Map([[profile.id, asset], [peer.id, benchmark]]), signal, context, base };
}
