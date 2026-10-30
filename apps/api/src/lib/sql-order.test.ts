/**
 * Guards for the ordering bug that served month-old news.
 *
 * `select id::text ... order by id desc` sorts the TEXT output alias, not the
 * bigint column: '9984466' > '39276235'. Every list was ordered by the leading
 * digit of an id string, and it was invisible for weeks because it only breaks
 * once ids of differing digit-length coexist.
 *
 * Two tests, because they catch different halves of the failure:
 *
 *   1. a static guard that always runs and fails if the qualifier disappears
 *   2. a database test that proves the semantics, skipped without a database
 *
 * The static one exists because the database one can be skipped and a skipped
 * guard is the thing that let the last omission through.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Read the source, not the compiled output beside this file.
 *
 * The first version resolved `news.ts` relative to `dist/`, where it does not
 * exist, and caught the read error with `continue`. It reported a pass while
 * three unqualified `order by id` clauses were present — a guard that skipped
 * everything and called it coverage. A missing file is now a failure.
 */
const read = (rel: string) => readFileSync(fileURLToPath(new URL(`../../src/lib/${rel}`, import.meta.url)), "utf8");

test("no SQL orders by an unqualified `id`", () => {
  // The failure is one word long: `order by id` instead of `order by table.id`.
  // `order by id::bigint` would also be correct, so the pattern excludes casts.
  const sources = ["news.ts", "cluster.ts"];
  for (const file of sources) {
    const text = read(file); // throws if absent — a missing file is not a pass
    const offenders = text
      .split("\n")
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      // Prose about the bug is not the bug. The first version of this guard
      // flagged its own explanatory comment, which is the right kind of
      // over-strictness, but the fix is to exclude comments rather than to
      // delete the explanation.
      .filter(({ line }) => !line.startsWith("--") && !line.startsWith("//") && !line.startsWith("*"))
      .filter(({ line }) => /order\s+by\s+id\b(?!\s*::)/i.test(line));

    assert.equal(
      offenders.length,
      0,
      `${file}: unqualified "order by id" sorts the text alias, not the column — qualify it.\n` +
        offenders.map((o) => `  line ${o.n}: ${o.line}`).join("\n"),
    );
  }
});

test("ordering by id is numeric, not lexicographic", async (t) => {
  const { hasDatabaseEnv, db } = await import("@blacksheep/db");
  if (!hasDatabaseEnv()) {
    // Skipped rather than silently passing. It is the static guard above that has
    // to carry the load when there is no database, which is why both exist.
    t.skip("no DATABASE_URL — the static guard covers this case");
    return;
  }

  const sql = db();

  // Inside a transaction, because the database is behind a pooler: a temporary
  // table lives on one connection and consecutive statements can land on
  // different ones. The first version created it on one and queried another,
  // which is how it failed with "relation _order_probe does not exist".
  const { lexicographic, numeric } = await sql.begin(async (tx) => {
    await tx`create temp table _order_probe (id bigint primary key, label text) on commit drop`;
    // Deliberately the shape that broke: a 7-digit id sorting above an 8-digit
    // one as text, because '9' > '3'.
    await tx`insert into _order_probe (id, label) values
               (9984466, 'seven digits, leading 9'),
               (39276235, 'eight digits, leading 3'),
               (12000000, 'eight digits, leading 1')`;
    const lex = await tx<Array<{ id: string }>>`
      select id::text as id from _order_probe order by id desc`;
    const num = await tx<Array<{ id: string }>>`
      select id::text as id from _order_probe order by _order_probe.id desc`;
    return {
      lexicographic: lex.map((r) => r.id),
      numeric: num.map((r) => r.id),
    };
  });

  assert.deepEqual(
    lexicographic,
    ["9984466", "39276235", "12000000"],
    "the unqualified form sorts text: this is the bug, reproduced",
  );
  assert.deepEqual(
    numeric,
    ["39276235", "12000000", "9984466"],
    "the qualified form sorts the column: this is the fix",
  );
});
