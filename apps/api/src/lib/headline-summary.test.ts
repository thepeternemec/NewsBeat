import assert from "node:assert/strict";
import { test } from "node:test";
import { validateSummaries, type HeadlineSummaryItem } from "./headline-summary.js";

const items: HeadlineSummaryItem[] = [
  { story_id: "1", text: "Nvidia in talks to invest $100M in Firmus", reports: [
    { id: "1", title: "Nvidia in talks to invest $100M in Firmus", source: "Publisher A", url: "https://example.com/1", published_at: "2026-10-21T09:00:00Z" },
  ] },
  { story_id: "2", text: "Nokia and Nvidia complete AI-RAN call", reports: [
    { id: "2", title: "Nokia and Nvidia complete AI-RAN call", source: "Publisher B", url: "https://example.com/2", published_at: "2026-10-21T08:00:00Z" },
  ] },
];

test("generated sentences stay attached to their own reports and preserve uncertainty", () => {
  assert.deepEqual(validateSummaries({ items: [
    { story_id: "1", text: "Nvidia is reportedly in talks to invest $100M in Firmus." },
    { story_id: "2", text: "Nokia and Nvidia completed an AI-RAN call." },
  ] }, items), ["Nvidia is reportedly in talks to invest $100M in Firmus.", "Nokia and Nvidia completed an AI-RAN call."]);
  assert.equal(validateSummaries({ items: [
    { story_id: "1", text: "Nvidia invested $100M in Firmus." },
    { story_id: "2", text: "Nokia and Nvidia completed an AI-RAN call." },
  ] }, items), null);
});

test("invented figures and mismatched citations trigger the original-headline fallback", () => {
  assert.equal(validateSummaries({ items: [
    { story_id: "1", text: "Nvidia may invest $500M in Firmus." },
    { story_id: "2", text: "Nokia and Nvidia completed an AI-RAN call." },
  ] }, items), null);
  assert.equal(validateSummaries({ items: [
    { story_id: "2", text: "Nvidia may invest $100M in Firmus." },
    { story_id: "1", text: "Nokia and Nvidia completed an AI-RAN call." },
  ] }, items), null);
});
