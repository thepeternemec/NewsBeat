import type { CSSProperties } from "react";
import { sceneXY } from "./scene-projection";

export type MarketDirection = "rising" | "falling" | "sideways";

type ChartPoint = { x: number; y: number };

const baseline = 274;
const rising = [40, 46, 59, 72, 67, 78, 101, 117, 111, 119, 143, 158, 151, 164, 187, 202, 195, 207, 227, 235];
const patterns: Record<MarketDirection, readonly number[]> = {
  rising,
  falling: [...rising].reverse(),
  sideways: [118, 123, 135, 128, 113, 107, 120, 133, 139, 125, 111, 118, 130, 137, 125, 113, 120, 134, 139, 130],
};

function smoothCurve(points: readonly ChartPoint[]) {
  const segments = points.slice(0, -1).map((point, index) => {
    const before = points[index - 1] ?? point;
    const next = points[index + 1];
    const after = points[index + 2] ?? next;
    const first = { x: point.x + (next.x - before.x) / 6, y: point.y + (next.y - before.y) / 6 };
    const second = { x: next.x - (after.x - point.x) / 6, y: next.y - (after.y - point.y) / 6 };
    return `C${sceneXY(first)} ${sceneXY(second)} ${sceneXY(next)}`;
  });
  return `M${sceneXY(points[0])} ${segments.join(" ")}`;
}

export default function MarketDirectionScene({ active, id }: { active: MarketDirection; id: string }) {
  const values = patterns[active];
  const points = values.map((height, index) => ({ x: 44 + index * 24, y: baseline - height }));
  const curve = smoothCurve(points);
  const end = points[points.length - 1];
  const metal = `${id}-bar-metal`;
  const area = `${id}-curve-area`;
  const shadow = `${id}-chart-shadow`;

  return <svg className="rb-market-chart" data-direction={active} viewBox="0 0 560 336" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={metal} x1="0" y1="0" x2=".25" y2="1">
        <stop stopColor="#aeb7c6" stopOpacity=".7" />
        <stop offset=".45" stopColor="#66707f" stopOpacity=".48" />
        <stop offset="1" stopColor="#2b3039" stopOpacity=".35" />
      </linearGradient>
      <linearGradient id={area} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#c6cedb" stopOpacity=".1" />
        <stop offset="1" stopColor="#c6cedb" stopOpacity="0" />
      </linearGradient>
      <radialGradient id={shadow}>
        <stop stopColor="#abb5c6" stopOpacity=".09" />
        <stop offset="1" stopColor="#abb5c6" stopOpacity="0" />
      </radialGradient>
    </defs>

    <path className="rb-market-chart-grid" d="M32 64H528 M32 116H528 M32 168H528 M32 220H528" />
    <ellipse cx="282" cy="285" rx="250" ry="27" fill={`url(#${shadow})`} />
    <g className="rb-market-chart-floor">
      <path d="M32 274H528 M43 286H539 M54 298H550" />
      {[44, 116, 188, 260, 332, 404, 476].map(x => <path key={x} d={`M${x} 274l22 24`} />)}
    </g>
    <path d={`${curve} L${end.x},${baseline} L44,${baseline} Z`} fill={`url(#${area})`} />

    {values.map((value, index) => {
      const x = points[index].x - 6;
      const height = value * (0.7 + (index * 7 % 5) * 0.045);
      const top = baseline - height;
      const right = x + 13;
      const style = { "--bar-delay": `${index * 35}ms`, "--bar-phase": `${-index * 0.31}s` } as CSSProperties;
      return <g key={index} className="rb-market-bar-enter" style={style}>
        <g className="rb-market-bar">
          <path className="rb-market-bar-side" d={`M${right},${top} l7,-7 V${baseline - 7} l-7,7 Z`} />
          <rect className="rb-market-bar-front" x={x} y={top} width="13" height={height} fill={`url(#${metal})`} />
          <path className="rb-market-bar-top" d={`M${x},${top} h13 l7,-7 h-13 Z`} />
        </g>
      </g>;
    })}

    <path className="rb-market-curve" d={curve} pathLength="1" />
    <path className="rb-market-curve-sheen" d={curve} pathLength="1" />
    <path className="rb-market-end-guide" d={`M${end.x},${end.y + 13} V${baseline}`} />
    <circle className="rb-market-end-ring" cx={end.x} cy={end.y} r="9" />
    <circle className="rb-market-end-dot" cx={end.x} cy={end.y} r="3.5" />
  </svg>;
}
