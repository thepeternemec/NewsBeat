import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema, type CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { env } from "@newsbeat/db";
import { NEWS_TOOLS, NEWS_AGENT_INSTRUCTIONS } from "@newsbeat/contracts";
import { callNewsTool } from "./news-routes.js";
import { NewsError } from "./news.js";
export async function mcpResponse(request: Request) {
    const oidcToken = request.headers.get("x-vercel-oidc-token");
    const origin = request.headers.get("origin");
    const allowed = ["https://newsbeat.dev", "https://www.newsbeat.dev", "https://news-beat.vercel.app", "https://newsgraph.vercel.app", "http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8787", ...[env("VERCEL_URL"), env("VERCEL_BRANCH_URL")].filter(Boolean).map(host => `https://${host}`), ...(env("NEWSBEAT_MCP_ORIGINS") ?? "").split(",").filter(Boolean)];
    if (origin && !allowed.includes(origin))
        return new Response("Origin not allowed", { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > 16384)
        return new Response("Request too large", { status: 413 });
    const server = new Server({ name: "newsbeat", version: "0.3.0" }, { capabilities: { tools: {} }, instructions: NEWS_AGENT_INSTRUCTIONS });
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: NEWS_TOOLS.map(tool => ({ ...tool, inputSchema: { ...tool.inputSchema, type: "object" as const }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true } })) }));
    server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
        try {
            const result = await callNewsTool(request.params.name, request.params.arguments ?? {}, oidcToken);
            return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
        }
        catch (error) {
            return { isError: true, content: [{ type: "text", text: JSON.stringify({ error: error instanceof NewsError ? error.code : "request_failed", message: error instanceof NewsError ? error.message : "Unable to complete the news request. Check arguments and retry." }) }] };
        }
    });
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    try {
        return await transport.handleRequest(request);
    }
    finally {
        await server.close();
    }
}
