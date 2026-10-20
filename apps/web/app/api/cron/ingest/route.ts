/**
 * Ingestion, on a schedule.
 *
 * Called by Vercel Cron (see vercel.json). Vercel signs cron requests, so this
 * also accepts the shared secret for a manual run:
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://www.newsbeat.dev/api/cron/ingest
 */
import { runIngestion } from "newsbeat-worker";
import { db, hasDatabaseEnv, pruneOldArticles } from "@newsbeat/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = (process.env.NEWSBEAT_CRON_SECRET ?? process.env.NEWSGRAPH_CRON_SECRET);
  const isVercelCron = request.headers.get("user-agent")?.includes("vercel-cron");
  if (secret && !isVercelCron) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  try {
    const result = await runIngestion();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
