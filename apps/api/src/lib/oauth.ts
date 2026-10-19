import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { db, env } from "@newsgraph/db";
import { randomUUID } from "node:crypto";
import type { Principal } from "./operations.js";
export function oauthConfig() {
  const issuer = env("NEWSGRAPH_OAUTH_ISSUER"),
    jwks = env("NEWSGRAPH_OAUTH_JWKS_URL"),
    resource = env("NEWSGRAPH_OAUTH_RESOURCE");
  if (!issuer || !jwks || !resource) return null;
  for (const value of [issuer, jwks, resource]) {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.hash)
      throw new Error("OAuth configuration requires HTTPS URLs");
  }
  return { issuer, jwks, resource };
}
let cached: { url: string; key: JWTVerifyGetKey } | undefined;
export async function verifyAccessToken(
  token: string,
  config: NonNullable<ReturnType<typeof oauthConfig>>,
  key?: JWTVerifyGetKey,
) {
  if (!key) {
    if (cached?.url !== config.jwks)
      cached = {
        url: config.jwks,
        key: createRemoteJWKSet(new URL(config.jwks)),
      };
    key = cached!.key;
  }
  const { payload } = await jwtVerify(token, key, {
    issuer: config.issuer,
    audience: config.resource,
    algorithms: ["RS256", "ES256"],
    requiredClaims: ["sub", "exp", "iat"],
    clockTolerance: 5,
  });
  if (
    !payload.sub ||
    typeof payload.scope !== "string" ||
    !payload.scope.split(" ").includes("news:read")
  )
    throw new Error("Missing news:read scope");
  return { subject: payload.sub, scopes: payload.scope.split(" ") };
}
export async function oauthPrincipal(token: string): Promise<Principal> {
  const config = oauthConfig();
  if (!config) throw new Error("OAuth is not configured");
  const verified = await verifyAccessToken(token, config);
  const sql = db();
  const accountId = await sql.begin(async (tx) => {
    // Serialize identity creation to prevent duplicate trial grants under concurrency.
    await tx`select pg_advisory_xact_lock(hashtextextended(${config.issuer + ":" + verified.subject},0))`;
    const [existing] =
      await tx`select account_id from oauth_identities where issuer=${config.issuer} and subject=${verified.subject}`;
    if (existing) return String(existing.account_id);
    const id = randomUUID();
    await tx`insert into accounts(account_id,display_name) values (${id},'OAuth account')`;
    await tx`insert into oauth_identities(issuer,subject,account_id) values (${config.issuer},${verified.subject},${id})`;
    await tx`insert into account_balance(account_id) values (${id})`;
    return id;
  });
  return { accountId, keyHash: null, kind: "oauth", scopes: verified.scopes };
}
export function resourceMetadata() {
  const config = oauthConfig();
  if (!config) return null;
  return {
    resource: config.resource,
    authorization_servers: [config.issuer],
    scopes_supported: ["news:read", "watches:write"],
    bearer_methods_supported: ["header"],
    resource_name: "NewsGraph",
    resource_documentation: "https://newsgraph.vercel.app/docs/connect",
  };
}
export function challenge(origin: string) {
  return `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/api/mcp", scope="news:read"`;
}
