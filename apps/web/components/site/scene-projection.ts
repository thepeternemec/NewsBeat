export type ScenePoint = readonly [x: number, y: number, z: number];

export function perspectiveProjector(
  { yaw, pitch }: { yaw: number; pitch: number },
  [centerX, centerY]: readonly [number, number],
  focalLength: number,
) {
  const sinYaw = Math.sin(yaw);
  const cosYaw = Math.cos(yaw);
  const sinPitch = Math.sin(pitch);
  const cosPitch = Math.cos(pitch);

  return ([x, y, z]: ScenePoint) => {
    const depth = x * sinYaw + z * cosYaw;
    const cameraX = x * cosYaw - z * sinYaw;
    const cameraY = y * cosPitch - depth * sinPitch;
    const cameraZ = y * sinPitch + depth * cosPitch;
    const scale = focalLength / (focalLength - cameraZ);
    return { x: centerX + cameraX * scale, y: centerY - cameraY * scale, z: cameraZ, scale };
  };
}

export function sceneXY({ x, y }: { x: number; y: number }) {
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}
