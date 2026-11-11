import { InvestmentRequestSchema, SEED_BEATS, type IntelligenceResponse, type InvestmentBrief, type ResearchAnswer, type ResearchResponse } from "@newsbeat/contracts";
import { readIntelligence } from "./intelligence.js";
import { NewsError } from "./news.js";
import { buildOpportunityBrief } from "./opportunities.js";
import { researchQuestion } from "./research.js";
import { assetView, researchEvidenceRole } from "./research-core.js";

/** Keep a useful brief available when generation fails, using the observations as recorded. */
export function investmentEvidenceAnswer(research: ResearchResponse): ResearchAnswer | null {
  const asset = research.assets[0];
  if (!asset) return null;
  const fresh = research.evidence.filter(item => item.beat_id === asset.beat_id && item.freshness === "fresh");
  const reportedFigure = fresh.find(item => researchEvidenceRole(item) === "reported_financial_measurement");
  const filing = fresh.find(item => researchEvidenceRole(item) === "official_filing_metadata");
  const headline = fresh.find(item => item.kind === "report");
  const reporting = reportedFigure ?? filing ?? headline;
  const returns = fresh.filter(item => item.id.startsWith("market:"));
  const comparison = returns.find(item => item.id.endsWith(":1440")) ?? returns.at(-1);
  const quote = fresh.find(item => /^(?:venue-quote:|quote:)/.test(item.id));
  const market = comparison ?? quote;
  const observations = [reporting, market].filter(item => item !== undefined);
  if (!observations.length) return null;

  const reportingCheck = reportedFigure || filing
    ? "Read the filing and compare reported results, guidance and expectations for the same period."
    : headline
      ? "Open the lead report and verify the underlying claim with a primary source or an independent report."
      : "Look for fresh reporting or a primary disclosure that identifies a material change.";
  return {
    answer: "Wait for a verified investment case. "
      + (reporting && market ? "Fresh reporting and market observations are available below."
        : reporting ? "Fresh reporting is available. A current market measurement is missing."
          : "A current market observation is available. Fresh reporting is missing."),
    reasoning: [
      ...observations.map(item => ({ kind: "observation" as const, claim: item.text, evidence_ids: [item.id] })),
      { kind: "interpretation", claim: comparison
        ? "The comparison describes a venue window. Connecting it to a development would require a verified catalyst and a measurement aligned to its release."
        : quote
          ? "The reference quote establishes a price observation. Evaluating the investment case requires evidence of a material development and how the market responded."
          : "The reported information is a starting point for verification. A market assessment requires a current measurement and a relevant comparison.",
        evidence_ids: observations.map(item => item.id) },
    ],
    unknowns: ["Whether a verified development changes the investment case, and whether the market has already reacted."],
    next_checks: [reportingCheck, "Check a fresh asset and benchmark comparison around the verified event time."],
  };
}

export function investmentStance(research: ResearchResponse, intelligence: IntelligenceResponse, now: number): Pick<InvestmentBrief, "stance" | "timing"> {
  const opportunity = buildOpportunityBrief([intelligence], "fundamentals", 1, now);
  const review = opportunity.review[0];
  const timing: InvestmentBrief["timing"] = {
    market: !intelligence.pilot ? "outside_pilot" : opportunity.status === "ready" ? "current" : "held",
    analysis: intelligence.status, trigger: review?.evidence[0] ?? null, invalidation: review?.invalidation ?? null,
  };
  const wait = (reason: string): InvestmentBrief["stance"] => ({ state: "wait", label: "Wait for stronger evidence", reason, valid_until: null });
  if (!research.answer || research.method !== "reasoned") return { timing, stance: wait("A stronger stance needs a validated investment case and current market confirmation.") };
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
  if (research.method === "evidence_only" && !research.answer) {
    const answer = investmentEvidenceAnswer(research);
    if (answer) {
      research.answer = answer;
      research.message = "This brief uses the available sources while the full investment analysis is unavailable.";
    }
  }
  const output = await intelligence;
  const now = Date.now();
  return { ticker, generated_at: new Date(now).toISOString(), research, ...investmentStance(research, output, now) };
}
