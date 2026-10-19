import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { fixture } from "./sql-fixture.mjs";
import {
  reserveUsage,
  settleUsage,
  InsufficientBalance,
} from "../packages/db/dist/metering.js";
import { issueKeyForAccount, resolveKey } from "../packages/db/dist/keys.js";
import {
  executeOperation,
  actualCost,
} from "../apps/api/dist/lib/operations.js";
import { searchNews, getStory } from "../apps/api/dist/lib/search.js";
import { authorizedCron } from "../apps/api/dist/lib/cron-auth.js";
import {
  publicAddress,
  seal,
  unseal,
  deliverySignature,
  webhookUrl,
} from "../apps/api/dist/lib/webhooks.js";
import { verifyAccessToken } from "../apps/api/dist/lib/oauth.js";
import { generateKeyPair, SignJWT } from "jose";
import { sameValue } from "../apps/api/dist/lib/sessions.js";
import { advanceArguments } from "../apps/api/dist/lib/subscriptions.js";
import { OperationSchemas } from "../packages/contracts/dist/operations.js";
process.env.NEWSGRAPH_CURSOR_SECRET = "integration-test-cursor-secret-only";
process.env.NEWSGRAPH_WEBHOOK_SECRET =
  "integration-test-webhook-secret-at-least-32";
delete process.env.DATABASE_URL;
async function account(sql, amount = 5000) {
  const id = randomUUID();
  await sql`insert into accounts(account_id) values (${id})`;
  await sql`insert into account_balance(account_id, credits_micro) values (${id}, ${amount})`;
  return id;
}
test("concurrent reservations cannot overspend; settlement is idempotent and failures release credit", async () => {
  const f = await fixture();
  try {
    const id = await account(f.sql);
    const attempts = await Promise.allSettled([
      reserveUsage(f.sql, id, null, "search", 4000),
      reserveUsage(f.sql, id, null, "search", 4000),
    ]);
    assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 1);
    assert.ok(
      attempts.find((r) => r.status === "rejected").reason instanceof
        InsufficientBalance,
    );
    const reservation = attempts.find((r) => r.status === "fulfilled").value;
    assert.equal(await settleUsage(f.sql, reservation, 500), 500);
    assert.equal(await settleUsage(f.sql, reservation, 500), 500);
    const [balance] =
      await f.sql`select credits_micro from account_balance where account_id=${id}`;
    assert.equal(Number(balance.credits_micro), 4500);
    const next = await reserveUsage(f.sql, id, null, "search", 4000);
    await settleUsage(f.sql, next, 0);
    const [ledger] =
      await f.sql`select count(*)::int as n,sum(cost_micro)::int as total from usage_ledger where account_id=${id}`;
    assert.deepEqual(ledger, { n: 2, total: 500 });
  } finally {
    await f.close();
  }
});
test("multiple keys stay valid and revoking one does not revoke another", async () => {
  const f = await fixture();
  try {
    const id = await account(f.sql);
    const a = await issueKeyForAccount(f.sql, id, "ChatGPT"),
      b = await issueKeyForAccount(f.sql, id, "Grok");
    const first = await resolveKey(f.sql, a);
    assert.ok(first);
    assert.ok(await resolveKey(f.sql, b));
    await f.sql`update api_keys set revoked_at=now() where key_hash=${first.keyHash}`;
    assert.equal(await resolveKey(f.sql, a), null);
    assert.ok(await resolveKey(f.sql, b));
  } finally {
    await f.close();
  }
});
test("shared executor validates before billing, charges success, and releases on provider failure", async () => {
  const f = await fixture();
  try {
    const id = await account(f.sql, 100000),
      p = { accountId: id, keyHash: null, kind: "key", scopes: ["news:read"] };
    let calls = 0;
    const deps = {
      database: () => f.sql,
      reserve: reserveUsage,
      settle: settleUsage,
      run: {
        news: async () => {
          calls++;
          return { items: [{ title: "A" }] };
        },
        brief: async () => {
          throw new Error("provider unavailable");
        },
        topics: async () => ({ topics: [] }),
      },
    };
    await assert.rejects(
      () => executeOperation("news", { bad: true }, p, deps),
      (e) => e.code === "invalid_request",
    );
    assert.equal(calls, 0);
    const result = await executeOperation(
      "news",
      { beat_id: "b_test" },
      p,
      deps,
    );
    assert.equal(result.usage.cost_micro, 4000);
    assert.ok(result.usage.receipt_id);
    await assert.rejects(() =>
      executeOperation("brief", { beat_id: "b_test" }, p, deps),
    );
    const [balance] =
      await f.sql`select credits_micro from account_balance where account_id=${id}`;
    assert.equal(Number(balance.credits_micro), 96000);
    assert.equal(
      actualCost("watch", {
        results: [
          { error: { code: "bad" }, items: [] },
          { error: null, items: [] },
        ],
      }),
      500,
    );
    await f.sql`update account_balance set credits_micro=0 where account_id=${id}`;
    assert.equal(
      (await executeOperation("topics", {}, p, deps)).usage.cost_micro,
      0,
    );
    await assert.rejects(
      () => executeOperation("news", { beat_id: "b_test" }, p, deps),
      (e) => e.code === "payment_required",
    );
  } finally {
    await f.close();
  }
});
test("search uses real SQL, stable IDs, bounded history, query-bound cursors and cached provider data", async () => {
  const f = await fixture();
  try {
    let providerCalls = 0;
    const date = new Date().toISOString();
    const provider = async () => {
      providerCalls++;
      return [1, 2, 3].map((n) => ({
        uri: String(n),
        title: `Central bank update ${n}`,
        url: `https://publisher.example/story-${n}`,
        lang: "eng",
        dateTime: date,
        source: { title: "Publisher" },
      }));
    };
    const deps = { database: () => f.sql, provider };
    const input = OperationSchemas.search.parse({
      query: "central bank",
      limit: 2,
    });
    const first = await searchNews(input, deps);
    assert.equal(first.items.length, 2);
    assert.equal(first.has_more, true);
    assert.equal(first.coverage.complete, false);
    const history = await searchNews(
      { ...input, before: first.history_cursor },
      deps,
    );
    assert.equal(history.items.length, 1);
    assert.ok(!first.items.some((r) => r.id === history.items[0].id));
    const delta = await searchNews({ ...input, cursor: first.cursor }, deps);
    assert.equal(delta.items.length, 0);
    assert.equal(providerCalls, 1);
    const story = await getStory(first.items[0].id, f.sql);
    assert.equal(story.id, first.items[0].id);
    assert.equal(story.citations.length, 1);
    await assert.rejects(
      () =>
        searchNews(
          { ...input, query: "different query", cursor: first.cursor },
          deps,
        ),
      (e) => e.code === "invalid_cursor",
    );
  } finally {
    await f.close();
  }
});
test("OAuth rejects wrong audience, expired tokens, missing scope and forged issuer", async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const config = {
    issuer: "https://auth.example/",
    jwks: "https://auth.example/jwks",
    resource: "https://news.example/api/mcp",
  };
  const make = (claims = {}) =>
    new SignJWT({ scope: "news:read", ...claims })
      .setProtectedHeader({ alg: "RS256" })
      .setSubject("user-1")
      .setIssuer(claims.iss ?? config.issuer)
      .setAudience(claims.aud ?? config.resource)
      .setIssuedAt()
      .setExpirationTime(claims.exp ?? "5m")
      .sign(privateKey);
  assert.equal(
    (await verifyAccessToken(await make(), config, async () => publicKey))
      .subject,
    "user-1",
  );
  for (const claims of [
    { aud: "another-service" },
    { iss: "https://attacker.example/" },
    { scope: "profile" },
    { exp: 1 },
  ])
    await assert.rejects(() =>
      make(claims).then((t) =>
        verifyAccessToken(t, config, async () => publicKey),
      ),
    );
});
test("cron cannot be authorized by User-Agent; callback state is browser bound", () => {
  const spoof = new Request("https://news.example/api/cron/ingest", {
    headers: { "user-agent": "vercel-cron/1.0" },
  });
  assert.equal(authorizedCron(spoof, []), false);
  assert.equal(authorizedCron(spoof, ["secret"]), false);
  assert.equal(
    authorizedCron(
      new Request(spoof, { headers: { authorization: "Bearer secret" } }),
      ["secret"],
    ),
    true,
  );
  assert.equal(sameValue("state", "other-browser"), false);
  assert.equal(sameValue("state", undefined), false);
});
test("webhook target protection covers private, mapped, metadata and reserved addresses; secrets authenticate", () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "192.168.1.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "0.0.0.0",
    "224.0.0.1",
  ])
    assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress("8.8.8.8"), true);
  assert.throws(() => webhookUrl("http://example.com"));
  assert.throws(() => webhookUrl("https://user:pass@example.com"));
  const ciphertext = seal("secret");
  assert.equal(unseal(ciphertext), "secret");
  assert.notEqual(ciphertext, seal("secret"));
  assert.throws(() => unseal(ciphertext.slice(0, -2) + "xx"));
  assert.notEqual(
    deliverySignature("key", "1", "body"),
    deliverySignature("key", "2", "body"),
  );
});
test("saved watches preserve failed cursors and reset expired ones without discarding healthy progress", () => {
  const args = {
    watches: [
      { beat_id: "a", cursor: "old-a" },
      { beat_id: "b", cursor: "old-b" },
      { beat_id: "c", cursor: "old-c" },
    ],
  };
  const result = {
    results: [
      { cursor: "new-a", error: null },
      { error: { code: "service_unavailable" } },
      { error: { code: "cursor_expired" } },
    ],
  };
  assert.deepEqual(advanceArguments("watch", args, result).watches, [
    { beat_id: "a", cursor: "new-a" },
    { beat_id: "b", cursor: "old-b" },
    { beat_id: "c" },
  ]);
});

test("saved-watch worker atomically queues cursor progress and retries delivery without repeating news charges", async () => {
  const { runSubscriptions } = await import(
    "../apps/api/dist/lib/subscriptions.js"
  );
  const f = await fixture();
  try {
    const id = await account(f.sql);
    const cipher = seal("receiver-signing-secret");
    const args = { watches: [{ beat_id: "b_test", cursor: "old" }] };
    const [subscription] =
      await f.sql`insert into news_subscriptions(account_id,label,operation,arguments,webhook_url,secret_cipher,interval_minutes) values (${id},'Test','watch',${f.sql.json(args)},'https://example.com/webhook',${cipher},15) returning id`;
    let checks = 0,
      attempts = 0;
    const ids = [];
    const deps = {
      database: () => f.sql,
      execute: async () => {
        checks++;
        return {
          moved: 1,
          failed: 0,
          results: [
            {
              cursor: "new",
              has_more: false,
              items: [{ title: "An update" }],
              freshness: { status: "fresh" },
              error: null,
            },
          ],
        };
      },
      deliver: async (url, secret, deliveryId) => {
        assert.equal(secret, "receiver-signing-secret");
        ids.push(deliveryId);
        if (attempts++ === 0) throw new Error("destination offline");
      },
    };
    assert.deepEqual(await runSubscriptions(deps), {
      checked: 1,
      delivered: 0,
    });
    const [sub] =
      await f.sql`select arguments from news_subscriptions where id=${subscription.id}`;
    assert.equal(sub.arguments.watches[0].cursor, "new");
    await f.sql`update news_deliveries set next_attempt_at=now()`;
    assert.deepEqual(await runSubscriptions(deps), {
      checked: 0,
      delivered: 1,
    });
    assert.equal(checks, 1);
    assert.equal(ids[0], ids[1]);
    const [delivery] = await f.sql`select delivered_at from news_deliveries`;
    assert.ok(delivery.delivered_at);
  } finally {
    await f.close();
  }
});
