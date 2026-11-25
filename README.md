<div align="center">

https://github.com/user-attachments/assets/fba03b95-8b0f-4b64-9eef-cec0216a7a8a

[![Tests](https://github.com/jimmerioles/capture/actions/workflows/test.yml/badge.svg)](https://github.com/jimmerioles/capture/actions/workflows/test.yml) [![Deploy to GitHub Pages](https://github.com/jimmerioles/capture/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/jimmerioles/capture/actions/workflows/deploy-pages.yml)

**Live demo:** https://jimmerioles.github.io/capture/

**Case study:** https://jimmerioles.github.io/capture/case-study/

</div>

# Capture

**The page is the screenshot.** A screenshot and annotation prototype whose demo captures itself.

Capture is one screen with a live, canvas-drawn analytics app. Press the shutter and that drawing freezes into a real bitmap; drag a selection, add arrows, boxes, or pixel blur, then copy or download a clean PNG. It is for people who want a fast, local capture tool inside the page, not another extension or upload flow.

## What makes it different

- **The demo is the subject.** Northstar, the analytics app in the preview, is drawn in Canvas 2D. The shutter copies its actual pixels at device resolution, so the capture is real.
- **The edit happens in place.** The live layer fades, the frozen bitmap takes over, and the selection tools appear on the same stage.
- **Exports use source pixels.** Copy and Download composite from the frozen bitmap, not the scaled display canvas. A selection crops to its bounds.
- **Three marks, one gesture.** Arrow, box, and pixel blur. No account, no upload, no detour.
- **Local by default.** The app has no server. If the clipboard blocks an image write, Copy downloads the PNG instead and says so.
- **Sound after intent.** The shutter and copy chime are synthesized with Web Audio after you interact. Mute is remembered.
- **Keyboard and reduced motion.** `C` captures, tool shortcuts work, and reduced-motion mode swaps the flash and shake for a simple fade.
- **Phone-sized.** The layout stacks and the canvas keeps touch dragging at 390 × 844.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check and build to dist/
npm run preview  # serve the production build
```

## Use it

| Action | Control |
| --- | --- |
| Capture | Click the shutter or press `C` |
| Select | Drag on the frozen image; resize with any of the eight handles |
| Tools | `V` select, `A` arrow, `R` box, `B` blur |
| Copy | Writes the selection or full capture as PNG, or downloads it if the clipboard is blocked |
| Download | Saves the selection or full capture as PNG |
| Exit | `Esc`, Reset, or Exit |

The header has a sound toggle and an in-page changelog; its Download link is a placeholder for a desktop app. On phones the toolbar becomes icon-only.

## How it works

A DPR-scaled Canvas 2D scene, a frozen bitmap copied from it, and a second canvas for selection and marks. Export paints the frozen bitmap and annotations into a clean canvas at native resolution, cropping if there is a selection. See [ARCHITECTURE.md](ARCHITECTURE.md) for the file map and coordinate model.

## Tests

- `npm test` runs the Vitest suite for selection geometry, resize handles, and export crop bounds.
- `npm run test:e2e` runs the Playwright flows in Chromium: full capture, selection crop and resize, annotation export, keyboard shortcuts, and clipboard fallback. The first run needs `npx playwright install chromium`; the suite starts its own Vite server on port 4273.
- `npm run build` runs the TypeScript check.

## Limits

- This prototype captures its own canvas, not the full page or the OS.
- There is no undo or redo yet; Reset discards the whole capture.
- Text callouts, movable annotations, and color choices are not implemented.
- Resizing during a capture stretches the frozen bitmap to the new stage aspect.
- Copy needs the Async Clipboard API and a secure context; behavior varies by browser.

## Credits and license

Built by [Jim Merioles](https://github.com/jimmerioles). UI fonts are Inter and JetBrains Mono from Google Fonts. The explainer score is "tech" by Vincent Schmalbach, MIT licensed. No other third-party code, images, or audio.

Explainer production notes live in [docs/explainer/](docs/explainer/). There is no license file for the project yet; open an issue before reusing the code.
