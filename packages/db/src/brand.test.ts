import assert from "node:assert/strict";
import { test } from "node:test";
import { env } from "./client.js";

// Variable names have been through three brands: NEWSGRAPH_*, NEWSBEAT_*, and now
// BLACKSHEEP_*. A deployment must never depend on the rename landing in the same
// instant as the code, so all three resolve and the current name wins.
test("brand environment aliases preserve deployed settings and prefer the new name", () => {
  const saved = {
    BLACKSHEEP_BRAND_TEST: process.env.BLACKSHEEP_BRAND_TEST,
    NEWSBEAT_BRAND_TEST: process.env.NEWSBEAT_BRAND_TEST,
    NEWSGRAPH_BRAND_TEST: process.env.NEWSGRAPH_BRAND_TEST,
  };
  try {
    delete process.env.BLACKSHEEP_BRAND_TEST;
    delete process.env.NEWSBEAT_BRAND_TEST;
    process.env.NEWSGRAPH_BRAND_TEST = "legacy";
    assert.equal(env("BLACKSHEEP_BRAND_TEST"), "legacy", "falls back to the oldest name");

    process.env.NEWSBEAT_BRAND_TEST = "middle";
    assert.equal(env("BLACKSHEEP_BRAND_TEST"), "middle", "prefers the middle name over the oldest");

    process.env.BLACKSHEEP_BRAND_TEST = "current";
    assert.equal(env("BLACKSHEEP_BRAND_TEST"), "current", "prefers the current name");
  } finally {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("an unknown variable resolves to undefined rather than throwing", () => {
  assert.equal(env("BLACKSHEEP_NOT_SET_ANYWHERE"), undefined);
});
