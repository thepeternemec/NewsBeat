import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { QUANT_POLICY_VERSION, type IntelligenceResponse, type InvestmentBrief, type ResearchResponse } from "@newsbeat/contracts";
import { closeDb, db } from "@newsbeat/db";
import app from "../index.js";
import { investmentEvidenceAnswer, investmentStance } from "./investment.js";
import { buildMarketContext } from "./quant-engine.js";
import { quantitativeFixture } from "./quant-fixtures.js";
import { formatTelegramBrief, handleTelegramUpdate, telegramTicker } from "./telegram.js";

test("public ticker brief resolves collisions and rejects mismatched asset selections", async () => {
  const query = (body: unknown) => app.request("/v2/investment", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const response = await query({ ticker: "$sui" });
  assert.equal(response.status, 200);
  const brief = await response.json() as InvestmentBrief;
  assert.equal(brief.ticker, "SUI");
  assert.equal(brief.stance, null);
  assert.equal(brief.research.candidates.length, 2);
  assert.equal((await query({ ticker: "SUI", beat_id: "b_06c91290de1c" })).status, 400);
  assert.equal((await query({ ticker: "what should I buy?" })).status, 400);
});

test("even fresh prices cannot upgrade a pending or expired investment stance", () => {
  const fixture = quantitativeFixture();
  const now = new Date(fixture.now).toISOString();
  const market = buildMarketContext(fixture.profile, fixture.snapshots, fixture.now);
  const output: IntelligenceResponse = {
    beat_id: fixture.signal.beat_id, label: "NVIDIA", context: fixture.context, pilot: true,
    generated_at: now, status: "pending", freshness: { status: "fresh", last_success_at: now },
    analysis: { last_success_at: null, last_attempt_at: null, error: null, coverage_truncated: false },
    signals: [], constructions: [], alerts: [], quantitative: {
      policy_version: QUANT_POLICY_VERSION, computed_at: now, context_id: fixture.context.id,
      market, decisions: [], evaluations: [], evaluation: { observations: 0, alerts: 0, horizons: [], review_horizons: [], note: "" },
    },
  };
  const research: ResearchResponse = {
    version: "question-research-v1", question: "Investment case for NVDA", generated_at: now,
    status: "ready", method: "reasoned", context: "fundamentals", message: null, generation_error: null,
    assets: [], candidates: [], evidence: [], limitations: [], flow: [],
    answer: { answer: "The guidance could support the demand case.", reasoning: [{ kind: "interpretation", claim: "Demand could rise.", evidence_ids: ["r1"] }], unknowns: [], next_checks: ["Check guidance."] },
  };
  assert.match(investmentStance(research, output, fixture.now).stance?.reason ?? "", /pending/);
  const stale = investmentStance(research, { ...output, status: "ready" }, fixture.now + 20 * 60000);
  assert.equal(stale.stance?.state, "wait");
  assert.equal(stale.timing?.market, "held");
  assert.equal(investmentStance({ ...research, answer: null }, output, fixture.now).stance?.state, "wait");
});

test("investment analysis failures return fresh sourced observations and a concrete next check", () => {
  const beat_id = "b_06c91290de1c";
  const now = new Date().toISOString();
  const evidence = (id: string, kind: "report" | "measurement", text: string) => ({
    beat_id, id, kind, text, source: "Test source", url: "https://example.com/evidence", observed_at: now, freshness: "fresh" as const,
  });
  const research: ResearchResponse = {
    version: "question-research-v1", question: "Investment case for BTC", generated_at: now, status: "partial", method: "evidence_only",
    context: "fundamentals", message: null, generation_error: "invalid_shape", assets: [{
      beat_id, ticker: "BTC", label: "Bitcoin", asset: "crypto", news_status: "fresh", market_status: "fresh",
      coverage_truncated: false, reports_scanned: 1, limitations: [],
    }], candidates: [], limitations: [], flow: [], answer: null,
    evidence: [
      { ...evidence("old", "report", "A historical headline"), freshness: "stale" },
      evidence("news:" + beat_id, "report", "Bitcoin fund reports new redemptions"),
      evidence("market:" + beat_id + ":60", "measurement", "60-minute venue asset return: 0.54%"),
      evidence("market:" + beat_id + ":1440", "measurement", "1440-minute venue asset return: -0.78%"),
    ],
  };
  const answer = investmentEvidenceAnswer(research);
  assert.ok(answer);
  assert.match(answer.answer, /Wait for a verified investment case/);
  assert.deepEqual(answer.reasoning.slice(0, 2).map(item => item.claim), [research.evidence[1]?.text, research.evidence[3]?.text]);
  assert.ok(answer.reasoning.flatMap(item => item.evidence_ids).every(id => id !== "old"));
  assert.match(answer.next_checks[0] ?? "", /primary source/);
  assert.equal(investmentEvidenceAnswer({ ...research, evidence: research.evidence.slice(0, 1) }), null);
});

test("Telegram commands normalize tickers and ignore commands addressed to another bot", () => {
  assert.equal(telegramTicker("/ask@RarebirdBot $btc", "rarebirdbot"), "BTC");
  assert.equal(telegramTicker("/ask@AnotherBot BTC", "rarebirdbot"), null);
  assert.equal(telegramTicker("/ask", "rarebirdbot"), "");
  assert.equal(telegramTicker("buy BTC", "rarebirdbot"), null);
});

test("Telegram formatter links the full brief when a symbol needs disambiguation", async () => {
  const response = await app.request("/v2/investment", { method: "POST", body: JSON.stringify({ ticker: "SUI" }) });
  const message = formatTelegramBrief(await response.json() as InvestmentBrief);
  assert.match(message.text, /choose the one you mean/i);
  assert.equal(message.reply_markup.inline_keyboard[0]?.[0]?.url, "https://www.newsbeat.dev/ask?ticker=SUI");
  assert.ok(message.text.length < 4096);
});

test("Telegram webhook authenticates and ignores updates from outside the configured group", async t => {
  const before = { ...process.env };
  t.after(() => {
    for (const key of Object.keys(process.env)) if (key.startsWith("NEWSBEAT_TELEGRAM_")) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  });
  process.env.NEWSBEAT_TELEGRAM_BOT_TOKEN = "123:fake-test-token";
  process.env.NEWSBEAT_TELEGRAM_CHAT_ID = "-100000000001";
  process.env.NEWSBEAT_TELEGRAM_BOT_USERNAME = "RarebirdBot";
  process.env.NEWSBEAT_TELEGRAM_WEBHOOK_SECRET = "a".repeat(40);
  delete process.env.NEWSBEAT_TELEGRAM_TOPIC_ID;
  const request = (secret: string) => new Request("https://www.newsbeat.dev/api/telegram/webhook", {
    method: "POST", headers: { "x-telegram-bot-api-secret-token": secret },
    body: JSON.stringify({ update_id: 42, message: { message_id: 10, chat: { id: -100000000002, type: "supergroup" }, text: "/ask BTC" } }),
  });
  assert.equal((await handleTelegramUpdate(request("wrong"))).status, 401);
  const result = await handleTelegramUpdate(request("a".repeat(40)));
  assert.deepEqual(await result.json(), { ok: true });
});

const connection = process.env.NEWSBEAT_INTELLIGENCE_TEST_DATABASE_URL;

test("Telegram retries of an accepted group command send one reply", { skip: !connection }, async t => {
  const url = new URL(connection!);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname === "/newsbeat_intelligence_test");
  const settings = {
    DATABASE_URL: connection!, NEWSBEAT_TELEGRAM_BOT_TOKEN: "123:fake-test-token", NEWSBEAT_TELEGRAM_CHAT_ID: "-100000000001",
    NEWSBEAT_TELEGRAM_BOT_USERNAME: "RarebirdBot", NEWSBEAT_TELEGRAM_WEBHOOK_SECRET: "a".repeat(40), NEWSBEAT_TELEGRAM_TOPIC_ID: "",
  };
  const before = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]));
  Object.assign(process.env, settings);
  t.after(async () => {
    await closeDb();
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  await db().unsafe(await readFile(new URL("../../../../db/schema.sql", import.meta.url), "utf8"));
  let sends = 0;
  t.mock.method(globalThis, "fetch", async (input: string, init: RequestInit) => {
    assert.match(input, /^https:\/\/api\.telegram\.org\/bot123:fake-test-token\/sendMessage$/);
    const message = JSON.parse(String(init.body));
    assert.equal(message.chat_id, settings.NEWSBEAT_TELEGRAM_CHAT_ID);
    assert.equal(message.reply_parameters.message_id, 12);
    assert.match(message.text, /SUI/);
    sends++;
    return Response.json({ ok: true });
  });
  const request = () => new Request("https://www.newsbeat.dev/api/telegram/webhook", {
    method: "POST", headers: { "x-telegram-bot-api-secret-token": settings.NEWSBEAT_TELEGRAM_WEBHOOK_SECRET },
    body: JSON.stringify({ update_id: Date.now(), message: { message_id: 12, chat: { id: -100000000001, type: "supergroup" }, text: "/ask SUI" } }),
  });
  const original = request();
  const retry = original.clone();
  const responses = await Promise.all([handleTelegramUpdate(original), handleTelegramUpdate(retry)]);
  assert.deepEqual(responses.map(response => response.status), [200, 200]);
  assert.equal(sends, 1);
});
