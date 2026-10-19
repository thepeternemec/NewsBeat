/**
 * Self-serve API keys, gated on GitHub.
 *
 *   GET /api/keys/authorize  -> GitHub, asking for read:user and nothing else
 *   GET /api/keys/callback   -> exchange, upsert the account, issue a key
 *
 * The key is rendered into the callback's HTML rather than passed in a redirect
 * query string. A secret in a URL ends up in browser history, in referrer headers
 * and in any proxy log on the way — and this is the one value that must not leak.
 */
import { Hono } from "hono";
import { db, describeKeyForAccount, findOrCreateAccount, hasDatabaseEnv, issueKeyForAccount } from "@newsgraph/db";
import { authorizeUrl, exchangeCodeForUser, oauthConfig, signState, verifyState } from "./github.js";

export const keyRoutes = new Hono();

function originOf(requestUrl: string): string {
  return new URL(requestUrl).origin;
}

keyRoutes.get("/authorize", (c) => {
  const config = oauthConfig();
  if (!config) {
    return c.html(unconfigured(), 503);
  }
  return c.redirect(authorizeUrl(originOf(c.req.url), signState()), 302);
});

keyRoutes.get("/callback", async (c) => {
  const config = oauthConfig();
  if (!config) return c.html(unconfigured(), 503);

  const code = c.req.query("code");
  // GitHub reports a declined authorisation here rather than at the token exchange.
  const denied = c.req.query("error");
  if (denied) return c.html(page("Not authorised", `<p>GitHub said: <code>${escapeHtml(denied)}</code>.</p>`), 400);

  if (!code) return c.html(page("Missing code", "<p>GitHub did not send an authorisation code.</p>"), 400);
  if (!verifyState(c.req.query("state"))) {
    // The signed state exists to stop a flow the user never started from being
    // completed against their browser.
    return c.html(page("Expired", "<p>That sign-in link is older than ten minutes or was not issued here. Start again.</p>"), 400);
  }
  if (!hasDatabaseEnv()) {
    return c.html(page("Unavailable", "<p>Storage is not configured, so a key cannot be issued.</p>"), 503);
  }

  try {
    const user = await exchangeCodeForUser(originOf(c.req.url), code);
    const sql = db();
    const account = await findOrCreateAccount(sql, user);
    const secret = await issueKeyForAccount(sql, account.accountId, `github:${user.login}`);
    return c.html(issued(user.login, secret));
  } catch (error) {
    console.error("key issuance failed:", error);
    return c.html(page("Could not issue a key", `<p>${escapeHtml((error as Error).message)}</p><p>Try again, or open an issue.</p>`), 500);
  }
});

/** What the account already holds, without revealing the secret. */
keyRoutes.get("/status", async (c) => {
  const login = c.req.query("login");
  if (!login || !hasDatabaseEnv()) return c.json({ key: null });
  const sql = db();
  const rows = await sql<Array<{ account_id: string }>>`
    select account_id from public.accounts where github_login = ${login} limit 1`;
  if (!rows[0]) return c.json({ key: null });
  return c.json({ key: await describeKeyForAccount(sql, rows[0].account_id) });
});

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
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

const page = (title: string, body: string) => SHELL(title, `<h1>${escapeHtml(title)}</h1>${body}`);

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

function issued(login: string, secret: string): string {
  return page(
    `Signed in as ${login}`,
    `<p>This is your API key. <strong>It is shown once</strong> — only a hash is stored, so it cannot be recovered. Signing in again rotates it and revokes this one.</p>
     <pre>${escapeHtml(secret)}</pre>
     <p>Send it as a header:</p>
     <pre>Authorization: Bearer ${escapeHtml(secret)}</pre>
     <p>It raises your limit from 120 requests a minute to 1200. It is metered from a $5.00 trial; when the balance reaches zero it returns <code>402</code>, and the free anonymous tier still works. It unlocks no data — everything the API serves is already public.</p>
     <div class="note"><p>Next: <a href="/docs/quickstart">the quickstart</a> ·
     <a href="/docs/connect">connecting</a> · <a href="/connect">MCP and tool calling</a></p></div>`,
  );
}
