import { timingSafeEqual } from "node:crypto";
import { runRequestedIngestion } from "newsbeat-worker";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "priority_collection_not_configured" }, { status: 503 });
  const actual = Buffer.from(request.headers.get("authorization") ?? ""), expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return Response.json({ error: "unauthorized" }, { status: 401 });
  try { return Response.json({ ok: true, ...(await runRequestedIngestion()) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "priority_collection_unavailable" }, { status: 503 }); }
}
