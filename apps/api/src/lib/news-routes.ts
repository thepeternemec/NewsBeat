import { Hono } from "hono";
import { NEWS_TOOLS, type Operation } from "@newsgraph/contracts";
import { executeOperation, ANONYMOUS } from "./operations.js";
import { NewsError } from "./news.js";
export { callNewsTool } from "./operations.js";
export const newsRoutes = new Hono();
newsRoutes.onError((error, c) => {
  const known = error instanceof NewsError;
  if (!known) console.error("News operation failed", error.name);
  return c.json(
    {
      error: {
        code: known ? error.code : "service_unavailable",
        message: known ? error.message : "News is temporarily unavailable.",
      },
    },
    (known ? error.status : 503) as 400,
  );
});
for (const operation of [
  "topics",
  "news",
  "changes",
  "brief",
  "stories",
  "search",
  "story",
] as Operation[]) {
  newsRoutes.get(`/${operation}`, async (c) => {
    const args: Record<string, unknown> = { ...c.req.query() };
    if (operation === "topics") {
      args.query = args.q ?? args.query;
      delete args.q;
    }
    for (const key of ["limit", "offset", "page_size"])
      if (args[key] !== undefined) args[key] = Number(args[key]);
    if (args.history !== undefined) {
      if (!["true", "false"].includes(String(args.history)))
        throw new NewsError(
          "invalid_request",
          "history must be true or false",
          400,
        );
      args.history = args.history === "true";
    }
    return c.json(
      await executeOperation(operation, args, c.get("principal") ?? ANONYMOUS),
    );
  });
}
newsRoutes.post("/watch", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new NewsError("invalid_request", "Expected JSON watches array", 400);
  }
  return c.json(
    await executeOperation("watch", body, c.get("principal") ?? ANONYMOUS),
  );
});
newsRoutes.get("/tools", (c) =>
  c.json({
    tools: NEWS_TOOLS.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    })),
  }),
);
