import { metric } from "@vercel/functions";

export function recordServiceCall(
  request: Request,
  surface: "rest" | "mcp",
  operation: string,
  outcome: "success" | "client_error" | "server_error" | "tool_error",
  startedAt: number,
) {
  if (process.env.VERCEL_ENV !== "production") return;

  const source = request.headers.get("x-newsbeat-traffic") === "synthetic"
    ? "synthetic"
    : request.headers.has("sec-fetch-mode") ? "browser" : "unclassified";
  const durationMs = Math.round(performance.now() - startedAt);
  const tags = { surface, operation, outcome, source };
  console.info(JSON.stringify({ event: "newsbeat.service_call", ...tags, durationMs }));
  try {
    metric("newsbeat.calls", 1, tags);
    metric("newsbeat.duration_ms", durationMs, tags);
  } catch {
    // Metrics availability must not affect API responses.
  }
}
