import { db, hasDatabaseEnv } from "@newsbeat/db";
import type { ProviderArticle } from "./newsapi.js";

/** PostgreSQL JSON/text rejects NUL and lone UTF-16 surrogates. */
function unicodeText(value: string) {
    return value.replace(/\u0000/g, "").replace(/[\uD800-\uDFFF]/gu, "\uFFFD");
}
function plainText(value: string, limit: number) {
    const plain = unicodeText(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    // Keep the API's UTF-16 length ceiling, removing a whole emoji if it cannot fit.
    return plain.slice(0, limit).replace(/[\uD800-\uDBFF]$/u, "");
}
export function normalizeArticles(articles: ProviderArticle[], now = new Date()) {
    const seen = new Set<string>();
    return articles.flatMap(article => {
        if (article.lang !== "eng" || !article.url)
            return [];
        let url: URL;
        try {
            url = new URL(article.url);
        }
        catch {
            return [];
        }
        if (article.url.length > 2048 || !["http:", "https:"].includes(url.protocol))
            return [];
        url.hash = "";
        for (const key of [...url.searchParams.keys()])
            if (key.startsWith("utm_") || ["fbclid", "gclid"].includes(key))
                url.searchParams.delete(key);
        const canonical = url.toString();
        if (seen.has(canonical))
            return [];
        seen.add(canonical);
        const date = new Date(article.dateTime ?? article.date ?? "");
        if (!Number.isFinite(date.getTime()) || date.getTime() < now.getTime() - 30 * 86400000 || date.getTime() > now.getTime() + 300000)
            return [];
        const title = plainText(article.title, 240);
        if (!title)
            return [];
        return [{ provider_uri: unicodeText(article.uri), title, excerpt: plainText(article.body ?? "", 320), url: canonical, source: plainText(article.source.title ?? article.source.uri ?? url.hostname, 120), published_at: date.toISOString() }];
    }).sort((a, b) => a.published_at.localeCompare(b.published_at) || a.url.localeCompare(b.url));
}
export async function persistNews(beatId: string, articles: ProviderArticle[]) { if (!hasDatabaseEnv())
    throw new Error("News database is not configured"); const rows = normalizeArticles(articles); const sql = db(); const [result] = await sql`select public.append_news_articles(${beatId}, ${sql.json(rows)}) as inserted`; return { received: articles.length, accepted: rows.length, inserted: Number(result?.inserted ?? 0) }; }
