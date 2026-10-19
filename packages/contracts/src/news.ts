import { z } from "zod";
import { BEAT_ID_PATTERN } from "./beats.js";
export const NewsArticleSchema = z.object({
  id: z.string(),
  beat_id: z.string().regex(BEAT_ID_PATTERN),
  title: z.string().max(240),
  excerpt: z.string().max(320),
  url: z
    .string()
    .url()
    .refine((url) => /^https?:\/\//.test(url)),
  source: z.string().max(120),
  published_at: z.string().datetime({ offset: true }),
  first_indexed_at: z.string().datetime({ offset: true }),
});
export type NewsArticle = z.infer<typeof NewsArticleSchema>;
export const FreshnessSchema = z.object({
  status: z.enum(["fresh", "stale", "unavailable"]),
  last_success_at: z.string().nullable(),
});
export const NewsPageSchema = z.object({
  items: z.array(NewsArticleSchema).max(8),
  cursor: z.string(),
  history_cursor: z.string().optional(),
  has_more: z.boolean(),
  freshness: FreshnessSchema,
  estimated_tokens: z.number().int().nonnegative(),
});
export type NewsPage = z.infer<typeof NewsPageSchema>;
export { NEWS_TOOLS } from "./operations.js";
