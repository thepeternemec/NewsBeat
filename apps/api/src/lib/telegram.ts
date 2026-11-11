import { createHash, timingSafeEqual } from "node:crypto";
import { InvestmentTickerSchema, type InvestmentBrief } from "@newsbeat/contracts";
import { consumeRateLimit, db } from "@newsbeat/db";
import { z } from "zod";
import { readInvestmentBrief } from "./investment.js";

const site = "https://www.newsbeat.dev/ask";
const updateSchema = z.object({ update_id: z.number().int().nonnegative().safe(), message: z.object({
  message_id: z.number().int().positive().safe(), message_thread_id: z.number().int().positive().safe().optional(),
  chat: z.object({ id: z.number().int().safe(), type: z.enum(["group", "supergroup", "private", "channel"]) }),
  from: z.object({ is_bot: z.boolean() }).optional(), text: z.string().max(4096).optional(),
}).optional() });

function config() {
  const token = process.env.NEWSBEAT_TELEGRAM_BOT_TOKEN;
  const group = process.env.NEWSBEAT_TELEGRAM_CHAT_ID;
  const username = process.env.NEWSBEAT_TELEGRAM_BOT_USERNAME?.replace(/^@/, "").toLowerCase();
  if (!token || !/^\d+:[\w-]+$/.test(token) || !group || !/^-[1-9]\d+$/.test(group) || !username || !/^[a-z0-9_]+$/.test(username)) return null;
  const topic = process.env.NEWSBEAT_TELEGRAM_TOPIC_ID;
  if (topic && (!/^[1-9]\d*$/.test(topic) || !Number.isSafeInteger(Number(topic)))) return null;
  return { token, group, username, topic: topic ? Number(topic) : undefined };
}
type BotConfig = NonNullable<ReturnType<typeof config>>;

function equalSecret(expected: string, received: string) {
  const left = Buffer.from(expected), right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function telegramTicker(text: string, username: string) {
  const command = text.trim().match(/^\/ask(?:@([\w]+))?(?:\s+([^\s]+))?$/i);
  if (!command || (command[1] && command[1].toLowerCase() !== username)) return null;
  const ticker = InvestmentTickerSchema.safeParse(command[2] ?? "");
  return ticker.success ? ticker.data : "";
}

const cut = (text: string, limit: number) => [...text].length > limit ? [...text].slice(0, limit - 1).join("") + "…" : text;

export function formatTelegramBrief(brief: InvestmentBrief) {
  const { research, stance, timing } = brief;
  const asset = research.assets[0];
  const evidence = new Map(research.evidence.map(item => [item.id, item]));
  const cited = research.answer?.reasoning.flatMap(row => row.evidence_ids).map(id => evidence.get(id)).filter(item => item !== undefined) ?? [];
  const sources = [...new Map([...(timing?.trigger ? [timing.trigger] : []), ...cited, ...research.evidence].map(item => [item.url, item])).values()]
    .filter(item => /^https?:\/\//.test(item.url) && item.url.length < 700).slice(0, 3);
  const url = site + "?" + new URLSearchParams({ ticker: brief.ticker, ...(asset ? { beat_id: asset.beat_id } : {}) });
  const lines = [
    `Rarebird · ${asset ? `${asset.label} (${brief.ticker})` : brief.ticker}`,
    new Date(brief.generated_at).toISOString().replace("T", " ").slice(0, 16) + " UTC",
    stance ? `${stance.label}\n${stance.reason}` : research.message ?? "Check the ticker on Rarebird.",
    stance?.valid_until ? `Timing evidence through ${stance.valid_until.replace("T", " ").slice(0, 16)} UTC` : "",
    cut(research.answer?.answer ?? (stance ? research.message ?? "" : ""), 600),
    research.answer && research.message ? cut(research.message, 175) : "",
    ...(research.answer?.reasoning.slice(0, 2).map(row => `• ${cut(row.claim, 220)}`) ?? []),
    research.answer?.unknowns[0] ? `Open question · ${cut(research.answer.unknowns[0], 175)}` : "",
    research.answer?.next_checks[0] ? `Next check · ${cut(research.answer.next_checks[0], 175)}` : "",
    asset ? `Coverage · news ${asset.news_status}, market ${asset.market_status}.` : "",
    "Asset-level research. Your time horizon and risk tolerance matter.",
  ].filter(Boolean);
  return {
    text: lines.join("\n\n"),
    reply_markup: { inline_keyboard: [[{ text: "Open full brief", url }], ...sources.map(item => [{ text: cut(item.source, 44), url: item.url }])] },
  };
}

const deliverySchema = `create table if not exists public.newsbeat_telegram_deliveries (
  delivery_key text primary key,
  claimed_at timestamptz not null default now()
)`;

async function claimDelivery(key: string) {
  const sql = db();
  await sql.unsafe(deliverySchema);
  const digest = createHash("sha256").update(key).digest("hex");
  const rows = await sql`insert into public.newsbeat_telegram_deliveries (delivery_key) values (${digest}) on conflict do nothing returning delivery_key`;
  return rows.length === 1;
}

async function sendTelegram(bot: BotConfig, body: ReturnType<typeof formatTelegramBrief> | { text: string }, messageId?: number, topic = bot.topic) {
  const response = await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
    method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(7000), redirect: "error",
    body: JSON.stringify({ ...body, chat_id: bot.group, message_thread_id: topic, link_preview_options: { is_disabled: true },
      ...(messageId ? { reply_parameters: { message_id: messageId, allow_sending_without_reply: true } } : {}) }),
  });
  if (!response.ok || !(await response.json() as { ok?: boolean }).ok) throw new Error("telegram_delivery_failed");
}

export async function handleTelegramUpdate(request: Request): Promise<Response> {
  const bot = config();
  const secret = process.env.NEWSBEAT_TELEGRAM_WEBHOOK_SECRET;
  if (!bot || !secret || !/^[\w-]{32,256}$/.test(secret)) return Response.json({ error: "telegram_not_configured" }, { status: 503 });
  if (!equalSecret(secret, request.headers.get("x-telegram-bot-api-secret-token") ?? "")) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (Number(request.headers.get("content-length") ?? 0) > 16384) return Response.json({ error: "update_too_large" }, { status: 413 });
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 16384) return Response.json({ error: "update_too_large" }, { status: 413 });
    raw = JSON.parse(text);
  } catch { return Response.json({ error: "invalid_update" }, { status: 400 }); }
  const parsed = updateSchema.safeParse(raw);
  const message = parsed.success ? parsed.data.message : undefined;
  if (!parsed.success || !message || message.from?.is_bot || !["group", "supergroup"].includes(message.chat.type)
    || String(message.chat.id) !== bot.group || (bot.topic !== undefined && message.message_thread_id !== bot.topic)) return Response.json({ ok: true });
  const ticker = telegramTicker(message.text ?? "", bot.username);
  if (ticker === null) return Response.json({ ok: true });
  try {
    const rate = await consumeRateLimit(db(), "telegram:ask:" + bot.group, 6);
    if (!rate.allowed || !await claimDelivery(`${bot.username}:${bot.group}:update:${parsed.data.update_id}`)) return Response.json({ ok: true });
  } catch { return Response.json({ error: "delivery_store_unavailable" }, { status: 503 }); }

  let body: ReturnType<typeof formatTelegramBrief> | { text: string } = { text: "Try /ask BTC or /ask NVDA." };
  if (ticker) {
    try { body = formatTelegramBrief(await readInvestmentBrief({ ticker }, request.headers.get("x-vercel-oidc-token"))); }
    catch { body = { text: "Rarebird could not build the brief right now. Try again in a moment." }; }
  }
  try { await sendTelegram(bot, body, message.message_id, message.message_thread_id); }
  catch { console.warn("Telegram command delivery failed or could not be confirmed"); }
  // Telegram may retry a webhook, but an uncertain send is never repeated.
  return Response.json({ ok: true });
}

export async function runTelegramFeed(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || !equalSecret(`Bearer ${secret}`, request.headers.get("authorization") ?? "")) return Response.json({ error: "unauthorized" }, { status: 401 });
  const bot = config();
  const list = process.env.NEWSBEAT_TELEGRAM_FEED_TICKERS?.trim();
  if (!bot || !list) return Response.json({ status: "disabled" });
  const parsed = z.array(InvestmentTickerSchema).min(1).max(3).safeParse(list.split(","));
  if (!parsed.success) return Response.json({ error: "invalid_feed_tickers" }, { status: 503 });
  const day = new Date().toISOString().slice(0, 10);
  try {
    await db().unsafe(deliverySchema);
    await db()`delete from public.newsbeat_telegram_deliveries where claimed_at < now() - interval '30 days'`;
  } catch { return Response.json({ error: "delivery_store_unavailable" }, { status: 503 }); }
  const results = await Promise.allSettled([...new Set(parsed.data)].map(async ticker => {
    const brief = await readInvestmentBrief({ ticker }, request.headers.get("x-vercel-oidc-token"));
    if (!brief.research.assets.length) return "unresolved";
    if (!await claimDelivery(`${bot.username}:${bot.group}:${bot.topic ?? 0}:feed:${day}:${ticker}`)) return "already_claimed";
    await sendTelegram(bot, formatTelegramBrief(brief));
    return "sent";
  }));
  const status = results.map(result => result.status === "fulfilled" ? result.value : "failed");
  return Response.json({ status }, { status: status.includes("failed") ? 503 : 200 });
}
