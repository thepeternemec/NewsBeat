import { InvestmentRequestSchema, SEED_BEATS, type IntelligenceResponse, type InvestmentBrief, type ResearchResponse } from "@newsbeat/contracts";
import { readIntelligence } from "./intelligence.js";
import { NewsError } from "./news.js";
import { buildOpportunityBrief } from "./opportunities.js";
import { researchQuestion } from "./research.js";
import { assetView } from "./research-core.js";

export function investmentStance(research: ResearchResponse, intelligence: IntelligenceResponse, now: number): Pick<InvestmentBrief, "stance" | "timing"> {
  const opportunity = buildOpportunityBrief([intelligence], "fundamentals", 1, now);
  const review = opportunity.review[0];
  const timing: InvestmentBrief["timing"] = {
    market: !intelligence.pilot ? "outside_pilot" : opportunity.status === "ready" ? "current" : "held",
    analysis: intelligence.status, trigger: review?.evidence[0] ?? null, invalidation: review?.invalidation ?? null,
  };
  const wait = (reason: string): InvestmentBrief["stance"] => ({ state: "wait", label: "Wait for stronger evidence", reason, valid_until: null });
  if (!research.answer || research.method !== "reasoned") return { timing, stance: wait("Rarebird could not validate a sourced investment case from the available evidence.") };
  if (!intelligence.pilot) return { timing, stance: wait("Rarebird has research coverage for this ticker. Its measured timing pilot covers selected assets.") };
  if (intelligence.status !== "ready") return { timing, stance: wait("The timing analysis is pending or unavailable. The research below shows the evidence available now.") };
  if (research.status !== "ready" || timing.market !== "current") return { timing, stance: wait("Current reporting and market coverage are needed to support a stronger stance.") };
  if (!review || (review.direction !== "supportive" && review.direction !== "adverse")) return { timing, stance: wait("The latest evidence did not produce a directional candidate that passed Rarebird’s review checks.") };
  const supportive = review.direction === "supportive";
  return { timing, stance: {
    state: supportive ? "consider" : "caution",
    label: supportive ? "Consider the case" : "Caution on the current case",
    reason: supportive ? "A supportive development passed the current reporting and market checks." : "An adverse development passed the current reporting and market checks.",
    valid_until: review.market_evidence_until,
  } };
}

export async function readInvestmentBrief(raw: unknown, oidcToken?: string | null): Promise<InvestmentBrief> {
  const parsed = InvestmentRequestSchema.safeParse(raw);
  if (!parsed.success) throw new NewsError("invalid_request", "Enter one ticker, such as BTC or NVDA.", 400);
  const { ticker, beat_id } = parsed.data;
  const matches = SEED_BEATS.filter(beat => beat.ticker.toUpperCase() === ticker);
  const asset = beat_id ? matches.find(beat => beat.beat_id === beat_id) : matches.length === 1 ? matches[0] : undefined;
  if (beat_id && !asset) throw new NewsError("invalid_request", "The selected asset does not match that ticker.", 400);
  const question = `What is the current investment case for ${ticker}? Explain the strongest supported upside, downside, market evidence, and what would change the case. Give an asset-level assessment with no trade instruction.`;
  if (!asset) {
    const now = new Date().toISOString();
    return { ticker, generated_at: now, stance: null, timing: null, research: {
      version: "question-research-v1", question, generated_at: now, status: "needs_clarification", method: "evidence_only", context: "fundamentals",
      answer: null, message: matches.length ? "This ticker matches several assets. Choose the one you mean." : "That ticker is outside the Rarebird catalog.",
      generation_error: null, assets: [], candidates: matches.map(assetView), evidence: [], limitations: [], flow: [{ step: "Resolve asset", status: "limited" }],
    } };
  }
  const intelligence = readIntelligence(asset.beat_id, "fundamentals");
  const research = await researchQuestion({ question, beat_ids: [asset.beat_id] }, oidcToken, () => intelligence);
  const output = await intelligence;
  const now = Date.now();
  return { ticker, generated_at: new Date(now).toISOString(), research, ...investmentStance(research, output, now) };
}
