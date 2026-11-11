# Rarebird in Telegram

A visitor can share a live brief from [Ask Rarebird](https://www.newsbeat.dev/ask) using Telegram’s chat picker. A group with the bot configured can request a brief using `/ask BTC` or `/ask@YourBot BTC`. Messages link to the full ticker view and the sources used for the reply. Opening the ticker view lets the visitor run a fresh check.

## Configure one group

1. Create a bot through [BotFather](https://t.me/BotFather), add it to the intended group, and allow it to send messages. Keep group privacy enabled. Address commands to the bot by username when the group has several bots.
2. Set the variables below in the production Vercel project. Keep the bot token and webhook secret in server-side environment variables. Set the group ID to the numeric chat ID and optionally restrict delivery to a forum topic.
3. Redeploy. Run `node scripts/setup-telegram.mjs` from the repository root with the same bot token, username, group ID and webhook secret available as local environment variables. It verifies the bot can see the group, registers `/ask` and sets its webhook to the production Rarebird endpoint. Run it for a bot dedicated to this deployment because Telegram permits one active webhook per bot.
4. In the group, try `/ask@YourBot BTC`. Confirm the reply opens the Bitcoin brief and includes source links. To enable scheduled delivery, set `NEWSBEAT_TELEGRAM_FEED_TICKERS` and redeploy.

| Variable | Value |
| --- | --- |
| `NEWSBEAT_TELEGRAM_BOT_TOKEN` | BotFather token |
| `NEWSBEAT_TELEGRAM_WEBHOOK_SECRET` | Random secret of 32–256 ASCII letters, numbers, underscores or hyphens |
| `NEWSBEAT_TELEGRAM_BOT_USERNAME` | Bot username, with or without `@` |
| `NEWSBEAT_TELEGRAM_CHAT_ID` | Negative numeric ID of the authorized group |
| `NEWSBEAT_TELEGRAM_TOPIC_ID` | Optional positive forum topic ID |
| `NEWSBEAT_TELEGRAM_FEED_TICKERS` | Optional list of up to three unambiguous tickers, such as `BTC,ETH,NVDA` |

The optional feed runs daily at **09:00 UTC** using the project’s `CRON_SECRET`. Delivery claims in Postgres suppress duplicates when Telegram retries a webhook or the scheduler runs twice. An uncertain send stays claimed, and the next user command can request a fresh reply. Replies are limited to six requests per minute per configured group.

Official setup and message formats are documented in the [Telegram Bot API](https://core.telegram.org/bots/api#setwebhook).
