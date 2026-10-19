/** Dependency-free client. No automatic retries of potentially billable requests. */
export class NewsGraphClient {
  constructor({ baseUrl = "https://newsgraph.vercel.app/api", apiKey } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }
  async call(operation, args = {}) {
    if (
      ![
        "topics",
        "news",
        "changes",
        "brief",
        "stories",
        "watch",
        "search",
        "story",
      ].includes(operation)
    )
      throw new Error("Unknown operation");
    const post = operation === "watch";
    const url = new URL(`${this.baseUrl}/v2/${operation}`);
    if (!post)
      for (const [key, value] of Object.entries(args))
        if (value !== undefined) url.searchParams.set(key, String(value));
    const response = await fetch(url, {
      method: post ? "POST" : "GET",
      headers: {
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        ...(post ? { "Content-Type": "application/json" } : {}),
      },
      ...(post ? { body: JSON.stringify(args) } : {}),
      signal: AbortSignal.timeout(60000),
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error?.message ?? `HTTP ${response.status}`);
      error.code = data.error?.code;
      error.status = response.status;
      error.retryAfter = response.headers.get("Retry-After");
      throw error;
    }
    return data;
  }
}
