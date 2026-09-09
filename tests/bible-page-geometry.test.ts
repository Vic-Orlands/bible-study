import { describe, expect, it } from "vitest";
import { PlaneGeometry, Vector3 } from "three";
import { bendPage, WIDTH, HEIGHT, LEAVES, ROWS, SEGMENTS } from "../components/bible-page-geometry";

const makePage = () => new PlaneGeometry(WIDTH, HEIGHT, SEGMENTS, ROWS);

describe("Bible paper geometry", () => {
  it("keeps every vertex and normal finite through the entire turn, including rounded corners", () => {
    const geometry = makePage();
    for (let index = 0; index <= LEAVES + 1; index++) {
      for (let frame = 0; frame <= 100; frame++) {
        bendPage(geometry, frame / 100, index);
        expect(geometry.attributes.position.array.every(Number.isFinite)).toBe(true);
        expect(geometry.attributes.normal.array.every(Number.isFinite)).toBe(true);
      }
    }
    geometry.dispose();
  });

  it("keeps the whole binding edge straight and attached while the paper bends", () => {
    const geometry = makePage();
    for (const progress of [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1]) {
      bendPage(geometry, progress, 5);
      const positions = geometry.attributes.position;
      const bindingHeight = positions.getZ(0);
      for (let row = 0; row <= ROWS; row++) {
        const vertex = row * (SEGMENTS + 1);
        expect(positions.getX(vertex)).toBe(0);
        expect(positions.getZ(vertex)).toBe(bindingHeight);
        expect(positions.getY(vertex)).toBeCloseTo((0.5 - row / ROWS) * HEIGHT, 5);
      }
    }
    geometry.dispose();
  });

  it("preserves paper length instead of stretching sheets during a turn", () => {
    const geometry = makePage();
    const previous = new Vector3();
    const current = new Vector3();
    for (const progress of [0, 0.2, 0.5, 0.8, 1]) {
      bendPage(geometry, progress, 3);
      const positions = geometry.attributes.position;
      const rowStart = (ROWS / 2) * (SEGMENTS + 1);
      let length = 0;
      previous.fromBufferAttribute(positions, rowStart);
      for (let column = 1; column <= SEGMENTS; column++) {
        current.fromBufferAttribute(positions, rowStart + column);
        length += previous.distanceTo(current);
        previous.copy(current);
      }
      expect(Math.abs(length - WIDTH)).toBeLessThan(0.001);
    }
    geometry.dispose();
  });

  it("keeps the final sheet above the blank back hardcover before it turns", () => {
    const geometry = makePage();
    bendPage(geometry, 0, LEAVES - 1);
    const positions = geometry.attributes.position;
    for (let vertex = 0; vertex < positions.count; vertex++) {
      expect(positions.getZ(vertex)).toBeGreaterThan(0);
    }
    geometry.dispose();
  });
});
