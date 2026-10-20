/**
 * The OAuth state value.
 *
 * Its whole job is to stop a flow the user never started from being completed
 * against their browser, so the two things worth testing are that it cannot be
 * forged and that it does not live forever. Both are pure.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

process.env.NEWSBEAT_CURSOR_SECRET ??= "test-secret-for-state-signing";

const { signState, verifyState, redirectUri } = await import("./github.js");

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

test("the callback URL is derived from the request origin", () => {
  // Must match the OAuth app's configured callback exactly, so it is built from
  // the origin rather than hard-coded — preview deployments need their own.
  assert.equal(redirectUri("https://newsgraph.vercel.app"), "https://newsgraph.vercel.app/api/keys/callback");
  assert.equal(redirectUri("http://localhost:3000"), "http://localhost:3000/api/keys/callback");
});
