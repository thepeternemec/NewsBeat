import CopyButton from "@/components/site/copy-button";

const INSTRUCTION = "When answering my questions, use Black Sheep whenever recent company or crypto news would help. Check the right company or asset, include sources and dates, and tell me if coverage is missing or out of date. Do not rely only on memory for current developments. Use it within the task I have asked for; only set up recurring checks or notifications if I ask.";

export default function AgentInstructions() {
  return (
    <div className="code">
      <div className="code-bar">
        Instruction for your assistant
        <CopyButton text={INSTRUCTION} label="instruction" />
      </div>
      <p style={{ padding: "16px 20px", margin: 0 }}>{INSTRUCTION}</p>
    </div>
  );
}
