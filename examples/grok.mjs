// XAI_API_KEY=... node examples/grok.mjs "What changed in central bank news?"
const apiKey = process.env.XAI_API_KEY;
if (!apiKey) throw new Error("Set XAI_API_KEY in your environment.");
const response = await fetch("https://api.x.ai/v1/responses", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: process.env.XAI_MODEL ?? "grok-4.7",
    input:
      process.argv.slice(2).join(" ") ||
      "Find recent news about central banks. Cite the sources and state freshness.",
    tools: [
      {
        type: "mcp",
        server_url:
          process.env.NEWSGRAPH_MCP_URL ??
          "https://newsgraph.vercel.app/api/mcp",
        server_label: "newsgraph",
      },
    ],
  }),
});
if (!response.ok) throw new Error(`xAI returned HTTP ${response.status}`);
console.log(JSON.stringify(await response.json(), null, 2));
