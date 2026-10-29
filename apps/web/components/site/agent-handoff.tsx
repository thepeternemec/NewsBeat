"use client";

import { useState } from "react";
import CopyButton from "./copy-button";

const AGENTS = [
  { id: "scout", label: "Scout", detail: "Collect a headline and preserve its source.", packet: { schema: "black-sheep/observation-proposal-v0", example: true, from: "agent:scout", to: "agent:analyst", asset: { underlying: "NVIDIA", ticker: "NVDA", token_mapping: "not_implemented" }, observation: "Example company development", evidence: [{ headline: "Illustrative headline — not a live report", source_url: "https://example.com/report" }], freshness: "illustrative" } },
  { id: "analyst", label: "Analyst", detail: "Add context without losing the evidence.", packet: { schema: "black-sheep/context-proposal-v0", example: true, from: "agent:analyst", to: "agent:publisher", underlying: "NVIDIA", context: "A short explanation grounded in the cited headline.", evidence_ref: "example:observation-001", basis: "headlines_only", price_causality: "not_established", token_events: "not_connected" } },
  { id: "publisher", label: "Publisher", detail: "Prepare a sourced update for the next agent.", packet: { schema: "black-sheep/handoff-proposal-v0", example: true, from: "agent:publisher", to: "agent:research-assistant", task: "Prepare a source-linked company update.", context_ref: "example:context-001", delivery: "preview_only", sent: false, token_payment: "not_implemented" } },
] as const;

export default function AgentHandoff() {
  const [selected, setSelected] = useState(0);
  const active = AGENTS[selected]!;
  const packet = JSON.stringify(active.packet, null, 2);
  return (
    <div className="bs-handoff">
      <div className="bs-handoff-bar"><span>BLACK SHEEP / AGENT HANDOFF LAB</span><span>ILLUSTRATIVE PROTOCOL CONCEPT</span></div>
      <div className="bs-handoff-layout">
        <div className="bs-agent-selector" aria-label="Explore the proposed agent roles">
          {AGENTS.map((agent, index) => <button key={agent.id} type="button" aria-pressed={index === selected} aria-controls="agent-packet" onClick={() => setSelected(index)}><span>0{index + 1}</span><span><strong>{agent.label}</strong><small>{agent.detail}</small></span></button>)}
        </div>
        <div className="bs-packet" id="agent-packet" aria-live="polite" aria-atomic="true">
          <div className="bs-packet-head"><span>{active.label.toUpperCase()} / EXAMPLE PACKET</span><CopyButton text={packet} label="Copy example" /></div>
          <pre>{packet}</pre>
        </div>
      </div>
      <p className="bs-handoff-note">Explore the roles to inspect example messages. No packets are sent. Agent messaging, token mapping and payments are not implemented.</p>
    </div>
  );
}
