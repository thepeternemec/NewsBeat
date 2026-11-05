import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeArticles } from "./ingest-news.js";
import { NewsArticleSchema } from "@newsbeat/contracts";
const now = new Date("2026-09-13T12:00:00Z");
const article = { uri: "p1", title: "<b>Source headline</b>", body: "<p>A short excerpt.</p>", lang: "eng", url: "https://example.com/story?utm_source=mail", dateTime: "2026-09-13T10:00:00Z", source: { title: "Publisher" } };
test("ingestion canonicalizes and deduplicates source URLs without losing first indexed identity", () => { const rows = normalizeArticles([article, { ...article, uri: "p2", url: "https://example.com/story#fragment" }], now); assert.equal(rows.length, 1); assert.equal(rows[0]?.title, "Source headline"); assert.equal(rows[0]?.url, "https://example.com/story"); assert(!Object.hasOwn(rows[0]!, "first_indexed_at")); });
test("ingestion rejects invalid dates, unsafe URLs, non-English and stale articles", () => { for (const patch of [{ dateTime: "invalid" }, { url: "javascript:alert(1)" }, { lang: "deu" }, { dateTime: "2020-01-01T00:00:00Z" }, { dateTime: "2027-01-01T00:00:00Z" }])
    assert.equal(normalizeArticles([{ ...article, ...patch }], now).length, 0); });

test("emoji boundaries preserve whole characters within the public API's text limits", () => {
    for (const fits of [false, true]) {
        const spare = fits ? 2 : 1;
        const [row] = normalizeArticles([{ ...article, title: "x".repeat(240 - spare) + "📷 after", body: "x".repeat(320 - spare) + "📷 after", source: { title: "x".repeat(120 - spare) + "📷 after" } }], now);
        for (const [field, limit] of [["title", 240], ["excerpt", 320], ["source", 120]] as const) {
            assert.equal(row![field].length, fits ? limit : limit - 1);
            assert.equal(row![field].endsWith("📷"), fits);
            assert.ok(!/[\uD800-\uDFFF]/u.test(row![field]), "no lone surrogate can reach PostgreSQL");
        }
        assert.ok(NewsArticleSchema.safeParse({ ...row, id: "1", beat_id: "b_bb964843350e", first_indexed_at: now.toISOString() }).success);
    }
});

test("malformed upstream Unicode and NUL cannot poison a JSON article batch", () => {
    const [row] = normalizeArticles([{ ...article, uri: "p\u00001", title: "Reported \uD83D headline\u0000", body: "Details \uDC00 here\u0000", source: { title: "Publisher\u0000 \uD83D" } }], now);
    assert.equal(row!.provider_uri, "p1");
    assert.equal(row!.title, "Reported � headline");
    for (const value of Object.values(row!)) assert.ok(!/[\u0000\uD800-\uDFFF]/u.test(value));
});
