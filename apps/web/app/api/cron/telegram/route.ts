import { runTelegramFeed } from "@newsbeat/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;
export const GET = runTelegramFeed;
