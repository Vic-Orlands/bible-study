import * as THREE from "three";

export const WIDTH = 1.95;
export const HEIGHT = 2.85;
export const LEAVES = 12;
export const SEGMENTS = 32;
export const ROWS = 8;

export function bendPage(geometry: THREE.PlaneGeometry, progress: number, index: number) {
  const positions = geometry.attributes.position;
  const turn = THREE.MathUtils.clamp(progress, 0, 1);
  const flex = Math.sin(turn * Math.PI);
  const baseAngle = -Math.PI * turn;
  const rootHeight = THREE.MathUtils.lerp(0.13 - index * 0.009, 0.032 + index * 0.009, turn);

  // Integrating the tangent preserves the sheet's length and keeps every row bound to the spine.
  for (let row = 0; row <= ROWS; row++) {
    const v = row / ROWS;
    let x = 0;
    let z = rootHeight;
    for (let column = 0; column <= SEGMENTS; column++) {
      const u = column / SEGMENTS;
      if (column > 0) {
        const midpoint = (column - 0.5) / SEGMENTS;
        const curl = flex * (0.58 * Math.sin(midpoint * Math.PI) + 0.12 * (v - 0.5) * midpoint);
        const restingCurve = -0.075 * Math.sin(midpoint * Math.PI * 2) * (1 - 2 * turn);
        const angle = baseAngle + curl + restingCurve;
        x += Math.cos(angle) * WIDTH / SEGMENTS;
        z -= Math.sin(angle) * WIDTH / SEGMENTS;
      }
      const corner = Math.min(u / 0.035, 1);
      const edgeRound = 0.022 * (1 - Math.sqrt(1 - Math.pow(THREE.MathUtils.clamp((u - 0.97) / 0.03, 0, 1), 2)));
      positions.setXYZ(row * (SEGMENTS + 1) + column, x,
        (0.5 - v) * (HEIGHT - edgeRound * 2) + flex * corner * Math.sin(v * Math.PI) * u * 0.025, z);
    }
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
}
