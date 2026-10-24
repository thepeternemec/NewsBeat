/**
 * Shared pricing, roadmap, and FAQ copy for the NewsBeat site.
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
    "when": "Available now",
    "what": "Ask a connected agent for company and crypto headlines, source links, short briefings and updates since a previous check. Explore the same news in the web terminal."
  },
  {
    "when": "In development",
    "what": "Broader news search, easier account connections and saved watches. These features still need setup and testing before release."
  },
  {
    "when": "Coming next",
    "what": "Ready-to-use Telegram and Discord integrations, notifications and paid access. Public reads are free during early access."
  },
  {
    "when": "Built in the open",
    "what": "The source code and roadmap are public. Tell us which companies, questions or integrations would make NewsBeat more useful to you."
  }
];

export const FAQ = [
  {
    "q": "Can I try NewsBeat before connecting an assistant?",
    "a": "Yes. Open the free live lookup, search for a supported company or crypto asset, and read its headlines with publisher links and dates. You can request a short headline-based summary there too. It uses the public API and needs no NewsBeat account, key or card. This tests the news service in your browser; your assistant needs a separate MCP connection."
  },
  {
    "q": "What does NewsBeat do?",
    "a": "NewsBeat brings recent company and crypto news into your AI assistant. Ask “What happened with Nvidia?” and your agent can use recent headlines, grouped coverage and brief updates to answer. The public connection is free during early access."
  },
  {
    "q": "Do I need to know how to code?",
    "a": "No coding is needed if your assistant lets you add a remote MCP connection. MCP is a way for an AI assistant to use an outside service. Add the NewsBeat address once, then ask questions normally. If your assistant does not offer this connection, you can explore news directly in the NewsBeat terminal."
  },
  {
    "q": "What can I ask?",
    "a": "Try “What is happening with Nvidia?”, “Give me the latest headlines about Apple”, or “What changed with Bitcoin since our last check?” You can ask about supported US-listed companies and crypto assets. Follow-up checks depend on your assistant retaining the previous check."
  },
  {
    "q": "Will my agent know when to check the news?",
    "a": "A connected agent can choose NewsBeat when current news would help answer your question, even if you do not mention NewsBeat by name. For example, it can check recent company headlines while researching a business. Add the suggested instruction in our getting-started guide to make that preference clear. Your assistant controls tool selection and may ask you to approve a lookup."
  },
  {
    "q": "Will it keep watching when I close the chat?",
    "a": "NewsBeat answers when your assistant calls it. It does not keep your chat running or send alerts by itself. Recurring checks need a scheduling feature in your assistant or another workflow that you set up. Dedicated notifications and messaging integrations are still in development."
  },
  {
    "q": "How do I connect it to my assistant?",
    "a": "Open the getting-started guide and copy https://www.newsbeat.dev/api/mcp into your assistant’s remote MCP connection settings. The exact steps depend on the app. Test the connection, enable its news tools, and ask your first question. Pasting the address into an ordinary chat does not necessarily connect it."
  },
  {
    "q": "Does it work with ChatGPT, Claude, Grok or other assistants?",
    "a": "The connection depends on the features available in your assistant and account. If it supports custom remote MCP servers, you can try the NewsBeat connection. Developers can also connect agents through the API. NewsBeat is not yet listed or approved in every assistant’s connector directory; the name of the app alone does not guarantee support."
  },
  {
    "q": "Is NewsBeat free?",
    "a": "Yes. Public MCP and REST reads are free during early access, with no NewsBeat account, key or credit card. The public limit is 120 requests a minute. Your assistant may charge separately. A GitHub-issued key is optional for a seven-day metered REST trial; paid checkout is not live yet."
  },
  {
    "q": "What is the seven-day API key trial?",
    "a": "It lets you test a REST integration in your own agent for seven days with up to $6 in usage credit and a 1,200-per-minute limit. The clock starts on the first metered REST call, not when you sign in. You can see the deadline and credit left with the key. When either runs out, keyed requests stop with a 402 response; remove the key to keep using the free public connection. Rotating a key does not restart the trial. The key does not unlock different news."
  },
  {
    "q": "Which companies and topics can I follow?",
    "a": "The current catalog includes 1,528 US-listed equities and 502 crypto assets. Search by company name or ticker. NewsBeat does not yet cover every company, private business or general news topic. If there is no match, your assistant should tell you rather than substitute a different company."
  },
  {
    "q": "How recent is the news?",
    "a": "NewsBeat checks sources on a fifteen-minute schedule. Some topics may update later if a source is delayed or a check fails. Your assistant can see when a topic was last checked successfully and should tell you if the coverage is out of date. It is not a second-by-second breaking-news feed."
  },
  {
    "q": "Where do the answers come from?",
    "a": "NewsBeat supplies English-language headlines, publisher names, dates and article links collected through Google News RSS. Your assistant uses that material to answer your question. Full article text is not included, so detailed claims may need the original reporting. Open the linked sources to read further; some publishers require a subscription."
  },
  {
    "q": "What does “nothing new” mean?",
    "a": "No new items were found in the checked window. That does not prove nothing happened to the company. Coverage may be quiet, delayed or unavailable, so your assistant should also check when the source was last refreshed."
  },
  {
    "q": "Can it help with trading or Polymarket research?",
    "a": "Yes, it can add relevant company and crypto news to your research. NewsBeat does not provide live market prices, place trades, predict outcomes or connect to your Polymarket account. Your assistant needs other sources for prices and market data."
  },
  {
    "q": "Can I use it in Telegram or Discord?",
    "a": "Developers can use the API in their own bots today. Ready-to-use Telegram and Discord integrations are planned. Connecting NewsBeat to an assistant does not automatically create a messaging bot."
  }
];

export function hhmm(iso: string | null): string {
  if (!iso) return "\u2014";
  return `${iso.slice(11, 16)}Z`;
}
