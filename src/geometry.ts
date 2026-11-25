export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export const MIN_SELECTION_PX = 10;
export const HANDLE_HIT_PX = 9;

/** A viewport in CSS pixels, such as a canvas bounding box. */
type Size = { width: number; height: number };

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeRect(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  };
}

/**
 * Which resize handle the pointer is within 9 CSS pixels of, if any.
 * Coordinates and viewport are in the same space.
 */
export function hitHandle(
  selection: Rect,
  point: Point,
  viewport: Size,
): ResizeHandle | null {
  const thresholdX = HANDLE_HIT_PX / Math.max(1, viewport.width);
  const thresholdY = HANDLE_HIT_PX / Math.max(1, viewport.height);
  const right = selection.x + selection.w;
  const bottom = selection.y + selection.h;
  const nearLeft = Math.abs(point.x - selection.x) <= thresholdX;
  const nearRight = Math.abs(point.x - right) <= thresholdX;
  const nearTop = Math.abs(point.y - selection.y) <= thresholdY;
  const nearBottom = Math.abs(point.y - bottom) <= thresholdY;
  const insideX =
    point.x >= selection.x - thresholdX && point.x <= right + thresholdX;
  const insideY =
    point.y >= selection.y - thresholdY && point.y <= bottom + thresholdY;

  if (nearLeft && nearTop) return "nw";
  if (nearRight && nearTop) return "ne";
  if (nearRight && nearBottom) return "se";
  if (nearLeft && nearBottom) return "sw";
  if (nearTop && insideX) return "n";
  if (nearRight && insideY) return "e";
  if (nearBottom && insideX) return "s";
  if (nearLeft && insideY) return "w";
  return null;
}

/**
 * Move one edge or corner of a selection to the pointer, keeping it inside
 * the viewport and no smaller than 10 CSS pixels per side.
 */
export function resizeSelection(
  origin: Rect,
  handle: ResizeHandle,
  point: Point,
  viewport: Size,
): Rect {
  let left = origin.x;
  let right = origin.x + origin.w;
  let top = origin.y;
  let bottom = origin.y + origin.h;

  if (handle.includes("w")) left = point.x;
  if (handle.includes("e")) right = point.x;
  if (handle.includes("n")) top = point.y;
  if (handle.includes("s")) bottom = point.y;

  const minW = MIN_SELECTION_PX / Math.max(1, viewport.width);
  const minH = MIN_SELECTION_PX / Math.max(1, viewport.height);

  if (right - left < minW) {
    if (handle.includes("w")) left = right - minW;
    else right = left + minW;
  }
  if (bottom - top < minH) {
    if (handle.includes("n")) top = bottom - minH;
    else bottom = top + minH;
  }

  left = clamp(left, 0, 1);
  right = clamp(right, 0, 1);
  top = clamp(top, 0, 1);
  bottom = clamp(bottom, 0, 1);

  return {
    x: Math.min(left, right),
    y: Math.min(top, bottom),
    w: Math.abs(right - left),
    h: Math.abs(bottom - top),
  };
}

/**
 * The pixel bounds of a normalized selection in a source bitmap. The floor
 * and ceil keep partial edge pixels, and a sliver still yields at least 1px.
 */
export function cropRect(
  selection: Rect,
  width: number,
  height: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const sx = clamp(Math.floor(selection.x * width), 0, width - 1);
  const sy = clamp(Math.floor(selection.y * height), 0, height - 1);
  const ex = clamp(
    Math.ceil((selection.x + selection.w) * width),
    sx + 1,
    width,
  );
  const ey = clamp(
    Math.ceil((selection.y + selection.h) * height),
    sy + 1,
    height,
  );
  return {
    sx,
    sy,
    sw: Math.max(1, ex - sx),
    sh: Math.max(1, ey - sy),
  };
}
