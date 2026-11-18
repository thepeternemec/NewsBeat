import { z } from "zod";
import type { MarketForecasts } from "./market-briefing.js";
import type { ResearchResponse } from "./research.js";

const beatIds = z.array(z.string().regex(/^b_[0-9a-f]{12}$/)).max(3);
export const AgentToolSchema = z.enum([
  "research", "discovery", "reporting", "forecasts", "opportunities", "indicators",
  "market", "chain", "token", "filings", "investment", "connections",
]);
export type AgentTool = z.infer<typeof AgentToolSchema>;
const tokenAsset = z.string().regex(/^(?:(?:ethereum|arbitrum|base):0x[a-fA-F0-9]{40}|solana:[1-9A-HJ-NP-Za-km-z]{32,44})$/);
export const AgentRequestSchema = z.object({
  question: z.string().trim().min(3).max(600),
  beat_ids: beatIds.optional(),
  market: z.enum(["equity", "crypto"]).optional(),
  history: z.array(z.object({
    question: z.string().max(600),
    answer: z.string().max(900).optional(),
    beat_ids: beatIds,
    tools: z.array(AgentToolSchema).max(4).optional(),
    context: z.enum(["fundamentals", "liquidity", "risk"]).optional(),
    token_asset: tokenAsset.optional(),
  }).strict()).max(4).default([]),
}).strict();
export type AgentRequest = z.infer<typeof AgentRequestSchema>;

export interface AgentResponse extends ResearchResponse {
  agent_version: "market-agent-v1";
  tools: Array<{ id: AgentTool; label: string; status: "complete" | "limited" | "unavailable" }>;
  suggestions: string[];
  forecasts?: MarketForecasts;
  token_asset?: string;
}
