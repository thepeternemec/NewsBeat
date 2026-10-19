import { authorizedCron } from "@newsgraph/api/dist/lib/cron-auth.js";
import { runSubscriptions } from "@newsgraph/api/dist/lib/subscriptions.js";
import { db, releaseAbandonedUsage } from "@newsgraph/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!authorizedCron(request, [process.env.CRON_SECRET]))
    return Response.json({ error: "unauthorized" }, { status: 401 });

  try {
    await releaseAbandonedUsage(db());
    if (!process.env.NEWSGRAPH_WEBHOOK_SECRET)
      return Response.json({ delivery_configured: false });
    return Response.json(await runSubscriptions());
  } catch {
    console.error("Scheduled watch processing failed");
    return Response.json({ error: "Watch processing failed" }, { status: 503 });
  }
}
