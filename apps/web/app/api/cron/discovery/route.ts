import { timingSafeEqual } from "node:crypto";
import { runDiscovery } from "@newsbeat/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 55;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "discovery_not_configured" }, { status: 503 });
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from("Bearer " + secret);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    return Response.json({ ok: true, ...(await runDiscovery()) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("catalog discovery unavailable", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "discovery_unavailable" }, { status: 503 });
  }
}
