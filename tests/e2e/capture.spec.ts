import { expect, test, type Download, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

type Png = { width: number; height: number; bytes: Uint8Array };

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  return a.every((byte, index) => byte === b[index]);
}

async function openDemo(page: Page): Promise<void> {
  await page.goto("/");
  await expect
    .poll(() =>
      page
        .locator("#live-canvas")
        .evaluate((canvas: HTMLCanvasElement) => canvas.width),
    )
    .toBeGreaterThan(0);
}

async function startCapture(page: Page): Promise<void> {
  await page.locator("#shutter").click();
  await expect(page.locator("#status-text")).toHaveText("Captured");
  await expect(page.locator("#toolbar")).toBeVisible();
  await expect(page.locator("#snapshot-canvas")).toBeVisible();
}

async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

async function snapshotSize(
  page: Page,
): Promise<{ width: number; height: number }> {
  return page
    .locator("#snapshot-canvas")
    .evaluate((canvas: HTMLCanvasElement) => ({
      width: canvas.width,
      height: canvas.height,
    }));
}

async function downloadPng(page: Page): Promise<Png & { filename: string }> {
  const pending = page.waitForEvent("download");
  await page.locator("#download-button").click();
  const download: Download = await pending;
  const path = await download.path();
  if (!path) throw new Error("The download has no local path.");
  const bytes = await readFile(path);

  expect(bytes.subarray(1, 4).toString("ascii")).toBe("PNG");
  return {
    filename: download.suggestedFilename(),
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bytes,
  };
}

test("downloads the full capture at backing-store size", async ({ page }) => {
  await openDemo(page);
  await startCapture(page);

  const expected = await snapshotSize(page);
  const png = await downloadPng(page);

  expect(png.filename).toMatch(/^capture-\d{4}-\d{2}-\d{2}-\d{4}\.png$/);
  expect({ width: png.width, height: png.height }).toEqual(expected);
});

test("crops the download to the dragged selection", async ({ page }) => {
  await openDemo(page);
  await startCapture(page);

  const box = await page.locator("#snapshot-canvas").boundingBox();
  if (!box) throw new Error("The snapshot canvas has no bounding box.");

  await drag(
    page,
    { x: box.x + box.width * 0.25, y: box.y + box.height * 0.25 },
    { x: box.x + box.width * 0.75, y: box.y + box.height * 0.75 },
  );
  await expect(page.locator("#selection-tag")).toBeVisible();

  const full = await snapshotSize(page);
  const png = await downloadPng(page);
  const expectedWidth =
    Math.ceil(full.width * 0.75) - Math.floor(full.width * 0.25);
  const expectedHeight =
    Math.ceil(full.height * 0.75) - Math.floor(full.height * 0.25);

  expect(png.filename).toMatch(/-selection\.png$/);
  expect(Math.abs(png.width - expectedWidth)).toBeLessThanOrEqual(3);
  expect(Math.abs(png.height - expectedHeight)).toBeLessThanOrEqual(3);
});

test("resizes the selection from a corner handle", async ({ page }) => {
  await openDemo(page);
  await startCapture(page);

  const box = await page.locator("#snapshot-canvas").boundingBox();
  if (!box) throw new Error("The snapshot canvas has no bounding box.");
  const point = (x: number, y: number) => ({
    x: box.x + box.width * x,
    y: box.y + box.height * y,
  });

  await drag(page, point(0.25, 0.25), point(0.5, 0.5));
  const before = await downloadPng(page);

  // Grab the south-east handle and pull it toward the bottom-right.
  await drag(page, point(0.5, 0.5), point(0.8, 0.8));
  const after = await downloadPng(page);

  const full = await snapshotSize(page);
  const expectedWidth =
    Math.ceil(full.width * 0.8) - Math.floor(full.width * 0.25);
  const expectedHeight =
    Math.ceil(full.height * 0.8) - Math.floor(full.height * 0.25);

  expect(after.width).toBeGreaterThan(before.width);
  expect(after.height).toBeGreaterThan(before.height);
  expect(Math.abs(after.width - expectedWidth)).toBeLessThanOrEqual(3);
  expect(Math.abs(after.height - expectedHeight)).toBeLessThanOrEqual(3);
});

test("includes annotations in the exported PNG", async ({ page }) => {
  await openDemo(page);
  await startCapture(page);

  const plain = await downloadPng(page);

  await page.keyboard.press("a");
  await expect(page.locator('[data-tool="arrow"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const box = await page.locator("#snapshot-canvas").boundingBox();
  if (!box) throw new Error("The snapshot canvas has no bounding box.");
  await drag(
    page,
    { x: box.x + box.width * 0.3, y: box.y + box.height * 0.4 },
    { x: box.x + box.width * 0.7, y: box.y + box.height * 0.6 },
  );
  await expect(page.locator("#live-region")).toHaveText("Arrow added.");

  const marked = await downloadPng(page);

  expect({ width: marked.width, height: marked.height }).toEqual({
    width: plain.width,
    height: plain.height,
  });
  expect(sameBytes(marked.bytes, plain.bytes)).toBe(false);
});

test("keyboard shortcuts capture, choose a tool, and exit", async ({
  page,
}) => {
  await openDemo(page);

  await page.keyboard.press("c");
  await expect(page.locator("#status-text")).toHaveText("Captured");

  await page.keyboard.press("a");
  await expect(page.locator('[data-tool="arrow"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.keyboard.press("Escape");
  await expect(page.locator("#status-text")).toHaveText("Live preview");
  await expect(page.locator("#toolbar")).toBeHidden();
  await expect(page.locator("#shutter")).toBeVisible();
});

test("downloads instead when the clipboard write is blocked", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "clipboard", {
      configurable: true,
      get: () => ({
        write: () =>
          Promise.reject(
            new DOMException("Clipboard blocked in test", "NotAllowedError"),
          ),
      }),
    });
  });

  await openDemo(page);
  await startCapture(page);

  const pending = page.waitForEvent("download");
  await page.locator("#copy-button").click();
  const download = await pending;

  expect(download.suggestedFilename()).toMatch(/^capture-.*\.png$/);
  await expect(page.locator("#toast-message")).toHaveText(
    "Clipboard blocked. Downloaded instead.",
  );
});
