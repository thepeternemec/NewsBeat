import assert from "node:assert/strict";
import { test } from "node:test";
import type { ResearchAsset, ResearchEvidence } from "@newsbeat/contracts";
import { isReferenceQuoteQuestion, referenceQuoteAnswer } from "./research-quote.js";

const asset: ResearchAsset = { beat_id: "b_06c91290de1c", label: "Bitcoin", ticker: "BTC", asset: "crypto",
  news_status: "fresh", market_status: "fresh", coverage_truncated: false, reports_scanned: 0, limitations: [] };
const quote: ResearchEvidence = { id: "quote:" + asset.beat_id, beat_id: asset.beat_id, kind: "measurement",
  text: "Bitcoin reference price: USD 75636.15.", source: "CoinGecko", url: "https://coingecko.com",
  observed_at: "2026-11-07T23:00:00.000Z", freshness: "fresh" };

test("current quote reads preserve values, attribution and time without model generation", () => {
  assert.equal(isReferenceQuoteQuestion("What is Bitcoin’s current reference price?"), true);
  const answer = referenceQuoteAnswer([asset], [quote])!;
  assert.ok(answer.answer.includes("USD 75636.15"));
  assert.ok(answer.answer.includes("CoinGecko"));
  assert.ok(answer.answer.includes(quote.observed_at));
  assert.equal(answer.reasoning[0]!.claim, quote.text);
  assert.equal(referenceQuoteAnswer([asset], [{ ...quote, freshness: "stale" }]), null);
  assert.equal(referenceQuoteAnswer([asset], [{ ...quote, id: "news:test", kind: "report" }]), null);
});

test("price reasoning, history and forecasts do not take the current-quote shortcut", () => {
  for (const question of ["Why is Bitcoin’s price moving?", "Compare AMD and NVIDIA price risk", "What was Bitcoin’s price yesterday?", "What price target could Bitcoin reach?", "What news affects the Bitcoin price?"]) {
    assert.equal(isReferenceQuoteQuestion(question), false, question);
  }
});
