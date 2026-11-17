import { handleTelegramUpdate } from "@rarebird/api";

export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = handleTelegramUpdate;
