import "./style.css";
import { CaptureAudio } from "./audio.ts";
import { CaptureEditor, type EditorState, type Tool } from "./editor.ts";
import { PreviewRenderer } from "./preview.ts";

function mustQuery<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Capture: missing ${selector}`);
  return element;
}

const station = mustQuery<HTMLElement>("#capture-station");
const stage = mustQuery<HTMLElement>("#stage");
const liveCanvas = mustQuery<HTMLCanvasElement>("#live-canvas");
const snapshotCanvas = mustQuery<HTMLCanvasElement>("#snapshot-canvas");
const selectionTag = mustQuery<HTMLElement>("#selection-tag");
const toolbar = mustQuery<HTMLElement>("#toolbar");
const prompt = mustQuery<HTMLElement>("#capture-prompt");
const shutter = mustQuery<HTMLButtonElement>("#shutter");
const idleControls = mustQuery<HTMLElement>("#idle-controls");
const capturedControls = mustQuery<HTMLElement>("#captured-controls");
const capturedHint = mustQuery<HTMLElement>("#captured-hint");
const exitButton = mustQuery<HTMLButtonElement>("#exit-capture");
const resetButton = mustQuery<HTMLButtonElement>("#reset-button");
const copyButton = mustQuery<HTMLButtonElement>("#copy-button");
const downloadButton = mustQuery<HTMLButtonElement>("#download-button");
const statusText = mustQuery<HTMLElement>("#status-text");
const canvasSize = mustQuery<HTMLElement>("#canvas-size");
const canvasDpr = mustQuery<HTMLElement>("#canvas-dpr");
const soundToggle = mustQuery<HTMLButtonElement>("#sound-toggle");
const changelogOpen = mustQuery<HTMLButtonElement>("#changelog-open");
const changelogDialog = mustQuery<HTMLDialogElement>("#changelog-dialog");
const downloadLink = mustQuery<HTMLAnchorElement>("#download-link");
const toast = mustQuery<HTMLElement>("#toast");
const toastMessage = mustQuery<HTMLElement>("#toast-message");
const liveRegion = mustQuery<HTMLElement>("#live-region");
const toolButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>("[data-tool]"),
);

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

function readMuted(): boolean {
  try {
    return localStorage.getItem("capture:muted") === "true";
  } catch {
    return false;
  }
}

function writeMuted(muted: boolean): void {
  try {
    localStorage.setItem("capture:muted", String(muted));
  } catch {
    // Storage is optional.
  }
}

let mode: "live" | "captured" = "live";
let fireTimer: number | undefined;
let toastTimer: number | undefined;
let metaFrame = 0;
let exporting = false;

const audio = new CaptureAudio(readMuted());
const preview = new PreviewRenderer(liveCanvas, {
  onFrame: () => scheduleMetaUpdate(),
});

const editor = new CaptureEditor({
  stage,
  canvas: snapshotCanvas,
  selectionTag,
  onChange: handleEditorChange,
  onAction: () => {
    prompt.hidden = true;
  },
  onAnnounce: (message) => announce(message),
});

function announce(message: string): void {
  liveRegion.textContent = "";
  window.setTimeout(() => {
    liveRegion.textContent = message;
  }, 20);
}

function applyMutedUI(): void {
  const muted = audio.isMuted;
  soundToggle.setAttribute("aria-pressed", String(muted));
  soundToggle.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
  soundToggle.title = muted ? "Unmute sound" : "Mute sound";
}

function updateMeta(): void {
  const cssW = stage.clientWidth;
  const cssH = stage.clientHeight;
  if (cssW < 2 || cssH < 2) return;
  const pixelW = liveCanvas.width || Math.round(cssW);
  const pixelH = liveCanvas.height || Math.round(cssH);
  canvasSize.textContent = `${pixelW}×${pixelH}`;
  const scale = pixelW / cssW;
  canvasDpr.textContent = `${scale.toFixed(1)}×`;
}

function scheduleMetaUpdate(): void {
  if (metaFrame) return;
  metaFrame = requestAnimationFrame(() => {
    metaFrame = 0;
    updateMeta();
  });
}

function updateToolbar(tool: Tool): void {
  for (const button of toolButtons) {
    const isActive = button.dataset.tool === tool;
    button.setAttribute("aria-pressed", String(isActive));
  }
}

function updateCapturedHint(state: EditorState): void {
  if (!state.hasSelection) {
    if (state.tool === "select") {
      capturedHint.textContent =
        "Drag to select an area, or pick a tool above.";
    } else if (state.tool === "arrow") {
      capturedHint.textContent =
        "Drag to draw an arrow. Selection is optional.";
    } else if (state.tool === "box") {
      capturedHint.textContent = "Drag a box around the important part.";
    } else {
      capturedHint.textContent = "Drag over anything private to pixelate it.";
    }
    return;
  }

  if (state.tool === "select") {
    capturedHint.textContent = "Selected. Drag a handle to resize, or copy it.";
  } else if (state.tool === "arrow") {
    capturedHint.textContent =
      "Drag to add an arrow. Copy or download when ready.";
  } else if (state.tool === "box") {
    capturedHint.textContent = "Drag to box the detail that matters.";
  } else {
    capturedHint.textContent = "Drag to blur the sensitive bit.";
  }
}

function handleEditorChange(state: EditorState): void {
  updateToolbar(state.tool);
  updateCapturedHint(state);
}

function chooseTool(tool: Tool): void {
  if (mode !== "captured") return;
  editor.setTool(tool);
}

function setCapturedChrome(captured: boolean): void {
  station.classList.toggle("is-captured", captured);
  statusText.textContent = captured ? "Captured" : "Live preview";
  toolbar.hidden = !captured;
  if (!captured) prompt.hidden = true;
  capturedControls.hidden = !captured;
  idleControls.hidden = captured;
  snapshotCanvas.tabIndex = captured ? 0 : -1;
  liveCanvas.setAttribute("aria-hidden", String(captured));
  snapshotCanvas.setAttribute("aria-hidden", String(!captured));
  if (!captured) selectionTag.hidden = true;
}

function startCapture(): void {
  if (mode === "captured" || changelogDialog.open) return;
  mode = "captured";

  audio.playShutter();
  preview.refresh();
  preview.setActive(false);
  editor.beginCapture(liveCanvas);
  setCapturedChrome(true);
  prompt.hidden = false;
  station.classList.remove("is-firing");
  if (!motionQuery.matches) {
    // Restart the flash animation even on a quick repeat capture.
    void station.offsetWidth;
    station.classList.add("is-firing");
    if (fireTimer) window.clearTimeout(fireTimer);
    fireTimer = window.setTimeout(
      () => station.classList.remove("is-firing"),
      560,
    );
  }

  announce("Screenshot captured. Drag on the image to select an area.");
  window.requestAnimationFrame(() => {
    snapshotCanvas.focus({ preventScroll: true });
  });
}

function exitCapture(restoreFocus = true): void {
  if (mode === "live") return;
  mode = "live";
  editor.endCapture();
  setCapturedChrome(false);
  station.classList.remove("is-firing");
  if (fireTimer) {
    window.clearTimeout(fireTimer);
    fireTimer = undefined;
  }
  preview.setActive(true);
  scheduleMetaUpdate();
  announce("Capture closed. Live preview restored.");
  if (restoreFocus) shutter.focus({ preventScroll: true });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas could not be encoded."));
    }, "image/png");
  });
}

function filenameForSelection(hasSelection: boolean): string {
  const stamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace("T", "-")
    .replace(":", "");
  return `capture-${stamp}${hasSelection ? "-selection" : ""}.png`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function showToast(
  message: string,
  tone: "success" | "warn" | "error" = "success",
): void {
  toast.dataset.tone = tone;
  toastMessage.textContent = message;
  toast.classList.remove("is-visible");
  void toast.offsetWidth;
  toast.classList.add("is-visible");
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(
    () => toast.classList.remove("is-visible"),
    tone === "success" ? 2800 : 4400,
  );
}

function setExportBusy(button: HTMLButtonElement, busy: boolean): void {
  button.classList.toggle("is-busy", busy);
  button.setAttribute("aria-busy", String(busy));
}

async function copyCapture(): Promise<void> {
  if (exporting) return;
  const canvas = editor.buildExportCanvas();
  if (!canvas) return;
  exporting = true;
  setExportBusy(copyButton, true);
  const hasSelection = editor.hasSelection();
  const filename = filenameForSelection(hasSelection);

  // Start encoding synchronously and pass the promise to ClipboardItem. That
  // keeps the write inside the browser's user-activation window (Safari cares).
  const blobPromise = canvasToBlob(canvas);

  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      throw new Error("Image clipboard is unavailable.");
    }
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blobPromise }),
    ]);
    audio.playChime();
    showToast(hasSelection ? "Selection copied" : "Capture copied", "success");
  } catch (clipboardError) {
    console.warn(
      "Capture: clipboard write failed, downloading instead.",
      clipboardError,
    );
    try {
      const blob = await blobPromise;
      triggerDownload(blob, filename);
      audio.playChime();
      showToast("Clipboard blocked — downloaded instead", "warn");
    } catch (fallbackError) {
      console.error("Capture: copy failed.", fallbackError);
      audio.playError();
      showToast("Could not copy. Try Download.", "error");
    }
  } finally {
    exporting = false;
    setExportBusy(copyButton, false);
  }
}

async function downloadCapture(): Promise<void> {
  if (exporting) return;
  const canvas = editor.buildExportCanvas();
  if (!canvas) return;
  exporting = true;
  setExportBusy(downloadButton, true);
  const hasSelection = editor.hasSelection();
  const filename = filenameForSelection(hasSelection);

  try {
    const blob = await canvasToBlob(canvas);
    triggerDownload(blob, filename);
    audio.playChime();
    showToast(
      hasSelection ? "Selection downloaded" : "Capture downloaded",
      "success",
    );
  } catch (error) {
    console.error("Capture: download failed.", error);
    audio.playError();
    showToast("Could not save the image.", "error");
  } finally {
    exporting = false;
    setExportBusy(downloadButton, false);
  }
}

shutter.addEventListener("click", startCapture);
exitButton.addEventListener("click", () => exitCapture());
resetButton.addEventListener("click", () => exitCapture());
copyButton.addEventListener("click", () => {
  void copyCapture();
});
downloadButton.addEventListener("click", () => {
  void downloadCapture();
});

for (const button of toolButtons) {
  button.addEventListener("click", () => {
    const tool = button.dataset.tool as Tool | undefined;
    if (tool) chooseTool(tool);
  });
}

toolbar.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const buttons = Array.from(
    toolbar.querySelectorAll<HTMLButtonElement>("button:not([disabled])"),
  );
  const currentIndex = buttons.indexOf(
    document.activeElement as HTMLButtonElement,
  );
  if (currentIndex < 0) return;
  event.preventDefault();
  const nextIndex =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? buttons.length - 1
        : (currentIndex +
            (event.key === "ArrowRight" ? 1 : -1) +
            buttons.length) %
          buttons.length;
  buttons[nextIndex]?.focus();
});

soundToggle.addEventListener("click", () => {
  const muted = !audio.isMuted;
  audio.setMuted(muted);
  writeMuted(muted);
  applyMutedUI();
  if (!muted) audio.unlock();
});

changelogOpen.addEventListener("click", () => {
  if (typeof changelogDialog.showModal === "function") {
    if (!changelogDialog.open) changelogDialog.showModal();
  } else {
    changelogDialog.setAttribute("open", "");
  }
});

changelogDialog.addEventListener("click", (event) => {
  if (event.target === changelogDialog) changelogDialog.close();
});

downloadLink.addEventListener("click", (event) => {
  event.preventDefault();
  showToast("Desktop app coming soon — capture right here.", "warn");
});

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (changelogDialog.open) return;
  const target = event.target as HTMLElement | null;
  if (
    target &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable)
  ) {
    return;
  }

  const key = event.key.toLowerCase();

  if (mode === "live") {
    if (key === "c") {
      event.preventDefault();
      startCapture();
    }
    return;
  }

  if (key === "escape") {
    event.preventDefault();
    exitCapture();
    return;
  }

  if (key === "v") {
    event.preventDefault();
    chooseTool("select");
  } else if (key === "a") {
    event.preventDefault();
    chooseTool("arrow");
  } else if (key === "r") {
    event.preventDefault();
    chooseTool("box");
  } else if (key === "b") {
    event.preventDefault();
    chooseTool("blur");
  }
});

let stationInView = true;
const stationObserver = new IntersectionObserver(
  (entries) => {
    stationInView = entries.some((entry) => entry.isIntersecting);
    syncPausedState();
  },
  { threshold: 0.01 },
);
stationObserver.observe(station);

function syncPausedState(): void {
  const paused = document.visibilityState !== "visible" || !stationInView;
  document.documentElement.classList.toggle("is-paused", paused);
}

document.addEventListener("visibilitychange", syncPausedState);
syncPausedState();

const stageObserver = new ResizeObserver(() => {
  scheduleMetaUpdate();
});
stageObserver.observe(stage);
window.addEventListener("resize", scheduleMetaUpdate);
motionQuery.addEventListener("change", scheduleMetaUpdate);

applyMutedUI();
snapshotCanvas.setAttribute("aria-hidden", "true");
handleEditorChange({ hasSelection: false, tool: "select", annotationCount: 0 });
scheduleMetaUpdate();
void document.fonts?.ready.then(scheduleMetaUpdate);
