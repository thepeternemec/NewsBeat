import { timingSafeEqual } from "node:crypto";
import { runIntelligence, runOfficialEvidence } from "@newsbeat/api";

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
    const [intelligence, official] = await Promise.all([
      runIntelligence(request.headers.get("x-vercel-oidc-token")),
      runOfficialEvidence().catch(() => ({ status: "worker_unavailable" })),
    ]);
    return Response.json({ ok: true,
      ...intelligence, official }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "intelligence_worker_unavailable" }, { status: 503 });
  }
}
