/**
 * Ingestion, on a schedule.
 *
 * Called by Vercel Cron (see vercel.json). Vercel signs cron requests, so this
 * also accepts the shared secret for a manual run:
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://blacksheep.vercel.app/api/cron/ingest
 */
import { runIngestion } from "blacksheep-worker";
import { db, env, hasDatabaseEnv, pruneOldArticles } from "@blacksheep/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  // env() already falls back through the two legacy variable names.
  const secret = env("BLACKSHEEP_CRON_SECRET");
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
