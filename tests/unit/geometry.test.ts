import { describe, expect, it } from "vitest";
import {
  clamp,
  cropRect,
  hitHandle,
  normalizeRect,
  resizeSelection,
  type Rect,
} from "../../src/geometry.ts";

const VIEWPORT = { width: 1000, height: 500 };
const SELECTION: Rect = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };

function expectRect(actual: Rect, expected: Rect): void {
  expect(actual.x).toBeCloseTo(expected.x, 10);
  expect(actual.y).toBeCloseTo(expected.y, 10);
  expect(actual.w).toBeCloseTo(expected.w, 10);
  expect(actual.h).toBeCloseTo(expected.h, 10);
}

describe("clamp", () => {
  it("keeps values inside the range", () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(-0.2, 0, 1)).toBe(0);
    expect(clamp(1.2, 0, 1)).toBe(1);
  });
});

describe("normalizeRect", () => {
  it("produces the same rect from either drag direction", () => {
    const forward = normalizeRect({ x: 0.1, y: 0.2 }, { x: 0.7, y: 0.6 });
    const reverse = normalizeRect({ x: 0.7, y: 0.6 }, { x: 0.1, y: 0.2 });

    expectRect(forward, { x: 0.1, y: 0.2, w: 0.6, h: 0.4 });
    expectRect(reverse, forward);
  });

  it("handles a zero-size drag", () => {
    expectRect(normalizeRect({ x: 0.3, y: 0.3 }, { x: 0.3, y: 0.3 }), {
      x: 0.3,
      y: 0.3,
      w: 0,
      h: 0,
    });
  });
});

describe("hitHandle", () => {
  it("returns null in the middle of the selection", () => {
    expect(hitHandle(SELECTION, { x: 0.4, y: 0.4 }, VIEWPORT)).toBeNull();
  });

  it("finds every corner", () => {
    expect(hitHandle(SELECTION, { x: 0.2, y: 0.2 }, VIEWPORT)).toBe("nw");
    expect(hitHandle(SELECTION, { x: 0.6, y: 0.2 }, VIEWPORT)).toBe("ne");
    expect(hitHandle(SELECTION, { x: 0.6, y: 0.6 }, VIEWPORT)).toBe("se");
    expect(hitHandle(SELECTION, { x: 0.2, y: 0.6 }, VIEWPORT)).toBe("sw");
  });

  it("finds every edge midpoint", () => {
    expect(hitHandle(SELECTION, { x: 0.4, y: 0.2 }, VIEWPORT)).toBe("n");
    expect(hitHandle(SELECTION, { x: 0.6, y: 0.4 }, VIEWPORT)).toBe("e");
    expect(hitHandle(SELECTION, { x: 0.4, y: 0.6 }, VIEWPORT)).toBe("s");
    expect(hitHandle(SELECTION, { x: 0.2, y: 0.4 }, VIEWPORT)).toBe("w");
  });

  it("uses a 9 CSS pixel hit area, not a fixed normalized distance", () => {
    // 0.008 of 1000px is 8px: inside. 0.010 is 10px: outside.
    expect(hitHandle(SELECTION, { x: 0.608, y: 0.4 }, VIEWPORT)).toBe("e");
    expect(hitHandle(SELECTION, { x: 0.610, y: 0.4 }, VIEWPORT)).toBeNull();
  });
});

describe("resizeSelection", () => {
  it("moves the south-east corner", () => {
    expectRect(
      resizeSelection(SELECTION, "se", { x: 0.8, y: 0.8 }, VIEWPORT),
      { x: 0.2, y: 0.2, w: 0.6, h: 0.6 },
    );
  });

  it("moves the north-west corner", () => {
    expectRect(
      resizeSelection(SELECTION, "nw", { x: 0.1, y: 0.1 }, VIEWPORT),
      { x: 0.1, y: 0.1, w: 0.5, h: 0.5 },
    );
  });

  it("moves one edge and leaves the others alone", () => {
    expectRect(
      resizeSelection(SELECTION, "n", { x: 0.4, y: 0.1 }, VIEWPORT),
      { x: 0.2, y: 0.1, w: 0.4, h: 0.5 },
    );
  });

  it("keeps a 10 CSS pixel minimum when an edge crosses the opposite edge", () => {
    expectRect(
      resizeSelection(SELECTION, "e", { x: 0.1, y: 0.4 }, VIEWPORT),
      { x: 0.2, y: 0.2, w: 0.01, h: 0.4 },
    );
    expectRect(
      resizeSelection(SELECTION, "w", { x: 0.8, y: 0.4 }, VIEWPORT),
      { x: 0.59, y: 0.2, w: 0.01, h: 0.4 },
    );
  });

  it("enforces separate horizontal and vertical minimums", () => {
    expectRect(
      resizeSelection(SELECTION, "se", { x: 0.2, y: 0.2 }, VIEWPORT),
      { x: 0.2, y: 0.2, w: 0.01, h: 0.02 },
    );
  });

  it("clamps the selection to the viewport", () => {
    expectRect(
      resizeSelection(SELECTION, "se", { x: 2, y: 2 }, VIEWPORT),
      { x: 0.2, y: 0.2, w: 0.8, h: 0.8 },
    );
    expectRect(
      resizeSelection(SELECTION, "nw", { x: -1, y: -1 }, VIEWPORT),
      { x: 0, y: 0, w: 0.6, h: 0.6 },
    );
  });
});

describe("cropRect", () => {
  it("takes the whole bitmap for a full selection", () => {
    expect(cropRect({ x: 0, y: 0, w: 1, h: 1 }, 800, 600)).toEqual({
      sx: 0,
      sy: 0,
      sw: 800,
      sh: 600,
    });
  });

  it("rounds outward to keep partial edge pixels", () => {
    expect(cropRect({ x: 0.1, y: 0.1, w: 0.1, h: 0.1 }, 800, 600)).toEqual({
      sx: 80,
      sy: 60,
      sw: 80,
      sh: 60,
    });
  });

  it("keeps a 1px sliver visible", () => {
    expect(cropRect({ x: 1, y: 1, w: 0, h: 0 }, 800, 600)).toEqual({
      sx: 799,
      sy: 599,
      sw: 1,
      sh: 1,
    });
  });

  it("clamps selections that extend past the bitmap", () => {
    expect(cropRect({ x: 0.9, y: 0.9, w: 0.5, h: 0.5 }, 800, 600)).toEqual({
      sx: 720,
      sy: 540,
      sw: 80,
      sh: 60,
    });
  });

  it("never leaves the bitmap or collapses a crop", () => {
    const selections: Rect[] = [
      { x: -0.2, y: -0.2, w: 0.4, h: 0.4 },
      { x: 0.5, y: 0.5, w: 0.001, h: 0.001 },
      { x: 0.25, y: 0.75, w: 0.5, h: 0.25 },
      { x: 0, y: 0.999, w: 1, h: 0.001 },
    ];

    for (const selection of selections) {
      const crop = cropRect(selection, 800, 600);
      expect(crop.sx).toBeGreaterThanOrEqual(0);
      expect(crop.sy).toBeGreaterThanOrEqual(0);
      expect(crop.sw).toBeGreaterThanOrEqual(1);
      expect(crop.sh).toBeGreaterThanOrEqual(1);
      expect(crop.sx + crop.sw).toBeLessThanOrEqual(800);
      expect(crop.sy + crop.sh).toBeLessThanOrEqual(600);
    }
  });
});
