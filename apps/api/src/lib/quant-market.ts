import { MARKET_INTERVAL_MS, type MarketBar, type MarketBook, type MarketInstrument, type MarketSnapshot } from "@newsbeat/contracts";

export interface MarketProfile {
  id: string; pair: string; base: string; ticker: string; kind: MarketInstrument["kind"]; beat_id?: string;
}
const profile = (pair: string, base: string, ticker: string, kind: MarketProfile["kind"], beat_id?: string): MarketProfile =>
  ({ id: "kraken:" + pair, pair, base, ticker, kind, ...(beat_id ? { beat_id } : {}) });
export const MARKET_PROFILES: MarketProfile[] = [
  profile("NVDAxUSD", "NVDAx", "NVDA", "tokenized_equity", "b_bb964843350e"),
  profile("AAPLxUSD", "AAPLx", "AAPL", "tokenized_equity", "b_7d5acdda6186"),
  profile("MSFTxUSD", "MSFTx", "MSFT", "tokenized_equity", "b_a723a1d2787f"),
  profile("GOOGLxUSD", "GOOGLx", "GOOGL", "tokenized_equity", "b_c0c3f9282a94"),
  profile("XBTUSD", "BTC", "BTC", "crypto", "b_06c91290de1c"),
  profile("ETHUSD", "ETH", "ETH", "crypto", "b_edbc5b5af755"),
  profile("QQQxUSD", "QQQx", "QQQ", "tokenized_equity"),
  profile("SOLUSD", "SOL", "SOL", "crypto"),
];
export function benchmarkFor(profile: MarketProfile) {
  if (profile.kind === "tokenized_equity") return { label: "QQQx / USD", methodology: "Same-venue Nasdaq-100 token proxy; token prices, not consolidated underlying-share prices.", components: [{ instrument_id: "kraken:QQQxUSD", weight: 1 }] };
  const peers = profile.ticker === "BTC" ? ["ETHUSD", "SOLUSD"] : ["XBTUSD", "SOLUSD"];
  return { label: profile.ticker === "BTC" ? "ETH + SOL proxy" : "BTC + SOL proxy", methodology: "Equal-weight five-minute returns of two same-venue USD crypto peers, excluding the asset itself; a narrow proxy, not the whole market.", components: peers.map(pair => ({ instrument_id: "kraken:" + pair, weight: 0.5 })) };
}
export const KRAKEN_BASE = "https://api.kraken.com/0/public/";
type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
const numeric = (value: unknown) => typeof value === "number" || typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
function result(body: unknown): JsonObject {
  const raw = object(body);
  if (!raw || !Array.isArray(raw.error) || raw.error.length || !object(raw.result)) throw new Error("provider_response_invalid");
  return raw.result as JsonObject;
}
export function verifyInstrument(body: unknown, wanted: MarketProfile, observedAt: string): MarketInstrument {
  const pairs = result(body);
  const match = Object.entries(pairs).find(([key, value]) => key === wanted.pair || object(value)?.altname === wanted.pair);
  const data = object(match?.[1]);
  const expectedClass = wanted.kind === "tokenized_equity" ? "tokenized_asset" : "currency";
  if (!data || data.base !== wanted.base || data.quote !== "USD" || data.aclass_base !== expectedClass || data.altname !== wanted.pair || data.status !== "online") throw new Error("instrument_mapping_unverified");
  return { id: wanted.id, symbol: wanted.base + "/USD", underlying_ticker: wanted.ticker, kind: wanted.kind,
    venue: "kraken", pair: wanted.pair, base: wanted.base, quote: "USD", status: "online",
    source_url: "https://pro.kraken.com/app/trade/" + encodeURIComponent(wanted.base.toLowerCase() + "-usd"),
    mapping_url: KRAKEN_BASE + "AssetPairs?assetVersion=1&aclass_base=" + expectedClass + "&pair=" + wanted.pair,
    verified_at: observedAt };
}
function pairValue(body: unknown, instrument: MarketInstrument): unknown {
  const data = result(body);
  const accepted = [instrument.pair, instrument.base + "/USD", instrument.base === "BTC" ? "XBT/USD" : ""];
  const entries = Object.entries(data).filter(([key]) => key !== "last");
  if (entries.length !== 1 || !accepted.includes(entries[0]![0])) throw new Error("provider_pair_mismatch");
  return entries[0]![1];
}
/** Kraken always includes an uncommitted final bucket. Never expose it to the estimator. */
export function parseClosedBars(body: unknown, instrument: MarketInstrument, now: number): MarketBar[] {
  const values = pairValue(body, instrument);
  if (!Array.isArray(values) || values.length < 2) throw new Error("market_history_missing");
  const bars: MarketBar[] = [];
  for (const row of values.slice(0, -1)) {
    if (!Array.isArray(row) || row.length < 8) throw new Error("market_bar_invalid");
    const [time, open, high, low, close, , volume, trades] = row.map(numeric);
    if (![time, open, high, low, close, volume, trades].every(Number.isFinite) || time! <= 0 || time! * 1000 % MARKET_INTERVAL_MS !== 0 ||
      open! <= 0 || low! <= 0 || high! < Math.max(open!, close!) || low! > Math.min(open!, close!) || high! < low! ||
      close! <= 0 || volume! < 0 || trades! < 0 || !Number.isInteger(trades)) throw new Error("market_bar_invalid");
    if (time! * 1000 + MARKET_INTERVAL_MS > now) continue;
    bars.push({ time: time! * 1000, open: open!, high: high!, low: low!, close: close!, volume: volume!, trades: trades! });
  }
  const unique = new Map(bars.map(bar => [bar.time, bar]));
  if (unique.size !== bars.length || !bars.length) throw new Error("market_history_invalid");
  return [...unique.values()].sort((a, b) => a.time - b.time).slice(-720);
}
export function parseBook(body: unknown, instrument: MarketInstrument, observedAt: string): MarketBook {
  const value = object(pairValue(body, instrument));
  const levels = (input: unknown): Array<{ price: number; size: number }> => {
    if (!Array.isArray(input) || !input.length) throw new Error("market_book_missing");
    return input.slice(0, 10).map(row => {
      if (!Array.isArray(row)) throw new Error("market_book_invalid");
      const price = numeric(row[0]), size = numeric(row[1]);
      if (!Number.isFinite(price) || !Number.isFinite(size) || price <= 0 || size <= 0) throw new Error("market_book_invalid");
      return { price, size };
    });
  };
  const asks = levels(value?.asks).sort((a, b) => a.price - b.price), bids = levels(value?.bids).sort((a, b) => b.price - a.price);
  const ask = asks[0]!.price, bid = bids[0]!.price;
  if (ask <= bid) throw new Error("market_book_crossed");
  const mid = (ask + bid) / 2, notional = 1000;
  let dollars = notional, bought = 0;
  for (const level of asks) { const spend = Math.min(dollars, level.price * level.size); bought += spend / level.price; dollars -= spend; }
  let units = notional / mid, proceeds = 0;
  for (const level of bids) { const sell = Math.min(units, level.size); proceeds += sell * level.price; units -= sell; }
  const bidDepth = bids.reduce((sum, row) => sum + row.price * row.size, 0), askDepth = asks.reduce((sum, row) => sum + row.price * row.size, 0);
  return { observed_at: observedAt, bid, ask, mid, spread_bps: (ask - bid) / mid * 10000, bid_depth_usd: bidDepth, ask_depth_usd: askDepth,
    imbalance: (bidDepth - askDepth) / (bidDepth + askDepth), reference_notional_usd: notional,
    buy_impact_bps: dollars <= 0.000001 ? (notional / bought / mid - 1) * 10000 : null,
    sell_impact_bps: units <= 0.000001 ? (1 - proceeds / notional) * 10000 : null };
}
export interface MarketRefresh { id: string; snapshot?: MarketSnapshot; error?: string }
/** Public endpoints share an IP budget. Space starts and bound transient retries. */
export function marketRequester(dependencies: { fetch?: typeof fetch; now?: () => number; wait?: (ms: number) => Promise<void> } = {}) {
  const request = dependencies.fetch ?? fetch, clock = dependencies.now ?? Date.now;
  const wait = dependencies.wait ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  let nextStart = 0;
  return async (url: string) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const start = Math.max(clock(), nextStart);
      nextStart = start + 1100;
      if (start > clock()) await wait(start - clock());
      let response: Response;
      try { response = await request(url, { signal: AbortSignal.timeout(8000), headers: { accept: "application/json", "user-agent": "NewsBeat/0.4 contact@newsbeat.dev" } }); }
      catch (error) { if (!attempt) continue; throw error; }
      if (!response.ok) {
        if (!attempt && (response.status === 429 || response.status >= 500)) {
          const after = Number(response.headers.get("retry-after"));
          if (Number.isFinite(after) && after > 5) throw new Error("provider_rate_limited");
          nextStart = Math.max(nextStart, clock() + (Number.isFinite(after) && after > 0 ? after * 1000 : 2200));
          continue;
        }
        throw new Error("provider_http_" + response.status);
      }
      const body: unknown = await response.json(), errors = object(body)?.error;
      if (Array.isArray(errors) && errors.length) {
        if (!attempt && errors.some(error => typeof error === "string" && /rate limit|too many|throttl|unavailable|busy/i.test(error))) { nextStart = Math.max(nextStart, clock() + 2200); continue; }
        throw new Error(errors.some(error => typeof error === "string" && /rate limit|too many|throttl/i.test(error)) ? "provider_rate_limited" : "provider_response_invalid");
      }
      return body;
    }
    throw new Error("market_source_unavailable");
  };
}
export async function fetchMarketSnapshots(now = Date.now()): Promise<MarketRefresh[]> {
  const get = marketRequester();
  const observedAt = new Date(now).toISOString();
  const classes = await Promise.allSettled(["currency", "tokenized_asset"].map(assetClass => {
    const pairs = MARKET_PROFILES.filter(p => (p.kind === "crypto" ? "currency" : "tokenized_asset") === assetClass).map(p => p.pair).join(",");
    return get(KRAKEN_BASE + "AssetPairs?assetVersion=1&aclass_base=" + assetClass + "&pair=" + encodeURIComponent(pairs));
  }));
  const output: MarketRefresh[] = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (cursor < MARKET_PROFILES.length) {
      const wanted = MARKET_PROFILES[cursor++]!;
      try {
        const metadata = classes[wanted.kind === "crypto" ? 0 : 1]!;
        if (metadata.status !== "fulfilled") throw new Error("instrument_directory_unavailable");
        const instrument = verifyInstrument(metadata.value, wanted, observedAt);
        const query = "?assetVersion=1&pair=" + encodeURIComponent(instrument.pair) + (wanted.kind === "tokenized_equity" ? "&asset_class=tokenized_asset" : "");
        const [history, depth] = await Promise.allSettled([get(KRAKEN_BASE + "OHLC" + query + "&interval=5"), get(KRAKEN_BASE + "Depth" + query + "&count=10")]);
        if (history.status !== "fulfilled") throw new Error("market_history_unavailable");
        const collectedAt = new Date().toISOString();
        const bars = parseClosedBars(history.value, instrument, Date.parse(collectedAt));
        let book: MarketBook | null = null;
        try { if (depth.status === "fulfilled") book = parseBook(depth.value, instrument, collectedAt); } catch { /* Price history remains usable; book gates stay closed. */ }
        output.push({ id: wanted.id, snapshot: { instrument, observed_at: collectedAt, bars, book, error: book ? null : depth.status === "rejected" && depth.reason instanceof Error && /^[a-z0-9_]+$/.test(depth.reason.message) ? depth.reason.message : "market_book_unavailable" } });
      } catch (error) {
        output.push({ id: wanted.id, error: error instanceof Error && /^[a-z0-9_]+$/.test(error.message) ? error.message : "market_source_unavailable" });
      }
    }
  }));
  return output;
}
