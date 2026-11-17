"use client";

import { useId, useRef, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import MarketDirectionScene from "./market-direction-scene";

const PERSPECTIVES = [
  {
    id: "rising", label: "Markets rising", icon: ArrowUpRight, word: "Conviction.",
    title: "Is there substance behind the momentum?",
    description: "Look beyond a rising market. Investigate the catalyst, check the original reporting and test what would need to hold for the story to continue.",
    checks: ["What actually changed?", "Does the evidence support the story?", "What would weaken the outlook?"],
    href: "/intelligence#discovery", action: "Investigate the developments", note: "Look for supporting evidence",
  },
  {
    id: "falling", label: "Markets falling", icon: ArrowDownRight, word: "Perspective.",
    title: "A change in the thesis, or a reason to look closer?",
    description: "Separate company or token developments from the wider backdrop. Examine adverse evidence, missing confirmation and what would change the view.",
    checks: ["Has the underlying story changed?", "What evidence points to more risk?", "What would support a reassessment?"],
    href: "/ask", action: "Examine an asset’s outlook", note: "Understand the downside case",
  },
  {
    id: "sideways", label: "Markets sideways", icon: ArrowRight, word: "Patience.",
    title: "What would make the next move meaningful?",
    description: "A quiet market still has a story. Follow fresh developments, inspect the experimental move-risk forecasts and identify the evidence you’re waiting for.",
    checks: ["Which new developments matter?", "What is still unconfirmed?", "What should be checked next?"],
    href: "/app/forecasts", action: "Explore forecasts and outcomes", note: "Know what you’re waiting for",
  },
] as const;

export default function MarketPerspective() {
  const [selected, setSelected] = useState(0);
  const id = useId();
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = PERSPECTIVES[selected];

  return <div className="rb-perspective">
    <div className="rb-perspective-tabs" role="tablist" aria-label="Explore a market condition">
      {PERSPECTIVES.map((item, index) => <button key={item.id} type="button" role="tab"
        ref={node => { tabs.current[index] = node; }} id={id + "-" + item.id}
        aria-selected={selected === index} aria-controls={id + "-panel-" + item.id} tabIndex={selected === index ? 0 : -1}
        onClick={() => setSelected(index)} onKeyDown={event => {
          let next = index;
          if (event.key === "ArrowRight") next = (index + 1) % PERSPECTIVES.length;
          else if (event.key === "ArrowLeft") next = (index + PERSPECTIVES.length - 1) % PERSPECTIVES.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = PERSPECTIVES.length - 1;
          else return;
          event.preventDefault(); setSelected(next); tabs.current[next]?.focus();
        }}><item.icon size={19} aria-hidden="true" />{item.label}</button>)}
    </div>
    {PERSPECTIVES.map((item, index) => <div key={item.id} id={id + "-panel-" + item.id} role="tabpanel" aria-labelledby={id + "-" + item.id} hidden={selected !== index} tabIndex={0}>
      {selected === index && <div className="rb-perspective-body" data-market={active.id}>
        <div className="rb-perspective-visual">
          <MarketDirectionScene active={active.id} id={`${id}-directions`} />
          <div className="rb-direction-caption"><span>{active.word}</span><small>{active.note}</small></div>
        </div>
        <div className="rb-perspective-copy"><p className="rb-home-eyebrow">Research playbook / Illustrative</p><h3>{active.title}</h3><p>{active.description}</p>
          <ol>{active.checks.map((check, i) => <li key={check}><span>0{i + 1}</span>{check}</li>)}</ol>
          <a className="rb-home-text-link" href={active.href}>{active.action}<ArrowRight size={17} aria-hidden="true" /></a>
        </div>
      </div>}
    </div>)}
  </div>;
}
