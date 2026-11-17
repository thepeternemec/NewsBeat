import type { CSSProperties } from "react";
import { perspectiveProjector, sceneXY as xy, type ScenePoint as Point } from "./scene-projection";

export type SignalStage = "anomaly" | "evidence" | "timing" | "decision" | "outcomes";
export type GraphView = { yaw: number; pitch: number };
export type SignalBranch = "review" | "watch";

export const DEFAULT_GRAPH_VIEW: GraphView = { yaw: -0.24, pitch: 0.6 };

const WIDTH = 760;
const HEIGHT = 432;
const FLOOR = -65;
const FOCAL_LENGTH = 1030;

const NODES = {
  anomaly: { point: [-245, 42, 80], stage: "anomaly", label: "Anomaly", radius: 22 },
  evidence: { point: [-186, 109, -125], stage: "evidence", label: "Evidence", radius: 19 },
  timing: { point: [-16, 66, 5], stage: "timing", label: "Timing", radius: 28 },
  review: { point: [130, 101, -100], stage: "decision", label: "Review", radius: 22 },
  watch: { point: [126, 42, 125], stage: "decision", label: "Watch", radius: 20 },
  outcomes: { point: [281, 63, -2], stage: "outcomes", label: "Outcomes", radius: 21 },
} as const satisfies Record<string, { point: Point; stage: SignalStage; label: string; radius: number }>;

type NodeName = keyof typeof NODES;

type Edge = { from: NodeName; to: NodeName; branch?: SignalBranch };
const EDGES: Edge[] = [
  { from: "anomaly", to: "timing" },
  { from: "evidence", to: "timing" },
  { from: "timing", to: "review", branch: "review" },
  { from: "timing", to: "watch", branch: "watch" },
  { from: "review", to: "outcomes", branch: "review" },
  { from: "watch", to: "outcomes", branch: "watch" },
];

const SYMBOLS: Record<NodeName, string> = {
  anomaly: "M-12 3h5l4-9 5 14 4-7h6",
  evidence: "M-8-11h11l5 5v17H-8zM2-11v6h6M-4 0h8m-8 5h8",
  timing: "M-11-5v-6h6m10 0h6v6m0 10v6h-6m-10 0h-6V5m-4-5h30M0-5v10",
  review: "M-8 0l5 5L9-7",
  watch: "M-12 0c7-10 17-10 24 0-7 10-17 10-24 0zM3 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  outcomes: "M-10-10v20H11M-6 3l5-5 4 2 7-8",
};

const GRID_X = Array.from({ length: 21 }, (_, i) => (i - 10) * 36);
const GRID_Z = Array.from({ length: 13 }, (_, i) => (i - 6) * 34);
const RING = Array.from({ length: 42 }, (_, i) => (i / 42) * Math.PI * 2);

export function rotateGraph(view: GraphView, yawDelta: number, pitchDelta: number): GraphView {
  return {
    yaw: Math.max(-0.64, Math.min(0.42, view.yaw + yawDelta)),
    pitch: Math.max(0.32, Math.min(0.88, view.pitch + pitchDelta)),
  };
}

export default function SignalGraphScene({
  stage, view, liveBranch, uid, onSelect,
}: {
  stage: SignalStage;
  view: GraphView;
  liveBranch?: SignalBranch | "none";
  uid: string;
  onSelect: (stage: SignalStage) => void;
}) {
  const project = perspectiveProjector(view, [WIDTH / 2, HEIGHT * 0.535], FOCAL_LENGTH);
  const path = (points: readonly Point[]) => points.map(point => xy(project(point))).join(" ");
  const projected = (Object.keys(NODES) as NodeName[]).map(name => ({
    name,
    node: NODES[name],
    center: project(NODES[name].point),
    active: stage === NODES[name].stage && ((name !== "review" && name !== "watch") || !liveBranch || name === liveBranch),
  })).sort((a, b) => a.center.z - b.center.z);
  const gridId = `${uid}-grid`;
  const orbId = `${uid}-orb`;
  const activeOrbId = `${uid}-active-orb`;
  const glowId = `${uid}-halo`;
  const ring = ([x, , z]: Point, radius: number, height: number) => path(RING.map(angle => [
    x + Math.cos(angle) * radius, height, z + Math.sin(angle) * radius,
  ]));

  return <>
    <svg className="rb-signal-scene" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gridId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--rb-scene-line)" stopOpacity=".3" />
          <stop offset="1" stopColor="var(--rb-scene-line)" stopOpacity=".03" />
        </linearGradient>
        <radialGradient id={orbId} cx="31%" cy="23%" r="82%">
          <stop offset="0" stopColor="#4d5057" /><stop offset=".6" stopColor="#1d2026" /><stop offset="1" stopColor="#0d0f13" />
        </radialGradient>
        <radialGradient id={activeOrbId} cx="30%" cy="21%" r="92%">
          <stop offset="0" stopColor="#737780" /><stop offset=".54" stopColor="#34383f" /><stop offset="1" stopColor="#111318" />
        </radialGradient>
        <radialGradient id={glowId}>
          <stop offset="0" stopColor="#dae0eb" stopOpacity=".16" /><stop offset="1" stopColor="#dae0eb" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g fill="none" strokeWidth="1">
        <polygon className="rb-signal-grid-plane" points={path([
          [-360, FLOOR, -204], [360, FLOOR, -204], [360, FLOOR, 204], [-360, FLOOR, 204],
        ])} />
        {GRID_X.map(x => <polyline key={`x${x}`} stroke={`url(#${gridId})`} points={path([[x, FLOOR, -204], [x, FLOOR, 204]])} />)}
        {GRID_Z.map(z => <polyline key={`z${z}`} className="rb-signal-grid-line" points={path([[-360, FLOOR, z], [360, FLOOR, z]])} />)}
      </g>

      {projected.map(({ name, node, center }) => {
        const [x, , z] = node.point;
        const base = project([x, FLOOR, z]);
        const active = stage === node.stage;
        return <g key={name} data-active={active} className="rb-signal-pedestal">
          <polygon points={ring(node.point, node.radius + 9, FLOOR)} />
          <polygon points={ring(node.point, node.radius + 17, FLOOR)} className="rb-signal-floor-ring" />
          <path d={`M${xy(base)} L${xy(center)}`} strokeDasharray="3 5" />
          <circle cx={base.x} cy={base.y} r="2.4" />
        </g>;
      })}

      {EDGES.map(({ from, to, branch }) => {
        const a = NODES[from];
        const b = NODES[to];
        const start = project(a.point);
        const end = project(b.point);
        const bend = (a.point[0] + b.point[0]) / 2;
        const first = project([bend, a.point[1], a.point[2]]);
        const second = project([bend, b.point[1], b.point[2]]);
        const d = `M${xy(start)} C${xy(first)} ${xy(second)} ${xy(end)}`;
        const selected = stage === a.stage || stage === b.stage;
        const lit = selected && (!branch || !liveBranch || branch === liveBranch);
        return <g key={`${from}-${to}`} data-lit={lit} data-branch={branch} className="rb-signal-edge">
          <path className="rb-signal-edge-base" d={d} />
          {lit && <path className="rb-signal-edge-flow" d={d} pathLength="100" />}
        </g>;
      })}

      {projected.map(({ name, node, center, active }) => {
        const radius = node.radius * center.scale;
        return <g key={name} className="rb-signal-orb" data-active={active}>
          {active && <circle cx={center.x} cy={center.y} r={radius * 3.5} fill={`url(#${glowId})`} />}
          <polygon className="rb-signal-orb-orbit" points={ring(node.point, node.radius + 12, node.point[1] - 8)} />
          <circle className="rb-signal-orb-border" cx={center.x} cy={center.y} r={radius}
            fill={`url(#${active ? activeOrbId : orbId})`} />
          <circle className="rb-signal-orb-rim" cx={center.x} cy={center.y} r={radius - 2.3} />
          <path className="rb-signal-orb-glyph" d={SYMBOLS[name]}
            transform={`translate(${xy(center)}) scale(${(center.scale * (name === "timing" ? 1.12 : 0.96)).toFixed(3)})`} />
        </g>;
      })}
    </svg>
    {projected.map(({ name, node, center, active }) => <button
      type="button"
      key={name}
      tabIndex={-1}
      aria-label={`Explore ${node.label.toLowerCase()}`}
      aria-pressed={stage === node.stage}
      className="rb-signal-node"
      data-active={active}
      style={{
        left: `${(center.x / WIDTH) * 100}%`,
        top: `${(center.y / HEIGHT) * 100}%`,
        "--rb-node-radius": `${(node.radius * center.scale) / WIDTH * 100}cqw`,
      } as CSSProperties}
      onClick={() => onSelect(node.stage)}
    ><span>{node.label}</span></button>)}
  </>;
}
