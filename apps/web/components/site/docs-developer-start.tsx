"use client";

import { useId, useRef, useState } from "react";
import { ArrowRight, Terminal } from "lucide-react";
import CopyButton from "./copy-button";

const MCP = "https://www.newsbeat.dev/api/mcp";
const EXAMPLES = [
  {
    id: "curl", label: "cURL", language: "Bash", title: "Find a supported topic",
    code: `curl --fail-with-body --get "https://www.newsbeat.dev/api/v2/topics" \\
  --data-urlencode "q=bitcoin" \\
  --data-urlencode "limit=5"`,
  },
  {
    id: "javascript", label: "JavaScript", language: "JavaScript", title: "Find a supported topic",
    code: `const response = await fetch(
  "https://www.newsbeat.dev/api/v2/topics?q=bitcoin&limit=5"
);
if (!response.ok) {
  throw new Error(\`NewsBeat: HTTP \${response.status}\`);
}
const catalog = await response.json();
console.log(catalog.topics);`,
  },
  {
    id: "mcp", label: "MCP config", language: "JSON", title: "For clients that accept mcpServers configuration",
    code: JSON.stringify({ mcpServers: { newsbeat: { url: MCP } } }, null, 2),
  },
] as const;

export default function DocsDeveloperStart() {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const example = EXAMPLES[selected];

  return (
    <div className="docs-developer-start">
      <div className="docs-endpoint">
        <span><Terminal size={17} aria-hidden="true" /> REMOTE MCP</span>
        <code>{MCP}</code>
        <CopyButton text={MCP} label="Copy endpoint" />
      </div>
      <div className="docs-example-tabs" role="tablist" aria-label="Integration example" onKeyDown={event => {
        let next = selected;
        if (event.key === "ArrowRight") next = (selected + 1) % EXAMPLES.length;
        else if (event.key === "ArrowLeft") next = (selected + EXAMPLES.length - 1) % EXAMPLES.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = EXAMPLES.length - 1;
        else return;
        event.preventDefault();
        setSelected(next);
        tabs.current[next]?.focus();
      }}>
        {EXAMPLES.map((item, index) => <button key={item.id} ref={node => { tabs.current[index] = node; }} type="button" role="tab" id={`${id}-${item.id}`} aria-selected={index === selected} aria-controls={`${id}-panel`} tabIndex={index === selected ? 0 : -1} onClick={() => setSelected(index)}>{item.label}</button>)}
      </div>
      <div className="docs-example-panel" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${example.id}`}>
        <div className="code-bar"><span>{example.title}</span><CopyButton key={example.id} text={example.code} label="Copy example" /></div>
        <pre key={example.id} tabIndex={0} aria-label={`${example.language} integration example`}><code>{example.code}</code></pre>
      </div>
      <div className="docs-example-next">
        <p>For REST, use a returned <code>beat_id</code> with <code>/v2/news</code>. Keep its cursor for your next <code>/v2/changes</code> call.</p>
        <a href="/docs/connect">Full API reference <ArrowRight size={16} aria-hidden="true" /></a>
      </div>
    </div>
  );
}
