import type { ResearchAnswer, ResearchAsset, ResearchEvidence } from "@newsbeat/contracts";

export function isReferenceQuoteQuestion(question: string) {
  return /\b(?:price|quote|bid|ask|mid)\b/i.test(question)
    && !/\b(?:why|cause|explain|risk|outlook|compare|anomal\w*|target|forecast|predict\w*|reaction|impact|valuation|undervalued|overvalued|news|since|historical|yesterday|ago|change|changed|return|returns)\b/i.test(question);
}

/** A measured read should not depend on a language model reformatting trusted numeric values. */
export function referenceQuoteAnswer(assets: ResearchAsset[], evidence: ResearchEvidence[]): ResearchAnswer | null {
  const candidates = evidence.filter(item => item.kind === "measurement" && item.freshness === "fresh"
    && /^(?:quote:|venue-quote:)/.test(item.id )).sort((a, b) => b.observed_at.localeCompare(a.observed_at));
  const quotes = assets.map(asset => candidates.find(item => item.beat_id === asset.beat_id)).filter((item): item is ResearchEvidence => Boolean(item));
  if (!quotes.length) return null;
  const missing = assets.filter(asset => !quotes.some(item => item.beat_id === asset.beat_id));
  return {
    answer: quotes.slice(0, 3).map(item => item.text + " Source: " + item.source + "; observed " + item.observed_at + ".").join(" ")
      + (missing.length ? " No current identified reference quote is available for " + missing.map(asset => asset.label).join(", ") + "." : ""),
    reasoning: [
      ...quotes.slice(0, 3).map(item => ({ kind: "observation" as const, claim: item.text, evidence_ids: [item.id] })),
      { kind: "interpretation", claim: "These are reference observations from identified sources and times. They do not establish an executable fill, a consolidated underlying-share quote or a forecast.", evidence_ids: quotes.slice(0, 3).map(item => item.id) },
    ],
    unknowns: ["An executable fill, fees and liquidity at the moment of execution are not established by these reference observations."],
    next_checks: ["Check the source and observation time of each quote, and refresh before using it as a current reference."],
  };
}
