import assert from "node:assert/strict";
import { test } from "node:test";
import { clusterStories } from "./cluster.js";
import { rankStories, selectBriefStories, selectSummaryStories } from "./relevance.js";

const at = "2026-10-21T09:03:00.000Z";
const report = (id: number, title: string, source: string, time = "2026-10-21T08:48:00.000Z") => ({
  id: String(id), title, source, published_at: time, url: `https://example.com/${id}`,
});

test("NVIDIA brief surfaces distinct developments ahead of a burst of routine holdings notices", () => {
  const filings = [
    "Shah Wealth Advisors LLC Acquires New Holdings in NVIDIA Corporation $NVDA",
    "Turner Financial Group Inc. Buys New Position in NVIDIA Corporation $NVDA",
    "16,330 Shares in NVIDIA Corporation $NVDA Bought by Tenet Wealth Partners LLC",
    "William John Sempolinski Buys 251,777 Shares of NVIDIA Corporation $NVDA",
    "Highland Investment Advisors LLC Makes New $583,000 Investment in NVIDIA Corporation $NVDA",
  ].map((title, i) => report(i + 1, title, "MarketBeat"));
  const developments = [
    report(20, "From the lab to the live network: Nokia, T-Mobile and NVIDIA complete world’s first AI-RAN call", "Nokia", "2026-10-21T08:35:00.000Z"),
    report(21, "Market Chatter: Nvidia in Talks to Financially Back Firmus, After Stalled IPO", "Moomoo", "2026-10-21T08:20:00.000Z"),
    report(22, "Nvidia Is In Talks To Invest Hundreds Of Millions Of Dollars In Australian AI Cloud Provider Firmus", "TradingView", "2026-10-21T08:18:00.000Z"),
    report(23, "World Bank names Cassava, Nvidia AI partners", "ITWeb Africa", "2026-10-21T08:05:00.000Z"),
  ];
  const all = clusterStories([...filings, ...developments]);
  const selected = selectBriefStories(all, 3, Date.parse(at));
  assert.equal(selected.length, 3);
  assert(selected.every(story => !story.sources.includes("MarketBeat")));
  assert.equal(selected.filter(story => story.lead.includes("Firmus")).length, 1);
  assert(selected.some(story => story.lead.includes("AI-RAN call")));
  assert.equal(all.reduce((n, story) => n + story.articles.length, 0), 9);
});

test("ranking preserves all reports, is deterministic and keeps routine coverage available", () => {
  const input = [
    report(1, "Company launches a new chip for industrial robots", "Publisher A"),
    report(2, "Company launches a new chip for industrial robots", "Publisher B"),
    report(3, "Advisors LLC Acquires New Holdings in Company Corporation", "MarketBeat"),
  ];
  const grouped = clusterStories(input);
  const ranked = rankStories(grouped, Date.parse(at));
  assert.equal(ranked[0]!.articles.length, 2);
  assert.equal(ranked.at(-1)!.articles[0]!.id, "3");
  assert.equal(ranked.reduce((n, story) => n + story.articles.length, 0), input.length);
  assert.deepEqual(rankStories([...grouped].reverse(), Date.parse(at)).map(s => s.lead), ranked.map(s => s.lead));
});

test("speculative and opposing developments are not merged or hidden", () => {
  const all = clusterStories([
    report(1, "Regulator approves Company AI chip exports", "Reuters"),
    report(2, "Regulator rejects Company AI chip exports", "AP"),
    report(3, "Regulator may approve Company AI chip exports", "Publisher C"),
  ]);
  assert.equal(all.length, 3);
  assert.equal(rankStories(all, Date.parse(at)).length, 3);
});

test("Apple digest selects company developments ahead of incidental Big Apple and scam mentions", () => {
  const grouped = clusterStories([
    report(1, "Big Ben and the Big Apple: SWISS looks back on a successful autumn holiday season", "SWISS"),
    report(2, "A $50 Apple Cash mistake centering child is suspected to be a scam", "Publisher A"),
    report(3, "Apple signs $100M titanium supplier agreement for iPhone", "Publisher B"),
    report(4, "Loop Capital cuts Apple rating over iPhone sales outlook", "Publisher C"),
    report(5, "Apple expands DIY repairs to latest Macs", "Publisher D"),
  ]);
  const selected = selectSummaryStories(grouped, 3, Date.parse(at));
  assert.equal(selected.length, 3);
  assert(selected.every(story => !/Big Apple|scam/i.test(story.lead)));
  assert(selected.some(story => /titanium/.test(story.lead)));
});
