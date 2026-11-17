import { perspectiveProjector, sceneXY, type ScenePoint } from "./scene-projection";

export type MarketDirection = "rising" | "falling" | "sideways";

const project = perspectiveProjector({ yaw: -0.23, pitch: 0.57 }, [280, 158], 870);
const polygon = (points: readonly ScenePoint[]) => points.map(point => sceneXY(project(point))).join(" ");
const floor = -65;
const origin: ScenePoint = [-170, 20, 3];
const depth = 13;
const endpoints: Record<MarketDirection, ScenePoint> = {
  rising: [150, 99, -56],
  sideways: [182, 12, 56],
  falling: [141, -35, 125],
};

const perimeter: ScenePoint[] = [
  [-190, floor, -124], [183, floor, -124], [203, floor, -104], [203, floor, 134],
  [184, floor, 153], [-193, floor, 153], [-212, floor, 134], [-212, floor, -102],
];
const lowerPerimeter: ScenePoint[] = perimeter.map(([x, y, z]) => [x, y - 10, z]);
const slabFaces = perimeter.map((point, i) => {
  const j = (i + 1) % perimeter.length;
  return polygon([point, perimeter[j], lowerPerimeter[j], lowerPerimeter[i]]);
});
const surface = polygon(perimeter);
const gridX = Array.from({ length: 13 }, (_, i) => -192 + i * 32);
const gridZ = Array.from({ length: 9 }, (_, i) => -116 + i * 32);

function ring(radius: number, height: number) {
  return polygon(Array.from({ length: 36 }, (_, i): ScenePoint => {
    const angle = i / 36 * Math.PI * 2;
    return [origin[0] + radius * Math.cos(angle), height, origin[2] + radius * Math.sin(angle)];
  }));
}

const pads = [ring(43, floor), ring(32, floor), ring(22, floor + 5)];
const originTop = project(origin);
const originFoot = project([origin[0], floor + 5, origin[2]]);

function makeArrow(end: ScenePoint) {
  const [dx, dy, dz] = end.map((value, i) => value - origin[i]);
  const length = Math.hypot(dx, dy);
  const halfHead = 22;
  const halfShaft = 7.5;
  function at(t: number, side = 0): ScenePoint {
    return [origin[0] + dx * t - dy / length * side, origin[1] + dy * t + dx / length * side, origin[2] + dz * t];
  }
  const neck = 1 - 39 / length;
  const front = [at(0.23, -halfShaft), at(neck, -halfShaft), at(neck, -halfHead), end,
    at(neck, halfHead), at(neck, halfShaft), at(0.23, halfShaft)];
  const rear = front.map(([x, y, z]): ScenePoint => [x, y, z - depth]);
  const walls = front.map((point, i) => {
    const next = (i + 1) % front.length;
    const face = [point, front[next], rear[next], rear[i]];
    return { id: i, points: polygon(face), viewDepth: face.reduce((sum, vertex) => sum + project(vertex).z, 0) / 4 };
  }).sort((a, b) => a.viewDepth - b.viewDepth);
  const tail = at(0.23);
  const foot = project([end[0], floor, end[2]]);
  return {
    face: polygon(front), walls, tip: sceneXY(project(end)), foot: sceneXY(foot), grounding: foot,
    lead: `M${sceneXY(originTop)} L${sceneXY(project(tail))}`,
    floorTrace: polygon([[origin[0], floor, origin[2]], [end[0], floor, end[2]]]),
  };
}

const arrows = (["rising", "sideways", "falling"] as const).map(direction => ({
  direction,
  ...makeArrow(endpoints[direction]),
}));

export default function MarketDirectionScene({ active, id }: { active: MarketDirection; id: string }) {
  const clip = `${id}-floor`;
  const lit = `${id}-lit`;
  const dim = `${id}-dim`;
  const metal = `${id}-metal`;

  return <svg className="rb-direction-scene" viewBox="0 0 560 360" aria-hidden="true" focusable="false">
    <defs>
      <clipPath id={clip}><polygon points={surface} /></clipPath>
      <linearGradient id={metal} x1="0" y1="0" x2=".2" y2="1">
        <stop stopColor="#23262b" /><stop offset="1" stopColor="#101114" />
      </linearGradient>
      <linearGradient id={lit} x1="0" y1="0" x2=".3" y2="1">
        <stop stopColor="#f6f7fa" /><stop offset=".47" stopColor="#d5d8de" />
        <stop offset=".51" stopColor="#989da6" /><stop offset="1" stopColor="#d8dbe0" />
      </linearGradient>
      <linearGradient id={dim} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#535861" /><stop offset="1" stopColor="#26292e" />
      </linearGradient>
    </defs>

    <g className="rb-direction-floor">
      <polygon points={polygon(lowerPerimeter)} />
      {slabFaces.map((points, i) => <polygon key={i} points={points} />)}
      <polygon className="rb-direction-floor-top" points={surface} fill={`url(#${metal})`} />
      <g clipPath={`url(#${clip})`} className="rb-direction-grid">
        {gridX.map(x => <polyline key={`x${x}`} points={polygon([[x, floor, -124], [x, floor, 154]])} />)}
        {gridZ.map(z => <polyline key={`z${z}`} points={polygon([[-212, floor, z], [203, floor, z]])} />)}
      </g>
    </g>
    {arrows.map(arrow => <g key={arrow.direction} className="rb-direction-trace" data-active={arrow.direction === active}>
      <polyline points={arrow.floorTrace} />
      <path d={`M${arrow.foot} L${arrow.tip}`} />
      <circle cx={arrow.grounding.x} cy={arrow.grounding.y} r="3.2" />
    </g>)}
    <g className="rb-direction-anchor">
      {pads.map((pad, i) => <polygon key={i} points={pad} />)}
      <line x1={originFoot.x} y1={originFoot.y} x2={originTop.x} y2={originTop.y} />
      <circle cx={originTop.x} cy={originTop.y} r="10" />
      <circle cx={originTop.x} cy={originTop.y} r="3" />
    </g>
    {arrows.map(arrow => <g key={arrow.direction} className="rb-direction-arrow"
      data-direction={arrow.direction} data-active={arrow.direction === active}>
      <path className="rb-direction-lead" d={arrow.lead} />
      {arrow.walls.map(wall => <polygon key={wall.id} className="rb-direction-wall" points={wall.points} />)}
      <polygon className="rb-direction-face" points={arrow.face} fill={`url(#${active === arrow.direction ? lit : dim})`} />
    </g>)}
  </svg>;
}
