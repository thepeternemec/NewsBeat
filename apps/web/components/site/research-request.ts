import type { AgentRequest, AgentResponse, ResearchResponse } from "@rarebird/contracts";
import { API_BASE } from "./content";

export async function requestResearch(question: string, beatIds?: string[], signal?: AbortSignal): Promise<ResearchResponse> {
  const response = await fetch(API_BASE + "/v2/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    signal,
    body: JSON.stringify({ question: question.trim(), ...(beatIds?.length ? { beat_ids: beatIds } : {}) }),
  });
  if (!response.ok) throw new Error(response.status === 429
    ? "Too many requests. Wait a moment before trying again."
    : "Research is unavailable right now. Please try again.");
  const data = await response.json() as ResearchResponse;
  if (data.version !== "question-research-v1" || !Array.isArray(data.evidence)) throw new Error("The research response could not be read.");
  signal?.throwIfAborted();
  return data;
}

export async function requestAgent(input: AgentRequest, signal?: AbortSignal): Promise<AgentResponse> {
  const response = await fetch(API_BASE + "/v2/agent", {
    method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", signal,
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(response.status === 429 ? "Rarebird is busy. Try again shortly." : "The agent could not complete this check. Try again.");
  const data = await response.json() as AgentResponse;
  if (data.agent_version !== "market-agent-v1" || !Array.isArray(data.evidence) || !Array.isArray(data.tools)) throw new Error("The agent response could not be read.");
  signal?.throwIfAborted();
  return data;
}
