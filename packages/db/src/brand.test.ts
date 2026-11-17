import assert from "node:assert/strict";
import { test } from "node:test";
import { env } from "./client.js";

test("brand environment aliases preserve deployed settings and prefer the current name", () => {
  const saved = {
    RAREBIRD_BRAND_TEST: process.env.RAREBIRD_BRAND_TEST,
    NEWSBEAT_BRAND_TEST: process.env.NEWSBEAT_BRAND_TEST,
    BLACKSHEEP_BRAND_TEST: process.env.BLACKSHEEP_BRAND_TEST,
    NEWSGRAPH_BRAND_TEST: process.env.NEWSGRAPH_BRAND_TEST,
  };
  try {
    delete process.env.RAREBIRD_BRAND_TEST;
    delete process.env.NEWSBEAT_BRAND_TEST;
    delete process.env.BLACKSHEEP_BRAND_TEST;
    process.env.NEWSGRAPH_BRAND_TEST = "legacy";
    assert.equal(env("RAREBIRD_BRAND_TEST"), "legacy", "falls back to the oldest name");

    process.env.BLACKSHEEP_BRAND_TEST = "middle";
    assert.equal(env("RAREBIRD_BRAND_TEST"), "middle", "prefers the previous name over the oldest");

    process.env.NEWSBEAT_BRAND_TEST = "previous";
    assert.equal(env("RAREBIRD_BRAND_TEST"), "previous", "prefers the most recent deployed alias");

    process.env.RAREBIRD_BRAND_TEST = "current";
    assert.equal(env("RAREBIRD_BRAND_TEST"), "current", "prefers the current name");
  } finally {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("an unknown variable resolves to undefined rather than throwing", () => {
  assert.equal(env("RAREBIRD_NOT_SET_ANYWHERE"), undefined);
});
