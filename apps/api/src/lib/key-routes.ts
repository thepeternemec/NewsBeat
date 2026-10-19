/**
 * GitHub sign-in establishes a browser-bound account session.
 * Named connection keys are created explicitly and shown once in the account UI.
 * Credentials never travel in redirect URLs.
 */
import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import {
  sessionAccount,
  startSession,
  sameOrigin,
  sameValue,
} from "./sessions.js";
import {
  db,
  findOrCreateAccount,
  hasDatabaseEnv,
  issueKeyForAccount,
} from "@newsgraph/db";
import {
  authorizeUrl,
  exchangeCodeForUser,
  oauthConfig,
  signState,
  verifyState,
} from "./github.js";

export const keyRoutes = new Hono();

function originOf(requestUrl: string): string {
  return new URL(requestUrl).origin;
}

keyRoutes.get("/authorize", (c) => {
  const config = oauthConfig();
  if (!config) {
    return c.html(unconfigured(), 503);
  }
  const state = signState();
  setCookie(c, "newsgraph_oauth_state", state, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/api/keys",
    maxAge: 600,
  });
  return c.redirect(authorizeUrl(originOf(c.req.url), state), 302);
});

keyRoutes.get("/callback", async (c) => {
  const config = oauthConfig();
  if (!config) return c.html(unconfigured(), 503);

  const code = c.req.query("code");
  // GitHub reports a declined authorisation here rather than at the token exchange.
  const denied = c.req.query("error");
  if (denied)
    return c.html(
      page(
        "Not authorised",
        `<p>GitHub said: <code>${escapeHtml(denied)}</code>.</p>`,
      ),
      400,
    );

  if (!code)
    return c.html(
      page("Missing code", "<p>GitHub did not send an authorisation code.</p>"),
      400,
    );
  const browserState = getCookie(c, "newsgraph_oauth_state");
  deleteCookie(c, "newsgraph_oauth_state", { path: "/api/keys" });
  if (
    !verifyState(c.req.query("state")) ||
    !sameValue(browserState, c.req.query("state"))
  ) {
    // The signed state exists to stop a flow the user never started from being
    // completed against their browser.
    return c.html(
      page(
        "Expired",
        "<p>That sign-in link is older than ten minutes or was not issued here. Start again.</p>",
      ),
      400,
    );
  }
  if (!hasDatabaseEnv()) {
    return c.html(
      page(
        "Unavailable",
        "<p>Storage is not configured, so a key cannot be issued.</p>",
      ),
      503,
    );
  }

  try {
    const user = await exchangeCodeForUser(originOf(c.req.url), code);
    const sql = db();
    const account = await findOrCreateAccount(sql, user);
    await startSession(c, account.accountId);
    return c.redirect("/keys", 303);
  } catch (error) {
    console.error("key issuance failed:", error);
    return c.html(
      page(
        "Could not issue a key",
        `<p>${escapeHtml((error as Error).message)}</p><p>Try again, or open an issue.</p>`,
      ),
      500,
    );
  }
});

keyRoutes.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
});
keyRoutes.get("/status", async (c) => {
  const account = await sessionAccount(c);
  if (!account) return c.json({ authenticated: false, keys: [] });
  const sql = db();
  const keys =
    await sql`select key_hash as id,label,created_at,last_used_at from api_keys where account_id=${account} and revoked_at is null order by created_at desc`;
  const [balance] =
    await sql`select credits_micro,topped_up_micro from account_balance where account_id=${account}`;
  return c.json({
    authenticated: true,
    keys,
    balance_micro:
      Number(balance?.credits_micro ?? 0) +
      Number(balance?.topped_up_micro ?? 0),
  });
});
keyRoutes.post("/logout", async (c) => {
  if (!sameOrigin(c)) return c.json({ error: "Origin not allowed" }, 403);
  const account = await sessionAccount(c);
  if (account) {
    const sql = db();
    await sql`delete from account_sessions where account_id=${account}`;
  }
  deleteCookie(c, "newsgraph_session", { path: "/api/keys" });
  return c.json({ ok: true });
});
keyRoutes.post("/create", async (c) => {
  if (!sameOrigin(c)) return c.json({ error: "Origin not allowed" }, 403);
  const account = await sessionAccount(c);
  if (!account) return c.json({ error: "Sign in first" }, 401);
  const body = await c.req.json().catch(() => null);
  if (
    typeof body?.label !== "string" ||
    !body.label.trim() ||
    body.label.length > 80
  )
    return c.json({ error: "Use a connection name of 1–80 characters" }, 400);
  try {
    return c.json({
      key: await issueKeyForAccount(db(), account, body.label.trim()),
    });
  } catch {
    return c.json(
      {
        error:
          "Could not create a connection. Check your connection limit and try again.",
      },
      409,
    );
  }
});
keyRoutes.post("/revoke", async (c) => {
  if (!sameOrigin(c)) return c.json({ error: "Origin not allowed" }, 403);
  const account = await sessionAccount(c);
  if (!account) return c.json({ error: "Sign in first" }, 401);
  const body = await c.req.json().catch(() => null);
  if (typeof body?.id !== "string")
    return c.json({ error: "Connection id required" }, 400);
  const sql = db();
  await sql`update api_keys set revoked_at=now() where account_id=${account} and key_hash=${body.id}`;
  return c.json({ ok: true });
});

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ]!,
  );
}

const SHELL = (title: string, body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} · NewsGraph</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:#050505; color:#ededed;
         font:15px/1.6 ui-sans-serif,system-ui,-apple-system,sans-serif; padding:32px; }
  main { max-width:640px; width:100%; }
  h1 { font-size:26px; letter-spacing:-0.02em; margin:0 0 16px; }
  p { color:#9a9a9a; margin:0 0 14px; }
  code, pre { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
  pre { background:#0d0d0d; border:1px solid #1e1e1e; border-radius:10px; padding:16px; overflow-x:auto; color:#fff; font-size:13px; }
  a { color:#fff; }
  .note { border-left:2px solid #3d3d3d; padding-left:14px; margin-top:22px; }
</style></head><body><main>${body}</main></body></html>`;

const page = (title: string, body: string) =>
  SHELL(title, `<h1>${escapeHtml(title)}</h1>${body}`);

function unconfigured(): string {
  return page(
    "GitHub sign-in is not configured",
    `<p>This deployment has no GitHub OAuth app, so self-serve keys are switched off.</p>
     <div class="note"><p>For the operator: create one at
     <a href="https://github.com/settings/developers">github.com/settings/developers</a>,
     set the callback URL to <code>/api/keys/callback</code> on this origin, and set
     <code>GITHUB_CLIENT_ID</code> and <code>GITHUB_CLIENT_SECRET</code>.</p>
     <p>Keys can still be issued by hand: <code>npm run key:issue -- "label"</code>.</p></div>`,
  );
}
