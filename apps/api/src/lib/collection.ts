import { CollectionRequestSchema } from "@newsbeat/contracts";
import { env, readCollection, startCollection, stopCollection } from "@newsbeat/db";
import { NewsError } from "./news.js";

export async function collectionControl(input: unknown) {
  const parsed = CollectionRequestSchema.safeParse(input);
  if (!parsed.success) throw new NewsError("invalid_request", "Use a pilot beat_id and action: status, start with interval_seconds: 60, or stop with your session_token. Fast collection lasts 15 minutes.", 400);
  const request = parsed.data;
  if (request.action === "status") return readCollection(request.beat_id);
  if (request.action === "stop") return stopCollection(request.beat_id, request.session_token);
  if ((env("NEWSBEAT_PROVIDER") ?? "google").toLowerCase() !== "google") throw new NewsError("service_unavailable", "One-minute collection is available only with the Google News collector.", 503);
  return startCollection(request.beat_id);
}
