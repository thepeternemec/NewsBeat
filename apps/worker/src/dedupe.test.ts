/**
 * Duplicate detection.
 *
 * "We are producing a lot of duplicates in our feed" turned out to be two defects
 * wearing one symptom:
 *
 *   1. Google mints a fresh URL for the same item on every cycle, so `on conflict
 *      (beat_id, url)` never fired. One topic stored 599 identical rows of a single
 *      headline over a week.
 *   2. The headline was "| Benalla Ensign" — the publisher's name, not a story. The
 *      suffix stripper required a space before the separator and Google had not
 *      included one.
 *
 * These are pure, so they run without a database or a network.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { isDegenerateTitle } from "./googlenews.js";

test("the publisher's name is not a headline", () => {
  // The exact string that was stored 599 times under ENSG.
  assert.equal(isDegenerateTitle("| Benalla Ensign", "Benalla Ensign"), true);
  assert.equal(isDegenerateTitle("Benalla Ensign", "Benalla Ensign"), true);
  assert.equal(isDegenerateTitle("- Reuters", "Reuters"), true);
  assert.equal(isDegenerateTitle(" — ", "Reuters"), true);
  assert.equal(isDegenerateTitle("|", "Reuters"), true);
  assert.equal(isDegenerateTitle("", "Reuters"), true);
});

test("real headlines survive", () => {
  for (const [title, publisher] of [
    ["NVIDIA reports record revenue on AI demand", "Reuters"],
    ["Ensign Group beats quarterly estimates", "Benalla Ensign"],
    ["What the Fed decision means for tech stocks", "Yahoo Finance"],
  ] as const) {
    assert.equal(isDegenerateTitle(title, publisher), false, `${title} should be kept`);
  }
});

test("a title too short to say anything is dropped", () => {
  // "Q3 results" is real but five characters of signal is not worth a row; the
  // duplicate detector relies on titles still being titles.
  assert.equal(isDegenerateTitle("Q3 results", "Benalla Ensign"), true);
  assert.equal(isDegenerateTitle("Update", "Reuters"), true);
});

test("the separator is handled with or without a space", () => {
  // Google writes " - Publisher" and "|Publisher" and everything between. A stripper
  // that only knows the spaced form leaves the residue that became the duplicate.
  const cases: Array<[string, string, boolean]> = [
    ["| Benalla Ensign", "Benalla Ensign", true],
    ["|Benalla Ensign", "Benalla Ensign", true],
    ["- Benalla Ensign", "Benalla Ensign", true],
  ];
  for (const [title, publisher, expected] of cases) {
    assert.equal(isDegenerateTitle(title, publisher), expected, title);
  }
});
