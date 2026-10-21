import { Hono } from "hono";
import { z } from "zod";
import { NEWS_TOOLS } from "@newsbeat/contracts";
import { NewsError, topics, newsPage, brief, stories, watchMany, WATCH_LIMIT, TOPIC_PAGE_DEFAULT, TOPIC_PAGE_MAX } from "./news.js";
import { headlineSummary } from "./headline-summary.js";
export const newsRoutes = new Hono();
newsRoutes.onError((error, c) => { if (error instanceof NewsError)
    return c.json({ error: { code: error.code, message: error.message } }, error.status as 400 | 404 | 410 | 503); console.error("news request failed", error.name); return c.json({ error: { code: "service_unavailable", message: "News is temporarily unavailable." } }, 503); });
const clamp = (raw: string | undefined, fallback: number, max: number) => {
    const n = Number.parseInt(raw ?? "", 10);
    return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : fallback;
};
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
newsRoutes.get("/summary", async (c) => {
    const beatId = (c.req.query("beat_id") ?? "").trim();
    if (!beatId) throw new NewsError("invalid_request", "beat_id is required.", 400);
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
export async function callNewsTool(name: string, args: unknown) {
    // Old clients can keep calling their cached tool names. Discovery uses NewsBeat.
    name = name.replace(/^newsgraph_/, "newsbeat_");
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
    if (name === "newsbeat_summary") {
        const input = z.object({ beat_id: z.string() }).strict().parse(args);
        return headlineSummary(input.beat_id);
    }
    if (name === "newsbeat_watch") {
        const input = z.object({
            watches: z.array(z.object({ beat_id: z.string(), cursor: z.string().max(2048).optional() })).min(1).max(WATCH_LIMIT),
        }).strict().parse(args);
        return watchMany(input.watches.map((w) => ({ beat_id: w.beat_id, cursor: w.cursor ?? "" })));
    }
    if (name === "newsbeat_changes") {
        const input = z.object({ beat_id: z.string(), cursor: z.string().max(2048) }).strict().parse(args);
        return newsPage(input.beat_id, input.cursor);
    }
    throw new NewsError("unknown_tool", "Unknown news tool.", 404);
}
