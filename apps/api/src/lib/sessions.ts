import { randomBytes, timingSafeEqual } from "node:crypto";
import { getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";
import { db, hashKey } from "@newsgraph/db";
const COOKIE = "newsgraph_session";
export function sameValue(a: string | undefined, b: string | undefined) {
  if (!a || !b) return false;
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export async function startSession(c: Context, accountId: string) {
  const secret = randomBytes(32).toString("hex");
  const sql = db();
  await sql`insert into account_sessions(token_hash,account_id,expires_at) values (${await hashKey(secret)},${accountId},now()+interval '12 hours')`;
  setCookie(c, COOKIE, secret, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/api/keys",
    maxAge: 43200,
  });
}
export async function sessionAccount(c: Context) {
  const secret = getCookie(c, COOKIE);
  if (!secret) return null;
  const sql = db();
  const [row] =
    await sql`select account_id from account_sessions where token_hash=${await hashKey(secret)} and expires_at>now()`;
  return row ? String(row.account_id) : null;
}
export function sameOrigin(c: Context) {
  return c.req.header("origin") === new URL(c.req.url).origin;
}
