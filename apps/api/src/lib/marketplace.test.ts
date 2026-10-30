import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import {
  createMarketplaceRoutes,
  validMarketplaceSignature,
} from "./marketplace.js";
import type { MarketplaceDelivery } from "@blacksheep/db";

const secret = "test-secret-not-a-production-credential";
function request(body: string, overrides: Record<string, string> = {}) {
  return new Request("http://local/", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "x-github-event": "marketplace_purchase",
      "x-github-delivery": randomUUID(),
      "x-hub-signature-256": `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`,
      ...overrides,
    },
  });
}
const purchase = (action = "purchased") =>
  JSON.stringify({
    action,
    effective_date: "2026-10-22T00:00:00Z",
    marketplace_purchase: {
      account: {
        id: 123,
        type: "User",
        email: "private@example.com",
        login: "private-user",
      },
      plan: { id: 456, name: "Free", monthly_price_in_cents: 0 },
    },
  });
function fixture() {
  const deliveries = new Map<string, MarketplaceDelivery>();
  const routes = createMarketplaceRoutes({
    secret: () => secret,
    record: async (delivery) => {
      const prior = deliveries.get(delivery.deliveryId);
      if (prior)
        return prior.bodyHash === delivery.bodyHash &&
          prior.event === delivery.event
          ? "duplicate"
          : "conflict";
      deliveries.set(delivery.deliveryId, delivery);
      return "recorded";
    },
  });
  return { routes, deliveries };
}

test("signature matches GitHub's published test vector and authenticates raw bytes", () => {
  assert(
    validMarketplaceSignature(
      Buffer.from("Hello, World!"),
      "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17",
      "It's a Secret to Everybody",
    ),
  );
  const body = Buffer.from('{ "headline": "é → Nvidia" }');
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  assert(validMarketplaceSignature(body, signature, secret));
  assert(
    !validMarketplaceSignature(
      Buffer.from('{"headline":"é → Nvidia"}'),
      signature,
      secret,
    ),
  );
  for (const bad of [
    undefined,
    "sha256=abc",
    "sha1=" + "0".repeat(40),
    "sha256=" + "z".repeat(64),
  ])
    assert(!validMarketplaceSignature(body, bad, secret));
});

test("missing and tampered signatures never reach storage", async () => {
  const { routes, deliveries } = fixture();
  for (const signature of ["", "sha256=" + "0".repeat(64)]) {
    assert.equal(
      (
        await routes.fetch(
          request(purchase(), { "x-hub-signature-256": signature }),
        )
      ).status,
      401,
    );
  }
  assert.equal(deliveries.size, 0);
});

test("all plan actions are durably acknowledged with only minimal metadata", async () => {
  const { routes, deliveries } = fixture();
  for (const action of [
    "purchased",
    "cancelled",
    "changed",
    "pending_change",
    "pending_change_cancelled",
  ]) {
    const response = await routes.fetch(request(purchase(action)));
    assert.equal(response.status, 200);
    assert.equal(
      ((await response.json()) as { status: string }).status,
      "recorded",
    );
  }
  assert.equal(deliveries.size, 5);
  const saved = [...deliveries.values()][0]!;
  assert.equal(saved.accountId, "123");
  assert.equal(saved.planId, "456");
  assert.equal(saved.effectiveAt, "2026-10-22T00:00:00.000Z");
  assert(!JSON.stringify([...deliveries.values()]).includes("private"));
});

test("redelivery is idempotent; changed payload under the same ID conflicts", async () => {
  const { routes, deliveries } = fixture();
  const deliveryId = randomUUID();
  const send = (body: string) =>
    routes.fetch(request(body, { "x-github-delivery": deliveryId }));
  assert.equal(
    ((await (await send(purchase())).json()) as { status: string }).status,
    "recorded",
  );
  assert.equal(
    ((await (await send(purchase())).json()) as { status: string }).status,
    "duplicate",
  );
  assert.equal((await send(purchase("cancelled"))).status, 409);
  assert.equal(deliveries.size, 1);
});

test("older and pending events are preserved without mutating account entitlements", async () => {
  const { routes, deliveries } = fixture();
  const later = JSON.parse(purchase("cancelled"));
  later.effective_date = "2026-11-22T00:00:00Z";
  assert.equal(
    (await routes.fetch(request(JSON.stringify(later)))).status,
    200,
  );
  assert.equal((await routes.fetch(request(purchase()))).status, 200);
  assert.equal(deliveries.size, 2);
});

test("signed ping exercises storage and redelivery; failures are not acknowledged", async () => {
  const { routes, deliveries } = fixture();
  const ping = request('{"zen":"Keep it simple."}', {
    "x-github-event": "ping",
  });
  assert.equal((await routes.fetch(ping)).status, 200);
  assert.equal([...deliveries.values()][0]!.event, "ping");
  const unavailable = createMarketplaceRoutes({
    secret: () => secret,
    record: async () => {
      throw new Error("secret database details");
    },
  });
  const failed = await unavailable.fetch(
    request("{}", { "x-github-event": "ping" }),
  );
  assert.equal(failed.status, 503);
  assert(!JSON.stringify(await failed.json()).includes("secret"));
});

test("invalid payload, content type, delivery ID and oversized bodies are rejected", async () => {
  const { routes, deliveries } = fixture();
  assert.equal((await routes.fetch(request("not json"))).status, 400);
  assert.equal((await routes.fetch(request("{}"))).status, 400);
  assert.equal(
    (await routes.fetch(request("[]", { "x-github-event": "ping" }))).status,
    400,
  );
  assert.equal(
    (await routes.fetch(request(purchase(), { "x-github-delivery": "bad" })))
      .status,
    400,
  );
  assert.equal(
    (
      await routes.fetch(
        request(purchase(), {
          "content-type": "application/x-www-form-urlencoded",
        }),
      )
    ).status,
    415,
  );
  assert.equal(
    (await routes.fetch(request(" ".repeat(1024 * 1024 + 1)))).status,
    413,
  );
  assert.equal(deliveries.size, 0);
});

test("configuration and method errors fail closed; unrelated signed events are ignored", async () => {
  const { routes, deliveries } = fixture();
  assert.equal((await routes.request("/", { method: "GET" })).status, 405);
  assert.equal(
    (await routes.fetch(request("{}", { "x-github-event": "push" }))).status,
    200,
  );
  assert.equal(deliveries.size, 0);
  const missing = createMarketplaceRoutes({
    secret: () => undefined,
    record: async () => {
      throw new Error("must not run");
    },
  });
  assert.equal((await missing.fetch(request(purchase()))).status, 503);
});

test("canonical mounted URL is handled before news rate limits and billing", async () => {
  const { default: app } = await import("../index.js");
  const response = await app.request("/webhooks/github/marketplace", {
    method: "POST",
    body: "{}",
  });
  assert.equal(
    response.status,
    process.env.GITHUB_MARKETPLACE_WEBHOOK_SECRET ? 401 : 503,
  );
  const data = (await response.json()) as { error: string };
  assert.equal(
    data.error,
    process.env.GITHUB_MARKETPLACE_WEBHOOK_SECRET
      ? "invalid_signature"
      : "webhook_not_configured",
  );
});
