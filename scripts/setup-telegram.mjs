const token = process.env.NEWSBEAT_TELEGRAM_BOT_TOKEN ?? "";
const secret = process.env.NEWSBEAT_TELEGRAM_WEBHOOK_SECRET ?? "";
const username = (process.env.NEWSBEAT_TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "").toLowerCase();
const group = process.env.NEWSBEAT_TELEGRAM_CHAT_ID ?? "";

if (!/^\d+:[\w-]+$/.test(token) || !/^[\w-]{32,256}$/.test(secret) || !/^[a-z0-9_]+$/.test(username) || !/^-[1-9]\d+$/.test(group)) {
  console.error("Set the bot token, webhook secret, username and numeric group ID in the environment.");
  process.exit(1);
}

async function call(method, payload) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(12000), redirect: "error",
    });
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error();
    return body.result;
  } catch { throw new Error(`Telegram ${method} failed. Check the bot credentials and group access.`); }
}

try {
  const bot = await call("getMe", {});
  if (bot.username?.toLowerCase() !== username) throw new Error("The token and bot username identify different bots.");
  const chat = await call("getChat", { chat_id: group });
  if (!["group", "supergroup"].includes(chat.type) || String(chat.id) !== group) throw new Error("The configured destination must be the intended group.");
  await call("setMyCommands", { scope: { type: "chat", chat_id: group }, commands: [{ command: "ask", description: "Get a Rarebird ticker brief, such as /ask BTC" }] });
  await call("setWebhook", { url: "https://www.newsbeat.dev/api/telegram/webhook", secret_token: secret, allowed_updates: ["message"] });
  console.log("Rarebird’s Telegram webhook and group command are configured.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
