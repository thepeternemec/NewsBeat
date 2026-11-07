"use client";

import ResearchQuestion from "./research-question";

/** Kept as a component adapter for existing asset pages. */
export default function HeadlineSummary({ beatId, label }: { beatId: string; label: string; base: string }) {
  return <ResearchQuestion key={beatId} beatIds={[beatId]} label={label} compact />;
}
