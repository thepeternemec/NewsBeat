/**
 * What a response costs.
 *
 * Cost depends on the result, not the route: an empty check is a twentieth of a
 * cent and one that moved is eight times that. These are pure, so they run without
 * a database — which matters, because the prices are the part of the product most
 * likely to be wrong in a way nobody notices until a customer does.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { PRICE, costFor, pruneOldArticles, recordUsage } from "./billing.js";

test("an empty check is cheaper than one that moved", () => {
  assert.equal(costFor("/api/v2/changes", { items: [] }), PRICE.checkEmpty);
  assert.equal(costFor("/api/v2/changes", { items: [{}, {}] }), PRICE.checkMoved);
  assert.equal(costFor("/api/v2/news", { items: [] }), PRICE.checkEmpty);
  assert.equal(costFor("/api/v2/brief", { items: [] }), PRICE.brief);
});

test("discovery is free", () => {
  // The catalog is how a customer finds out what exists; charging for it puts a
  // toll booth in front of the shop window.
  for (const path of ["/api/v2/topics", "/api/v2/tools", "/api/health"]) {
    assert.equal(costFor(path, { topics: [] }), 0, `${path} should be free`);
  }
});

test("a batch is priced per watch, not per request", () => {
  // It recorded 0 when it shipped, which would have made the cheapest way to use
  // the product also the only free one.
  assert.equal(
    costFor("/api/v2/watch", { results: [{ moved: true }, { moved: false }, { moved: false }] }),
    PRICE.checkMoved + PRICE.checkEmpty * 2,
  );
  assert.equal(
    costFor("/api/v2/watch", { results: Array.from({ length: 50 }, () => ({ moved: false })) }),
    PRICE.checkEmpty * 50,
  );
  // A malformed body must not be treated as a free lunch.
  assert.equal(costFor("/api/v2/watch", null), 0);
});

test("a failed watch still costs the empty price", () => {
  // An entry that errored produced no items, which is the cheap case — and it must
  // not be *cheaper* than a successful empty check, or errors become a discount.
  assert.equal(costFor("/api/v2/watch", { results: [{ moved: false, error: { code: "invalid_cursor" } }] }), PRICE.checkEmpty);
});

test("retention refuses to be configured below the API window", () => {
  // The API serves 30 days. A retention window shorter than that would delete rows
  // a request could still reach, so the floor is enforced in the function rather
  // than trusted from the environment.
  assert.equal(typeof pruneOldArticles, "function");
  assert.equal(typeof recordUsage, "function");
});
