import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import {
  recordMarketplaceDelivery,
  type MarketplaceDelivery,
  type DeliveryResult,
} from "@blacksheep/db";

const MAX_BYTES = 1024 * 1024;
const id = z.number().int().positive().safe();
const purchaseSchema = z.object({
  action: z.string().regex(/^[a-z_]{1,64}$/),
  effective_date: z.string().datetime({ offset: true }),
  marketplace_purchase: z.object({
    account: z.object({ id, type: z.enum(["User", "Organization"]) }),
    plan: z.object({ id }),
  }),
  previous_marketplace_purchase: z
    .object({
      plan: z.object({ id }),
    })
    .nullish(),
});

export function validMarketplaceSignature(
  body: Uint8Array,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!/^sha256=[a-f0-9]{64}$/.test(signature ?? "")) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature!.slice(7), "hex"));
}

async function boundedBody(request: Request): Promise<Buffer> {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > MAX_BYTES) throw new Error("large");
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel().catch(() => {});
  }, 5000);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (timedOut) throw new Error("timeout");
      if (done) return Buffer.concat(chunks);
      length += value.length;
      if (length > MAX_BYTES) {
        await reader.cancel();
        throw new Error("large");
      }
      chunks.push(value);
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}

type Dependencies = {
  secret: () => string | undefined;
  record: (delivery: MarketplaceDelivery) => Promise<DeliveryResult>;
};
export function createMarketplaceRoutes(
  dependencies: Dependencies = {
    secret: () => process.env.GITHUB_MARKETPLACE_WEBHOOK_SECRET,
    record: recordMarketplaceDelivery,
  },
) {
  const routes = new Hono();
  routes.all("/", async (c) => {
    c.header("Cache-Control", "no-store");
    if (c.req.method !== "POST") {
      c.header("Allow", "POST");
      return c.json({ error: "method_not_allowed" }, 405);
    }
    const secret = dependencies.secret();
    if (!secret) return c.json({ error: "webhook_not_configured" }, 503);
    const signature = c.req.header("X-Hub-Signature-256");
    if (!/^sha256=[a-f0-9]{64}$/.test(signature ?? ""))
      return c.json({ error: "invalid_signature" }, 401);
    if (
      c.req.header("Content-Type")?.split(";")[0]?.trim().toLowerCase() !==
      "application/json"
    )
      return c.json({ error: "use_application_json" }, 415);
    let body: Buffer;
    try {
      body = await boundedBody(c.req.raw);
    } catch (error) {
      return c.json(
        { error: "invalid_body" },
        (error as Error).message === "large" ? 413 : 400,
      );
    }
    if (!validMarketplaceSignature(body, signature, secret))
      return c.json({ error: "invalid_signature" }, 401);
    const deliveryId = c.req.header("X-GitHub-Delivery");
    if (
      !deliveryId ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        deliveryId,
      )
    )
      return c.json({ error: "invalid_delivery_id" }, 400);
    const event = c.req.header("X-GitHub-Event");
    if (event !== "ping" && event !== "marketplace_purchase")
      return c.json({ status: "ignored" }, 200);
    let payload: unknown;
    try {
      payload = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(body),
      );
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const delivery: MarketplaceDelivery = {
      deliveryId: deliveryId.toLowerCase(),
      event,
      bodyHash: createHash("sha256").update(body).digest("hex"),
      action: null,
      accountId: null,
      accountType: null,
      planId: null,
      previousPlanId: null,
      effectiveAt: null,
    };
    if (event === "marketplace_purchase") {
      const parsed = purchaseSchema.safeParse(payload);
      if (!parsed.success)
        return c.json({ error: "invalid_marketplace_payload" }, 400);
      const data = parsed.data;
      delivery.action = data.action;
      delivery.accountId = String(data.marketplace_purchase.account.id);
      delivery.accountType = data.marketplace_purchase.account.type;
      delivery.planId = String(data.marketplace_purchase.plan.id);
      delivery.previousPlanId = data.previous_marketplace_purchase
        ? String(data.previous_marketplace_purchase.plan.id)
        : null;
      delivery.effectiveAt = new Date(data.effective_date).toISOString();
    } else if (
      typeof payload !== "object" ||
      payload === null ||
      Array.isArray(payload)
    ) {
      return c.json({ error: "invalid_ping_payload" }, 400);
    }
    try {
      const result = await dependencies.record(delivery);
      if (result === "conflict")
        return c.json({ error: "delivery_conflict" }, 409);
      return c.json({ status: result, delivery_id: delivery.deliveryId }, 200);
    } catch {
      // Do not expose payloads, database details or secrets in responses or logs.
      return c.json({ error: "delivery_storage_unavailable" }, 503);
    }
  });
  return routes;
}

export const marketplaceRoutes = createMarketplaceRoutes();
