/**
 * Sign in with GitHub, so a key can be self-served.
 *
 * Keys were issued by running a script on the server, which meant a human had to
 * be involved every time. Gating self-serve on *something* is the point: with no
 * identity, minting keys is free and the rate limit stops meaning anything — one
 * person could hold a thousand keys and the 1200-a-minute ceiling would be
 * 1,200,000.
 *
 * GitHub is the cheapest identity a developer already has, and it needs no email
 * delivery to verify. The scope requested is `read:user` and nothing else.
 *
 * **This cannot set itself up.** GitHub has no API for creating an OAuth app; it
 * is a settings form. Two environment variables are required and the flow refuses
 * to start without them rather than redirecting somewhere broken.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@newsgraph/db";

const AUTHORIZE = "https://github.com/login/oauth/authorize";
const TOKEN = "https://github.com/login/oauth/access_token";
const USER = "https://api.github.com/user";

/** Where GitHub sends the developer back. Must match the OAuth app exactly. */
export function redirectUri(origin: string): string {
  return `${origin}/api/keys/callback`;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
}

/** Null when the app has not been registered — the caller says so plainly. */
export function oauthConfig(): OAuthConfig | null {
  const clientId = env("GITHUB_CLIENT_ID");
  const clientSecret = env("GITHUB_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/**
 * A signed, timestamped state value.
 *
 * OAuth's `state` exists to stop an attacker completing a flow the user never
 * started, so it has to be unforgeable and short-lived. HMAC over the timestamp,
 * verified with a constant-time compare, and rejected after ten minutes.
 */
const STATE_TTL_MS = 10 * 60_000;

function stateKey(): string {
  const secret = env("NEWSGRAPH_CURSOR_SECRET");
  if (!secret) throw new Error("NEWSGRAPH_CURSOR_SECRET is required to sign OAuth state");
  return secret;
}

export function signState(now = Date.now()): string {
  const stamp = String(now);
  const mac = createHmac("sha256", stateKey()).update(`oauth:${stamp}`).digest("hex").slice(0, 32);
  return `${stamp}.${mac}`;
}

export function verifyState(state: string | undefined, now = Date.now()): boolean {
  if (!state) return false;
  const [stamp, mac] = state.split(".");
  if (!stamp || !mac) return false;
  const issued = Number(stamp);
  if (!Number.isFinite(issued) || now - issued > STATE_TTL_MS || issued > now + 60_000) return false;
  const expected = createHmac("sha256", stateKey()).update(`oauth:${stamp}`).digest("hex").slice(0, 32);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authorizeUrl(origin: string, state: string): string {
  const config = oauthConfig();
  if (!config) throw new Error("GitHub OAuth is not configured");
  const url = new URL(AUTHORIZE);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri(origin));
  // The least that identifies a user. No repositories, no email, no writes.
  url.searchParams.set("scope", "read:user");
  url.searchParams.set("state", state);
  return url.toString();
}

export interface GithubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
}

/** Exchange the code, then read the user. Throws with a usable message. */
export async function exchangeCodeForUser(
  origin: string,
  code: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GithubUser> {
  const config = oauthConfig();
  if (!config) throw new Error("GitHub OAuth is not configured");

  const tokenResponse = await fetchImpl(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri(origin),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const token = (await tokenResponse.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!token.access_token) {
    throw new Error(token.error_description ?? token.error ?? "GitHub did not return an access token");
  }

  const userResponse = await fetchImpl(USER, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "newsgraph",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!userResponse.ok) throw new Error(`GitHub user lookup failed: ${userResponse.status}`);

  const user = (await userResponse.json()) as GithubUser;
  if (typeof user.id !== "number" || typeof user.login !== "string") {
    throw new Error("GitHub returned an unexpected user payload");
  }
  return { id: user.id, login: user.login, name: user.name ?? null, email: user.email ?? null };
}
