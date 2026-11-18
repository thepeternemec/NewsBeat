import { Hono } from "hono";
import { NewsError } from "./news.js";
import { readAgentBriefing, runAgent } from "./agent.js";

export const agentRoutes = new Hono();
agentRoutes.onError((error, c) => {
  if (error instanceof NewsError) return c.json({ error: { code: error.code, message: error.message } }, error.status as 400 | 429);
  return c.json({ error: { code: "unavailable", message: "The market agent is temporarily unavailable. Try again." } }, 503);
});
agentRoutes.get("/agent", async c => {
  const market = c.req.query("market");
  if (market !== undefined && market !== "equity" && market !== "crypto") throw new NewsError("invalid_request", "Choose the stock or crypto market.", 400);
  c.header("Cache-Control", "public, max-age=0, s-maxage=30");
  return c.json(await readAgentBriefing(c.req.query("beat_id"), undefined, market));
});
agentRoutes.post("/agent", async c => {
  c.header("Cache-Control", "no-store");
  if (Number(c.req.header("content-length") ?? 0) > 16384) throw new NewsError("invalid_request", "The conversation request is too large.", 413);
  let input: unknown;
  try {
    const text = await c.req.text();
    if (text.length > 16384) throw new Error();
    input = JSON.parse(text);
  } catch { throw new NewsError("invalid_request", "Expected a JSON conversation request.", 400); }
  return c.json(await runAgent(input, c.req.header("x-vercel-oidc-token")));
});
