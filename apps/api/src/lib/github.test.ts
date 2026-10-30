/**
 * The OAuth state value.
 *
 * Its whole job is to stop a flow the user never started from being completed
 * against their browser, so the two things worth testing are that it cannot be
 * forged and that it does not live forever. Both are pure.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

process.env.BLACKSHEEP_CURSOR_SECRET ??= "test-secret-for-state-signing";

const { signState, verifyState, redirectUri, authorizeUrl, exchangeCodeForUser } = await import("./github.js");
const { keyRoutes } = await import("./key-routes.js");

test("a fresh state verifies", () => {
  assert.equal(verifyState(signState()), true);
});

test("a forged state does not", () => {
  const real = signState();
  const [stamp] = real.split(".");
  assert.equal(verifyState(`${stamp}.${"0".repeat(32)}`), false, "a wrong signature must fail");
  assert.equal(verifyState(`${stamp}.`), false);
  assert.equal(verifyState("garbage"), false);
  assert.equal(verifyState(undefined), false);
  assert.equal(verifyState(""), false);
});

test("a state older than ten minutes does not", () => {
  const old = signState(Date.now() - 11 * 60_000);
  assert.equal(verifyState(old), false, "an expired state must not authorise a key");
  // Just inside the window still works, so the boundary is not off by much.
  assert.equal(verifyState(signState(Date.now() - 9 * 60_000)), true);
});

test("a state from the future does not", () => {
  // A clock skew of a minute is tolerated; an hour is not a clock skew.
  assert.equal(verifyState(signState(Date.now() + 60 * 60_000)), false);
});

async function withOAuthEnv(vercel: string, run: () => void | Promise<void>) {
  const values = { VERCEL: vercel, GITHUB_CLIENT_ID: "test-client", GITHUB_CLIENT_SECRET: "test-client-secret" };
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  try { await run(); } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

test("local development retains its local callback", () => withOAuthEnv("", () => {
  assert.equal(redirectUri("http://localhost:3000"), "http://localhost:3000/api/keys/callback");
}));

test("hosted aliases and previews use the registered production callback", () => withOAuthEnv("1", () => {
  for (const origin of ["https://www.newsbeat.dev", "https://news-beat.vercel.app", "https://newsgraph-preview.vercel.app"]) {
    assert.equal(redirectUri(origin), "https://www.newsbeat.dev/api/keys/callback");
    assert.equal(new URL(authorizeUrl(origin, "test-state")).searchParams.get("redirect_uri"), redirectUri(origin));
  }
}));

test("preview sign-in starts on production before state is issued", () => withOAuthEnv("1", async () => {
  const response = await keyRoutes.request("https://newsgraph-preview.vercel.app/authorize");
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://www.newsbeat.dev/api/keys/authorize");
  assert.equal(response.headers.get("cache-control"), "no-store");
  const canonical = await keyRoutes.request("https://www.newsbeat.dev/authorize");
  const location = new URL(canonical.headers.get("location")!);
  assert.equal(location.origin, "https://github.com");
  assert.equal(location.searchParams.get("redirect_uri"), "https://www.newsbeat.dev/api/keys/callback");
  assert.equal(verifyState(location.searchParams.get("state")!), true);
}));

test("code exchange uses the same registered callback as authorization", () => withOAuthEnv("1", async () => {
  const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url).endsWith("/access_token")) {
      const payload = JSON.parse(String(init?.body));
      assert.equal(payload.redirect_uri, "https://www.newsbeat.dev/api/keys/callback");
      return Response.json({ access_token: "test-token" });
    }
    return Response.json({ id: 1, login: "test-user" });
  }) as typeof fetch;
  assert.equal((await exchangeCodeForUser("https://newsgraph-preview.vercel.app", "test-code", mockFetch)).login, "test-user");
}));
