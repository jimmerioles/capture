# Architecture

Capture is a static Vite app with one page and no runtime framework. The interesting part is the handoff between a live canvas, a frozen bitmap, and an export canvas.

## Capture flow

1. `PreviewRenderer` draws the fictional Northstar analytics UI into `#live-canvas` at up to 2.5× device pixel ratio. It targets roughly 30 fps, pauses when the tab is hidden or the canvas leaves the viewport, and renders a static frame under reduced motion.
2. `startCapture()` in `src/main.ts` refreshes the preview, stops the live loop, and passes `#live-canvas` to `CaptureEditor.beginCapture()`.
3. `CaptureEditor` copies the live pixels into an offscreen frozen canvas at their full backing-store size. Selection and annotation geometry is stored in normalized 0..1 coordinates.
4. `buildExportCanvas()` paints the frozen bitmap and annotations into a clean canvas, crops to the selection if one exists, and returns it. Copy and Download encode that canvas as a PNG.

## Files

| File | Role |
| --- | --- |
| `src/preview.ts` | The canvas-drawn Northstar app, ambient animation, and visibility-aware animation loop. |
| `src/editor.ts` | Capture state, normalized selection geometry, annotation drawing, mosaic blur, and native-resolution PNG composition. |
| `src/audio.ts` | The Web Audio shutter, chime, and error sounds, plus mute state. |
| `src/main.ts` | DOM wiring, shutter and reset flow, clipboard and download handling, toasts, dialog, keyboard shortcuts, and accessibility announcements. |
| `src/style.css` | Layout, identity, physical shutter, crop marks, glass toolbar, responsive rules, and reduced-motion treatment. |

## Rendering and export

Display canvases are sized in CSS pixels and backed by DPR-scaled bitmaps. The display is a composition of the frozen image, a dimming veil, the selected cutout, annotations, and selection chrome. Export skips the veil and chrome and paints only the frozen image plus annotations.

Blur is a downsample/upscale mosaic built from the frozen bitmap, so it cannot reveal pixels outside the capture. Arrows, boxes, and blur regions all use the same normalized geometry as the selection, which lets the editor survive viewport changes without recapturing.

The stage chrome shows the backing-store size and effective DPR. The live preview and snapshot are separate canvases, so the frozen image stays intact while the live layer is hidden.

## Sound and accessibility

All audio is synthesized with the Web Audio API. The `AudioContext` is created inside a user gesture, and the mute preference is stored in `localStorage`.

The shutter is a real button, the toolbar supports arrow-key navigation, and an `aria-live` region announces captures, selections, and annotations. Reduced-motion mode removes the flash, shake, and entrance animations while keeping every selection and annotation tool available.

## Known limits

- Resizing the browser during a capture stretches the frozen bitmap to the new stage aspect.
- There is no per-mark undo. Reset discards the whole capture.
- The prototype captures its own canvas, not the full page or the OS.
- Image clipboard support varies by browser and requires a secure context.
