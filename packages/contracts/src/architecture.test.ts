import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const architecture = readFileSync(
  fileURLToPath(new URL("../../../docs/ARCHITECTURE.md", import.meta.url)),
  "utf8",
);

// Keep the architecture guide aligned with the single-deployment layout and
// the current stored-read / scheduled-update boundary.
const REQUIRED = [
  "one Next.js deployment",
  "packages/contracts",
  "packages/db",
  "db/schema.sql",
  "apps/api",
  "apps/worker",
  "/api/v2/*",
  "/api/mcp",
  "Scheduled routes",
  "PostgreSQL",
];

const FORBIDDEN = [
  "/v1/poll",
  "/v1/delta",
  "packages/sdk",
  "packages/realtime",
  "apps/bots",
  "ledger",
  "x402",
  "supabase/functions",
];

test("ARCHITECTURE.md describes the current simplified system", () => {
  for (const needle of REQUIRED) {
    assert.ok(architecture.includes(needle), `expected doc to mention ${needle}`);
  }
});

test("ARCHITECTURE.md no longer describes the pre-simplification system", () => {
  for (const needle of FORBIDDEN) {
    assert.equal(
      architecture.includes(needle),
      false,
      `doc must not mention removed layout term ${needle}`,
    );
  }
});