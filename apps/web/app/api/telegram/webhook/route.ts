import { handleTelegramUpdate } from "@newsbeat/api";

export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = handleTelegramUpdate;
