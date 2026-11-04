import assert from "node:assert/strict";
import { test } from "node:test";
import { marketRequester } from "./quant-market.js";

const response = (body: unknown, status = 200, retry?: string) => new Response(JSON.stringify(body), { status, headers: retry ? { "Retry-After": retry } : {} });
test("public market requests respect pacing and a bounded retry-after", async () => {
  let now = 1000, calls = 0;
  const starts: number[] = [];
  const get = marketRequester({ now: () => now, wait: async ms => { now += ms; }, fetch: (async () => {
    starts.push(now); calls++;
    return calls === 2 ? response({}, 429, "3") : response({ error: [], result: {} });
  }) as typeof fetch });
  await get("https://api.kraken.com/0/public/AssetPairs");
  await get("https://api.kraken.com/0/public/Depth");
  assert.deepEqual(starts, [1000, 2100, 5100]);
});
test("JSON throttling retries once, while permanent errors and long deferrals stop", async () => {
  let calls = 0, now = 0;
  const get = marketRequester({ now: () => now, wait: async ms => { now += ms; }, fetch: (async () => {
    calls++; return response({ error: ["EAPI:Rate limit exceeded"] });
  }) as typeof fetch });
  await assert.rejects(get("https://api.kraken.com/0/public/Depth"), /provider_rate_limited/); assert.equal(calls, 2);
  for (const [status, after] of [[403, "0"], [429, "30"]] as const) {
    calls = 0;
    const permanent = marketRequester({ fetch: (async () => { calls++; return response({}, status, after); }) as typeof fetch });
    await assert.rejects(permanent("https://api.kraken.com/0/public/Depth"), /provider_http_403|provider_rate_limited/); assert.equal(calls, 1);
  }
});
