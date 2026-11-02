/**
 * One call that answers "what do we know about this asset right now".
 *
 * The alternative is worse in a way that matters: an agent chaining topics → brief →
 * prices → chain makes four round trips, pays four latencies, and loses the attribution
 * between them — so by the time it writes an answer it cannot say which part of it came
 * from a publisher and which from a price feed. Here every part arrives labelled, and each
 * failure is reported rather than silently rendered as zero.
 *
 * This is deliberately not a summariser. It gathers and labels; the agent does the writing,
 * because the agent has the conversation and we do not.
 */

import type { AskNewsItem, AskPayload, Freshness, PricesPayload, Unavailable, ChainPulse, Sourced } from "@blacksheep/contracts";
import { brief, topics } from "./news.js";
import { prices } from "./market.js";
import { chainPulse, contractToken } from "./chain.js";

function unavailable(error: string): Unavailable {
  return {
    freshness: { status: "unavailable", age_seconds: 0, refresh_in_seconds: 0 },
    error,
  };
}

/** Maps a free-text query onto a catalog entry, or reports that there isn't one. */
export async function resolveTopic(query: string) {
  const page = await topics(query, 5, 0);
  const match = page.topics[0];
  if (!match) return null;
  return { beat_id: match.beat_id, label: match.label, asset: match.asset, status: match.status };
}

export async function ask(query: string): Promise<AskPayload> {
  const trimmed = query.trim();
  const notes: string[] = [];

  const topic = await resolveTopic(trimmed).catch(() => null);
  if (!topic) {
    notes.push(`No supported company or crypto asset matches "${trimmed}". Use blacksheep_topics to find one.`);
  } else if (topic.status !== "fresh") {
    notes.push(`Coverage for ${topic.label} is ${topic.status}; the headlines below may be older than they look.`);
  }

  const [newsResult, priceResult, chainResult] = await Promise.allSettled([
    topic ? brief(topic.beat_id) : Promise.reject(new Error("no topic resolved")),
    prices(["bitcoin", "ethereum", "solana"]),
    chainPulse(),
  ]);

  const news: Sourced<{ items: AskNewsItem[] }> | Unavailable =
    newsResult.status === "fulfilled"
      ? {
          source: "google-news",
          source_url: "https://news.google.com",
          fetched_at: newsResult.value.freshness.last_success_at ?? new Date().toISOString(),
          ttl_seconds: 900,
          freshness: {
            // Pass the source's own verdict through rather than flattening it: if the
            // topic's last successful check was hours ago, the caller should see "stale".
            // The news helper infers `string` from its conditional; the value is one of three.
            status: newsResult.value.freshness.status as Freshness["status"],
            age_seconds: newsResult.value.freshness.last_success_at
              ? Math.max(0, Math.round((Date.now() - Date.parse(newsResult.value.freshness.last_success_at)) / 1000))
              : 0,
            refresh_in_seconds: 900,
            upstream_cadence: "every fifteen minutes",
          },
          data: { items: newsResult.value.items },
        }
      : unavailable(newsResult.reason instanceof Error ? newsResult.reason.message : "news unavailable");

  const market: Sourced<PricesPayload> | Unavailable =
    priceResult.status === "fulfilled" ? priceResult.value : unavailable("price feed unavailable");

  const chain: Sourced<ChainPulse> | Unavailable =
    chainResult.status === "fulfilled" ? chainResult.value : unavailable("chain endpoints unavailable");

  if (news instanceof Object && "error" in news) notes.push("Headlines are unavailable for this asset right now.");
  if ("error" in market) notes.push("Market prices are unavailable right now.");
  if ("error" in chain) notes.push("Chain state is unavailable right now.");

  // If the query looks like a contract address, resolve it too — that identity is more
  // exact than any name match, and it is the one that exists on chain.
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed) || /^[a-z]+:0x[0-9a-fA-F]{40}$/.test(trimmed)) {
    const token = await contractToken(trimmed).catch(() => null);
    if (token?.data.token) {
      notes.push(`Contract ${token.data.token.asset} resolved to ${token.data.token.symbol} at $${token.data.token.price_usd}.`);
    } else {
      notes.push(`No price is available for contract ${trimmed}.`);
    }
  }

  return { query: trimmed, topic, news, market, chain, notes };
}
