/** Example signed webhook receiver. Node 22+. Put behind HTTPS.
 * Required: NEWSGRAPH_SIGNING_SECRET; Telegram: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID;
 * Discord: DISCORD_BOT_TOKEN, DISCORD_CHANNEL_ID.
 * DELIVERY_LOG must be a persistent file; run one receiver instance per file.
 * Never log bot tokens or webhook secrets. This script sends only when run explicitly.
 */
import { createServer } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { appendFile, readFile } from "node:fs/promises";
const secret = process.env.NEWSGRAPH_SIGNING_SECRET;
if (!secret) throw new Error("Set NEWSGRAPH_SIGNING_SECRET");
const destinations = [];
if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
  destinations.push({
    name: "telegram",
    url: `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    headers: {},
    payload: (text) => ({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text,
      link_preview_options: { is_disabled: true },
    }),
  });
if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_CHANNEL_ID)
  destinations.push({
    name: "discord",
    url: `https://discord.com/api/v10/channels/${process.env.DISCORD_CHANNEL_ID}/messages`,
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    payload: (text) => ({ content: text, allowed_mentions: { parse: [] } }),
  });
if (!destinations.length)
  throw new Error("Configure a Telegram or Discord bot destination");
const file = process.env.DELIVERY_LOG ?? "./newsgraph-deliveries.log";
const seen = new Set(
  (
    await readFile(file, "utf8").catch((e) => {
      if (e.code === "ENOENT") return "";
      throw e;
    })
  )
    .split("\n")
    .filter(Boolean),
);
let queue = Promise.resolve();
async function receive(req, res) {
  if (req.method !== "POST" || req.url !== "/newsgraph") {
    res.writeHead(404).end();
    return;
  }
  const id = req.headers["x-newsgraph-delivery"],
    stamp = req.headers["x-newsgraph-timestamp"],
    signature = req.headers["x-newsgraph-signature"];
  if (
    typeof id !== "string" ||
    !/^[a-f0-9-]{36}$/.test(id) ||
    typeof stamp !== "string" ||
    !/^\d+$/.test(stamp) ||
    Math.abs(Date.now() / 1000 - Number(stamp)) > 300 ||
    typeof signature !== "string"
  ) {
    res.writeHead(401).end();
    return;
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 256000) {
      res.writeHead(413).end();
      return;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  const expected = Buffer.from(
      `v1=${createHmac("sha256", secret).update(`${stamp}.${raw}`).digest("hex")}`,
    ),
    actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    res.writeHead(401).end();
    return;
  }
  const event = JSON.parse(raw),
    result = event.result;
  const rows =
    result?.items ?? result?.results?.flatMap((r) => r.items ?? []) ?? [];
  const freshness =
    result?.freshness?.status ??
    result?.results
      ?.map((r) => r.freshness?.status ?? r.error?.code)
      .join(", ");
  const text = [
    `NewsGraph update — freshness: ${freshness ?? "unknown"}`,
    ...rows
      .slice(0, 5)
      .map((r) => `${r.title}\n${r.source ?? ""}\n${r.url ?? ""}`),
  ]
    .join("\n\n")
    .slice(0, 1900);
  // Serialize durable dedupe + sends for this single-process example.
  const job = queue.then(async () => {
    for (const d of destinations) {
      const key = `${id}:${d.name}`;
      if (seen.has(key)) continue;
      const response = await fetch(d.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...d.headers },
        body: JSON.stringify(d.payload(text)),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error("Destination delivery failed");
      await appendFile(file, `${key}\n`, { mode: 0o600 });
      seen.add(key);
    }
  });
  queue = job.catch(() => {});
  await job;
  res.writeHead(204).end();
}
createServer((req, res) => {
  receive(req, res).catch(() => {
    if (!res.headersSent) res.writeHead(503);
    res.end();
  });
}).listen(Number(process.env.PORT ?? 8080), "127.0.0.1", () =>
  console.log("NewsGraph receiver ready on /newsgraph"),
);
