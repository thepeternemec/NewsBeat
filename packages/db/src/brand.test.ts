import assert from "node:assert/strict";
import { test } from "node:test";
import { env } from "./client.js";
test("brand environment aliases preserve deployed settings and prefer the new name", () => {
  const oldValue = process.env.NEWSGRAPH_BRAND_TEST;
  const newValue = process.env.NEWSBEAT_BRAND_TEST;
  try {
    delete process.env.NEWSBEAT_BRAND_TEST;
    process.env.NEWSGRAPH_BRAND_TEST = "legacy";
    assert.equal(env("NEWSBEAT_BRAND_TEST"), "legacy");
    process.env.NEWSBEAT_BRAND_TEST = "current";
    assert.equal(env("NEWSBEAT_BRAND_TEST"), "current");
  } finally {
    if (oldValue === undefined) delete process.env.NEWSGRAPH_BRAND_TEST; else process.env.NEWSGRAPH_BRAND_TEST = oldValue;
    if (newValue === undefined) delete process.env.NEWSBEAT_BRAND_TEST; else process.env.NEWSBEAT_BRAND_TEST = newValue;
  }
});
