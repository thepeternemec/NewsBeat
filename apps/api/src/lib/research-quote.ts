import type { ResearchAnswer, ResearchAsset, ResearchEvidence } from "@newsbeat/contracts";
import { resolveResearchAssets } from "./research-core.js";

const QUOTE_WORDS = new Set("what whats is are the current latest reference spot price prices quote quotes bid bids ask asks mid midpoint for of and or me show give tell please how much does do a an s in usd dollar dollars now today live source sources with at as observed observation timestamp timestamps time update updated when can you i".split(" "));
const plain = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export function isReferenceQuoteQuestion(question: string, scopedAssets?: Array<Pick<ResearchAsset, "label" | "ticker">>) {
  if (!/\b(?:prices?|quotes?|bids?|asks?|mid)\b/i.test(question)) return false;
  const assets = scopedAssets ?? resolveResearchAssets(question).assets;
  if (!assets.length) return false;
  let remainder = " " + plain(question) + " ";
  for (const asset of assets) for (const name of [asset.label, asset.ticker].sort((a, b) => b.length - a.length)) {
    remainder = remainder.replaceAll(" " + plain(name) + " ", " ");
  }
  // Only the supported quote vocabulary can take this shortcut. Everything else
  // (risk, news, history, liquidity, forecasts, etc.) continues through research.
  return remainder.trim().split(/\s+/).every(word => QUOTE_WORDS.has(word));
}

/** A measured read should not depend on a language model reformatting trusted numeric values. */
export function referenceQuoteAnswer(assets: ResearchAsset[], evidence: ResearchEvidence[]): ResearchAnswer | null {
  const candidates = evidence.filter(item => item.kind === "measurement" && item.freshness === "fresh"
    && /^(?:quote:|venue-quote:)/.test(item.id)).sort((a, b) => b.observed_at.localeCompare(a.observed_at));
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
