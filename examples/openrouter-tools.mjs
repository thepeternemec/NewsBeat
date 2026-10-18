// No model key needed to load schemas or execute news calls. A model request to
// OpenRouter needs the application's own OPENROUTER_API_KEY.
//
// Every tool the API advertises is handled here. An earlier version mapped three
// of them and threw on the rest, so an agent that chose `brief` or `stories` from
// the schemas it was handed got "Unknown news tool" — the example was the reason
// the service looked broken.

export async function loadNewsTools(baseUrl) {
  const response = await fetch(`${baseUrl}/v2/tools`, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`News tool discovery failed: ${response.status}`);
  return (await response.json()).tools;
}

/** GET routes, keyed by tool name. `watch` is absent because it takes a body. */
const GET_PATHS = {
  newsgraph_topics: "topics",
  newsgraph_news: "news",
  newsgraph_changes: "changes",
  newsgraph_brief: "brief",
  newsgraph_stories: "stories",
};

export async function executeNewsTool(baseUrl, call) {
  const args = JSON.parse(call.function.arguments);
  const name = call.function.name;
  const timeout = AbortSignal.timeout(20000);

  let response;
  if (name === "newsgraph_watch") {
    // A batch carries up to fifty cursors, so it is a POST — fifty of them do not
    // fit in a URL. Everything else here is a GET.
    if (!Array.isArray(args.watches)) throw new Error("watches must be an array");
    response = await fetch(`${baseUrl}/v2/watch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watches: args.watches }),
      signal: timeout,
    });
  } else if (Object.hasOwn(GET_PATHS, name)) {
    if (name === "newsgraph_topics") {
      const query = new URLSearchParams(args.query ? { q: args.query } : {});
      response = await fetch(`${baseUrl}/v2/${GET_PATHS[name]}?${query}`, { signal: timeout });
    } else {
      if (typeof args.beat_id !== "string") throw new Error("beat_id is required");
      const query = new URLSearchParams({
        beat_id: args.beat_id,
        ...(args.cursor ? { cursor: args.cursor } : {}),
      });
      response = await fetch(`${baseUrl}/v2/${GET_PATHS[name]}?${query}`, { signal: timeout });
    }
  } else {
    throw new Error(`Unknown news tool: ${name}`);
  }

  const content = await response.text();
  return {
    role: "tool",
    tool_call_id: call.id,
    content: response.ok
      ? content
      : JSON.stringify({ error: "news_request_failed", status: response.status, detail: content }),
  };
}
