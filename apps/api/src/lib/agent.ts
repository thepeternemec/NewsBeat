import {
  AgentRequestSchema, SEED_BEATS, type AgentRequest, type AgentResponse, type AgentTool,
  type ResearchAnswer, type ResearchEvidence,
} from "@rarebird/contracts";
import { NewsError } from "./news.js";
import { assetView, resolveResearchAssets } from "./research-core.js";
import { reasonAboutQuestion } from "./research-model.js";
import { isReferenceQuoteQuestion, referenceQuoteAnswer } from "./research-quote.js";
import { AGENT_TOOL_LABELS, planAgent, type AgentPlan } from "./agent-plan.js";
import { extractAgentContract, readAgentTool, type AgentToolReading } from "./agent-tools.js";

const services = { plan: planAgent, read: readAgentTool, reason: reasonAboutQuestion };
let activeRequests = 0;

export function agentAssets(input: AgentRequest, plan: AgentPlan) {
  if (extractAgentContract(input.question)) return { assets: [], candidates: [], issue: null };
  const explicit = resolveResearchAssets(input.question);
  if (input.beat_ids?.length) {
    const selected = resolveResearchAssets(input.question, input.beat_ids);
    if (selected.issue) return selected;
    if (!explicit.assets.length && (!explicit.candidates.length || selected.assets.every(asset => explicit.candidates.some(candidate => candidate.beat_id === asset.beat_id)))) return selected;
  }
  if (explicit.candidates.length) {
    const crypto = input.market === "crypto" || /\b(crypto|token|coin)\b/i.test(input.question);
    const equity = input.market === "equity" || /\b(stock|company|shares)\b/i.test(input.question);
    const candidates = crypto !== equity ? explicit.candidates.filter(asset => asset.asset === (crypto ? "crypto" : "equity")) : explicit.candidates;
    if (candidates.length === 1) return resolveResearchAssets(input.question, [candidates[0]!.beat_id]);
    return explicit;
  }
  const previousIds = input.beat_ids?.length ? input.beat_ids : input.history.at(-1)?.beat_ids;
  const previous = previousIds?.length ? resolveResearchAssets(input.question, previousIds).assets : [];
  const allowed = new Map([...previous, ...explicit.assets].map(asset => [asset.beat_id, asset]));
  if (explicit.assets.length) {
    if (previous.length && /\b(compare|versus|vs|than)\b/i.test(input.question)
      && (explicit.assets.length === 1 || /\b(it|them|those|these)\b/i.test(input.question))) {
      if (allowed.size > 3) return { assets: [], candidates: [...allowed.values()].map(assetView), issue: "Choose up to three assets for this comparison." };
      return { assets: [...allowed.values()], candidates: [], issue: null };
    }
    return explicit;
  }
  if (!explicit.assets.length && (/\b(overall|across|best|opportunities|recommend|all markets|whole market|deserves attention)\b/i.test(input.question)
    || (/\bforecasts?\b/i.test(input.question) && !/\b(for (?:it|that|these|those|them)|its forecast|their forecast)\b/i.test(input.question)))) return { assets: [], candidates: [], issue: null };
  const rewritten = resolveResearchAssets(plan.question);
  if (rewritten.assets.length && rewritten.assets.every(asset => allowed.has(asset.beat_id))) return rewritten;
  if (/\b(overall|across|best|opportunities|recommend|all markets|whole market|deserves attention)\b/i.test(input.question)
    || (plan.tools.every(tool => ["forecasts", "market", "indicators", "chain", "connections", "discovery", "opportunities"].includes(tool))
      && !/\b(it|its|that|these|those|they|them|their|and|what about|how about)\b/i.test(input.question))) return { assets: [], candidates: [], issue: null };
  return { assets: previous, candidates: [], issue: null };
}

function observedAnswer(question: string, evidence: ResearchEvidence[], limitations: string[]): ResearchAnswer | null {
  const current = evidence.filter(item => item.freshness === "fresh");
  const lead = current.find(item => item.id.startsWith("agent:review:"))
    ?? current.find(item => item.id.startsWith("agent:watch:")) ?? current[0];
  if (!lead) return null;
  const seekingRecommendation = /best|recommend|attention|opportunit|prioriti|watch/i.test(question);
  const reviewMissing = seekingRecommendation && !current.some(item => /^agent:(review|watch):/.test(item.id));
  return {
    answer: (reviewMissing ? "Current review checks do not supply a qualified leading candidate. The following is a source observation to investigate. " : "") + lead.text.slice(0, reviewMissing ? 650 : 850),
    reasoning: current.slice(0, 3).map(item => ({ kind: "observation", claim: item.text.slice(0, 490), evidence_ids: [item.id] })),
    unknowns: limitations.slice(0, 6).map(item => item.slice(0, 300)),
    next_checks: [reviewMissing ? "Check for a fresh review with passing market confirmation before prioritizing a candidate." : "Check the linked source, observation time and missing confirmation before making a decision."],
  };
}

async function execute(input: AgentRequest, oidcToken: string | null | undefined, dependencies: typeof services, proactive: boolean): Promise<AgentResponse> {
  const plan = proactive ? { question: input.question, context: "fundamentals" as const,
    tools: (input.beat_ids?.length ? ["research", "reporting"] : ["opportunities", "discovery", "forecasts", "market"]) as AgentTool[] }
    : await dependencies.plan(input, oidcToken);
  const resolved = agentAssets(input, plan);
  const output: AgentResponse = {
    agent_version: "market-agent-v1", version: "question-research-v1", question: input.question,
    generated_at: new Date().toISOString(), status: "partial", method: "evidence_only", context: plan.context,
    answer: null, message: null, generation_error: null,
    assets: resolved.assets.map(asset => ({ ...assetView(asset), news_status: "not_checked", market_status: "not_checked", reports_scanned: 0, coverage_truncated: false, limitations: [] })), candidates: resolved.candidates,
    evidence: [], limitations: [], flow: [], tools: [], suggestions: [],
  };
  if (resolved.candidates.length || resolved.issue) {
    output.status = "needs_clarification";
    output.message = resolved.issue;
    return output;
  }
  let tools = [...new Set(plan.tools)];
  const previous = input.history.at(-1);
  const hasNewAddress = /0x[a-f0-9]+|\b(?:ethereum|arbitrum|base|solana):/i.test(input.question);
  const contract = extractAgentContract(input.question) ?? (!hasNewAddress && !resolved.assets.length
    ? previous?.token_asset ?? (previous && extractAgentContract(previous.question)) : undefined);
  if (tools.includes("token") && !contract) {
    output.status = "needs_clarification";
    output.message = "Which chain and contract should I check? Send ethereum:0x…, arbitrum:0x…, base:0x… or solana:address. A contract address needs its chain to identify the token.";
    return output;
  }
  if (contract && tools.includes("token")) output.token_asset = contract;
  if (!resolved.assets.length) {
    tools = tools.map(tool => tool === "reporting" ? "discovery" : tool);
    if (tools.some(tool => tool === "research" || tool === "investment")) {
      if (!contract && !previous && !/\b(market|markets|today|now|current|anything|attention|risks?|crypto|stocks)\b/i.test(input.question)) {
        output.status = "needs_clarification";
        output.message = "Which company or crypto asset do you mean? Use its name or ticker, or ask about the market overall.";
        return output;
      }
      tools = tools.filter(tool => tool !== "research" && tool !== "investment");
      tools.push("opportunities", "discovery", "market");
    }
  }
  if (proactive && resolved.assets.some(asset => asset.asset === "crypto" && ["BTC", "ETH"].includes(asset.ticker))) tools.push("forecasts");
  if (input.market === "equity" && !resolved.assets.length) tools = tools.filter(tool => tool !== "forecasts" && tool !== "market");
  tools = [...new Set(tools)].slice(0, 4);
  const readings = await Promise.allSettled(tools.map(async tool => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        dependencies.read(tool, { question: plan.question, assets: resolved.assets, market: input.market, context: plan.context, oidcToken, tokenAsset: contract }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Tool check timed out")), 20_000); }),
      ]);
    } finally { clearTimeout(timer); }
  }));
  let suppliedAnswer: ResearchAnswer | null = null;
  readings.forEach((reading, index) => {
    const tool = tools[index]!;
    if (reading.status === "rejected") {
      output.tools.push({ id: tool, label: AGENT_TOOL_LABELS[tool], status: "unavailable" });
      output.limitations.push(AGENT_TOOL_LABELS[tool] + " could not be checked.");
      return;
    }
    const data: AgentToolReading = reading.value;
    const fresh = data.evidence.some(item => item.freshness === "fresh");
    output.tools.push({ id: tool, label: AGENT_TOOL_LABELS[tool], status: fresh && !data.limited ? "complete" : "limited" });
    output.evidence.push(...data.evidence);
    for (const asset of data.assets) {
      const index = output.assets.findIndex(item => item.beat_id === asset.beat_id);
      if (index < 0) output.assets.push(asset); else {
        const previous = output.assets[index]!;
        output.assets[index] = { ...previous, ...asset,
          news_status: asset.news_status === "not_checked" ? previous.news_status : asset.news_status,
          market_status: asset.market_status === "not_checked" ? previous.market_status : asset.market_status };
      }
    }
    output.limitations.push(...data.limitations);
    output.suggestions.push(...data.suggestions);
    if (data.forecasts) output.forecasts = data.forecasts;
    if (data.answer) suppliedAnswer = data.answer;
  });
  output.evidence = [...new Map(output.evidence.map(item => [item.id, item])).values()].slice(0, 48);
  output.assets = output.assets.slice(0, 3);
  output.limitations = [...new Set(output.limitations)];
  const usable = output.evidence.filter(item => item.freshness === "fresh");
  output.flow = output.tools.map(tool => ({ step: tool.label, status: tool.status === "complete" ? "complete" : "limited" }));
  if (!proactive && tools.length === 1 && tools[0] === "market" && isReferenceQuoteQuestion(input.question, output.assets)) {
    output.answer = referenceQuoteAnswer(output.assets, usable);
    if (output.answer) output.method = "measured";
  }
  if (!proactive && usable.length && !output.answer) {
    try {
      output.answer = tools.length === 1 && tools[0] === "investment" ? suppliedAnswer
        : await dependencies.reason({ question: plan.question, intent: "conversational market intelligence", context: plan.context,
        assets: output.assets, evidence: usable, limitations: [
          ...output.limitations,
          "Recommend research priorities only when fresh reviews or evidence support them. Do not rank all catalog assets from the six-asset pilot. Portfolio holdings, loss limits, risk tolerance and execution are not connected. Follow-up context identifies the task, but earlier answers are not current evidence.",
        ] }, oidcToken, undefined, reason => { output.generation_error = reason; });
    } catch { output.generation_error = "generation_failed"; }
    if (output.answer) output.method = "reasoned";
  }
  if (!output.answer) {
    output.answer = observedAnswer(input.question, output.evidence, output.limitations);
    output.message = proactive ? "Prioritized from available review checks, reporting and market observations."
      : output.answer ? "Showing source observations. A generated interpretation could not be validated."
        : output.limitations.join(" ") || "Current sources are unavailable. Try this check again.";
  }
  output.status = !usable.length ? "unavailable" : output.tools.every(tool => tool.status === "complete") ? "ready" : "partial";
  output.suggestions = [...new Set([...output.suggestions, "What deserves attention right now?", "What are the main risks?", "Show the latest forecasts and their results."])].slice(0, 4);
  return output;
}

export async function runAgent(raw: unknown, oidcToken?: string | null, dependencies = services): Promise<AgentResponse> {
  const input = AgentRequestSchema.safeParse(raw);
  if (!input.success) throw new NewsError("invalid_request", "Ask a question of 3–600 characters with up to four recent conversation turns.", 400);
  if (activeRequests >= 4) throw new NewsError("busy", "Rarebird is handling other checks. Try again shortly.", 429);
  activeRequests++;
  try { return await execute(input.data, oidcToken, dependencies, false); }
  finally { activeRequests--; }
}

const briefings = new Map<string, { expires: number; task: Promise<AgentResponse> }>();
export function readAgentBriefing(beatId?: string, dependencies = services, market?: AgentRequest["market"]): Promise<AgentResponse> {
  const asset = beatId ? SEED_BEATS.find(item => item.beat_id === beatId) : undefined;
  if (beatId && !asset) throw new NewsError("invalid_request", "This asset is outside the supported catalog.", 400);
  const key = beatId ?? market ?? "market";
  const cached = briefings.get(key);
  if (cached && cached.expires > Date.now()) return cached.task;
  const task = execute({ question: asset ? "What changed for " + asset.label + " and what should I check next?" : "What deserves attention right now?",
    history: [], market, ...(asset ? { beat_ids: [asset.beat_id] } : {}) }, undefined, dependencies, true);
  briefings.set(key, { expires: Date.now() + 30_000, task });
  if (briefings.size > 32) briefings.delete(briefings.keys().next().value!);
  void task.catch(() => { if (briefings.get(key)?.task === task) briefings.delete(key); });
  return task;
}
