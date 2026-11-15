import assert from "node:assert/strict";
import { test } from "node:test";
import { SEED_BEATS, type FilingEvidence } from "@newsbeat/contracts";
import { filingDiscovery, pressDiscovery, rankDiscovery } from "./discovery-core.js";

const published = "2026-11-15T19:00:00.000Z";
const indexed = "2026-11-15T19:05:00.000Z";
const recorded = "2026-11-15T19:06:00.000Z";
const now = Date.parse("2026-11-15T19:08:00.000Z");
const beat = (ticker: string, asset?: "equity" | "crypto") => SEED_BEATS.find(row => row.ticker === ticker && (!asset || (row.asset ?? "equity") === asset))!.beat_id;
const press = (ticker: string, title: string, id = "1", asset?: "equity" | "crypto", url = "https://example.com/report") =>
  pressDiscovery({ id, beat_id: beat(ticker, asset), title, source: "Publisher", url, published_at: published, indexed_at: indexed });

test("discovery rejects unrelated collision headlines and ticker opinion", () => {
  assert.equal(press("AAPL", "Apple Blossom Festival Unveils Theme for Historic 100th Celebration"), null);
  assert.equal(press("AAPL", "Apple Blossom Festival raises $1 million for local schools"), null);
  assert.equal(press("XRP", "Flights will continue to be impacted in ripple effect after nationwide stoppage"), null);
  assert.equal(press("DOGE", "DOGE tribal grant cuts total $468.7 million"), null);
  assert.equal(press("CCK", "Crown Point Energy Inc. Reports Earnings Results for the Third Quarter"), null);
  assert.equal(press("HOOD", "Klarna Names Robinhood Executive Chris Koegel as New Chief Financial Officer"), null);
  assert.equal(press("SOL", "Jung Kwan Jang Signs Wonder Dogs' Kim Da-sol"), null);
  assert.equal(press("SUI", "$SUI activates mainnet upgrade", "9", "crypto"), null, "shared cashtag needs a disambiguated name");
  assert.equal(press("AMD", "Advanced Micro Devices, Inc. $AMD Holdings Boosted by Optas LLC"), null);
  assert.equal(press("ETH", "Ethereum Price Prediction: ETH Trades Near $1,910 as Remittix Announces a Planned $0.46 RTX Listing Price"), null);
  assert.equal(press("NVDA", "Nvidia Reports Earnings on Nov. 17. Here's What Investors Should Be Watching."), null);
  assert.equal(press("COIN", "Coinbase could suspend withdrawals amid outage"), null);
  assert.equal(press("AAPL", "Apple cuts full-year revenue outlook", "3", "equity", "javascript:alert(1)"), null);
});

test("discovery recognizes a reported change and preserves cross-asset evidence without duplicate cards", () => {
  assert.equal(press("AAPL", "Apple cuts full-year revenue outlook")?.kind, "guidance");
  assert.equal(press("NVDA", "Jensen Huang resigns as Nvidia CEO")?.kind, "leadership");
  assert.equal(press("ETH", "Ethereum activates new mainnet upgrade")?.kind, "protocol");
  assert.equal(press("BTC", "Bitcoin shares its 2026 price prediction: will it rally?"), null);
  const title = "CFTC sues Louisiana after court halts Kalshi, Robinhood and Coinbase event contracts";
  const event = press("COIN", title);
  const related = press("HOOD", title, "2");
  assert.equal(event?.kind, "regulation");
  assert.equal(related?.event_id, event?.event_id);
  assert.ok(event && related);
  const [item] = rankDiscovery([{ ...related, recorded_at: "2026-11-15T19:07:00.000Z" }, { ...event, recorded_at: recorded }], now, 5);
  assert.deepEqual(item?.assets.map(asset => asset.ticker), ["COIN", "HOOD"]);
  assert.equal(item?.evidence.length, 1);
  assert.equal(item?.first_recorded_at, recorded);
  assert.equal(item?.evidence[0]?.indexed_at, indexed);
  assert.equal(item?.title, title);
});

test("similar coverage stays on one card and keeps the first record and both publishers", () => {
  const first = press("MSFT", "Microsoft services restored after lengthy outage", "10");
  const second = press("MSFT", "Microsoft says services ‘restored,’ outage over", "20", "equity", "https://example.org/update");
  assert.ok(first && second);
  const latest = { ...second, recorded_at: "2026-11-15T19:07:00.000Z" };
  const items = rankDiscovery([latest, { ...first, recorded_at: recorded }], now, 5);
  assert.equal(items.length, 1);
  assert.equal(items[0]?.id, first.event_id);
  assert.equal(items[0]?.first_recorded_at, recorded);
  assert.equal(items[0]?.evidence.length, 2);
});

test("filing category comes from a material form item and keeps the acceptance timestamp", () => {
  const filing: FilingEvidence = { id: "sec:0001045810:0001045810-26-000082", form: "8-K", accession: "0001045810-26-000082",
    accepted_at: published, filed_on: "2026-11-15", report_date: null, items: ["5.02", "9.01"],
    description: "Leadership or compensation change", url: "https://www.sec.gov/Archives/edgar/data/1045810/000104581026000082/nvda-20261111.htm" };
  const row = filingDiscovery(beat("NVDA"), filing, indexed);
  assert.equal(row?.evidence.type, "official_filing");
  assert.equal(row?.evidence.published_at, published);
  assert.equal(row?.kind, "leadership");
  assert.equal(filingDiscovery(beat("NVDA"), { ...filing, items: ["9.01"] }, indexed), null);
});
