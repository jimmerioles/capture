export type Tool = "select" | "arrow" | "box" | "blur";

type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

type Annotation =
  | { kind: "arrow"; a: Point; b: Point }
  | { kind: "box"; rect: Rect }
  | { kind: "blur"; rect: Rect };

type Draft =
  | { kind: "select"; a: Point; b: Point }
  | { kind: "arrow"; a: Point; b: Point }
  | { kind: "box"; a: Point; b: Point }
  | { kind: "blur"; a: Point; b: Point };

export type EditorState = {
  hasSelection: boolean;
  tool: Tool;
  annotationCount: number;
};

type CaptureEditorOptions = {
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  selectionTag: HTMLElement;
  onChange?: (state: EditorState) => void;
  onAction?: () => void;
  onAnnounce?: (message: string) => void;
};

const ICE = "#7fe7ff";
const DARK_INK = "rgba(3, 8, 16, 0.62)";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeRect(a: Point, b: Point): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  };
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function cursorForHandle(handle: ResizeHandle): string {
  if (handle === "n" || handle === "s") return "ns-resize";
  if (handle === "e" || handle === "w") return "ew-resize";
  if (handle === "nw" || handle === "se") return "nwse-resize";
  return "nesw-resize";
}

/**
 * The frozen half of the hero: it paints the captured bitmap, the selection
 * chrome, and all annotations, then builds a clean PNG for copy/download.
 */
export class CaptureEditor {
  private stage: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private selectionTag: HTMLElement;
  private options: CaptureEditorOptions;

  private frozen = document.createElement("canvas");
  private frozenCtx: CanvasRenderingContext2D;
  private scratch = document.createElement("canvas");

  private active = false;
  private width = 1;
  private height = 1;
  private captureScale = 1;

  private tool: Tool = "select";
  private annotations: Annotation[] = [];
  private selection: Rect | null = null;
  private draft: Draft | null = null;
  private resizing: { handle: ResizeHandle; origin: Rect } | null = null;
  private pointerId: number | null = null;
  private lastPoint: Point | null = null;
  private raf = 0;

  private resizeObserver: ResizeObserver;

  constructor(options: CaptureEditorOptions) {
    this.options = options;
    this.stage = options.stage;
    this.canvas = options.canvas;
    this.selectionTag = options.selectionTag;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Capture: Canvas 2D is unavailable.");
    this.ctx = ctx;

    const frozenCtx = this.frozen.getContext("2d");
    if (!frozenCtx) throw new Error("Capture: Canvas 2D is unavailable.");
    this.frozenCtx = frozenCtx;

    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerCancel);
    this.canvas.addEventListener("pointerleave", this.onPointerLeave);

    this.resizeObserver = new ResizeObserver(() => {
      if (this.active) this.schedule();
    });
    this.resizeObserver.observe(this.stage);
    window.addEventListener("resize", () => {
      if (this.active) this.schedule();
    });
  }

  beginCapture(source: HTMLCanvasElement): void {
    this.frozen.width = Math.max(1, source.width);
    this.frozen.height = Math.max(1, source.height);
    this.frozenCtx.clearRect(0, 0, this.frozen.width, this.frozen.height);
    this.frozenCtx.drawImage(source, 0, 0);

    this.width = Math.max(1, this.stage.clientWidth);
    this.height = Math.max(1, this.stage.clientHeight);
    this.captureScale = this.frozen.width / this.width;

    this.active = true;
    this.resetState();
    this.configureCanvas();
    this.render();
    this.emit();
  }

  endCapture(): void {
    this.active = false;
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    if (this.pointerId !== null) {
      try {
        this.canvas.releasePointerCapture(this.pointerId);
      } catch {
        // The pointer may already be gone.
      }
    }
    this.pointerId = null;
    this.draft = null;
    this.resizing = null;
    this.lastPoint = null;
    this.canvas.style.cursor = "";
    this.selectionTag.hidden = true;
    this.options.onChange?.({
      hasSelection: false,
      tool: this.tool,
      annotationCount: 0,
    });
  }

  reset(): void {
    if (!this.active) return;
    this.resetState();
    this.render();
    this.emit();
  }

  setTool(tool: Tool): void {
    if (this.tool === tool) return;
    this.tool = tool;
    this.draft = null;
    this.resizing = null;
    this.updateCursor(this.lastPoint);
    this.schedule();
    this.emit();
  }

  getTool(): Tool {
    return this.tool;
  }

  hasSelection(): boolean {
    return this.selection !== null;
  }

  buildExportCanvas(): HTMLCanvasElement | null {
    if (!this.active) return null;
    const frozenW = this.frozen.width;
    const frozenH = this.frozen.height;

    const composite = document.createElement("canvas");
    composite.width = frozenW;
    composite.height = frozenH;
    const compositeCtx = composite.getContext("2d");
    if (!compositeCtx) return null;

    compositeCtx.drawImage(this.frozen, 0, 0);
    this.drawAnnotations(compositeCtx, frozenW, frozenH, this.captureScale);

    if (!this.selection) return composite;

    const sx = clamp(Math.floor(this.selection.x * frozenW), 0, frozenW - 1);
    const sy = clamp(Math.floor(this.selection.y * frozenH), 0, frozenH - 1);
    const ex = clamp(
      Math.ceil((this.selection.x + this.selection.w) * frozenW),
      sx + 1,
      frozenW,
    );
    const ey = clamp(
      Math.ceil((this.selection.y + this.selection.h) * frozenH),
      sy + 1,
      frozenH,
    );
    const cropW = Math.max(1, ex - sx);
    const cropH = Math.max(1, ey - sy);

    const crop = document.createElement("canvas");
    crop.width = cropW;
    crop.height = cropH;
    const cropCtx = crop.getContext("2d");
    if (!cropCtx) return composite;
    cropCtx.drawImage(composite, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
    return crop;
  }

  private resetState(): void {
    this.tool = "select";
    this.annotations = [];
    this.selection = null;
    this.draft = null;
    this.resizing = null;
    this.lastPoint = null;
    this.canvas.style.cursor = "crosshair";
    this.selectionTag.hidden = true;
  }

  private emit(): void {
    this.options.onChange?.({
      hasSelection: this.selection !== null,
      tool: this.tool,
      annotationCount: this.annotations.length,
    });
  }

  private configureCanvas(): void {
    this.width = Math.max(1, this.stage.clientWidth);
    this.height = Math.max(1, this.stage.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const pixelWidth = Math.max(1, Math.round(this.width * dpr));
    const pixelHeight = Math.max(1, Math.round(this.height * dpr));
    if (
      this.canvas.width !== pixelWidth ||
      this.canvas.height !== pixelHeight
    ) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
  }

  private schedule(): void {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.render();
    });
  }

  private toPoint(event: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1),
      y: clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1),
    };
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.active) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    this.canvas.focus({ preventScroll: true });

    const point = this.toPoint(event);
    this.lastPoint = point;
    this.pointerId = event.pointerId;
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is a progressive enhancement.
    }

    if (this.tool === "select") {
      const handle = this.selection ? this.hitHandle(point) : null;
      if (handle && this.selection) {
        this.resizing = { handle, origin: { ...this.selection } };
        this.draft = null;
      } else {
        this.draft = { kind: "select", a: point, b: point };
        this.resizing = null;
      }
    } else {
      this.draft = { kind: this.tool, a: point, b: point };
      this.resizing = null;
    }
    this.updateCursor(point);
    this.schedule();
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.active) return;
    const point = this.toPoint(event);
    this.lastPoint = point;

    if (this.draft) {
      this.draft.b = point;
      this.schedule();
      return;
    }

    if (this.resizing && this.selection) {
      this.selection = this.resizeSelection(
        this.resizing.origin,
        this.resizing.handle,
        point,
      );
      this.schedule();
      return;
    }

    this.updateCursor(point);
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (!this.active) return;
    if (!this.draft && !this.resizing) return;
    const point = this.toPoint(event);
    const wasSelection = this.draft?.kind === "select";

    if (this.draft) {
      const draft = this.draft;
      if (draft.kind === "select") {
        const rect = normalizeRect(draft.a, point);
        if (
          rect.w * this.canvas.getBoundingClientRect().width >= 10 &&
          rect.h * this.canvas.getBoundingClientRect().height >= 10
        ) {
          this.selection = rect;
          this.announceSelection();
        }
      } else {
        this.commitAnnotation(draft, point);
      }
    }

    if (this.resizing) {
      this.announceSelection();
    }

    this.draft = null;
    this.resizing = null;
    this.releasePointer();
    this.updateCursor(point);
    this.render();
    this.emit();
    if (wasSelection && this.selection) this.options.onAction?.();
  };

  private onPointerCancel = (): void => {
    this.draft = null;
    this.resizing = null;
    this.releasePointer();
    this.schedule();
  };

  private onPointerLeave = (): void => {
    if (!this.active || this.draft || this.resizing) return;
    this.canvas.style.cursor =
      this.tool === "select" ? "crosshair" : "crosshair";
  };

  private releasePointer(): void {
    if (this.pointerId !== null) {
      try {
        this.canvas.releasePointerCapture(this.pointerId);
      } catch {
        // The pointer may already be gone.
      }
    }
    this.pointerId = null;
  }

  private commitAnnotation(
    draft: Exclude<Draft, { kind: "select" }>,
    end: Point,
  ): void {
    const rect = normalizeRect(draft.a, end);
    const pxW = rect.w * this.canvas.getBoundingClientRect().width;
    const pxH = rect.h * this.canvas.getBoundingClientRect().height;

    if (draft.kind === "arrow") {
      const distance = Math.hypot(pxW, pxH);
      if (distance < 9) return;
      this.annotations.push({ kind: "arrow", a: draft.a, b: end });
      this.options.onAnnounce?.("Arrow added.");
    } else if (draft.kind === "box") {
      if (pxW < 7 || pxH < 7) return;
      this.annotations.push({ kind: "box", rect });
      this.options.onAnnounce?.("Box added.");
    } else {
      if (pxW < 9 || pxH < 9) return;
      this.annotations.push({ kind: "blur", rect });
      this.options.onAnnounce?.("Area blurred.");
    }
    this.options.onAction?.();
  }

  private announceSelection(): void {
    if (!this.selection) return;
    const pxW = Math.max(1, Math.round(this.selection.w * this.frozen.width));
    const pxH = Math.max(1, Math.round(this.selection.h * this.frozen.height));
    this.options.onAnnounce?.(`Selected ${pxW} by ${pxH} pixels.`);
  }

  private hitHandle(point: Point): ResizeHandle | null {
    const selection = this.selection;
    if (!selection) return null;
    const rect = this.canvas.getBoundingClientRect();
    const thresholdX = 9 / Math.max(1, rect.width);
    const thresholdY = 9 / Math.max(1, rect.height);
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

  private resizeSelection(
    origin: Rect,
    handle: ResizeHandle,
    point: Point,
  ): Rect {
    let left = origin.x;
    let right = origin.x + origin.w;
    let top = origin.y;
    let bottom = origin.y + origin.h;

    if (handle.includes("w")) left = point.x;
    if (handle.includes("e")) right = point.x;
    if (handle.includes("n")) top = point.y;
    if (handle.includes("s")) bottom = point.y;

    const minW = 10 / Math.max(1, this.canvas.getBoundingClientRect().width);
    const minH = 10 / Math.max(1, this.canvas.getBoundingClientRect().height);

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

  private updateCursor(point: Point | null): void {
    if (!this.active) {
      this.canvas.style.cursor = "";
      return;
    }
    if (point && this.tool === "select" && this.selection) {
      const handle = this.hitHandle(point);
      if (handle) {
        this.canvas.style.cursor = cursorForHandle(handle);
        return;
      }
    }
    this.canvas.style.cursor = "crosshair";
  }

  private render(): void {
    if (!this.active) return;
    this.configureCanvas();
    const cssW = this.width;
    const cssH = this.height;
    const pixelW = this.canvas.width;
    const pixelH = this.canvas.height;
    if (pixelW < 2 || pixelH < 2) return;

    const ctx = this.ctx;
    const scaleX = pixelW / cssW;
    const scaleY = pixelH / cssH;
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    // 1. The frozen screenshot and, once a selection exists, its annotations.
    // Both are treated as part of the captured image, so the area outside the
    // selection dims them together instead of letting marks float above the veil.
    ctx.drawImage(this.frozen, 0, 0, cssW, cssH);

    const draftSelection =
      this.draft?.kind === "select"
        ? normalizeRect(this.draft.a, this.draft.b)
        : null;
    const brightRect =
      draftSelection && draftSelection.w > 0.002
        ? draftSelection
        : this.selection;
    const hasSelectionContext = brightRect !== null;
    if (hasSelectionContext) {
      this.drawAnnotations(ctx, cssW, cssH, 1);
    }

    // 2. Dim everything except the active selection.
    ctx.fillStyle = "rgba(3, 8, 16, 0.58)";
    ctx.fillRect(0, 0, cssW, cssH);

    if (brightRect) {
      ctx.save();
      roundRectPath(
        ctx,
        brightRect.x * cssW,
        brightRect.y * cssH,
        brightRect.w * cssW,
        brightRect.h * cssH,
        1,
      );
      ctx.clip();
      ctx.drawImage(this.frozen, 0, 0, cssW, cssH);
      this.drawAnnotations(ctx, cssW, cssH, 1);
      ctx.restore();
    }

    // Without a selection the dim is a hint, so keep any existing marks readable.
    if (!hasSelectionContext) {
      this.drawAnnotations(ctx, cssW, cssH, 1);
    }

    // 3. The in-progress mark is always bright.
    if (this.draft && this.draft.kind !== "select") {
      this.drawAnnotation(
        ctx,
        {
          kind: this.draft.kind,
          ...(this.draft.kind === "arrow"
            ? { a: this.draft.a, b: this.draft.b }
            : { rect: normalizeRect(this.draft.a, this.draft.b) }),
        } as Annotation,
        cssW,
        cssH,
        1,
        true,
      );
    }

    const selectionForChrome =
      this.draft?.kind === "select" ? draftSelection : this.selection;
    if (
      selectionForChrome &&
      selectionForChrome.w > 0.002 &&
      selectionForChrome.h > 0.002
    ) {
      this.drawSelectionChrome(
        ctx,
        selectionForChrome,
        cssW,
        cssH,
        !this.draft && this.tool === "select",
      );
    }

    this.updateSelectionTag(selectionForChrome);
  }

  private drawAnnotations(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    scale: number,
  ): void {
    for (const annotation of this.annotations) {
      this.drawAnnotation(ctx, annotation, w, h, scale, false);
    }
  }

  private drawAnnotation(
    ctx: CanvasRenderingContext2D,
    annotation: Annotation,
    w: number,
    h: number,
    scale: number,
    preview: boolean,
  ): void {
    if (annotation.kind === "arrow") {
      this.drawArrow(ctx, annotation.a, annotation.b, w, h, scale);
    } else if (annotation.kind === "box") {
      this.strokeBox(ctx, annotation.rect, w, h, scale, preview);
    } else {
      this.blurRect(ctx, annotation.rect, w, h, scale);
      if (preview) {
        ctx.save();
        ctx.setLineDash([5 * scale, 4 * scale]);
        roundRectPath(
          ctx,
          annotation.rect.x * w,
          annotation.rect.y * h,
          annotation.rect.w * w,
          annotation.rect.h * h,
          2,
        );
        ctx.strokeStyle = ICE;
        ctx.lineWidth = 1.2 * scale;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private drawArrow(
    ctx: CanvasRenderingContext2D,
    a: Point,
    b: Point,
    w: number,
    h: number,
    scale: number,
  ): void {
    const ax = a.x * w;
    const ay = a.y * h;
    const bx = b.x * w;
    const by = b.y * h;
    const length = Math.hypot(bx - ax, by - ay);
    if (length < 2) return;

    const angle = Math.atan2(by - ay, bx - ax);
    const headLength = Math.min(15 * scale, length * 0.4);
    const wing = headLength * 0.48;
    const leftX = bx - headLength * Math.cos(angle) + wing * Math.sin(angle);
    const leftY = by - headLength * Math.sin(angle) - wing * Math.cos(angle);
    const rightX = bx - headLength * Math.cos(angle) - wing * Math.sin(angle);
    const rightY = by - headLength * Math.sin(angle) + wing * Math.cos(angle);

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Dark halo so the mark reads over bright and dark captures.
    ctx.strokeStyle = DARK_INK;
    ctx.lineWidth = 5.4 * scale;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.moveTo(bx, by);
    ctx.lineTo(leftX, leftY);
    ctx.moveTo(bx, by);
    ctx.lineTo(rightX, rightY);
    ctx.stroke();

    ctx.strokeStyle = ICE;
    ctx.lineWidth = 2.4 * scale;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.moveTo(bx, by);
    ctx.lineTo(leftX, leftY);
    ctx.moveTo(bx, by);
    ctx.lineTo(rightX, rightY);
    ctx.stroke();
    ctx.restore();
  }

  private strokeBox(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    w: number,
    h: number,
    scale: number,
    preview: boolean,
  ): void {
    const x = rect.x * w;
    const y = rect.y * h;
    const bw = rect.w * w;
    const bh = rect.h * h;
    if (bw < 1 || bh < 1) return;

    ctx.save();
    if (!preview) {
      ctx.fillStyle = "rgba(127, 231, 255, 0.055)";
      roundRectPath(ctx, x, y, bw, bh, 2.5 * scale);
      ctx.fill();
    }
    roundRectPath(ctx, x, y, bw, bh, 2.5 * scale);
    ctx.strokeStyle = DARK_INK;
    ctx.lineWidth = 4.6 * scale;
    ctx.stroke();
    roundRectPath(ctx, x, y, bw, bh, 2.5 * scale);
    ctx.strokeStyle = ICE;
    ctx.lineWidth = 2.1 * scale;
    if (preview) ctx.setLineDash([6 * scale, 4 * scale]);
    ctx.stroke();
    ctx.restore();
  }

  private blurRect(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    w: number,
    h: number,
    scale: number,
  ): void {
    const x = clamp(rect.x, 0, 1) * w;
    const y = clamp(rect.y, 0, 1) * h;
    const bw = clamp(rect.w, 0, 1) * w;
    const bh = clamp(rect.h, 0, 1) * h;
    if (bw < 2 || bh < 2) return;

    const sourceW = this.frozen.width;
    const sourceH = this.frozen.height;
    const sx = clamp(rect.x, 0, 1) * sourceW;
    const sy = clamp(rect.y, 0, 1) * sourceH;
    const sw = Math.max(1, Math.min(rect.w, 1 - rect.x) * sourceW);
    const sh = Math.max(1, Math.min(rect.h, 1 - rect.y) * sourceH);

    const block = Math.max(3, 13 * scale);
    const cols = clamp(Math.round(bw / block), 2, 90);
    const rows = clamp(Math.round(bh / block), 2, 90);
    this.scratch.width = cols;
    this.scratch.height = rows;
    const scratchCtx = this.scratch.getContext("2d");
    if (!scratchCtx) return;
    scratchCtx.imageSmoothingEnabled = true;
    scratchCtx.clearRect(0, 0, cols, rows);
    scratchCtx.drawImage(this.frozen, sx, sy, sw, sh, 0, 0, cols, rows);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, bw, bh);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.scratch, 0, 0, cols, rows, x, y, bw, bh);
    ctx.restore();
  }

  private drawSelectionChrome(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    w: number,
    h: number,
    handles: boolean,
  ): void {
    const x = Math.round(rect.x * w) + 0.5;
    const y = Math.round(rect.y * h) + 0.5;
    const bw = Math.max(1, Math.round(rect.w * w) - 1);
    const bh = Math.max(1, Math.round(rect.h * h) - 1);

    ctx.save();
    ctx.strokeStyle = "rgba(4, 10, 18, 0.5)";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, bw, bh);
    ctx.strokeStyle = "rgba(242, 252, 255, 0.94)";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x, y, bw, bh);

    if (handles) {
      const handleSize = 7;
      const points: Array<[number, number]> = [
        [x, y],
        [x + bw / 2, y],
        [x + bw, y],
        [x + bw, y + bh / 2],
        [x + bw, y + bh],
        [x + bw / 2, y + bh],
        [x, y + bh],
        [x, y + bh / 2],
      ];
      for (const [hx, hy] of points) {
        ctx.fillStyle = "#f4fdff";
        ctx.strokeStyle = "rgba(4, 10, 18, 0.75)";
        ctx.lineWidth = 1;
        roundRectPath(
          ctx,
          hx - handleSize / 2,
          hy - handleSize / 2,
          handleSize,
          handleSize,
          1.2,
        );
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private updateSelectionTag(rect: Rect | null | undefined): void {
    if (!this.active || !rect || rect.w <= 0.002 || rect.h <= 0.002) {
      this.selectionTag.hidden = true;
      return;
    }

    const pxW = Math.max(1, Math.round(rect.w * this.frozen.width));
    const pxH = Math.max(1, Math.round(rect.h * this.frozen.height));
    this.selectionTag.textContent = `${pxW} × ${pxH}`;
    this.selectionTag.hidden = false;

    const stageW = this.width;
    const stageH = this.height;
    const tagW = this.selectionTag.offsetWidth || 66;
    const tagH = this.selectionTag.offsetHeight || 20;
    let left = rect.x * stageW;
    let top = rect.y * stageH - tagH - 7;
    if (top < 6) top = rect.y * stageH + 7;
    left = clamp(left, 6, Math.max(6, stageW - tagW - 6));
    top = clamp(top, 6, Math.max(6, stageH - tagH - 6));
    this.selectionTag.style.left = `${left}px`;
    this.selectionTag.style.top = `${top}px`;
  }
}
