import { lookup } from "node:dns/promises";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";
import { Agent, request } from "undici";
import ipaddr from "ipaddr.js";
import { env } from "@newsgraph/db";
export function publicAddress(address: string) {
  try {
    let ip = ipaddr.parse(address);
    if (ip.kind() === "ipv6" && (ip as ipaddr.IPv6).isIPv4MappedAddress())
      ip = (ip as ipaddr.IPv6).toIPv4Address();
    return ip.range() === "unicast";
  } catch {
    return false;
  }
}
export function webhookUrl(raw: string) {
  const url = new URL(raw);
  if (
    url.protocol !== "https:" ||
    (url.port && url.port !== "443") ||
    url.username ||
    url.password ||
    url.hash ||
    raw.length > 2048
  )
    throw new Error(
      "Use a public HTTPS webhook on port 443 without embedded credentials",
    );
  return url;
}
export async function webhookTarget(raw: string) {
  const url = webhookUrl(raw);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new Error("Webhook must resolve only to public addresses");
  return { url, address: addresses[0]! };
}
function encryptionKey() {
  const secret = env("NEWSGRAPH_WEBHOOK_SECRET");
  if (!secret || secret.length < 32)
    throw new Error("Webhook delivery is not configured");
  return createHash("sha256")
    .update(`newsgraph:webhooks:v1:${secret}`)
    .digest();
}
export function seal(value: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data]
    .map((b) => b.toString("base64url"))
    .join(".");
}
export function unseal(value: string) {
  const parts = value.split(".").map((p) => Buffer.from(p, "base64url"));
  if (parts.length !== 3) throw new Error("Invalid encrypted secret");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), parts[0]!);
  decipher.setAuthTag(parts[1]!);
  return Buffer.concat([decipher.update(parts[2]!), decipher.final()]).toString(
    "utf8",
  );
}
export function deliverySignature(
  secret: string,
  timestamp: string,
  body: string,
) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}
export async function deliverWebhook(
  destination: string,
  secret: string,
  id: string,
  payload: unknown,
) {
  const { url, address } = await webhookTarget(destination);
  // Pin the validated address for the connection. Keep the original hostname for TLS/SNI.
  const dispatcher = new Agent({
    connect: {
      lookup: ((_host: unknown, options: any, callback: any) => {
        callback(
          null,
          options?.all ? [address] : address.address,
          address.family,
        );
      }) as any,
    },
  });
  const body = JSON.stringify(payload),
    timestamp = String(Math.floor(Date.now() / 1000));
  try {
    const response = await request(url, {
      dispatcher,
      method: "POST",
      body,
      headersTimeout: 10000,
      bodyTimeout: 10000,
      signal: AbortSignal.timeout(12000),
      headers: {
        "content-type": "application/json",
        "user-agent": "NewsGraph-Webhooks/1.0",
        "x-newsgraph-delivery": id,
        "x-newsgraph-timestamp": timestamp,
        "x-newsgraph-signature": `v1=${deliverySignature(secret, timestamp, body)}`,
      },
    });
    response.body.destroy();
    if (response.statusCode < 200 || response.statusCode >= 300)
      throw new Error(`Webhook returned HTTP ${response.statusCode}`);
  } finally {
    await dispatcher.close();
  }
}
