// Capture, explained.
//
// The argument: a page can be its own screenshot. The film follows one
// shutter press through a canvas, a frozen bitmap, a selection, three vector
// marks, a native-resolution export, and the quiet machinery underneath.

import {
  W,
  H,
  M,
  ctx,
  C,
  F,
  clamp,
  lerp,
  smooth,
  easeOut,
  easeInOut,
  span,
  pulse,
  withAlpha,
  font,
  text,
  label,
  paragraph,
  revealText,
  panel,
  rrect,
  line,
  curve,
  arrow,
  dot,
  ring,
  glow,
  image,
  imageCrop,
  drawWaveforms,
  sceneLabel,
} from "/kit/render/helpers.js";

const T = {
  display: 96,
  title: 64,
  body: 32,
  caption: 24,
  label: 18,
  chrome: 14,
};

const TAU = Math.PI * 2;

// timing

function times(sc) {
  return sc.seg.sentences.map((s) => ({
    start: s.start - sc.start,
    end: s.end - sc.start,
    dur: s.duration,
    text: s.text,
  }));
}

function head(sc, lt) {
  const dur = sc.end - sc.start;
  const p = smooth(span(lt, 0.25, 0.85)) * (1 - smooth(span(lt, dur - 0.5, dur - 0.1)));
  sceneLabel(sc.seg.title ?? sc.id, M.x, M.top, p);
}

// type

function kicker(str, x, y, color = C.coral, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  dot(x + 3, y - 5, 3.2, color, 1, 10);
  ctx.restore();
  text(str.toUpperCase(), x + 17, y, {
    size: T.chrome,
    family: F.mono,
    color: C.dim,
    ls: 2.7,
    alpha,
  });
}

function mono(str, x, y, opts = {}) {
  text(str, x, y, { size: T.label, family: F.mono, color: C.dim, ...opts });
}

function statement(str, x, y, alpha = 1, size = T.title, color = C.ink) {
  text(str, x, y, { size, weight: 500, color, alpha, ls: -1.6 });
}

function body(str, x, y, w, alpha = 1, color = C.dim) {
  return paragraph(str, x, y, w, {
    size: T.body,
    lineHeight: 46,
    color,
    alpha,
  });
}

function chip(str, x, y, color = C.coral, alpha = 1, opts = {}) {
  const { align = "left", size = T.chrome, fill = true } = opts;
  font(size, 400, F.mono);
  ctx.letterSpacing = "2px";
  const w = ctx.measureText(str.toUpperCase()).width + 26;
  const px = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (fill) {
    rrect(px, y - size - 7, w, size + 16, 999);
    ctx.fillStyle = withAlpha(color, 0.09);
    ctx.fill();
    ctx.strokeStyle = withAlpha(color, 0.34);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  text(str.toUpperCase(), px + 13, y, { size, family: F.mono, color, ls: 2 });
  ctx.restore();
  return w;
}

function dottedRule(x1, y1, x2, y2, color = C.line, alpha = 1) {
  line(x1, y1, x2, y2, color, 1, [3, 6], alpha);
}

// objects

function frame(x, y, w, h, opts = {}) {
  const { r = 16, alpha = 1, color = C.coral, glowA = 0.13 } = opts;
  ctx.save();
  ctx.globalAlpha *= alpha;
  glow(x + w / 2, y + h / 2, Math.max(w, h) * 0.6, color, glowA);
  panel(x - 6, y - 6, w + 12, h + 12, {
    r: r + 6,
    fill: "rgba(8,12,24,0.5)",
    stroke: withAlpha(color, 0.18),
    lw: 1.2,
  });
  ctx.restore();
}

function shot(name, x, y, w, h, alpha = 1, opts = {}) {
  const { r = 14, color = C.coral, glowA = 0.12, zoom = 1 } = opts;
  if (alpha <= 0.001) return;
  frame(x, y, w, h, { r, alpha, color, glowA });
  image(name, x, y, w, h, alpha, r, zoom);
}

function cropMarks(x, y, w, h, color = C.coral, alpha = 1, size = 26, lw = 1.4) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  const c = size;
  const points = [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ];
  for (const [px, py, sx, sy] of points) {
    ctx.beginPath();
    ctx.moveTo(px + sx * c, py);
    ctx.lineTo(px, py);
    ctx.lineTo(px, py + sy * c);
    ctx.stroke();
  }
  ctx.restore();
}

function cursor(x, y, alpha = 1, scale = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 30);
  ctx.lineTo(8, 23);
  ctx.lineTo(14, 36);
  ctx.lineTo(20, 33);
  ctx.lineTo(14, 21);
  ctx.lineTo(24, 20);
  ctx.closePath();
  ctx.fillStyle = "#f4f1ea";
  ctx.fill();
  ctx.strokeStyle = "rgba(7,10,21,0.85)";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
}

function shutterButton(x, y, r, p = 0, alpha = 1) {
  const s = 1 - 0.055 * p;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.translate(-x, -y + 2 * p);
  glow(x, y, r * 1.9, C.coral, 0.12 + 0.08 * p);
  dot(x, y, r, "rgba(8,17,31,0.9)", 1);
  ring(x, y, r, withAlpha(C.coral, 0.3), 1.4);
  ring(x, y, r * 0.87, withAlpha(C.coral, 0.18), 1, 1, [3, 7]);
  const cap = ctx.createLinearGradient(x - r * 0.6, y - r * 0.7, x + r * 0.5, y + r * 0.7);
  cap.addColorStop(0, "#f2fdff");
  cap.addColorStop(0.45, "#b9f0ff");
  cap.addColorStop(1, "#77d8fa");
  ctx.beginPath();
  ctx.arc(x, y, r * 0.7, 0, TAU);
  ctx.fillStyle = cap;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // crop glyph
  ctx.strokeStyle = "#071725";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  const g = r * 0.31;
  ctx.beginPath();
  ctx.moveTo(x - g * 0.78, y - g * 0.35);
  ctx.lineTo(x - g * 0.78, y - g * 0.78);
  ctx.lineTo(x - g * 0.35, y - g * 0.78);
  ctx.moveTo(x + g * 0.35, y - g * 0.78);
  ctx.lineTo(x + g * 0.78, y - g * 0.78);
  ctx.lineTo(x + g * 0.78, y - g * 0.35);
  ctx.moveTo(x + g * 0.78, y + g * 0.35);
  ctx.lineTo(x + g * 0.78, y + g * 0.78);
  ctx.lineTo(x + g * 0.35, y + g * 0.78);
  ctx.moveTo(x - g * 0.35, y + g * 0.78);
  ctx.lineTo(x - g * 0.78, y + g * 0.78);
  ctx.lineTo(x - g * 0.78, y + g * 0.35);
  ctx.stroke();
  dot(x, y, 2.5, "#071725", 1);
  ctx.restore();
}

function minimap(x, y, w, h, opts = {}) {
  const {
    alpha = 1,
    selection = null,
    handles = false,
    color = C.coral,
    labelText = null,
    tag = null,
  } = opts;
  ctx.save();
  ctx.globalAlpha *= alpha;
  panel(x, y, w, h, {
    r: 10,
    fill: "rgba(7,12,24,0.9)",
    stroke: "rgba(139,177,242,0.16)",
    lw: 1,
  });
  // sidebar
  ctx.fillStyle = "rgba(4,9,18,0.7)";
  ctx.fillRect(x, y, w * 0.15, h);
  line(x + w * 0.15, y, x + w * 0.15, y + h, "rgba(139,177,242,0.12)", 1, null, 1);
  // chart panel
  const cx = x + w * 0.19;
  const cy = y + h * 0.29;
  const cw = w * 0.47;
  const ch = h * 0.57;
  panel(cx, cy, cw, ch, {
    r: 5,
    fill: "rgba(15,26,45,0.85)",
    stroke: "rgba(139,177,242,0.12)",
    lw: 1,
    alpha: 1,
  });
  const pts = [];
  for (let i = 0; i <= 30; i++) {
    const p = i / 30;
    const v = 0.3 + 0.5 * p + Math.sin(p * 7.2) * 0.13 + Math.sin(p * 17) * 0.04;
    pts.push([cx + cw * 0.08 + p * cw * 0.84, cy + ch * 0.82 - v * ch * 0.58]);
  }
  curve(pts, withAlpha(C.coral, 0.85), 1.6, 1);
  // notes panel
  panel(x + w * 0.69, cy, w * 0.27, ch, {
    r: 5,
    fill: "rgba(15,26,45,0.85)",
    stroke: "rgba(139,177,242,0.12)",
    lw: 1,
    alpha: 1,
  });
  for (let i = 0; i < 3; i++) {
    line(
      x + w * 0.705,
      cy + ch * (0.2 + i * 0.2),
      x + w * 0.945,
      cy + ch * (0.2 + i * 0.2),
      "rgba(189,204,225,0.22)",
      1,
      null,
      1,
    );
  }
  // selection
  if (selection) {
    const sx = x + selection.x * w;
    const sy = y + selection.y * h;
    const sw = selection.w * w;
    const sh = selection.h * h;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 1.4;
    rrect(sx, sy, sw, sh, 1);
    ctx.stroke();
    if (handles) {
      for (const [hx, hy] of [
        [sx, sy],
        [sx + sw / 2, sy],
        [sx + sw, sy],
        [sx + sw, sy + sh / 2],
        [sx + sw, sy + sh],
        [sx + sw / 2, sy + sh],
        [sx, sy + sh],
        [sx, sy + sh / 2],
      ]) {
        ctx.fillStyle = "#f4fdff";
        ctx.strokeStyle = "rgba(4,10,18,0.8)";
        ctx.lineWidth = 1;
        rrect(hx - 3.5, hy - 3.5, 7, 7, 1.2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
    if (tag) {
      font(T.chrome, 400, F.mono);
      const tw = ctx.measureText(tag).width + 16;
      const tx = clamp(sx, x + 4, x + w - tw - 4);
      const ty = clamp(sy - 26, y + 4, y + h - 24);
      rrect(tx, ty, tw, 22, 4);
      ctx.fillStyle = "rgba(235,251,255,0.94)";
      ctx.fill();
      text(tag, tx + 8, ty + 15, { size: T.chrome, family: F.mono, color: "#071725" });
    }
  }
  // labels
  if (labelText) {
    text(labelText, x + w / 2, y + h + 24, {
      size: T.chrome,
      family: F.mono,
      color: C.faint,
      align: "center",
      ls: 1.8,
      alpha: 1,
    });
  }
  ctx.restore();
}

// audio traces

function hashNoise(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

function trace(x, y, w, h, sampler, color, opts = {}) {
  const { lw = 2, alpha = 1, progress = 1, dash = null, fill = false } = opts;
  const n = Math.max(2, Math.round(w));
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath();
  const pts = [];
  for (let i = 0; i <= n; i++) {
    if (i / n > progress) break;
    const p = i / n;
    const v = clamp(sampler(p), -1.4, 1.4);
    const px = x + p * w;
    const py = y + h / 2 - v * h * 0.42;
    pts.push([px, py]);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  if (fill && pts.length > 2) {
    ctx.lineTo(pts[pts.length - 1][0], y + h / 2);
    ctx.lineTo(pts[0][0], y + h / 2);
    ctx.closePath();
    ctx.fillStyle = withAlpha(color, 0.08);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (dash) ctx.setLineDash(dash);
  ctx.stroke();
  ctx.restore();
  return pts;
}

function noiseBurst(p) {
  const env = Math.exp(-p * 7) * (1 - Math.exp(-p * 80));
  return (hashNoise(p * 930) * 0.6 + hashNoise(p * 311) * 0.3) * env;
}

function thump(p) {
  return Math.sin(p * TAU * 12) * Math.exp(-p * 8) * 0.85;
}

function click(p) {
  const env = Math.exp(-p * 45);
  return (hashNoise(p * 1400) * 0.8 + Math.sin(p * TAU * 40) * 0.2) * env;
}

function chimeNote(p, cycles = 9) {
  const env = Math.exp(-p * 3.2) * (1 - Math.exp(-p * 60));
  return Math.sin(p * TAU * cycles) * env;
}

function errorTone(p) {
  const env = Math.min(1, p * 12) * Math.exp(-Math.max(0, p - 0.2) * 3.4);
  const freq = 10 - p * 3.5;
  return Math.sin(p * TAU * freq) * env * 0.8;
}

// scene 01

function coldOpen(lt, sc) {
  const s = times(sc);
  head(sc, lt);

  const intro = smooth(span(lt, 0.15, 1.15));
  const pageIn = smooth(span(lt, 0.3, 1.4));
  const liveIn = smooth(span(lt, s[1].start - 0.25, s[1].start + 0.95));
  const shutterIn = smooth(span(lt, s[2].start - 0.45, s[2].start + 0.35));
  const shootP = smooth(span(lt, s[2].start + 0.2, s[2].start + 0.42)) *
    (1 - smooth(span(lt, s[2].start + 0.46, s[2].start + 0.82)));
  const frozenP = smooth(span(lt, s[2].start + 0.5, s[2].start + 1.1));
  const markingP = smooth(span(lt, s[3].start - 0.3, s[3].start + 0.9));
  const flash = smooth(span(lt, s[2].start + 0.2, s[2].start + 0.31)) *
    (1 - smooth(span(lt, s[2].start + 0.31, s[2].start + 0.95)));

  // left argument
  kicker("capture / prototype 01", M.x, 168, C.coral, intro);
  const lines = [
    ["The page", C.ink, s[0].start + 0.05],
    ["is the", C.ink, s[0].start + 0.18],
    ["screenshot.", C.coral, s[0].start + 0.31],
  ];
  lines.forEach(([str, color, at], i) => {
    const p = smooth(span(lt, at, at + 0.9));
    revealText(str, M.x, 300 + i * 92, p, {
      size: T.display,
      weight: 500,
      color,
      ls: -4.5,
    });
  });
  body("A screenshot tool whose demo captures itself.", M.x, 590, 520, intro * 0.95, C.dim);
  const firstBeat = smooth(span(lt, s[0].start + 2.1, s[0].start + 2.8));
  if (firstBeat > 0) {
    const items = [
      ["one shutter", C.coral],
      ["zero uploads", C.mint],
      ["all local", C.peach],
    ];
    items.forEach(([str, color], i) => {
      chip(str, M.x + i * 178, 704, color, firstBeat * (1 - markingP * 0.4), {
        fill: false,
      });
    });
  }

  // the page as an object, then the live stage
  const px = 900;
  const py = 118;
  const pw = 820;
  const ph = 512;
  if (pageIn > 0) {
    shot("page", px, py, pw, ph, pageIn * (1 - liveIn), {
      color: C.coral,
      glowA: 0.14,
      r: 16,
    });
    cropMarks(px, py, pw, ph, C.coral, pageIn * (1 - liveIn), 22);
    text("CAPTURE / LANDING PAGE", px, py - 20, {
      size: T.chrome,
      family: F.mono,
      color: C.dim,
      ls: 2,
      alpha: pageIn * (1 - liveIn),
    });
    text("1440 × 900", px + pw, py - 20, {
      size: T.chrome,
      family: F.mono,
      color: C.faint,
      align: "right",
      alpha: pageIn * (1 - liveIn),
    });
  }

  const sx = 848;
  const sy = 160;
  const sw = 926;
  const sh = 578;
  if (liveIn > 0) {
    const baseAlpha = liveIn * (1 - frozenP);
    const frozenAlpha = liveIn * frozenP;
    shot("stage", sx, sy, sw, sh, baseAlpha, { color: C.coral, glowA: 0.13 });
    shot("stageFrozen", sx, sy, sw, sh, frozenAlpha, { color: C.coral, glowA: 0.13 });
    shot("selected", sx, sy, sw, sh, liveIn * markingP, { color: C.coral, glowA: 0.16 });
    cropMarks(sx, sy, sw, sh, C.coral, liveIn * 0.85, 22, 1.2);

    const tagP = liveIn;
    text(markingP > 0.2 ? "NORTHSTAR / EDITING" : frozenP > 0.2 ? "NORTHSTAR / FROZEN" : "NORTHSTAR / LIVE PREVIEW", sx, sy - 20, {
      size: T.chrome,
      family: F.mono,
      color: C.dim,
      ls: 2,
      alpha: tagP,
    });
    const fps = markingP > 0.2 ? "EDIT" : frozenP > 0.2 ? "0 FPS" : "30 FPS";
    text(fps, sx + sw, sy - 20, {
      size: T.chrome,
      family: F.mono,
      color: frozenP > 0.2 ? C.faint : C.coral,
      align: "right",
      ls: 2,
      alpha: tagP,
    });

    // selection handles glow after the freeze
    if (markingP > 0) {
      const rx = sx + 0.073 * sw;
      const ry = sy + 0.5 * sh;
      const rw = 0.902 * sw;
      const rh = 0.44 * sh;
      ctx.save();
      ctx.globalAlpha *= markingP;
      ctx.strokeStyle = withAlpha(C.coral, 0.55);
      ctx.lineWidth = 1.6;
      rrect(rx, ry, rw, rh, 1);
      ctx.stroke();
      ctx.restore();
      chip("selected · 1022 × 393", rx + 14, ry - 18, C.coral, markingP);
    }
  }

  // the shutter, below the stage
  if (shutterIn > 0) {
    const bx = 748;
    const by = 846;
    shutterButton(bx, by, 54, shootP, shutterIn);
    mono("press C", bx, by + 92, {
      size: T.chrome,
      color: C.faint,
      align: "center",
      ls: 2,
      alpha: shutterIn * (1 - markingP * 0.7),
    });
    const cur = smooth(span(lt, s[2].start - 0.2, s[2].start + 0.3));
    cursor(bx + 34 - 10 * cur, by + 38 - 8 * cur, cur * (1 - markingP), 0.9);
  }

  // flash
  if (flash > 0) {
    ctx.save();
    ctx.globalAlpha *= flash;
    ctx.fillStyle = "#e9fbff";
    rrect(sx, sy, sw, sh, 14);
    ctx.fill();
    glow(sx + sw / 2, sy + sh / 2, sw * 0.5, "#bff5ff", 0.5);
    ctx.restore();
  }

  // a quiet closing line on the left
  const closeP = smooth(span(lt, s[3].start, s[3].start + 0.8));
  if (closeP > 0) {
    line(M.x, 762, M.x + 340 * closeP, 762, withAlpha(C.coral, 0.34), 1.2);
    mono("no tabs · no detours", M.x, 796, {
      size: T.chrome,
      color: C.faint,
      ls: 2,
      alpha: closeP * 0.9,
    });
  }
}

// scene 02

function freeze(lt, sc) {
  const s = times(sc);
  head(sc, lt);

  const leftIn = smooth(span(lt, 0.2, 1.0));
  const copyP = smooth(span(lt, s[2].start, s[2].start + 1.5));
  const scaleP = smooth(span(lt, s[3].start, s[3].start + 1.1));
  const moveP = easeInOut(span(lt, s[4].start - 0.1, s[4].start + 1.25));
  const leftOut = 1 - smooth(span(lt, s[4].start, s[4].start + 0.7));

  statement("Not", M.x, 250, leftIn * leftOut, T.title);
  statement("an image.", M.x, 318, leftIn * leftOut, T.title, C.coral);
  body("A live canvas, painted thirty times a second.", M.x, 386, 470, leftIn * leftOut);
  mono("CANVAS 2D / DPR AWARE", M.x, 486, {
    size: T.chrome,
    color: C.faint,
    ls: 2,
    alpha: leftIn * leftOut,
  });

  const fpsIn = smooth(span(lt, s[1].start - 0.2, s[1].start + 0.7));
  if (fpsIn > 0) {
    text("30", M.x, 660, {
      size: T.display,
      weight: 500,
      color: C.coral,
      alpha: fpsIn * leftOut,
      ls: -4,
    });
    mono("frames / second", M.x + 8, 700, {
      size: T.chrome,
      color: C.faint,
      ls: 2,
      alpha: fpsIn * leftOut,
    });
    ring(M.x + 250, 630, 44, withAlpha(C.coral, 0.14), 1, fpsIn * leftOut);
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * TAU - Math.PI / 2;
      const lit = (i / 30) <= ((lt * 0.55) % 1);
      dot(M.x + 250 + Math.cos(a) * 44, 630 + Math.sin(a) * 44, lit ? 2.6 : 1.4, lit ? C.coral : C.faint, fpsIn * leftOut * (lit ? 1 : 0.5));
    }
  }

  const liveX = 640;
  const liveY = 190;
  const liveW = 480;
  const liveH = 300;
  const frozenX = 1280;
  const frozenY = 190;
  const frozenW = 480;
  const frozenH = 300;

  const liveTag = smooth(span(lt, s[0].start, s[0].start + 0.6));
  if (liveTag > 0) {
    shot("stage", liveX, liveY, liveW, liveH, liveTag * (1 - moveP), {
      color: C.coral,
      glowA: 0.11,
      r: 12,
    });
    text("LIVE CANVAS", liveX, liveY - 18, {
      size: T.chrome,
      family: F.mono,
      color: C.dim,
      ls: 2,
      alpha: liveTag * (1 - moveP),
    });
    text("30 FPS", liveX + liveW, liveY - 18, {
      size: T.chrome,
      family: F.mono,
      color: C.coral,
      align: "right",
      ls: 2,
      alpha: liveTag * (1 - moveP),
    });
    // frame ticks around the live object
    if (fpsIn > 0) {
      ctx.save();
      ctx.globalAlpha *= fpsIn * (1 - moveP) * 0.55;
      for (let i = 0; i < 30; i++) {
        const p = i / 30;
        const x = liveX + p * liveW;
        line(x, liveY - 7, x, liveY - 3, C.coral, 1.2);
        line(x, liveY + liveH + 3, x, liveY + liveH + 7, C.coral, 1.2);
      }
      ctx.restore();
    }
  }

  // the copy beam
  if (copyP > 0) {
    const midY = liveY + liveH / 2;
    arrow(liveX + liveW + 22, midY, frozenX - 26, midY, withAlpha(C.coral, 0.55), 1.4, 9, copyP);
    const labelP = smooth(span(lt, s[2].start + 0.4, s[2].start + 1.0));
    text("copy pixels", liveX + liveW + 82, midY - 22, {
      size: T.chrome,
      family: F.mono,
      color: C.coral,
      align: "center",
      alpha: labelP,
    });
    // pixel packets
    for (let i = 0; i < 14; i++) {
      const t = ((lt * 0.38 + i * 0.071) % 1);
      const px = lerp(liveX + liveW + 20, frozenX - 24, t);
      const py = midY + Math.sin(i * 2.1 + lt * 3) * 18 * (1 - Math.abs(t - 0.5) * 2);
      dot(px, py, 1.6 + (i % 3) * 0.7, i % 2 ? C.coral : C.cyan, copyP * (1 - Math.abs(t - 0.5) * 1.4));
    }
  }

  const freezeP = smooth(span(lt, s[2].start + 0.5, s[2].start + 1.4));
  if (freezeP > 0) {
    shot("frozen", frozenX, frozenY, frozenW, frozenH, freezeP * (1 - moveP), {
      color: C.coral,
      glowA: 0.12,
      r: 12,
    });
    text("FROZEN BITMAP", frozenX, frozenY - 18, {
      size: T.chrome,
      family: F.mono,
      color: C.dim,
      ls: 2,
      alpha: freezeP * (1 - moveP),
    });
    text("0 FPS", frozenX + frozenW, frozenY - 18, {
      size: T.chrome,
      family: F.mono,
      color: C.faint,
      align: "right",
      ls: 2,
      alpha: freezeP * (1 - moveP),
    });
    // a fine bitmap grid
    ctx.save();
    ctx.globalAlpha *= freezeP * (1 - moveP) * 0.16;
    for (let x = frozenX; x < frozenX + frozenW; x += 11) {
      line(x, frozenY, x, frozenY + frozenH, C.coral, 1);
    }
    for (let y = frozenY; y < frozenY + frozenH; y += 11) {
      line(frozenX, y, frozenX + frozenW, y, C.coral, 1);
    }
    ctx.restore();
  }

  // dimensions
  const dimP = smooth(span(lt, s[3].start - 0.2, s[3].start + 0.8)) * (1 - moveP);
  if (dimP > 0) {
    mono("716 × 447 CSS", liveX, liveY + liveH + 34, {
      size: T.chrome,
      color: C.faint,
      alpha: dimP,
    });
    mono("1432 × 894 px", frozenX + frozenW, frozenY + frozenH + 34, {
      size: T.chrome,
      color: C.coral,
      align: "right",
      alpha: dimP,
    });
    line(liveX, liveY + liveH + 52, liveX + liveW, liveY + liveH + 52, withAlpha(C.coral, 0.25), 1, null, dimP);
    line(frozenX, frozenY + frozenH + 52, frozenX + frozenW, frozenY + frozenH + 52, withAlpha(C.coral, 0.25), 1, null, dimP);
    chip("× 2.0", 1188, 536, C.coral, dimP);
    mono("device pixels", 1208, 578, {
      size: T.chrome,
      color: C.faint,
      ls: 1.4,
      alpha: dimP,
    });
    mono("cap 2.5×", 1208, 610, {
      size: T.chrome,
      color: C.peach,
      ls: 1.4,
      alpha: dimP,
    });
  }

  // the copy takes the stage
  if (moveP > 0) {
    const nx = lerp(frozenX, 720, moveP);
    const ny = lerp(frozenY, 150, moveP);
    const nw = lerp(frozenW, 1030, moveP);
    const nh = lerp(frozenH, 644, moveP);
    shot("frozen", nx, ny, nw, nh, copyP * moveP, {
      color: C.coral,
      glowA: 0.16 + 0.05 * moveP,
      r: 16,
    });
    text("THE FROZEN FRAME", nx, ny - 20, {
      size: T.chrome,
      family: F.mono,
      color: C.dim,
      ls: 2,
      alpha: moveP,
    });
    text("1432 × 894", nx + nw, ny - 20, {
      size: T.chrome,
      family: F.mono,
      color: C.coral,
      align: "right",
      ls: 2,
      alpha: moveP,
    });
    statement("The copy.", M.x, 318, moveP, T.title, C.coral);
    body("Same pixels. No motion.", M.x, 386, 480, moveP);
    mono("0 FPS", M.x, 470, {
      size: T.display,
      color: C.faint,
      alpha: moveP * 0.4,
      ls: -4,
    });
  }
}

// scene 03

function selection(lt, sc) {
  const s = times(sc);
  head(sc, lt);

  const leftIn = smooth(span(lt, 0.2, 1.0));
  const selP = smooth(span(lt, s[1].start - 0.2, s[1].start + 0.7));
  const handleP = smooth(span(lt, s[2].start - 0.2, s[2].start + 0.7));
  const morphP = easeInOut(span(lt, s[3].start - 0.1, s[3].start + 1.2));

  statement("Select.", M.x, 250, leftIn, T.display, C.ink);
  body("The frozen canvas becomes an editor.", M.x, 320, 500, leftIn);
  mono("DRAG / RESIZE / CROP", M.x, 420, {
    size: T.chrome,
    color: C.faint,
    ls: 2,
    alpha: leftIn,
  });

  // the right side: the real editor
  const sx = 690;
  const sy = 150;
  const sw = 1080;
  const sh = 674;
  shot("stageFrozen", sx, sy, sw, sh, leftIn * (1 - selP), { color: C.coral, glowA: 0.11 });
  shot("selected", sx, sy, sw, sh, leftIn * selP, { color: C.coral, glowA: 0.16 });
  text("NORTHSTAR / CAPTURED", sx, sy - 20, {
    size: T.chrome,
    family: F.mono,
    color: C.dim,
    ls: 2,
    alpha: leftIn,
  });
  text(selP > 0.2 ? "EDITING" : "FROZEN", sx + sw, sy - 20, {
    size: T.chrome,
    family: F.mono,
    color: selP > 0.2 ? C.coral : C.faint,
    align: "right",
    ls: 2,
    alpha: leftIn,
  });

  // selection glow and handles over the real image
  if (selP > 0) {
    const rx = sx + 0.26 * sw;
    const ry = sy + 0.5 * sh;
    const rw = 0.715 * sw;
    const rh = 0.44 * sh;
    ctx.save();
    ctx.globalAlpha *= selP;
    ctx.strokeStyle = withAlpha(C.coral, 0.42);
    ctx.lineWidth = 1.4;
    rrect(rx, ry, rw, rh, 1);
    ctx.stroke();
    const glowP = 0.5 + 0.5 * Math.sin(lt * 2.4);
    if (handleP > 0) {
      for (const [hx, hy] of [
        [rx, ry],
        [rx + rw / 2, ry],
        [rx + rw, ry],
        [rx + rw, ry + rh / 2],
        [rx + rw, ry + rh],
        [rx + rw / 2, ry + rh],
        [rx, ry + rh],
        [rx, ry + rh / 2],
      ]) {
        ring(hx, hy, 11 + glowP * 3, withAlpha(C.coral, 0.4), 1.4, handleP);
        dot(hx, hy, 3.2, C.coral, handleP, 6);
      }
      const hx = sx + sw - 250;
      const hy = sy + sh + 34;
      line(rx + rw, ry + rh, hx + 60, hy - 12, withAlpha(C.coral, 0.4), 1, [3, 5], handleP);
      chip("eight handles", hx, hy, C.coral, handleP);
    }
    ctx.restore();
  }

  // the normalized diagram on the left
  const dx = M.x;
  const dy = 480;
  const dw = 500;
  const dh = 300;
  const ratio = lerp(0.625, 0.75, morphP);
  const fw = dw;
  const fh = fw * ratio;
  const fy = dy + (dh - fh) / 2;
  minimap(dx, fy, fw, fh, {
    alpha: leftIn,
    selection: { x: 0.26, y: 0.5, w: 0.715, h: 0.44 },
    handles: handleP > 0.1,
    color: C.coral,
  });
  // normalized labels
  const rectX = dx + 0.26 * fw;
  const rectY = fy + 0.5 * fh;
  const rectW = 0.715 * fw;
  const rectH = 0.44 * fh;
  if (leftIn > 0) {
    mono("0", dx - 2, fy - 10, { size: T.chrome, color: C.faint, alpha: leftIn });
    mono("1", dx + fw - 12, fy + fh - 10, { size: T.chrome, color: C.faint, alpha: leftIn });
    line(rectX, rectY + rectH + 10, rectX + rectW, rectY + rectH + 10, withAlpha(C.coral, 0.5), 1, null, leftIn);
    text("x 0.26   w 0.715", rectX + rectW / 2, rectY + rectH + 30, {
      size: T.chrome,
      family: F.mono,
      color: C.dim,
      align: "center",
      ls: 1.4,
      alpha: leftIn,
    });
    line(rectX - 12, rectY, rectX - 12, rectY + rectH, withAlpha(C.coral, 0.5), 1, null, leftIn);
    text("y 0.50", rectX - 20, rectY + rectH / 2, {
      size: T.chrome,
      family: F.mono,
      color: C.dim,
      align: "right",
      alpha: leftIn,
    });
  }
  const morphNote = smooth(span(lt, s[3].start + 0.2, s[3].start + 1.0));
  if (morphNote > 0) {
    mono(morphP > 0.5 ? "SAME FRACTIONS · NEW PIXELS" : "16:10", dx, dy + 338, {
      size: T.chrome,
      color: C.coral,
      ls: 2,
      alpha: morphNote,
    });
    mono(morphP > 0.5 ? "the crop survives a resize" : "the frame can change shape", dx, dy + 366, {
      size: T.chrome,
      color: C.faint,
      alpha: morphNote * 0.85,
    });
  }

  // a drag hint at the beginning
  const hintP = smooth(span(lt, s[1].start + 0.2, s[1].start + 0.7)) * (1 - smooth(span(lt, s[2].start - 0.2, s[2].start + 0.3)));
  if (hintP > 0) {
    cursor(sx + 0.38 * sw, sy + 0.82 * sh, hintP, 1.1);
  }
}

// scene 04

function marks(lt, sc) {
  const s = times(sc);
  head(sc, lt);

  const leftIn = smooth(span(lt, 0.2, 0.9));
  const arrowP = smooth(span(lt, s[1].start - 0.15, s[1].start + 0.45));
  const boxP = smooth(span(lt, s[1].start + 1.4, s[1].start + 2.0));
  const blurP = smooth(span(lt, s[2].start, s[2].start + 0.8));
  const geomP = smooth(span(lt, s[3].start - 0.15, s[3].start + 0.8));
  const sizeP = smooth(span(lt, s[4].start - 0.15, s[4].start + 0.9));

  kicker("the markup", M.x, 164, C.coral, leftIn);
  statement("Point.", M.x, 262, leftIn, T.title, C.ink);
  statement("Frame.", M.x, 326, leftIn, T.title, C.peach);
  statement("Hide.", M.x, 390, leftIn, T.title, C.violet);

  // tool chips
  const tools = [
    ["A", "ARROW", C.coral],
    ["R", "BOX", C.peach],
    ["B", "BLUR", C.violet],
  ];
  tools.forEach(([key, name, color], i) => {
    const p = smooth(span(lt, s[0].start + i * 0.16, s[0].start + 0.65 + i * 0.16));
    const y = 470 + i * 50;
    chip(`${key} / ${name}`, M.x, y, color, p, { fill: false });
  });

  // geometry card
  if (geomP > 0) {
    panel(M.x, 620, 540, 196, {
      r: 12,
      fill: "rgba(8,12,24,0.76)",
      stroke: "rgba(244,241,234,0.1)",
      alpha: geomP,
    });
    mono("GEOMETRY / NORMALIZED", M.x + 20, 650, {
      size: T.chrome,
      color: C.faint,
      ls: 2,
      alpha: geomP,
    });
    const rows = [
      ["ARROW", "a → b", C.coral],
      ["BOX", "rect", C.peach],
      ["BLUR", "rect", C.violet],
    ];
    rows.forEach(([name, shape, color], i) => {
      const y = 690 + i * 38;
      text(name, M.x + 20, y, { size: T.label, family: F.mono, color, alpha: geomP });
      text(shape, M.x + 150, y, { size: T.label, family: F.mono, color: C.dim, alpha: geomP });
      line(M.x + 20, y + 12, M.x + 520, y + 12, "rgba(244,241,234,0.06)", 1, null, geomP);
    });
  }

  // the same marks at two sizes
  if (sizeP > 0) {
    const pulseP = 0.5 + 0.5 * Math.sin(lt * 2.0);
    const a = 0.86 + 0.06 * pulseP;
    ctx.save();
    ctx.globalAlpha *= sizeP;
    // small frame
    const s1x = M.x;
    const s1y = 850;
    const s1w = 190;
    const s1h = 119;
    panel(s1x, s1y, s1w, s1h, {
      r: 7,
      fill: "rgba(8,12,24,0.9)",
      stroke: "rgba(139,177,242,0.16)",
      lw: 1,
      alpha: 1,
    });
    drawMiniChart(s1x, s1y, s1w, s1h, a);
    drawMiniMarks(s1x, s1y, s1w, s1h, 1);
    // large frame
    const s2x = M.x + 236;
    const s2y = 826;
    const s2w = 304;
    const s2h = 190;
    panel(s2x, s2y, s2w, s2h, {
      r: 9,
      fill: "rgba(8,12,24,0.9)",
      stroke: "rgba(139,177,242,0.16)",
      lw: 1,
      alpha: 1,
    });
    drawMiniChart(s2x, s2y, s2w, s2h, a);
    drawMiniMarks(s2x, s2y, s2w, s2h, 1.6);
    mono("716", s1x, s1y + s1h + 22, { size: T.chrome, color: C.faint, ls: 1.4, alpha: 1 });
    mono("1432", s2x + s2w, s2y + s2h + 22, {
      size: T.chrome,
      color: C.faint,
      align: "right",
      ls: 1.4,
      alpha: 1,
    });
    mono("ANY SIZE", s2x + s2w, s2y - 12, {
      size: T.chrome,
      color: C.coral,
      align: "right",
      ls: 2,
      alpha: 1,
    });
    ctx.restore();
  }

  // the annotated stage
  const sx = 760;
  const sy = 140;
  const sw = 1000;
  const sh = 625;
  shot("stageFrozen", sx, sy, sw, sh, leftIn, { color: C.coral, glowA: 0.1 });
  shot("arrow", sx, sy, sw, sh, arrowP, { color: C.coral, glowA: 0.1 });
  shot("box", sx, sy, sw, sh, boxP, { color: C.coral, glowA: 0.1 });
  shot("annotated", sx, sy, sw, sh, blurP, { color: C.coral, glowA: 0.14 });
  text("NORTHSTAR / ANNOTATED", sx, sy - 18, {
    size: T.chrome,
    family: F.mono,
    color: C.dim,
    ls: 2,
    alpha: leftIn,
  });
  text(blurP > 0.3 ? "3 MARKS" : boxP > 0.3 ? "2 MARKS" : arrowP > 0.3 ? "1 MARK" : "0 MARKS", sx + sw, sy - 18, {
    size: T.chrome,
    family: F.mono,
    color: C.coral,
    align: "right",
    ls: 2,
    alpha: leftIn,
  });

  // callouts on the real marks
  if (blurP > 0) {
    const bx = sx + 0.775 * sw;
    const by = sy + 0.612 * sh;
    const bw = 0.19 * sw;
    const bh = 0.063 * sh;
    ctx.save();
    ctx.globalAlpha *= blurP;
    ctx.strokeStyle = withAlpha(C.violet, 0.9);
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(bx, by, bw, bh);
    ctx.restore();
    line(bx + bw + 6, by + bh / 2, 1200, 838, withAlpha(C.violet, 0.4), 1, [3, 5], blurP);
  }

  // the blur close-up
  if (blurP > 0) {
    const ix = 1240;
    const iy = 812;
    const iw = 520;
    const ih = 188;
    const cropX = 0.75 * 1432;
    const cropY = 0.58 * 894;
    const cropW = 0.225 * 1432;
    const cropH = 0.15 * 894;
    ctx.save();
    ctx.globalAlpha *= blurP;
    panel(ix - 8, iy - 8, iw + 16, ih + 16, {
      r: 12,
      fill: "rgba(8,12,24,0.92)",
      stroke: withAlpha(C.violet, 0.34),
      lw: 1.2,
      glow: withAlpha(C.violet, 0.22),
    });
    imageCrop("frozen", cropX, cropY, cropW, cropH, ix, iy, iw, ih, 1, 6);
    // source grid
    const gridA = smooth(span(lt, s[2].start + 1.0, s[2].start + 1.7));
    ctx.save();
    ctx.globalAlpha *= gridA * 0.5;
    ctx.strokeStyle = withAlpha(C.violet, 0.55);
    ctx.lineWidth = 1;
    for (let i = 1; i < 22; i++) {
      const x = ix + (i / 22) * iw;
      ctx.beginPath();
      ctx.moveTo(x, iy);
      ctx.lineTo(x, iy + ih);
      ctx.stroke();
    }
    for (let i = 1; i < 5; i++) {
      const y = iy + (i / 5) * ih;
      ctx.beginPath();
      ctx.moveTo(ix, y);
      ctx.lineTo(ix + iw, y);
      ctx.stroke();
    }
    ctx.restore();
    // the real mosaic on top
    imageCrop("annotated", cropX, cropY, cropW, cropH, ix, iy, iw, ih, smooth(span(lt, s[2].start + 1.6, s[2].start + 2.4)), 6);
    mono("SOURCE PIXELS", ix, iy - 18, {
      size: T.chrome,
      color: C.faint,
      ls: 2,
      alpha: blurP,
    });
    mono("13 PX MOSAIC", ix + iw, iy - 18, {
      size: T.chrome,
      color: C.violet,
      align: "right",
      ls: 2,
      alpha: blurP,
    });
    ctx.restore();
  }
}

function drawMiniChart(x, y, w, h, a = 1) {
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const p = i / 20;
    const v = 0.3 + 0.55 * p + Math.sin(p * 8) * 0.12;
    pts.push([x + w * 0.08 + p * w * 0.84, y + h * 0.82 - v * h * 0.5]);
  }
  curve(pts, withAlpha(C.coral, 0.8 * a), 1.5, 1);
}

function drawMiniMarks(x, y, w, h, scale = 1) {
  // arrow
  arrow(
    x + w * 0.18,
    y + h * 0.8,
    x + w * 0.45,
    y + h * 0.42,
    withAlpha(C.coral, 0.9),
    1.4 * scale,
    6 * scale,
    1,
  );
  // box
  ctx.save();
  ctx.strokeStyle = withAlpha(C.peach, 0.9);
  ctx.lineWidth = 1.2 * scale;
  ctx.setLineDash([4 * scale, 3 * scale]);
  ctx.strokeRect(x + w * 0.62, y + h * 0.18, w * 0.28, h * 0.22);
  ctx.restore();
  // blur
  ctx.save();
  const bx = x + w * 0.62;
  const by = y + h * 0.62;
  const bw = w * 0.28;
  const bh = h * 0.18;
  ctx.globalAlpha *= 0.9;
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      ctx.fillStyle = (i + j) % 2 ? "rgba(142,155,255,0.28)" : "rgba(142,155,255,0.12)";
      ctx.fillRect(bx + (i / 6) * bw, by + (j / 3) * bh, bw / 6 + 0.5, bh / 3 + 0.5);
    }
  }
  ctx.strokeStyle = withAlpha(C.violet, 0.9);
  ctx.lineWidth = 1.2 * scale;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.restore();
}

// scene 05

function drawCleanMarks(x, y, w, h, alpha = 1) {
  const ax = x + 0.17 * w;
  const ay = y + 0.8 * h;
  const bx = x + 0.41 * w;
  const by = y + 0.34 * h;
  // arrow with a dark halo
  arrow(ax, ay, bx, by, "rgba(3,8,16,0.72)", 6, 16, alpha);
  arrow(ax, ay, bx, by, C.coral, 2.4, 12, alpha);

  // box around the review note
  const rx = x + 0.69 * w;
  const ry = y + 0.17 * h;
  const rw = 0.3 * w;
  const rh = 0.29 * h;
  ctx.save();
  ctx.globalAlpha *= alpha;
  rrect(rx, ry, rw, rh, 3);
  ctx.strokeStyle = "rgba(3,8,16,0.6)";
  ctx.lineWidth = 4.6;
  ctx.stroke();
  rrect(rx, ry, rw, rh, 3);
  ctx.strokeStyle = C.peach;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // the mosaic over the email line
  const bx2 = x + 0.72 * w;
  const by2 = y + 0.255 * h;
  const bw = 0.25 * w;
  const bh = 0.145 * h;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const cols = 9;
  const rows = 4;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const shade = (i * 7 + j * 13) % 5;
      const fill =
        shade === 0
          ? "rgba(50,64,92,0.94)"
          : shade === 1
            ? "rgba(24,36,58,0.96)"
            : shade === 2
              ? "rgba(38,52,78,0.95)"
              : "rgba(17,27,46,0.97)";
      ctx.fillStyle = fill;
      ctx.fillRect(
        bx2 + (i / cols) * bw,
        by2 + (j / rows) * bh,
        bw / cols + 0.8,
        bh / rows + 0.8,
      );
    }
  }
  ctx.strokeStyle = withAlpha(C.violet, 0.9);
  ctx.lineWidth = 1.4;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(bx2, by2, bw, bh);
  ctx.restore();
}

function exportScene(lt, sc) {
  const s = times(sc);
  head(sc, lt);

  const leftIn = smooth(span(lt, 0.2, 0.9));
  const noScreenP = smooth(span(lt, s[0].start + 0.4, s[0].start + 1.2));
  const bitmapP = smooth(span(lt, s[1].start - 0.15, s[1].start + 0.8));
  const pipeP = smooth(span(lt, s[1].start + 0.2, s[1].start + 1.2));
  const cleanP = smooth(span(lt, s[1].start + 0.3, s[1].start + 1.2));
  const cropP = smooth(span(lt, s[2].start - 0.1, s[2].start + 1.0));
  const stripP = smooth(span(lt, s[3].start - 0.1, s[3].start + 0.9));
  const pngP = smooth(span(lt, s[4].start - 0.2, s[4].start + 1.0));

  kicker("the export", M.x, 164, C.coral, leftIn);
  statement("Screen.", M.x, 262, leftIn, T.title, C.dim);
  if (noScreenP > 0) {
    const w = 250 * noScreenP;
    line(M.x - 10, 240, M.x - 10 + w, 232, withAlpha(C.peach, 0.9), 2.6);
  }
  statement("Bitmap.", M.x, 326, bitmapP, T.title, C.coral);
  body("Exports read the frozen pixels, not the display.", M.x, 394, 500, leftIn);

  const claimP = smooth(span(lt, s[0].start + 1.2, s[0].start + 1.8));
  if (claimP > 0) {
    chip("no readPixels", M.x, 470, C.peach, claimP, { fill: false });
    mono("not the screen", M.x, 506, {
      size: T.chrome,
      color: C.faint,
      ls: 1.8,
      alpha: claimP * 0.8,
    });
  }

  // what is left behind
  if (stripP > 0) {
    const items = ["veil", "handles", "toolbar"];
    items.forEach((name, i) => {
      const y = 600 + i * 46;
      ctx.save();
      ctx.globalAlpha *= stripP;
      ctx.strokeStyle = withAlpha(C.peach, 0.8);
      ctx.lineWidth = 1.8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(M.x + 2, y - 18);
      ctx.lineTo(M.x + 12, y - 8);
      ctx.moveTo(M.x + 12, y - 18);
      ctx.lineTo(M.x + 2, y - 8);
      ctx.stroke();
      ctx.restore();
      text(name, M.x + 24, y, {
        size: T.body,
        family: F.sans,
        color: C.dim,
        alpha: stripP,
      });
    });
    mono("left out of the PNG", M.x, 760, {
      size: T.chrome,
      color: C.peach,
      ls: 2,
      alpha: stripP,
    });
  }

  // native resolution numbers
  if (pngP > 0) {
    text("1024", M.x, 872, {
      size: T.display,
      weight: 500,
      color: C.coral,
      alpha: pngP,
      ls: -4,
    });
    text("× 394", M.x + 234, 872, {
      size: T.caption,
      family: F.mono,
      color: C.dim,
      alpha: pngP,
    });
    mono("PNG / NATIVE RESOLUTION", M.x, 908, {
      size: T.chrome,
      color: C.faint,
      ls: 2,
      alpha: pngP,
    });
  }

  // pipeline
  const nodes = [
    { x: 720, y: 158, w: 310, h: 186, name: "FROZEN", sub: "1432 × 894", color: C.coral },
    { x: 1116, y: 158, w: 310, h: 186, name: "MARKS", sub: "3 vector layers", color: C.peach },
    { x: 1512, y: 158, w: 298, h: 186, name: "CROP", sub: "selection bounds", color: C.mint },
  ];
  nodes.forEach((n, i) => {
    const p = pipeP * smooth(span(lt, s[1].start + i * 0.22, s[1].start + 0.65 + i * 0.22));
    if (p <= 0) return;
    panel(n.x, n.y, n.w, n.h, {
      r: 12,
      fill: "rgba(8,12,24,0.78)",
      stroke: withAlpha(n.color, i === 2 && cropP > 0.2 ? 0.55 : 0.24),
      lw: 1.2,
      alpha: p,
      glow: withAlpha(n.color, i === 2 && cropP > 0.2 ? 0.18 : 0.06),
    });
    mono(n.name, n.x + 20, n.y + 30, {
      size: T.chrome,
      color: n.color,
      ls: 2,
      alpha: p,
    });
    mono(n.sub, n.x + 20, n.y + 52, {
      size: T.chrome,
      color: C.faint,
      alpha: p * 0.8,
    });
    if (i === 0) {
      imageCrop("frozen", 0, 0, 1432, 894, n.x + 102, n.y + 20, 190, 119, p * 0.9, 5);
    } else if (i === 1) {
      imageCrop("export", 0, 0, 1024, 394, n.x + 102, n.y + 20, 190, 73, p * 0.9, 5);
    } else {
      imageCrop("export", 0, 0, 973, 394, n.x + 102, n.y + 20, 190, 77, p * 0.9, 5);
    }
    if (i < nodes.length - 1) {
      arrow(n.x + n.w + 14, n.y + n.h / 2, nodes[i + 1].x - 16, n.y + n.h / 2, withAlpha(n.color, 0.5), 1.3, 8, p);
    }
  });

  // the clean canvas builds, then resolves into the real PNG
  const ex = 720;
  const ey = 486;
  const ew = 1090;
  const eh = 440;
  if (cleanP > 0) {
    ctx.save();
    ctx.globalAlpha *= cleanP;
    glow(ex + ew / 2, ey + eh / 2, ew * 0.55, C.coral, 0.1);
    panel(ex - 7, ey - 7, ew + 14, eh + 14, {
      r: 16,
      fill: "rgba(8,12,24,0.74)",
      stroke: withAlpha(C.coral, cropP > 0.2 ? 0.28 : 0.16),
      lw: 1.2,
    });
    // empty canvas grid
    ctx.save();
    ctx.globalAlpha *= 1 - smooth(span(lt, s[2].start + 0.4, s[2].start + 1.2));
    for (let x = ex + 40; x < ex + ew; x += 40) {
      line(x, ey + 20, x, ey + eh - 20, "rgba(244,241,234,0.05)", 1);
    }
    for (let y = ey + 40; y < ey + eh; y += 40) {
      line(ex + 20, y, ex + ew - 20, y, "rgba(244,241,234,0.05)", 1);
    }
    text("CLEAN CANVAS", ex + 28, ey + 44, {
      size: T.chrome,
      family: F.mono,
      color: C.faint,
      ls: 2,
    });
    ctx.restore();
    // the annotated crop fills the canvas at sentence 2
    const fillP = smooth(span(lt, s[2].start + 0.2, s[2].start + 1.2));
    if (fillP > 0) {
      ctx.save();
      ctx.globalAlpha *= fillP;
      imageCrop("frozen", 372, 447, 1024, 393, ex, ey, ew, eh, 1, 10);
      drawCleanMarks(ex, ey, ew, eh, 1);
      // soften the very edge so it reads as a canvas object
      ctx.strokeStyle = withAlpha(C.coral, 0.22);
      ctx.lineWidth = 1.2;
      rrect(ex, ey, ew, eh, 10);
      ctx.stroke();
      ctx.restore();
    }
    // crop frame
    if (cropP > 0) {
      const inset = 14 * (1 - cropP);
      ctx.save();
      ctx.globalAlpha *= cropP;
      ctx.strokeStyle = withAlpha(C.mint, 0.9);
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 5]);
      rrect(ex + inset, ey + inset, ew - inset * 2, eh - inset * 2, 8);
      ctx.stroke();
      ctx.restore();
    }
    // chrome that is left behind
    if (stripP > 0) {
      const chips = [
        ["veil", C.dim],
        ["handles", C.dim],
        ["toolbar", C.dim],
      ];
      chips.forEach(([name, color], i) => {
        const p = stripP * smooth(span(lt, s[3].start + i * 0.16, s[3].start + 0.5 + i * 0.16));
        const cx = ex + 40 + i * 180;
        const cy = ey + 34 - 22 * p;
        chip(name, cx, cy, color, p, { fill: false });
      });
      mono("not painted into the export", ex + ew - 28, ey + 38, {
        size: T.chrome,
        color: C.peach,
        align: "right",
        ls: 1.6,
        alpha: stripP,
      });
    }
    // the actual PNG replaces the built canvas
    if (pngP > 0) {
      ctx.save();
      ctx.globalAlpha *= pngP;
      glow(ex + ew / 2, ey + eh / 2, ew * 0.55, C.coral, 0.18);
      image("export", ex, ey, ew, eh, 1, 10);
      ctx.restore();
      text("THE PNG", ex, ey - 18, {
        size: T.chrome,
        family: F.mono,
        color: C.dim,
        ls: 2,
        alpha: pngP,
      });
      chip("annotations included", ex + ew, ey - 20, C.coral, pngP, { align: "right" });
    } else if (cleanP > 0) {
      text("THE CLEAN CANVAS", ex, ey - 18, {
        size: T.chrome,
        family: F.mono,
        color: C.dim,
        ls: 2,
        alpha: cleanP,
      });
    }
    ctx.restore();
  }
}

// scene 06

function soundScene(lt, sc) {
  const s = times(sc);
  head(sc, lt);

  const leftIn = smooth(span(lt, 0.2, 0.9));
  const shutterP = smooth(span(lt, s[1].start - 0.2, s[1].start + 0.8));
  const chimeP = smooth(span(lt, s[2].start - 0.2, s[2].start + 0.8));
  const errorP = smooth(span(lt, s[3].start - 0.2, s[3].start + 0.8));
  const gestureP = smooth(span(lt, s[4].start - 0.2, s[4].start + 0.9));

  kicker("the sound", M.x, 164, C.coral, leftIn);
  statement("No audio", M.x, 262, leftIn, T.title, C.ink);
  statement("files.", M.x, 326, leftIn, T.title, C.coral);
  body("Every sound is built from oscillators and filtered noise.", M.x, 394, 470, leftIn);

  // a file card with a slash
  const fileP = smooth(span(lt, s[0].start + 0.7, s[0].start + 1.3));
  if (fileP > 0) {
    panel(M.x, 470, 380, 88, {
      r: 10,
      fill: "rgba(8,12,24,0.75)",
      stroke: "rgba(244,241,234,0.14)",
      alpha: fileP,
    });
    mono("shutter.mp3", M.x + 22, 522, {
      size: T.label,
      color: C.dim,
      alpha: fileP,
    });
    mono("0 bytes", M.x + 358, 522, {
      size: T.chrome,
      color: C.faint,
      align: "right",
      alpha: fileP,
    });
    const w = 330 * fileP;
    line(M.x + 14, 540, M.x + 14 + w, 488, withAlpha(C.peach, 0.85), 2.6);
  }

  // gesture gate
  if (gestureP > 0) {
    panel(M.x, 600, 380, 208, {
      r: 12,
      fill: "rgba(8,12,24,0.72)",
      stroke: withAlpha(C.coral, 0.24),
      alpha: gestureP,
    });
    mono("AUDIO CONTEXT", M.x + 20, 632, {
      size: T.chrome,
      color: C.faint,
      ls: 2,
      alpha: gestureP,
    });
    const open = gestureP > 0.5;
    text(open ? "OPEN" : "LOCKED", M.x + 20, 682, {
      size: T.title,
      weight: 500,
      color: open ? C.mint : C.dim,
      alpha: gestureP,
      ls: -1.4,
    });
    dot(M.x + 340, 670, 7, open ? C.mint : C.faint, gestureP, open ? 12 : 0);
    line(M.x + 20, 706, M.x + 360, 706, "rgba(244,241,234,0.08)", 1, null, gestureP);
    mono("created inside the click", M.x + 20, 740, {
      size: T.chrome,
      color: C.dim,
      alpha: gestureP,
    });
    mono("no autoplay", M.x + 20, 768, {
      size: T.chrome,
      color: C.faint,
      alpha: gestureP * 0.8,
    });
    // a key
    const kx = M.x + 300;
    const ky = 748;
    if (open) {
      ring(kx, ky, 16, withAlpha(C.mint, 0.5), 1.2, gestureP);
      dot(kx, ky, 4, C.mint, gestureP, 8);
    } else {
      ring(kx, ky, 16, withAlpha(C.dim, 0.4), 1.2, gestureP, [3, 4]);
    }
  }

  // the synth panel
  const px = 660;
  const py = 150;
  const pw = 1150;
  const ph = 820;
  ctx.save();
  ctx.globalAlpha *= leftIn;
  panel(px, py, pw, ph, {
    r: 16,
    fill: "rgba(8,12,24,0.72)",
    stroke: "rgba(244,241,234,0.1)",
    lw: 1.2,
    glow: withAlpha(C.coral, 0.08),
  });
  mono("WEB AUDIO / ONE SYNTH", px + 28, py + 36, {
    size: T.chrome,
    color: C.faint,
    ls: 2,
  });
  mono("48 kHz", px + pw - 28, py + 36, {
    size: T.chrome,
    color: C.faint,
    align: "right",
    ls: 2,
  });
  line(px + 20, py + 56, px + pw - 20, py + 56, "rgba(244,241,234,0.08)", 1);
  ctx.restore();

  // lane helper
  const lane = (y, name, sub, color, p, draw) => {
    if (p <= 0) return;
    ctx.save();
    ctx.globalAlpha *= p;
    mono(name, px + 28, y + 64, {
      size: T.chrome,
      color,
      ls: 2,
    });
    mono(sub, px + 28, y + 88, {
      size: T.chrome,
      color: C.faint,
    });
    line(px + 190, y + 22, px + pw - 24, y + 22, "rgba(244,241,234,0.07)", 1, null, 1);
    line(px + 190, y + 108, px + pw - 24, y + 108, "rgba(244,241,234,0.07)", 1, null, 1);
    draw(px + 190, y + 22, pw - 214, 86);
    ctx.restore();
  };

  lane(190, "SHUTTER", "noise + sine + click", C.coral, shutterP, (x, y, w, h) => {
    trace(x, y, w, h, noiseBurst, withAlpha(C.coral, 0.9), { lw: 1.4 });
    trace(x, y, w, h, thump, withAlpha(C.peach, 0.8), { lw: 1.8 });
    trace(x, y, w, h, click, withAlpha(C.coral, 0.55), { lw: 1.2 });
    text("0 ms", x, y + h + 22, { size: T.chrome, family: F.mono, color: C.faint });
    text("160 ms", x + w, y + h + 22, {
      size: T.chrome,
      family: F.mono,
      color: C.faint,
      align: "right",
    });
  });

  lane(360, "COPY CHIME", "three sine notes", C.peach, chimeP, (x, y, w, h) => {
    const p1 = trace(x, y + 14, w, h * 0.7, (p) => chimeNote(p, 8), withAlpha(C.peach, 0.9), { lw: 1.6 });
    trace(x, y + 10, w, h * 0.66, (p) => chimeNote(p, 10) * 0.8, withAlpha(C.coral, 0.65), { lw: 1.4 });
    trace(x, y + 18, w, h * 0.58, (p) => chimeNote(p, 12) * 0.68, withAlpha(C.mint, 0.65), { lw: 1.4 });
    if (p1.length > 0) {
      const last = p1[p1.length - 1];
      dot(last[0], last[1], 3, C.peach, 1, 8);
    }
    ["A5", "C#6", "E6"].forEach((n, i) => {
      const nx = x + w - 220 + i * 70;
      const ny = y + 70;
      dot(nx, ny, 3.2, [C.peach, C.coral, C.mint][i], 1, 8);
      text(n, nx + 10, ny + 5, {
        size: T.chrome,
        family: F.mono,
        color: [C.peach, C.coral, C.mint][i],
        alpha: 0.9,
      });
    });
  });

  lane(530, "ERROR", "one falling tone", C.violet, errorP, (x, y, w, h) => {
    trace(x, y, w * 0.64, h, errorTone, withAlpha(C.violet, 0.9), { lw: 1.8 });
    text("clipboard refused", x + w * 0.68, y + h / 2 + 6, {
      size: T.chrome,
      family: F.mono,
      color: C.violet,
      alpha: 0.9,
    });
  });

  // a quiet footer inside the panel
  if (gestureP > 0) {
    ctx.save();
    ctx.globalAlpha *= gestureP;
    line(px + 20, py + 662, px + pw - 20, py + 662, "rgba(244,241,234,0.08)", 1);
    chip("user gesture", px + 28, py + 706, C.coral, 1, { fill: false });
    mono("AudioContext opens on click", px + 190, py + 712, {
      size: T.chrome,
      color: C.faint,
    });
    // little gate arrow
    arrow(px + 470, py + 700, px + 590, py + 700, withAlpha(C.coral, 0.4), 1.2, 7, 1);
    ring(px + 630, py + 700, 18, withAlpha(C.mint, 0.4), 1.2, 1, [3, 5]);
    dot(px + 630, py + 700, 4, C.mint, 1, 8);
    ctx.restore();
  }
}

// scene 07

function clockScene(lt, sc) {
  const s = times(sc);
  head(sc, lt);

  const leftIn = smooth(span(lt, 0.2, 0.9));
  const laneP = smooth(span(lt, s[0].start + 0.3, s[0].start + 1.1));
  const gateP = smooth(span(lt, s[2].start - 0.2, s[2].start + 0.8));
  const freezeP = smooth(span(lt, s[3].start - 0.2, s[3].start + 0.9));
  const stopped = Math.max(gateP, freezeP);
  const amp = 1 - 0.92 * stopped;

  kicker("one frame", M.x, 164, C.coral, leftIn);
  statement("One loop.", M.x, 262, leftIn, T.title, C.ink);
  statement("Three pulses.", M.x, 326, leftIn, T.title, C.coral);
  body("Every moving part reads the same frame time.", M.x, 394, 470, leftIn);

  // the ring
  const rx = 330;
  const ry = 690;
  const rr = 128;
  const rpm = smooth(span(lt, s[0].start + 0.2, s[0].start + 1.2));
  if (rpm > 0) {
    ctx.save();
    ctx.globalAlpha *= rpm;
    ring(rx, ry, rr, withAlpha(C.coral, 0.2), 1.2, 1);
    ring(rx, ry, rr * 0.82, withAlpha(C.coral, 0.46), 1.4, 1);
    glow(rx, ry, rr * 1.5, C.coral, 0.1);
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * TAU - Math.PI / 2;
      const long = i % 5 === 0;
      const r1 = rr - (long ? 13 : 7);
      const r2 = rr - 2;
      line(
        rx + Math.cos(a) * r1,
        ry + Math.sin(a) * r1,
        rx + Math.cos(a) * r2,
        ry + Math.sin(a) * r2,
        long ? C.coral : C.faint,
        long ? 1.4 : 1,
        null,
        0.8,
      );
    }
    const handA = -Math.PI / 2 + (stopped > 0.5 ? 1.9 : lt * 1.6);
    line(rx, ry, rx + Math.cos(handA) * (rr - 28), ry + Math.sin(handA) * (rr - 28), C.coral, 2.4);
    dot(rx, ry, 5, C.coral, 1, 12);
    text(freezeP > 0.4 ? "0" : "30", rx, ry + 42, {
      size: T.display,
      weight: 500,
      color: freezeP > 0.4 ? C.faint : C.ink,
      align: "center",
      ls: -4,
    });
    mono(freezeP > 0.4 ? "FPS / STOPPED" : "FPS / LIVE", rx, ry + 78, {
      size: T.chrome,
      color: freezeP > 0.4 ? C.faint : C.coral,
      align: "center",
      ls: 2,
    });
    ctx.restore();
  }
  mono("requestAnimationFrame", M.x, 880, {
    size: T.chrome,
    color: C.faint,
    ls: 1.6,
    alpha: rpm,
  });

  // the three lanes
  const lx = 640;
  const lw = 1160;
  const lanes = [
    {
      y: 200,
      name: "ENDPOINT",
      sub: "a breathing radius",
      color: C.coral,
      sampler: (p) => Math.sin(p * TAU * 2.2 + lt * 1.4) * (0.6 + 0.2 * Math.sin(lt * 0.7)) * amp,
    },
    {
      y: 400,
      name: "LIVE DOT",
      sub: "a status pulse",
      color: C.mint,
      sampler: (p) => (Math.sin(p * TAU * 8 + lt * 2.8) > 0 ? 0.75 : -0.75) * amp,
    },
    {
      y: 600,
      name: "CHART SCAN",
      sub: "a slow pass",
      color: C.peach,
      sampler: (p) => (((p * 1.6 + lt * 0.12) % 1) * 2 - 1) * 0.8 * amp,
    },
  ];
  lanes.forEach((lane, i) => {
    const p = laneP * smooth(span(lt, s[0].start + 0.45 + i * 0.2, s[0].start + 0.85 + i * 0.2));
    if (p <= 0) return;
    text(lane.name, lx, lane.y + 30, {
      size: T.chrome,
      family: F.mono,
      color: lane.color,
      ls: 2,
      alpha: p,
    });
    mono(lane.sub, lx, lane.y + 54, {
      size: T.chrome,
      color: C.faint,
      alpha: p * 0.8,
    });
    line(lx + 190, lane.y + 10, lx + lw, lane.y + 10, "rgba(244,241,234,0.08)", 1, null, p);
    line(lx + 190, lane.y + 92, lx + lw, lane.y + 92, "rgba(244,241,234,0.08)", 1, null, p);
    trace(lx + 190, lane.y + 10, lw - 190, 82, lane.sampler, withAlpha(lane.color, 0.9), { lw: 1.6 });
    // a soft second trace
    trace(lx + 190, lane.y + 10, lw - 190, 82, (q) => lane.sampler(q) * 0.5, withAlpha(lane.color, 0.25), { lw: 1.2 });
  });

  // the playhead
  if (laneP > 0) {
    const hx = lx + 220 + ((lt * 0.18) % 1) * (lw - 280);
    line(hx, 168, hx, 700, withAlpha(C.coral, 0.35), 1.2, [3, 6], laneP);
    dot(hx, 168, 3.6, C.coral, laneP, 8);
  }

  // gates
  if (gateP > 0) {
    const gx = 1580;
    ctx.save();
    ctx.globalAlpha *= gateP;
    line(gx, 160, gx, 900, withAlpha(C.peach, 0.5), 1.4, [6, 6]);
    chip("tab hidden", gx + 18, 746, C.peach, 1, { fill: false });
    chip("out of view", gx + 18, 788, C.peach, 1, { fill: false });
    chip("freeze", gx + 18, 830, C.coral, freezeP, { fill: false });
    if (gateP > 0.45) {
      panel(gx + 18, 862, 194, 48, {
        r: 9,
        fill: withAlpha(C.peach, 0.1),
        stroke: withAlpha(C.peach, 0.4),
        alpha: 1,
      });
      text("RAF STOPPED", gx + 36, 892, {
        size: T.chrome,
        family: F.mono,
        color: C.peach,
        ls: 2,
      });
    }
    ctx.restore();
  }

  // the frozen hold
  if (freezeP > 0) {
    const tx = 640;
    const ty = 760;
    const tw = 340;
    const th = 212;
    ctx.save();
    ctx.globalAlpha *= freezeP;
    glow(tx + tw / 2, ty + th / 2, tw * 0.6, C.coral, 0.12);
    panel(tx - 5, ty - 5, tw + 10, th + 10, {
      r: 12,
      fill: "rgba(8,12,24,0.8)",
      stroke: withAlpha(C.coral, 0.24),
      lw: 1.2,
    });
    image("stageFrozen", tx, ty, tw, th, 1, 8);
    mono("THE FRAME HOLDS", tx + tw / 2, ty + th + 28, {
      size: T.chrome,
      color: C.coral,
      align: "center",
      ls: 2,
      alpha: 1,
    });
    ctx.restore();
  }
}

// scene 08

function noAssets(lt, sc) {
  const s = times(sc);
  head(sc, lt);

  const leftIn = smooth(span(lt, 0.2, 0.9));
  const tableP = smooth(span(lt, s[0].start + 0.2, s[0].start + 1.0));
  const zeroP = smooth(span(lt, s[1].start - 0.1, s[1].start + 0.8));
  const fontP = smooth(span(lt, s[2].start - 0.1, s[2].start + 0.8));
  const codeP = smooth(span(lt, s[3].start - 0.5, s[3].start + 0.7));
  const loopP = smooth(span(lt, s[4].start - 0.2, s[4].start + 0.9));

  kicker("the ledger", M.x, 164, C.coral, leftIn);
  statement("All code.", M.x, 262, leftIn, T.display, C.ink);
  body("The preview is drawn, not loaded.", M.x, 330, 470, leftIn);

  // code card
  if (codeP > 0) {
    const cx = M.x;
    const cy = 420;
    const cw = 560;
    const ch = 330;
    ctx.save();
    ctx.globalAlpha *= codeP;
    panel(cx, cy, cw, ch, {
      r: 12,
      fill: "rgba(8,12,24,0.78)",
      stroke: "rgba(244,241,234,0.1)",
      lw: 1.1,
    });
    mono("src/preview.ts", cx + 20, cy + 30, {
      size: T.chrome,
      color: C.faint,
      ls: 1.6,
    });
    line(cx + 16, cy + 44, cx + cw - 16, cy + 44, "rgba(244,241,234,0.08)", 1);
    const lines = [
      ["ctx.fillRect(0, 0, w, h);", C.dim],
      ["const points = captures.map(pointFor);", C.dim],
      ["ctx.strokeStyle = C.ice;", C.coral],
      ["ctx.stroke();", C.coral],
      ['drawText(ctx, "Weekly review", ...);', C.dim],
      ["drawNotes(ctx, ...);", C.dim],
      ["requestAnimationFrame(tick);", C.mint],
    ];
    lines.forEach(([str, color], i) => {
      const p = smooth(span(lt, s[3].start + 0.25 + i * 0.12, s[3].start + 0.65 + i * 0.12));
      if (p <= 0) return;
      text(String(i + 1).padStart(2, "0"), cx + 20, cy + 78 + i * 32, {
        size: T.chrome,
        family: F.mono,
        color: C.faint,
        alpha: p * 0.7,
      });
      text(str, cx + 52, cy + 78 + i * 32, {
        size: T.chrome,
        family: F.mono,
        color,
        alpha: p,
      });
    });
    const cursorOn = (lt * 2.4) % 2 < 1;
    if (cursorOn) {
      ctx.fillStyle = C.coral;
      ctx.fillRect(cx + 52 + 250, cy + 78 + 6 * 32 - 12, 7, 15);
    }
    ctx.restore();
  }

  // ledger
  const tx = 720;
  const ty = 156;
  const tw = 1090;
  const rowH = 66;
  const rows = [
    { name: "IMAGES", value: "0", color: C.coral, note: "every panel is drawn" },
    { name: "AUDIO", value: "0", color: C.peach, note: "every sound is synthesized" },
    { name: "VIDEO", value: "0", color: C.mint, note: "no footage" },
    { name: "UI LIBRARY", value: "0", color: C.violet, note: "no React, no chart kit" },
    { name: "FONTS", value: "2", color: C.coral, note: "Inter + JetBrains Mono" },
  ];
  if (tableP > 0) {
    panel(tx, ty, tw, rowH * rows.length + 58, {
      r: 14,
      fill: "rgba(8,12,24,0.7)",
      stroke: "rgba(244,241,234,0.1)",
      lw: 1.2,
      alpha: tableP,
    });
    mono("ASSET LEDGER", tx + 24, ty + 32, {
      size: T.chrome,
      color: C.faint,
      ls: 2,
      alpha: tableP,
    });
    mono("COUNT", tx + tw - 24, ty + 32, {
      size: T.chrome,
      color: C.faint,
      align: "right",
      ls: 2,
      alpha: tableP,
    });
    line(tx + 18, ty + 48, tx + tw - 18, ty + 48, "rgba(244,241,234,0.08)", 1, null, tableP);
    rows.forEach((row, i) => {
      const p = tableP * smooth(span(lt, s[0].start + 0.35 + i * 0.14, s[0].start + 0.8 + i * 0.14));
      if (p <= 0) return;
      const y = ty + 48 + i * rowH;
      text(row.name, tx + 24, y + 42, {
        size: T.caption,
        family: F.mono,
        color: i === 4 && fontP > 0.2 ? C.ink : C.dim,
        alpha: p,
        ls: 1.2,
      });
      mono(row.note, tx + 260, y + 42, {
        size: T.chrome,
        color: C.faint,
        alpha: p * 0.8,
      });
      const valueP = i < 4 ? zeroP : fontP;
      text(row.value, tx + tw - 92, y + 44, {
        size: 48,
        weight: 500,
        family: F.mono,
        color: row.color,
        align: "right",
        alpha: p * valueP,
      });
      if (i < 4) {
        // a small check
        const cx = tx + tw - 44;
        const cy = y + 32;
        ctx.save();
        ctx.globalAlpha *= p * zeroP;
        ctx.strokeStyle = C.mint;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy);
        ctx.lineTo(cx - 2, cy + 7);
        ctx.lineTo(cx + 10, cy - 8);
        ctx.stroke();
        ctx.restore();
      }
      if (i < rows.length - 1) {
        line(tx + 18, y + rowH, tx + tw - 18, y + rowH, "rgba(244,241,234,0.06)", 1, null, p);
      }
    });
  }

  // font specimens
  if (fontP > 0) {
    const fx = 720;
    const fy = 570;
    const fw = 520;
    const fh = 190;
    panel(fx, fy, fw, fh, {
      r: 12,
      fill: "rgba(8,12,24,0.72)",
      stroke: withAlpha(C.coral, 0.24),
      alpha: fontP,
    });
    mono("ONLY THE FONTS", fx + 20, fy + 30, {
      size: T.chrome,
      color: C.faint,
      ls: 2,
      alpha: fontP,
    });
    text("Inter", fx + 20, fy + 92, {
      size: T.title,
      family: F.sans,
      color: C.ink,
      alpha: fontP,
      ls: -1.4,
    });
    text("JetBrains Mono", fx + 20, fy + 150, {
      size: T.body,
      family: F.mono,
      color: C.coral,
      alpha: fontP,
    });
    text("Aa", fx + fw - 90, fy + 96, {
      size: T.display,
      family: F.serif,
      style: "italic",
      color: C.dim,
      alpha: fontP,
    });
    text("2 families", fx + fw - 20, fy + 160, {
      size: T.chrome,
      family: F.mono,
      color: C.faint,
      align: "right",
      alpha: fontP,
    });
  }

  // loop diagram
  if (loopP > 0) {
    const lx = 1290;
    const ly = 570;
    const lw = 520;
    const lh = 360;
    panel(lx, ly, lw, lh, {
      r: 14,
      fill: "rgba(8,12,24,0.72)",
      stroke: withAlpha(C.mint, 0.24),
      alpha: loopP,
    });
    mono("THE LOOP", lx + 20, ly + 30, {
      size: T.chrome,
      color: C.faint,
      ls: 2,
      alpha: loopP,
    });
    const nodes = [
      { name: "PAGE", x: lx + 46, y: ly + 72, color: C.coral },
      { name: "CANVAS", x: lx + 330, y: ly + 72, color: C.peach },
      { name: "CAPTURE", x: lx + 330, y: ly + 226, color: C.mint },
      { name: "PNG", x: lx + 46, y: ly + 226, color: C.violet },
    ];
    nodes.forEach((n) => {
      panel(n.x, n.y, 144, 54, {
        r: 9,
        fill: withAlpha(n.color, 0.07),
        stroke: withAlpha(n.color, 0.3),
        lw: 1.1,
        alpha: loopP,
      });
      text(n.name, n.x + 72, n.y + 34, {
        size: T.chrome,
        family: F.mono,
        color: n.color,
        align: "center",
        ls: 1.6,
        alpha: loopP,
      });
    });
    arrow(nodes[0].x + 144, nodes[0].y + 27, nodes[1].x - 6, nodes[1].y + 27, withAlpha(C.coral, 0.45), 1.2, 7, loopP);
    arrow(nodes[1].x + 72, nodes[1].y + 54, nodes[2].x + 72, nodes[2].y - 4, withAlpha(C.peach, 0.45), 1.2, 7, loopP);
    arrow(nodes[2].x, nodes[2].y + 27, nodes[3].x + 150, nodes[3].y + 27, withAlpha(C.mint, 0.45), 1.2, 7, loopP);
    arrow(nodes[3].x + 41, nodes[3].y, nodes[0].x + 41, nodes[0].y + 60, withAlpha(C.violet, 0.45), 1.2, 7, loopP);
    // server slash
    const sx = lx + lw / 2;
    const sy = ly + 176;
    ctx.save();
    ctx.globalAlpha *= loopP;
    ring(sx, sy, 46, withAlpha(C.peach, 0.28), 1.2, 1, [3, 5]);
    text("SERVER", sx, sy + 6, {
      size: T.chrome,
      family: F.mono,
      color: C.dim,
      align: "center",
      ls: 1.6,
    });
    line(sx - 36, sy + 40, sx + 40, sy - 40, withAlpha(C.peach, 0.85), 2, null, 1);
    ctx.restore();
    mono("zero round trips", lx + lw / 2, ly + lh - 24, {
      size: T.chrome,
      color: C.mint,
      align: "center",
      ls: 2,
      alpha: loopP,
    });
  }
}

// scene 09

function defaults(lt, sc) {
  const s = times(sc);
  head(sc, lt);

  const leftIn = smooth(span(lt, 0.2, 0.9));
  const panelP = smooth(span(lt, s[0].start - 0.1, s[0].start + 0.9));
  const motionP = smooth(span(lt, s[1].start - 0.2, s[1].start + 0.8));
  const keepsP = smooth(span(lt, s[2].start - 0.2, s[2].start + 0.8));
  const keyP = smooth(span(lt, s[3].start - 0.2, s[3].start + 0.8));
  const phoneP = smooth(span(lt, s[4].start - 0.2, s[4].start + 0.9));

  kicker("three ways", M.x, 164, C.coral, leftIn);
  statement("No dead ends.", M.x, 262, leftIn, T.title, C.ink);
  body("The same capture, three ways.", M.x, 326, 460, leftIn);

  const cards = [
    { x: M.x, y: 400, w: 520, h: 560, n: "01", name: "REDUCED MOTION", color: C.coral },
    { x: 680, y: 400, w: 520, h: 560, n: "02", name: "KEYBOARD", color: C.peach },
    { x: 1250, y: 400, w: 560, h: 560, n: "03", name: "PHONE", color: C.mint },
  ];
  cards.forEach((c, i) => {
    const p = panelP * smooth(span(lt, s[0].start + i * 0.16, s[0].start + 0.7 + i * 0.16));
    if (p <= 0) return;
    panel(c.x, c.y, c.w, c.h, {
      r: 14,
      fill: "rgba(8,12,24,0.7)",
      stroke: withAlpha(c.color, 0.22),
      lw: 1.2,
      alpha: p,
      glow: withAlpha(c.color, 0.05),
    });
    mono(c.n, c.x + 24, c.y + 40, {
      size: T.chrome,
      color: c.color,
      ls: 2,
      alpha: p,
    });
    mono(c.name, c.x + 24, c.y + 66, {
      size: T.chrome,
      color: C.dim,
      ls: 2,
      alpha: p,
    });
  });

  // quiet placeholders so the two later cards are never empty
  const holdP = 0.35 * (1 - keyP);
  if (holdP > 0.01) {
    ctx.save();
    ctx.globalAlpha *= holdP;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        rrect(704 + col * 160, 548 + row * 150, 118, 82, 10);
        ctx.strokeStyle = "rgba(244,241,234,0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    text("6 shortcuts", 940, 900, {
      size: T.caption,
      family: F.mono,
      color: C.faint,
      align: "center",
    });
    ctx.restore();
  }
  const phoneHoldP = 0.3 * (1 - phoneP);
  if (phoneHoldP > 0) {
    ctx.save();
    ctx.globalAlpha *= phoneHoldP;
    rrect(1370, 460, 216, 467, 18);
    ctx.strokeStyle = withAlpha(C.mint, 0.5);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    text("390 × 844", 1478, 720, {
      size: T.caption,
      family: F.mono,
      color: C.faint,
      align: "center",
    });
    ctx.restore();
  }

  // reduced motion
  const mx = M.x;
  const my = 500;
  const items = [
    ["flash", "no flash"],
    ["shake", "no shake"],
    ["entrance", "no entrance"],
  ];
  items.forEach(([name, sub], i) => {
    const p = motionP * smooth(span(lt, s[1].start + i * 0.22, s[1].start + 0.6 + i * 0.22));
    if (p <= 0) return;
    const y = my + i * 78;
    ctx.save();
    ctx.globalAlpha *= p;
    panel(mx + 24, y - 24, 472, 58, {
      r: 9,
      fill: "rgba(244,241,234,0.02)",
      stroke: "rgba(244,241,234,0.09)",
      lw: 1,
    });
    text(name, mx + 52, y + 12, {
      size: T.caption,
      family: F.mono,
      color: C.dim,
    });
    mono(sub, mx + 300, y + 12, {
      size: T.chrome,
      color: C.faint,
      align: "right",
    });
    line(mx + 44, y + 2, mx + 198, y - 10, withAlpha(C.peach, 0.85), 2.2);
    ctx.restore();
  });
  if (keepsP > 0) {
    const y = 760;
    ctx.save();
    ctx.globalAlpha *= keepsP;
    panel(mx + 24, y - 24, 472, 110, {
      r: 9,
      fill: withAlpha(C.coral, 0.05),
      stroke: withAlpha(C.coral, 0.25),
      lw: 1.1,
    });
    text("fade", mx + 52, y + 12, {
      size: T.caption,
      family: F.mono,
      color: C.ink,
    });
    mono("the freeze still works", mx + 92, y + 12, {
      size: T.chrome,
      color: C.coral,
    });
    // a simple fade curve
    for (let i = 0; i < 40; i++) {
      const p = i / 39;
      const alpha = 1 - p;
      dot(mx + 52 + p * 220, y + 50, 1.4, C.coral, keepsP * alpha);
    }
    mono("every tool still works", mx + 52, y + 86, {
      size: T.chrome,
      color: C.dim,
      alpha: keepsP,
    });
    ctx.restore();
  }

  // keyboard
  if (keyP > 0) {
    const keys = [
      ["C", "capture"],
      ["V", "select"],
      ["A", "arrow"],
      ["R", "box"],
      ["B", "blur"],
      ["Esc", "exit"],
    ];
    keys.forEach(([key, name], i) => {
      const p = keyP * smooth(span(lt, s[3].start + i * 0.1, s[3].start + 0.45 + i * 0.1));
      if (p <= 0) return;
      const col = i % 3;
      const row = Math.floor(i / 3);
      const kx = 704 + col * 160;
      const ky = 548 + row * 150;
      const press = i === 0 ? 0.5 + 0.5 * Math.sin(lt * 3.2) : 0;
      ctx.save();
      ctx.globalAlpha *= p;
      rrect(kx, ky, 118, 82, 10);
      ctx.fillStyle = "rgba(9,15,27,0.96)";
      ctx.fill();
      ctx.strokeStyle = withAlpha(C.peach, 0.3 + 0.3 * press);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      if (i === 0) {
        ring(kx + 59, ky + 41, 54, withAlpha(C.coral, 0.28), 1.2, p);
      }
      text(key, kx + 59, ky + 48, {
        size: key.length > 1 ? T.caption : T.title,
        weight: 500,
        family: F.mono,
        color: C.ink,
        align: "center",
      });
      mono(name, kx + 59, ky + 104, {
        size: T.chrome,
        color: C.faint,
        align: "center",
        ls: 1.6,
        alpha: p,
      });
      ctx.restore();
    });
    mono("focus is never lost", 704, 920, {
      size: T.chrome,
      color: C.peach,
      ls: 2,
      alpha: keyP,
    });
  }

  // phone
  if (phoneP > 0) {
    const px = 1370;
    const py = 440;
    const pw = 216;
    const ph = 467;
    ctx.save();
    ctx.globalAlpha *= phoneP;
    glow(px + pw / 2, py + ph / 2, pw * 0.9, C.mint, 0.1);
    panel(px - 6, py - 6, pw + 12, ph + 12, {
      r: 18,
      fill: "rgba(8,12,24,0.8)",
      stroke: withAlpha(C.mint, 0.26),
      lw: 1.2,
    });
    image("mobile", px, py, pw, ph, 1, 14);
    mono("390 × 844", px + pw / 2, py + ph + 26, {
      size: T.chrome,
      color: C.mint,
      align: "center",
      ls: 2,
    });
    mono("stacks, keeps touch", px + pw / 2, py + ph + 48, {
      size: T.chrome,
      color: C.faint,
      align: "center",
      alpha: 0.8,
    });
    ctx.restore();
  }
}

// scene 10

function closeScene(lt, sc) {
  const s = times(sc);
  head(sc, lt);

  const leftIn = smooth(span(lt, 0.2, 0.9));
  const selfP = smooth(span(lt, s[0].start + 0.2, s[0].start + 1.1));
  const zoomP = smooth(span(lt, s[1].start - 0.2, s[1].start + 1.0));
  const localP = smooth(span(lt, s[2].start - 0.2, s[2].start + 0.8));
  const finalP = smooth(span(lt, s[3].start - 0.1, s[3].start + 1.1));

  kicker("capture / prototype 01", M.x, 164, C.coral, leftIn * (1 - finalP));
  statement("One page.", M.x, 262, leftIn * (1 - finalP), T.title, C.ink);
  statement("One shutter.", M.x, 326, leftIn * (1 - finalP), T.title, C.coral);
  body("A local screenshot, drawn in place.", M.x, 394, 470, leftIn * (1 - finalP));

  // the page object
  const px = 760;
  const py = 140;
  const pw = 940;
  const ph = 588;
  const pageOut = 1 - zoomP;
  if (leftIn > 0) {
    shot("page", px, py, pw, ph, leftIn * pageOut, { color: C.coral, glowA: 0.14, r: 16 });
    cropMarks(px, py, pw, ph, C.coral, leftIn * pageOut, 24);
    text("CAPTURE / THE WHOLE PAGE", px, py - 20, {
      size: T.chrome,
      family: F.mono,
      color: C.dim,
      ls: 2,
      alpha: leftIn * pageOut,
    });
    // the stage region inside the page
    const stx = px + 0.484 * pw;
    const sty = py + 0.131 * ph;
    const stw = 0.498 * pw;
    const sth = 0.44 * ph;
    ctx.save();
    ctx.globalAlpha *= selfP * pageOut;
    ctx.strokeStyle = withAlpha(C.coral, 0.9);
    ctx.lineWidth = 1.4;
    rrect(stx, sty, stw, sth, 8);
    ctx.stroke();
    ring(stx + stw / 2, sty + sth / 2, stw * 0.7, withAlpha(C.coral, 0.18), 1.2, 1, [4, 8]);
    chip("the page", stx + stw / 2, sty - 14, C.coral, 1, { align: "center" });
    ctx.restore();
  }

  // the stage as the object
  const sx = 720;
  const sy = 150;
  const sw = 1030;
  const sh = 643;
  if (zoomP > 0) {
    shot("annotated", sx, sy, sw, sh, leftIn * zoomP, { color: C.coral, glowA: 0.16, r: 16 });
    cropMarks(sx, sy, sw, sh, C.coral, zoomP * 0.9, 22, 1.2);
    text("NORTHSTAR / CAPTURED", sx, sy - 20, {
      size: T.chrome,
      family: F.mono,
      color: C.dim,
      ls: 2,
      alpha: zoomP,
    });
    text("1 FRAME · 3 MARKS", sx + sw, sy - 20, {
      size: T.chrome,
      family: F.mono,
      color: C.coral,
      align: "right",
      ls: 2,
      alpha: zoomP,
    });
    if (localP > 0) {
      chip("local · 0 uploads", sx + 24, sy + sh + 36, C.mint, localP, { fill: true });
    }
  }

  // local proof
  if (localP > 0) {
    line(M.x, 512, M.x + 300 * localP, 512, withAlpha(C.mint, 0.35), 1.2);
    mono("pixels stay in the tab", M.x, 552, {
      size: T.chrome,
      color: C.mint,
      ls: 2,
      alpha: localP,
    });
    mono("requests: 0", M.x, 584, {
      size: T.chrome,
      color: C.faint,
      ls: 2,
      alpha: localP * 0.9,
    });
  }

  // the last line
  if (finalP > 0) {
    const dim = 1 - finalP * 0.94;
    ctx.save();
    ctx.globalAlpha *= dim;
    if (zoomP > 0) {
      shot("annotated", sx, sy, sw, sh, leftIn * zoomP, { color: C.coral, glowA: 0.12, r: 16 });
    }
    ctx.restore();

    // a quiet field for the last sentence
    ctx.save();
    ctx.globalAlpha *= finalP;
    const scrim = ctx.createRadialGradient(W / 2, 520, 160, W / 2, 520, 900);
    scrim.addColorStop(0, "rgba(7,10,21,0.92)");
    scrim.addColorStop(0.6, "rgba(7,10,21,0.78)");
    scrim.addColorStop(1, "rgba(7,10,21,0.55)");
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha *= finalP;
    glow(W / 2, 520, 580, C.coral, 0.08);
    text("The page", W / 2, 470, {
      size: T.display,
      family: F.serif,
      style: "italic",
      color: C.ink,
      align: "center",
    });
    text("is the screenshot.", W / 2, 582, {
      size: T.display,
      family: F.serif,
      style: "italic",
      color: C.coral,
      align: "center",
    });
    line(W / 2 - 160, 642, W / 2 + 160, 642, withAlpha(C.coral, 0.36), 1.2);
    mono("CAPTURE / PROTOTYPE 01", W / 2, 684, {
      size: T.chrome,
      color: C.faint,
      align: "center",
      ls: 3,
    });
    ctx.restore();
  }
}

// export

export const SCENES = {
  "cold-open": coldOpen,
  freeze,
  selection,
  marks,
  export: exportScene,
  sound: soundScene,
  clock: clockScene,
  "no-assets": noAssets,
  defaults,
  close: closeScene,
  __default(t, sc) {
    head(sc, t);
    statement(sc.seg.title ?? sc.id, M.x, 300, 1, T.title);
  },
};
