/**
 * Shared pricing, roadmap, and FAQ copy for the NewsGraph site.
 * Keep the current service state separate from planned paid access.
 */

/** The public, read-only news API. */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

export const PRICES = [
  {
    "label": "daily rate",
    "price": "$0.20",
    "desc": "Per day for up to fifty tickers, checked on the fifteen-minute refresh schedule. No seat licences."
  },
  {
    "label": "prepaid · 30 days",
    "price": "$6",
    "desc": "Thirty days of access at the same daily rate. A simple starting point for your agent workflow."
  },
  {
    "label": "prepaid · 90 days",
    "price": "$18",
    "desc": "Ninety days of access for agents you run regularly. Same rate, fewer top-ups."
  },
  {
    "label": "prepaid · 300 days",
    "price": "$60",
    "desc": "Three hundred days of access for ongoing market research and monitoring."
  }
];

export const ROADMAP = [
  {
    "when": "Shipped",
    "what": "2,000+ equities and cryptos, fifteen-minute ingestion, a public REST API, OpenAI-compatible tools, hosted MCP, cursors, briefs, and story grouping."
  },
  {
    "when": "In progress",
    "what": "Stripe checkout for prepaid access, direct publisher URLs, and short descriptions for items that currently carry only a headline."
  },
  {
    "when": "Next",
    "what": "Telegram, Discord, and more service integrations, plus scheduled watches and push updates."
  },
  {
    "when": "Open",
    "what": "MIT-licensed source, public schemas and documentation, and an open topic catalog. Suggest a topic or contribute an integration."
  }
];

export const FAQ = [
  {
    "q": "What is live today?",
    "a": "NewsGraph covers 2,000+ equities and cryptos using English-language financial news from Google News RSS, refreshed every fifteen minutes. The public REST API, OpenAI-compatible tools, and hosted MCP support topic discovery, headlines, changes since a cursor, briefs, and story grouping."
  },
  {
    "q": "How does NewsGraph track what changed?",
    "a": "Choose a topic and keep the cursor returned by the API. On the next check, send that cursor to receive stories that appeared since. An empty result means nothing new was found in that window; always check the topic's freshness status too."
  },
  {
    "q": "Do I get full articles?",
    "a": "Each news page contains up to eight items with a headline, publisher, publication time, and a link that resolves to the article. NewsGraph does not supply full article bodies. Current links may redirect through Google News."
  },
  {
    "q": "How fresh is the news?",
    "a": "Ingestion runs on a fifteen-minute schedule. Availability also depends on the upstream source and each topic's last successful check. Responses report freshness, and items include publication and indexing timestamps, so your agent can assess the update before using it."
  },
  {
    "q": "How do I connect my agent?",
    "a": "Use the hosted MCP endpoint, OpenAI-compatible tool definitions, or the REST API. Public access currently needs no API key. The Connect page includes setup instructions and the quickstart shows your first request."
  },
  {
    "q": "How does pricing work?",
    "a": "Usage-based pricing, with no seat licences. Published prepaid plans start at $0.20 a day for up to fifty tickers: $6 for 30 days, $18 for 90 days, or $60 for 300 days. The API is free during early access; Stripe checkout and paid access are coming soon."
  },
  {
    "q": "Can I use NewsGraph for trading or Polymarket research?",
    "a": "Yes. Bring relevant equity and crypto headlines into your research alongside your own market data and probability models. NewsGraph supplies news context; it does not execute trades, provide Polymarket prices, or connect directly to your Polymarket account."
  },
  {
    "q": "Are Telegram and Discord integrations available?",
    "a": "MCP and the REST API are available today. Dedicated Telegram, Discord, and other service integrations are planned. You can already use the API in your own bots and workflows."
  }
];

export function hhmm(iso: string | null): string {
  if (!iso) return "\u2014";
  return `${iso.slice(11, 16)}Z`;
}
