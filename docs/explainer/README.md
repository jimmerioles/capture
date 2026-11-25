# Capture, explained

A 3:09 film about one shutter press. It is built at 1920 × 1080, 30 fps, H.264 with AAC audio, and mixed to -16 LUFS.

The MP4 is a build artifact and is not committed. The README player is a GitHub user attachment, and the [explainer-v1 release](https://github.com/jimmerioles/capture/releases/tag/explainer-v1) carries the download.

The current master opens on the poster frame for 2.5 seconds, crossfades for 0.5 seconds, then continues with the original film at 2.5 seconds. Audio stays at zero, so the duration and chapter timings are unchanged.

## Chapters

| Time | Chapter |
| --- | --- |
| 0:01 | The page is the screenshot |
| 0:17 | The freeze |
| 0:38 | The selection |
| 0:55 | Three marks |
| 1:15 | The clean copy |
| 1:37 | Made from scratch |
| 2:00 | The clock |
| 2:17 | Nothing to download |
| 2:38 | The quiet defaults |
| 2:54 | The page is the screenshot |

## Production

- Voice: Kokoro `af_heart`, fallback `af_bella`.
- Score: the house `tech` bed by Vincent Schmalbach, MIT licensed.
- Picture: real prototype captures at 2×, animated in Canvas, with diagrams and chapter cards.
- Verification: video format, audio format, chapter starts, loudness, true peak, and a golden frame.
- The companion script and verification report are generated into `build/`.

## Source files

| File | Role |
| --- | --- |
| `config.json` | Title, voice, accent, music bed, capture target, verify frame |
| `script.json` | Ten chapters, one idea each |
| `scenes.js` | Diagrams, chapter cards, and the cut |
| `capture.mjs` | Real captures of the page at 2× |
| `assets.js` | Generated capture assets |
| `music.m4a` | The score |
| `poster.jpg` | The 1920 × 1080 poster frame |

## Rebuild

Rebuild with [explainer-kit](https://github.com/jimmerioles/explainer-kit) 1.1.0. The capture step reads the live page, so keep the dev server running on port 5173 in one shell:

```bash
npm run dev -- --port 5173
```

Then build the film in another shell:

```bash
KIT=~/Work/jimmerioles/explainer-kit
node $KIT/bin/explainer.mjs narrate
node $KIT/bin/explainer.mjs capture
node $KIT/bin/explainer.mjs stills
node $KIT/bin/explainer.mjs golden
node $KIT/bin/explainer.mjs render
node $KIT/bin/explainer.mjs mix
node $KIT/bin/explainer.mjs master
node $KIT/bin/explainer.mjs verify
```

Set `CAPTURE_URL` if the dev server runs on a different port.
