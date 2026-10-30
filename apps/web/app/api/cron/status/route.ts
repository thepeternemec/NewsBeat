import { timingSafeEqual } from "node:crypto";
import { runOperationalCheck } from "@blacksheep/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return Response.json({ error: "monitor_not_configured" }, { status: 503 });
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    const report = await runOperationalCheck();
    return Response.json(
      { ok: true, report },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "monitor_check_not_recorded" },
      { status: 503 },
    );
  }
}
