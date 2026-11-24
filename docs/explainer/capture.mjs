// Capture hook for Capture. Grabs the page at the beats the film needs:
// live, frozen, selected, annotated, exported, and the phone layout.
//
// A fresh context with deviceScaleFactor 2 gives the page a real 2x pixel
// ratio. The canvas backing store and every screenshot then carry the same
// high-density pixels the product actually captures.
export default async function capture({ page, config, out }) {
  const browser = page.context().browser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    acceptDownloads: true,
  });
  const shotPage = await context.newPage();

  try {
    const url = process.env.CAPTURE_URL ?? config.capture.url;
    await shotPage.goto(url, { waitUntil: "networkidle" });
    await shotPage.evaluate(() => document.fonts.ready);
    await shotPage.waitForTimeout(1200);

    const shot = async (selector, name) => {
      await shotPage.locator(selector).screenshot({ path: `${out}/${name}` });
    };

    await shot("body", "page-idle.png");
    await shot("#capture-station", "station-idle.png");
    await shot("#stage", "stage-idle.png");
    await shot("#live-canvas", "bitmap.png");

    // The shutter. Hide the transient drag hint so the editor stills show the
    // product, not the onboarding toast.
    await shotPage.locator("#shutter").click();
    await shotPage.waitForTimeout(700);
    await shotPage.evaluate(() => {
      const prompt = document.querySelector("#capture-prompt");
      if (prompt) prompt.hidden = true;
    });
    await shotPage.waitForTimeout(250);
    await shot("#stage", "stage-frozen.png");
    await shot("#capture-station", "station-frozen.png");

    // Select the chart and the review notes.
    const stage = await shotPage.locator("#stage").boundingBox();
    if (!stage) throw new Error("Capture: no stage box");
    const point = (nx, ny) => ({
      x: stage.x + stage.width * nx,
      y: stage.y + stage.height * ny,
    });
    const drag = async (a, b, steps = 24) => {
      const from = point(a[0], a[1]);
      const to = point(b[0], b[1]);
      await shotPage.mouse.move(from.x, from.y);
      await shotPage.mouse.down();
      await shotPage.mouse.move(to.x, to.y, { steps });
      await shotPage.mouse.up();
      await shotPage.waitForTimeout(420);
    };

    await drag([0.26, 0.5], [0.975, 0.94]);
    await shot("#stage", "stage-selected.png");
    await shot("#capture-station", "station-selected.png");

    // Arrow to the chart peak. Start above the toolbar so the canvas gets it.
    await shotPage.locator('[data-tool="arrow"]').click();
    await drag([0.38, 0.85], [0.55, 0.65], 12);
    await shot("#stage", "stage-arrow.png");

    // Box around the review note that mentions an email.
    await shotPage.locator('[data-tool="box"]').click();
    await drag([0.755, 0.58], [0.975, 0.70], 12);
    await shot("#stage", "stage-box.png");

    // Blur the email line inside the note.
    await shotPage.locator('[data-tool="blur"]').click();
    await drag([0.775, 0.612], [0.965, 0.675], 10);
    await shotPage.waitForTimeout(500);
    await shot("#stage", "stage-annotated.png");
    await shot("#capture-station", "station-annotated.png");
    await shot("#toolbar", "toolbar.png");

    // The real export. This is the clean crop, not the display canvas.
    const downloadPromise = shotPage.waitForEvent("download");
    await shotPage.locator("#download-button").click();
    const download = await downloadPromise;
    await download.saveAs(`${out}/export.png`);
    await shotPage.waitForTimeout(500);

    // The phone layout.
    await shotPage.setViewportSize({ width: 390, height: 844 });
    await shotPage.reload({ waitUntil: "networkidle" });
    await shotPage.evaluate(() => document.fonts.ready);
    await shotPage.waitForTimeout(900);
    await shot("body", "page-mobile.png");
    await shot("#capture-station", "station-mobile.png");
  } finally {
    await context.close();
  }

  return [
    "page-idle.png",
    "station-idle.png",
    "stage-idle.png",
    "bitmap.png",
    "stage-frozen.png",
    "station-frozen.png",
    "stage-selected.png",
    "station-selected.png",
    "stage-arrow.png",
    "stage-box.png",
    "stage-annotated.png",
    "station-annotated.png",
    "toolbar.png",
    "export.png",
    "page-mobile.png",
    "station-mobile.png",
  ];
}
