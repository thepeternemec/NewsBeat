# NewsBeat product direction

NewsBeat is building **meaningful signals for AI agents**.

The product should help an agent understand **what changed, why it may matter to its task, and what to investigate next**. Stocks and crypto are the current coverage universe. The value is evidence-based understanding.

## Live foundation

- Supported-asset discovery and source-linked headline metadata.
- Approximate grouping of related headlines and relevance heuristics.
- Short headline-based summaries with original-headline fallback.
- Coverage freshness, timestamps and change cursors.
- MCP and REST interfaces for agents.

These capabilities organize evidence. They do not yet establish a development’s significance, explain causality, or provide task-specific intelligence.

## Next intelligence layer — planned

A useful signal should carry:

| Element | Question it answers |
| --- | --- |
| Reported change | What new development is supported by the reporting? |
| Context | Which entities and related developments help explain it? |
| Relevance | Why does it belong in this agent’s current task? |
| Evidence | Which sources support the report and any interpretation? |
| Uncertainty | What is inferred, conflicting, missing or still unverified? |
| Follow-up | What should the agent investigate next? |

Deeper event understanding, cross-development context, task-specific relevance and possible implications are planned work. A future signal must separate publisher reporting from model inference and preserve freshness and source provenance.

## Product hierarchy

1. Lead with agent intelligence and meaningful signals.
2. Show the live feed as the evidence foundation.
3. Make stocks and crypto coverage visible where useful.
4. Keep MCP and REST in setup and developer reference.
5. Treat standalone prices, funding, liquidity and chain readings as supporting reference utilities.

The web experience uses an intelligence overview in place of the former crypto dashboard. Existing reference API routes and tool names remain compatible; their availability does not make them the product’s mission.

## Longer-term applications

Saved watches, agent delivery and notifications can build on the intelligence layer. Tokenized assets remain an application, with verified mapping to underlying assets still planned.

## Language

Main line: **Meaningful signals. Built for agents.**

Describe the intelligence direction as being built. Say “available today” for source-linked coverage, grouping, headline-based summaries and change tracking. Say “planned” for task-aware interpretation, implications and deeper signals. Avoid presenting metric movements, headline volume or generated summaries as verified intelligence.
