import { NEWS_TOOLS, type Operation } from "@newsgraph/contracts";
export function openApi(origin: string) {
  const paths: Record<string, unknown> = {};
  for (const tool of NEWS_TOOLS) {
    const operation = tool.name.slice(10) as Operation;
    const schema = tool.inputSchema as any;
    const post = operation === "watch";
    paths[`/v2/${operation}`] = {
      [post ? "post" : "get"]: {
        operationId: tool.name,
        description: tool.description,
        ...(post
          ? {
              requestBody: {
                required: true,
                content: { "application/json": { schema } },
              },
            }
          : {
              parameters: Object.entries(schema.properties ?? {}).map(
                ([name, s]) => ({
                  name,
                  in: "query",
                  required: schema.required?.includes(name) ?? false,
                  schema: s,
                }),
              ),
            }),
        responses: {
          "200": {
            description: "Cited results and usage receipt",
            content: {
              "application/json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
          "400": { description: "Invalid arguments" },
          "401": { description: "Invalid or expired credential" },
          "402": { description: "Insufficient credit" },
          "410": { description: "Cursor expired; establish a new baseline" },
          "429": { description: "Rate limit; respect Retry-After" },
          "503": { description: "Temporarily unavailable" },
        },
        security: [{}, { bearerAuth: [] }],
      },
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "NewsGraph",
      version: "0.4.0",
      description:
        "Source-linked news search and change monitoring for agents. Headline metadata, not full article text.",
    },
    servers: [{ url: `${origin}/api` }],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Account API key or OAuth access token",
        },
      },
    },
  };
}
