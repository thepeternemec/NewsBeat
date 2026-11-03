import assert from "node:assert/strict";
import { test } from "node:test";
import { env } from "./client.js";

// The variable names have been through four rounds: NEWSGRAPH_*, NEWSBEAT_*,
// BLACKSHEEP_*, and back to NEWSBEAT_*. Every name that has ever been deployed still
// resolves, so a deployment never depends on a rename landing at the same instant as the
// code. The current name wins.
test("brand environment aliases preserve deployed settings and prefer the current name", () => {
  const saved = {
    NEWSBEAT_BRAND_TEST: process.env.NEWSBEAT_BRAND_TEST,
    BLACKSHEEP_BRAND_TEST: process.env.BLACKSHEEP_BRAND_TEST,
    NEWSGRAPH_BRAND_TEST: process.env.NEWSGRAPH_BRAND_TEST,
  };
  try {
    delete process.env.NEWSBEAT_BRAND_TEST;
    delete process.env.BLACKSHEEP_BRAND_TEST;
    process.env.NEWSGRAPH_BRAND_TEST = "legacy";
    assert.equal(env("NEWSBEAT_BRAND_TEST"), "legacy", "falls back to the oldest name");

    process.env.BLACKSHEEP_BRAND_TEST = "middle";
    assert.equal(env("NEWSBEAT_BRAND_TEST"), "middle", "prefers the previous name over the oldest");

    process.env.NEWSBEAT_BRAND_TEST = "current";
    assert.equal(env("NEWSBEAT_BRAND_TEST"), "current", "prefers the current name");
  } finally {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("an unknown variable resolves to undefined rather than throwing", () => {
  assert.equal(env("NEWSBEAT_NOT_SET_ANYWHERE"), undefined);
});
