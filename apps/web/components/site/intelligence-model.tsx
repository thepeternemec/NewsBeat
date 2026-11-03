import BrandMark from "./brand-mark";
import "./intelligence-model.css";

const STAGES = [
  { number: "01", name: "Observe", title: "Read the change.", text: "Collect reporting, preserve its sources and track what is new.", state: "Available", planned: false },
  { number: "02", name: "Construct", title: "Connect it to the market.", text: "Build a hypothesis around revenue, demand, liquidity or risk.", state: "Available", planned: false },
  { number: "03", name: "Evaluate", title: "Test the alert conditions.", text: "Check the context, evidence and trigger. Decide whether to review, watch or reassess.", state: "First pilot", planned: false },
];

export default function IntelligenceModel() {
  return (
    <aside className="intelligence-model" aria-label="The path from reporting to agent intelligence">
      <div className="intelligence-model-bar"><span><BrandMark size={26} /> NEWSBEAT</span><span>SIGNAL CONSTRUCTION</span></div>
      <ol className="intelligence-model-stages">
        {STAGES.map(stage => <li key={stage.number} data-planned={stage.planned}>
          <div className="intelligence-model-index" aria-hidden="true">{stage.number}</div>
          <div className="intelligence-model-content">
            <div className="intelligence-model-stage"><span>{stage.name}</span><small>{stage.state}</small></div>
            <h3>{stage.title}</h3><p>{stage.text}</p>
          </div>
        </li>)}
      </ol>
      <div className="intelligence-model-outcome"><span>THE GOAL</span><p>A signal with a reason, a trigger, and a clear condition for changing the view.</p></div>
    </aside>
  );
}
