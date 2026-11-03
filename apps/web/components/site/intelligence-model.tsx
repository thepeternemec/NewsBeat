import BrandMark from "./brand-mark";
import "./intelligence-model.css";

const STAGES = [
  { number: "01", name: "Observe", title: "Know what changed.", text: "Source-linked reporting, collection freshness and new arrivals.", state: "Available", planned: false },
  { number: "02", name: "Organize", title: "Bring the evidence together.", text: "Related headlines grouped with their publishers and timestamps.", state: "Available", planned: false },
  { number: "03", name: "Interpret", title: "Surface a meaningful signal.", text: "Relevance to a task, possible implications and what still needs checking.", state: "Planned", planned: true },
];

export default function IntelligenceModel() {
  return (
    <aside className="intelligence-model" aria-label="The path from reporting to agent intelligence">
      <div className="intelligence-model-bar"><span><BrandMark size={26} /> NEWSBEAT</span><span>THE INTELLIGENCE LAYER</span></div>
      <ol className="intelligence-model-stages">
        {STAGES.map(stage => <li key={stage.number} data-planned={stage.planned}>
          <div className="intelligence-model-index" aria-hidden="true">{stage.number}</div>
          <div className="intelligence-model-content">
            <div className="intelligence-model-stage"><span>{stage.name}</span><small>{stage.state}</small></div>
            <h3>{stage.title}</h3><p>{stage.text}</p>
          </div>
        </li>)}
      </ol>
      <div className="intelligence-model-outcome"><span>THE GOAL</span><p>An agent that knows what deserves attention — with the evidence to explain why.</p></div>
    </aside>
  );
}
