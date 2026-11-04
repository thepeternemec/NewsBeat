import { timingSafeEqual } from "node:crypto";
import { runIntelligence } from "@newsbeat/api";
import { runPilotIngestion } from "newsbeat-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

/** Only the authenticated scheduler can create model work or mutate event memory. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "intelligence_monitor_not_configured" }, { status: 503 });
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    const ingestion = await runPilotIngestion();
    return Response.json({ ok: true, pilot_ingestion: { calls: ingestion.calls, inserted: ingestion.inserted, deferred: ingestion.deferred ?? 0 },
      ...(await runIntelligence(request.headers.get("x-vercel-oidc-token"))) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "intelligence_worker_unavailable" }, { status: 503 });
  }
}
