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
import { db, describeKeyForAccount, findOrCreateAccount, hasDatabaseEnv, issueKeyForAccount, openBalance, resolveKey, trialFor, TRIAL_DAYS } from "@newsbeat/db";
import { authorizeUrl, exchangeCodeForUser, oauthConfig, oauthOrigin, signState, verifyState } from "./github.js";

export const keyRoutes = new Hono();

/** A private, zero-cost check an agent can use to explain its trial deadline. */
keyRoutes.get("/trial", async (c) => {
  c.header("Cache-Control", "no-store");
  const bearer = c.req.header("authorization") ?? "";
  const secret = bearer.toLowerCase().startsWith("bearer ") ? bearer.slice(7).trim() : "";
  if (!secret) return c.json({ error: "A bearer key is required." }, 401);
  if (!hasDatabaseEnv()) return c.json({ error: "Trial status is unavailable." }, 503);
  try {
    const sql = db();
    const key = await resolveKey(sql, secret);
    if (!key?.accountId) return c.json({ error: "An account key is required." }, 401);
    const [balance, trial] = await Promise.all([openBalance(sql, key.accountId), trialFor(sql, key.accountId)]);
    const spendable = (trial.expired ? 0 : balance.creditsMicro) + balance.toppedUpMicro;
    return c.json({
      status: balance.toppedUpMicro > 0 ? "paid" : trial.expired ? "expired" : spendable <= 0 ? "credit_exhausted" : trial.startedAt ? "active" : "ready",
      trial_days: TRIAL_DAYS,
      started_at: trial.startedAt?.toISOString() ?? null,
      expires_at: trial.expiresAt?.toISOString() ?? null,
      trial_credit_micro: trial.expired ? 0 : balance.creditsMicro,
      paid_balance_micro: balance.toppedUpMicro,
      public_access: { requires_key: false, requests_per_minute: 120 },
    });
  } catch (error) {
    console.error("trial status failed:", error);
    return c.json({ error: "Trial status is temporarily unavailable." }, 503);
  }
});

function originOf(requestUrl: string): string {
  return new URL(requestUrl).origin;
}

keyRoutes.get("/authorize", (c) => {
  c.header("Cache-Control", "no-store");
  const origin = originOf(c.req.url);
  const canonical = oauthOrigin(origin);
  // Start on the callback's deployment so credentials and signed state agree,
  // even when a preview uses a different GitHub app or state-signing secret.
  if (canonical !== origin) return c.redirect(`${canonical}/api/keys/authorize`, 302);
  const config = oauthConfig();
  if (!config) {
    return c.html(unconfigured(), 503);
  }
  return c.redirect(authorizeUrl(origin, signState()), 302);
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
<title>${escapeHtml(title)} · NewsBeat</title>
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
     <p>Try NewsBeat in your agent for seven days, starting with its first metered request. You have up to $6 in trial credit to check the companies and crypto you follow; the key also allows up to 1200 requests a minute. See your deadline and remaining credit at <code>GET /api/keys/trial</code> using this key. When the seven days or credit ends, keyed reads return <code>402</code>. Public news remains free without a key at 120 requests a minute. Signing in again does not restart the trial.</p>
     <div class="note"><p>Next: <a href="/docs/quickstart">the quickstart</a> ·
     <a href="/docs/connect">connecting</a> · <a href="/connect">MCP and tool calling</a></p></div>`,
  );
}
