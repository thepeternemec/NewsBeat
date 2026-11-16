import WorkspaceShell, { WorkspaceEvidence } from "@/components/site/workspace-shell";
import ResearchQuestion from "@/components/site/research-question";

export const metadata = {
  title: "Market research questions | Rarebird",
  description: "Ask about a stock or crypto asset and inspect Rarebird’s answer, sources, uncertainty, and next checks.",
  alternates: { canonical: "/app/research" },
};

export default function ResearchPage() {
  return <WorkspaceShell active="/app/research" title="Ask a research question"
    description="Ask what changed, compare up to three assets, or check what evidence would change the outlook.">
    <WorkspaceEvidence title="How Rarebird builds an answer">
      <p>Rarebird identifies the assets, selects relevant reporting and checks available market measurements. The response links the sources and marks missing evidence.</p>
      <p>News research spans the catalog. Deeper measured checks cover six pilot assets.</p>
      <a href="/docs/try">See how to run the same question through the API</a>
    </WorkspaceEvidence>
    <ResearchQuestion />
  </WorkspaceShell>;
}
