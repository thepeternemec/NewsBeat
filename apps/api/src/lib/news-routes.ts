import { Hono } from "hono";
import { z } from "zod";
import { NEWS_TOOLS, SignalContextIdSchema } from "@newsbeat/contracts";
import { NewsError, topics, newsPage, brief, stories, watchMany, WATCH_LIMIT, TOPIC_PAGE_DEFAULT, TOPIC_PAGE_MAX } from "./news.js";
import { headlineSummary } from "./headline-summary.js";
import { fearGreed, overview, prices, DEFAULT_PRICE_IDS } from "./market.js";
import { chainPulse, contractToken } from "./chain.js";
import { ask } from "./ask.js";
import { signals } from "./signals.js";
import { readIntelligence } from "./intelligence.js";
import { collectionControl } from "./collection.js";
import { researchQuestion, researchCoverage } from "./research.js";
import { readInvestmentBrief } from "./investment.js";
import { readOpportunities } from "./opportunities.js";
import { readCatalysts } from "./catalysts.js";
import { readTokenIntelligence } from "./token-intelligence.js";
import { readMarketBriefing } from "./market-briefing.js";
export const newsRoutes = new Hono();
newsRoutes.onError((error, c) => { if (error instanceof NewsError)
    return c.json({ error: { code: error.code, message: error.message } }, error.status as 400 | 404 | 410 | 503); console.error("news request failed", error.name); return c.json({ error: { code: "service_unavailable", message: "News is temporarily unavailable." } }, 503); });
const clamp = (raw: string | undefined, fallback: number, max: number) => {
    const n = Number.parseInt(raw ?? "", 10);
    return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : fallback;
};
newsRoutes.get("/research", c => c.json({ ...researchCoverage, method: "POST", body: { question: "Why is NVIDIA moving, and what should I check next?" } }));
newsRoutes.get("/briefing", async c => {
    c.header("Cache-Control", "public, max-age=0, s-maxage=30");
    return c.json(await readMarketBriefing());
});
newsRoutes.get("/tokens", async c => {
    c.header("Cache-Control", "no-store");
    return c.json(await readTokenIntelligence(c.req.query("asset") ?? ""));
});
newsRoutes.post("/investment", async c => {
    c.header("Cache-Control", "no-store");
    if (Number(c.req.header("content-length") ?? 0) > 2048) throw new NewsError("invalid_request", "Ticker request is too large.", 413);
    let body: unknown;
    try {
        const raw = await c.req.text();
        if (raw.length > 2048) throw new Error();
        body = JSON.parse(raw);
    } catch { throw new NewsError("invalid_request", "Expected a JSON ticker request.", 400); }
    return c.json(await readInvestmentBrief(body, c.req.header("x-vercel-oidc-token")));
});
newsRoutes.post("/research", async c => {
    c.header("Cache-Control", "no-store");
    if (Number(c.req.header("content-length") ?? 0) > 8192) throw new NewsError("invalid_request", "Research request is too large.", 413);
    let body: unknown;
    try { const raw = await c.req.text(); if (raw.length > 8192) throw new Error(); body = JSON.parse(raw); }
    catch { throw new NewsError("invalid_request", "Expected a bounded JSON research request.", 400); }
    return c.json(await researchQuestion(body, c.req.header("x-vercel-oidc-token")));
});
newsRoutes.get("/collection", async c => {
    c.header("Cache-Control", "no-store");
    return c.json(await collectionControl({ action: "status", beat_id: c.req.query("beat_id") }));
});
newsRoutes.post("/collection", async c => {
    c.header("Cache-Control", "no-store");
    const origin = c.req.header("origin");
    if (origin && origin !== new URL(c.req.url).origin) return c.json({ error: { code: "origin_not_allowed", message: "Use a same-origin request." } }, 403);
    let body: unknown;
    try { body = await c.req.json(); } catch { throw new NewsError("invalid_request", "Expected an explicit JSON collection request.", 400); }
    return c.json(await collectionControl(body));
});
newsRoutes.post("/watch", async (c) => {
    let body: unknown;
    try {
        body = await c.req.json();
    } catch {
        throw new NewsError("invalid_request", "Expected a JSON body with a watches array.", 400);
    }
    const parsed = z.object({
        watches: z.array(z.object({ beat_id: z.string(), cursor: z.string().max(2048).optional() })).min(1).max(WATCH_LIMIT),
    }).strict().safeParse(body);
    if (!parsed.success) {
        throw new NewsError(
            "invalid_request",
            `Expected { watches: [{ beat_id, cursor }] } with 1 to ${WATCH_LIMIT} entries.`,
            400,
        );
    }
    return c.json(await watchMany(parsed.data.watches.map((w) => ({ beat_id: w.beat_id, cursor: w.cursor ?? "" }))));
});
newsRoutes.get("/stories", async (c) => {
    const beatId = (c.req.query("beat_id") ?? "").trim();
    if (!beatId)
        throw new NewsError("invalid_request", "beat_id is required.", 400);
    const limit = clamp(c.req.query("limit"), 200, 500) || 200;
    return c.json(await stories(beatId, limit));
});
newsRoutes.get("/intelligence", async c => {
    const beatId = (c.req.query("beat_id") ?? "").trim();
    if (!beatId) throw new NewsError("invalid_request", "beat_id is required.", 400);
    c.header("Cache-Control", "public, max-age=0, s-maxage=30");
    const context = SignalContextIdSchema.safeParse(c.req.query("context") ?? "fundamentals");
    if (!context.success) throw new NewsError("invalid_request", "context must be fundamentals, liquidity or risk.", 400);
    return c.json(await readIntelligence(beatId, context.data));
});
newsRoutes.get("/opportunities", async c => {
    c.header("Cache-Control", "no-store");
    const limit = c.req.query("limit");
    return c.json(await readOpportunities({
        context: c.req.query("context"),
        limit: limit === undefined ? undefined : Number(limit),
    }));
});
newsRoutes.get("/catalysts", async c => {
    c.header("Cache-Control", "no-store");
    const limit = c.req.query("limit");
    return c.json(await readCatalysts({ beat_id: c.req.query("beat_id"), limit: limit === undefined ? undefined : Number(limit) }));
});
newsRoutes.get("/summary", async (c) => {
    const beatId = (c.req.query("beat_id") ?? "").trim();
    if (!beatId) throw new NewsError("invalid_request", "beat_id is required.", 400);
    c.header("Deprecation", "true");
    c.header("Link", '</api/v2/research>; rel="successor-version"');
    return c.json(await headlineSummary(beatId));
});
newsRoutes.get("/brief", async (c) => {
    const beatId = (c.req.query("beat_id") ?? "").trim();
    if (!beatId)
        throw new NewsError("invalid_request", "beat_id is required.", 400);
    return c.json(await brief(beatId, c.req.query("cursor") || undefined, c.req.query("history") === "true"));
});
newsRoutes.get("/topics", async (c) => {
    const limit = clamp(c.req.query("limit"), TOPIC_PAGE_DEFAULT, TOPIC_PAGE_MAX) || TOPIC_PAGE_DEFAULT;
    const offset = clamp(c.req.query("offset"), 0, Number.MAX_SAFE_INTEGER);
    return c.json(await topics((c.req.query("q") ?? "").slice(0, 200), limit, offset));
});
newsRoutes.get("/news", async (c) => c.json(await newsPage(c.req.query("beat_id") ?? "", c.req.query("before"), !!c.req.query("before"))));
newsRoutes.get("/changes", async (c) => { const cursor = c.req.query("cursor"); if (!cursor)
    throw new NewsError("missing_cursor", "Read latest news first and save its cursor."); return c.json(await newsPage(c.req.query("beat_id") ?? "", cursor)); });
newsRoutes.get("/tools", c => c.json({ tools: NEWS_TOOLS.map(t => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.inputSchema } })) }));
export async function callNewsTool(name: string, args: unknown, oidcToken?: string | null) {
    // Old clients keep their cached tool names working. The API has been through
    // `newsgraph_*`, `newsbeat_*` and briefly `newsbeat_*`; all three resolve and the
    // advertised name is `newsbeat_*` again. Remove a prefix once its callers have moved.
    name = name.replace(/^(?:newsgraph|newsbeat|rarebird)_/, "newsbeat_");
    if (name === "newsbeat_research") return researchQuestion(args, oidcToken);
    if (name === "newsbeat_investment") return readInvestmentBrief(args, oidcToken);
    if (name === "newsbeat_market_briefing") {
        z.object({}).strict().parse(args);
        return readMarketBriefing();
    }
    if (name === "newsbeat_token_intelligence") {
        const input = z.object({ asset: z.string().max(80) }).strict().parse(args);
        return readTokenIntelligence(input.asset);
    }
    if (name === "newsbeat_collection") return collectionControl(args);
    if (name === "newsbeat_opportunities") return readOpportunities(args);
    if (name === "newsbeat_catalysts") return readCatalysts(args);
    if (name === "newsbeat_topics") {
        const input = z.object({ query: z.string().max(200).optional() }).strict().parse(args);
        // MCP callers have no way to page, so this surface asks for the whole
        // catalog. The REST route is where pagination belongs.
        return topics(input.query, TOPIC_PAGE_MAX, 0);
    }
    if (name === "newsbeat_news") {
        const input = z.object({ beat_id: z.string() }).strict().parse(args);
        return newsPage(input.beat_id);
    }
    if (name === "newsbeat_brief") {
        const input = z.object({ beat_id: z.string() }).strict().parse(args);
        return brief(input.beat_id);
    }
    if (name === "newsbeat_stories") {
        const input = z.object({ beat_id: z.string() }).strict().parse(args);
        return stories(input.beat_id, 40, 200);
    }
    if (name === "newsbeat_intelligence") {
        const input = z.object({ beat_id: z.string(), context: SignalContextIdSchema.optional() }).strict().parse(args);
        return readIntelligence(input.beat_id, input.context);
    }
    if (name === "newsbeat_summary") {
        const input = z.object({ beat_id: z.string() }).strict().parse(args);
        return headlineSummary(input.beat_id, oidcToken);
    }
    if (name === "newsbeat_watch") {
        const input = z.object({
            watches: z.array(z.object({ beat_id: z.string(), cursor: z.string().max(2048).optional() })).min(1).max(WATCH_LIMIT),
        }).strict().parse(args);
        return watchMany(input.watches.map((w) => ({ beat_id: w.beat_id, cursor: w.cursor ?? "" })));
    }
    if (name === "newsbeat_signals") {
        z.object({}).strict().parse(args);
        return { ...(await signals()), tool: "newsbeat_signals" };
    }
    if (name === "newsbeat_ask") {
        const input = z.object({ q: z.string().min(1).max(120) }).strict().parse(args);
        return { ...(await ask(input.q)), tool: "newsbeat_ask" };
    }
    if (name === "newsbeat_chain") {
        z.object({}).strict().parse(args);
        return { ...(await chainPulse()), tool: "newsbeat_chain" };
    }
    if (name === "newsbeat_token") {
        const input = z.object({ asset: z.string().min(3).max(120) }).strict().parse(args);
        return { ...(await contractToken(input.asset)), tool: "newsbeat_token" };
    }
    if (name === "newsbeat_market") {
        z.object({}).strict().parse(args);
        return { ...(await overview()), tool: "newsbeat_market" };
    }
    if (name === "newsbeat_prices") {
        const input = z.object({ ids: z.array(z.string().min(1).max(80)).max(20).optional() }).strict().parse(args);
        return { ...(await prices(input.ids?.length ? input.ids : [...DEFAULT_PRICE_IDS])), tool: "newsbeat_prices" };
    }
    if (name === "newsbeat_fear_greed") {
        const input = z.object({ limit: z.number().int().min(1).max(30).optional() }).strict().parse(args);
        return { ...(await fearGreed(input.limit ?? 7)), tool: "newsbeat_fear_greed" };
    }
    if (name === "newsbeat_changes") {
        const input = z.object({ beat_id: z.string(), cursor: z.string().max(2048) }).strict().parse(args);
        return newsPage(input.beat_id, input.cursor);
    }
    throw new NewsError("unknown_tool", "Unknown news tool.", 404);
}
