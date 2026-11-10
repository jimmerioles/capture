const SANS = '"Inter", "Helvetica Neue", Arial, sans-serif';
const MONO = '"JetBrains Mono", "SFMono-Regular", Consolas, monospace';

const C = {
  bgTop: "#0b1525",
  bgBottom: "#070e1a",
  topbar: "rgba(6, 12, 23, 0.72)",
  sidebar: "rgba(4, 9, 18, 0.42)",
  card: "rgba(15, 26, 45, 0.92)",
  cardTop: "rgba(20, 34, 58, 0.92)",
  border: "rgba(139, 177, 242, 0.14)",
  borderSoft: "rgba(139, 177, 242, 0.09)",
  ink: "#eef5ff",
  body: "#bdcce1",
  muted: "#8da1bf",
  dim: "#657a9b",
  faint: "#485d7e",
  ice: "#7fe7ff",
  iceSoft: "rgba(127, 231, 255, 0.14)",
  blue: "#5c7dff",
  green: "#6fe3b1",
  amber: "#f3c66b",
  red: "#ff8798",
  panelInk: "#07131f",
} as const;

type Ctx = CanvasRenderingContext2D;

function roundRectPath(
  ctx: Ctx,
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

function fillRoundRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | CanvasGradient,
): void {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokeRoundRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  stroke: string,
  lineWidth = 1,
): void {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawText(
  ctx: Ctx,
  value: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = "left",
  baseline: CanvasTextBaseline = "middle",
): void {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(value, x, y);
}

function smoothPath(ctx: Ctx, points: Array<{ x: number; y: number }>): void {
  if (points.length === 0) return;
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}

function wrapLines(
  ctx: Ctx,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (last && ctx.measureText(last).width > maxWidth) {
      let clipped = last;
      while (
        clipped.length > 1 &&
        ctx.measureText(`${clipped}…`).width > maxWidth
      ) {
        clipped = clipped.slice(0, -1);
      }
      lines[maxLines - 1] = `${clipped}…`;
    }
  }
  return lines;
}

function drawNavIcon(
  ctx: Ctx,
  kind: "overview" | "captures" | "notes" | "insights",
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.15;
  ctx.lineCap = "round";
  if (kind === "overview") {
    const cell = size * 0.38;
    const gap = size * 0.16;
    strokeRoundRect(ctx, x, y, cell, cell, 1.2, color, 1.1);
    fillRoundRect(ctx, x + cell + gap, y, cell, cell, 1.2, color);
    fillRoundRect(ctx, x, y + cell + gap, cell, cell, 1.2, color);
    strokeRoundRect(
      ctx,
      x + cell + gap,
      y + cell + gap,
      cell,
      cell,
      1.2,
      color,
      1.1,
    );
  } else if (kind === "captures") {
    ctx.beginPath();
    ctx.moveTo(x + size * 0.18, y + size * 0.38);
    ctx.lineTo(x + size * 0.18, y + size * 0.18);
    ctx.lineTo(x + size * 0.38, y + size * 0.18);
    ctx.moveTo(x + size * 0.62, y + size * 0.18);
    ctx.lineTo(x + size * 0.82, y + size * 0.18);
    ctx.lineTo(x + size * 0.82, y + size * 0.38);
    ctx.moveTo(x + size * 0.82, y + size * 0.62);
    ctx.lineTo(x + size * 0.82, y + size * 0.82);
    ctx.lineTo(x + size * 0.62, y + size * 0.82);
    ctx.moveTo(x + size * 0.38, y + size * 0.82);
    ctx.lineTo(x + size * 0.18, y + size * 0.82);
    ctx.lineTo(x + size * 0.18, y + size * 0.62);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + size * 0.5, y + size * 0.5, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "notes") {
    roundRectPath(
      ctx,
      x + size * 0.18,
      y + size * 0.12,
      size * 0.64,
      size * 0.76,
      2,
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + size * 0.31, y + size * 0.36);
    ctx.lineTo(x + size * 0.69, y + size * 0.36);
    ctx.moveTo(x + size * 0.31, y + size * 0.54);
    ctx.lineTo(x + size * 0.62, y + size * 0.54);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x + size * 0.25, y + size * 0.82);
    ctx.lineTo(x + size * 0.25, y + size * 0.48);
    ctx.moveTo(x + size * 0.5, y + size * 0.82);
    ctx.lineTo(x + size * 0.5, y + size * 0.22);
    ctx.moveTo(x + size * 0.75, y + size * 0.82);
    ctx.lineTo(x + size * 0.75, y + size * 0.38);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTopbar(ctx: Ctx, w: number, topH: number, compact: boolean): void {
  const grad = ctx.createLinearGradient(0, 0, 0, topH);
  grad.addColorStop(0, "rgba(13, 24, 42, 0.96)");
  grad.addColorStop(1, "rgba(7, 14, 26, 0.96)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, topH);

  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, topH - 0.5);
  ctx.lineTo(w, topH - 0.5);
  ctx.stroke();

  const cy = topH / 2;
  const startX = compact ? 12 : 15;
  [
    "rgba(255, 124, 143, 0.78)",
    "rgba(243, 198, 107, 0.72)",
    "rgba(111, 227, 177, 0.72)",
  ].forEach((color, index) => {
    ctx.beginPath();
    ctx.arc(startX + index * 11, cy, 3.1, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });

  const dividerX = startX + 30;
  ctx.strokeStyle = C.borderSoft;
  ctx.beginPath();
  ctx.moveTo(dividerX, cy - 7);
  ctx.lineTo(dividerX, cy + 7);
  ctx.stroke();

  const brandX = dividerX + 12;
  const markSize = 13;
  ctx.save();
  ctx.strokeStyle = C.ice;
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(brandX + 3, cy - markSize / 2);
  ctx.lineTo(brandX + 0.5, cy - markSize / 2);
  ctx.lineTo(brandX + 0.5, cy - markSize / 2 + 2.6);
  ctx.moveTo(brandX + markSize - 3, cy - markSize / 2);
  ctx.lineTo(brandX + markSize - 0.5, cy - markSize / 2);
  ctx.lineTo(brandX + markSize - 0.5, cy - markSize / 2 + 2.6);
  ctx.moveTo(brandX + markSize - 0.5, cy + markSize / 2 - 2.6);
  ctx.lineTo(brandX + markSize - 0.5, cy + markSize / 2);
  ctx.lineTo(brandX + markSize - 3, cy + markSize / 2);
  ctx.moveTo(brandX + 3, cy + markSize / 2);
  ctx.lineTo(brandX + 0.5, cy + markSize / 2);
  ctx.lineTo(brandX + 0.5, cy + markSize / 2 - 2.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = C.ice;
  ctx.arc(brandX + markSize / 2, cy, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const brandFont = `600 ${compact ? 10 : 11}px ${SANS}`;
  drawText(ctx, "Northstar", brandX + markSize + 7, cy + 0.5, brandFont, C.ink);

  if (!compact) {
    ctx.font = brandFont;
    const brandWidth = ctx.measureText("Northstar").width;
    const tabs = ["Overview", "Captures", "Notes"];
    let tabX = brandX + markSize + 7 + brandWidth + 26;
    const tabFont = `500 10.5px ${SANS}`;
    ctx.font = tabFont;
    const available = w - 260;
    for (let i = 0; i < tabs.length; i += 1) {
      const label = tabs[i];
      const labelWidth = ctx.measureText(label).width;
      if (tabX + labelWidth > available) break;
      const active = i === 0;
      if (active) {
        fillRoundRect(
          ctx,
          tabX - 8,
          cy - 11,
          labelWidth + 16,
          22,
          5,
          "rgba(127, 231, 255, 0.07)",
        );
      }
      drawText(ctx, label, tabX, cy + 0.5, tabFont, active ? C.ink : C.muted);
      if (active) {
        ctx.fillStyle = C.ice;
        ctx.fillRect(tabX, topH - 1, labelWidth, 1.4);
      }
      tabX += labelWidth + 22;
    }
  }

  const avatarR = compact ? 9.5 : 10.5;
  const avatarX = w - (compact ? 16 : 20) - avatarR;
  const searchWidth = compact ? 0 : Math.min(136, Math.max(96, w * 0.17));
  if (!compact) {
    const searchX = avatarX - avatarR - 12 - searchWidth;
    drawText(
      ctx,
      "⌘K",
      searchX + searchWidth - 9,
      cy,
      `500 6.5px ${MONO}`,
      C.faint,
      "right",
    );
    fillRoundRect(
      ctx,
      searchX,
      cy - 11,
      searchWidth,
      22,
      5.5,
      "rgba(10, 19, 33, 0.8)",
    );
    strokeRoundRect(ctx, searchX, cy - 11, searchWidth, 22, 5.5, C.borderSoft);
    ctx.save();
    ctx.strokeStyle = C.dim;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(searchX + 11, cy - 0.5, 3.2, 0, Math.PI * 2);
    ctx.moveTo(searchX + 13.4, cy + 1.9);
    ctx.lineTo(searchX + 15.8, cy + 4.2);
    ctx.stroke();
    ctx.restore();
    drawText(ctx, "Search", searchX + 20, cy + 0.5, `400 8.5px ${SANS}`, C.dim);
  }

  const avatarGradient = ctx.createLinearGradient(
    avatarX - avatarR,
    cy - avatarR,
    avatarX + avatarR,
    cy + avatarR,
  );
  avatarGradient.addColorStop(0, "#b9f3ff");
  avatarGradient.addColorStop(1, "#6e8cff");
  ctx.beginPath();
  ctx.arc(avatarX, cy, avatarR, 0, Math.PI * 2);
  ctx.fillStyle = avatarGradient;
  ctx.fill();
  drawText(
    ctx,
    "AL",
    avatarX,
    cy + 0.4,
    `600 ${compact ? 6.5 : 7}px ${SANS}`,
    C.panelInk,
    "center",
  );
  ctx.beginPath();
  ctx.arc(avatarX + avatarR - 1, cy + avatarR - 2, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#132033";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(avatarX + avatarR - 1, cy + avatarR - 2, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = C.green;
  ctx.fill();
}

function drawSidebar(
  ctx: Ctx,
  h: number,
  topH: number,
  sidebarW: number,
  pulse: number,
): void {
  ctx.fillStyle = C.sidebar;
  ctx.fillRect(0, topH, sidebarW, h - topH);
  ctx.strokeStyle = C.borderSoft;
  ctx.beginPath();
  ctx.moveTo(sidebarW - 0.5, topH);
  ctx.lineTo(sidebarW - 0.5, h);
  ctx.stroke();

  const x = 13;
  let y = topH + 17;
  drawText(ctx, "WORKSPACE", x, y, `500 6.5px ${MONO}`, C.faint);

  y += 16;
  const nav: Array<{
    label: string;
    icon: "overview" | "captures" | "notes" | "insights";
  }> = [
    { label: "Overview", icon: "overview" },
    { label: "Captures", icon: "captures" },
    { label: "Notes", icon: "notes" },
    { label: "Insights", icon: "insights" },
  ];

  for (const item of nav) {
    const active = item.label === "Overview";
    if (active) {
      fillRoundRect(
        ctx,
        7,
        y - 10,
        sidebarW - 14,
        25,
        5,
        "rgba(127, 231, 255, 0.075)",
      );
      ctx.fillStyle = C.ice;
      ctx.fillRect(7, y - 7, 1.6, 19);
    }
    drawNavIcon(ctx, item.icon, x + 2, y - 5, 11, active ? C.ice : C.dim);
    drawText(
      ctx,
      item.label,
      x + 21,
      y + 0.5,
      `500 9.5px ${SANS}`,
      active ? C.ink : C.muted,
    );
    if (active) {
      ctx.beginPath();
      ctx.arc(sidebarW - 17, y + 0.5, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = C.ice;
      ctx.fill();
    }
    y += 28;
  }

  y += 12;
  drawText(ctx, "COLLECTIONS", x, y, `500 6.5px ${MONO}`, C.faint);
  y += 16;

  const collections = [
    { label: "Product launch", color: C.ice },
    { label: "Growth lab", color: C.blue },
    { label: "Design crits", color: C.amber },
  ];
  for (const item of collections) {
    ctx.beginPath();
    ctx.arc(x + 3, y, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = item.color;
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.globalAlpha = 1;
    drawText(ctx, item.label, x + 12, y + 0.5, `400 9px ${SANS}`, C.muted);
    y += 21;
  }

  const cardY = h - 52;
  if (cardY > y + 8) {
    fillRoundRect(
      ctx,
      11,
      cardY,
      sidebarW - 22,
      38,
      6,
      "rgba(13, 24, 41, 0.7)",
    );
    strokeRoundRect(ctx, 11, cardY, sidebarW - 22, 38, 6, C.borderSoft);
    drawText(ctx, "Storage", 19, cardY + 12, `500 7px ${MONO}`, C.dim);
    drawText(
      ctx,
      "2.4 / 5 GB",
      sidebarW - 19,
      cardY + 12,
      `500 7px ${MONO}`,
      C.faint,
      "right",
    );
    fillRoundRect(
      ctx,
      19,
      cardY + 24,
      sidebarW - 38,
      3,
      2,
      "rgba(127, 231, 255, 0.12)",
    );
    fillRoundRect(
      ctx,
      19,
      cardY + 24,
      (sidebarW - 38) * (0.42 + pulse * 0.02),
      3,
      2,
      "rgba(127, 231, 255, 0.72)",
    );
  }
}

function drawMiniSparkline(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  values: number[],
  color: string,
): void {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((value, index) => ({
    x: x + (index / (values.length - 1)) * w,
    y: y + h - ((value - min) / range) * h,
  }));
  ctx.save();
  ctx.beginPath();
  smoothPath(ctx, pts);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 1.1;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  const last = pts[pts.length - 1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, 1.7, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = 1;
  ctx.fill();
  ctx.restore();
}

type Metric = {
  label: string;
  value: string;
  delta: string;
  tone: "up" | "down";
  color: string;
  spark: number[];
};

function drawMetrics(
  ctx: Ctx,
  x: number,
  y: number,
  width: number,
  height: number,
  compact: boolean,
): void {
  const metrics: Metric[] = [
    {
      label: "ACTIVE USERS",
      value: "12,846",
      delta: "+8.2%",
      tone: "up",
      color: C.ice,
      spark: [10, 14, 12, 18, 17, 24, 27, 26, 32],
    },
    {
      label: "SESSIONS",
      value: "38,291",
      delta: "+4.6%",
      tone: "up",
      color: C.blue,
      spark: [16, 13, 17, 16, 22, 20, 27, 25, 30],
    },
    {
      label: "RETENTION",
      value: "72.4%",
      delta: "−1.2%",
      tone: "down",
      color: C.amber,
      spark: [28, 26, 29, 24, 26, 22, 23, 21, 20],
    },
  ];

  const visible = compact ? metrics.slice(0, 2) : metrics;
  const gap = compact ? 7 : 9;
  const cardW = (width - gap * (visible.length - 1)) / visible.length;
  const radius = 7;

  for (let i = 0; i < visible.length; i += 1) {
    const metric = visible[i];
    const cx = x + i * (cardW + gap);
    const grad = ctx.createLinearGradient(cx, y, cx, y + height);
    grad.addColorStop(0, C.cardTop);
    grad.addColorStop(1, C.card);
    fillRoundRect(ctx, cx, y, cardW, height, radius, grad);
    strokeRoundRect(
      ctx,
      cx + 0.5,
      y + 0.5,
      cardW - 1,
      height - 1,
      radius,
      C.borderSoft,
    );

    drawText(
      ctx,
      metric.label,
      cx + (compact ? 8 : 10),
      y + (compact ? 10 : 12),
      `500 ${compact ? 5.8 : 6.6}px ${MONO}`,
      C.dim,
    );

    drawText(
      ctx,
      metric.delta,
      cx + cardW - (compact ? 8 : 10),
      y + (compact ? 10 : 12),
      `500 ${compact ? 6 : 6.8}px ${MONO}`,
      metric.tone === "up" ? C.green : C.amber,
      "right",
    );

    drawText(
      ctx,
      metric.value,
      cx + (compact ? 8 : 10),
      y + height - (compact ? 11 : 13),
      `600 ${compact ? 15 : 19}px ${SANS}`,
      C.ink,
      "left",
      "alphabetic",
    );

    const sparkW = compact ? 34 : Math.min(46, cardW * 0.34);
    const sparkH = compact ? 12 : 16;
    drawMiniSparkline(
      ctx,
      cx + cardW - sparkW - (compact ? 8 : 10),
      y + height - sparkH - (compact ? 8 : 11),
      sparkW,
      sparkH,
      metric.spark,
      metric.color,
    );
  }
}

function drawChartHeader(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  compact: boolean,
  pulse: number,
): void {
  drawText(
    ctx,
    "Signal volume",
    x + 11,
    y + (compact ? 11 : 13),
    `600 ${compact ? 9 : 10.5}px ${SANS}`,
    C.ink,
  );

  if (!compact) {
    ctx.font = `500 10.5px ${SANS}`;
    const titleW = ctx.measureText("Signal volume").width;
    drawText(
      ctx,
      "LAST 7 DAYS",
      x + 17 + titleW,
      y + 13,
      `500 5.9px ${MONO}`,
      C.faint,
    );

    let legendX = x + w - 12;
    drawText(
      ctx,
      "Notes",
      legendX,
      y + 13,
      `400 7.5px ${SANS}`,
      C.muted,
      "right",
    );
    ctx.font = `400 7.5px ${SANS}`;
    legendX -= ctx.measureText("Notes").width + 8;
    ctx.beginPath();
    ctx.arc(legendX, y + 13, 2.3, 0, Math.PI * 2);
    ctx.fillStyle = C.blue;
    ctx.fill();
    legendX -= 10;
    drawText(
      ctx,
      "Captures",
      legendX,
      y + 13,
      `400 7.5px ${SANS}`,
      C.muted,
      "right",
    );
    ctx.font = `400 7.5px ${SANS}`;
    legendX -= ctx.measureText("Captures").width + 8;
    ctx.beginPath();
    ctx.arc(legendX, y + 13, 2.3, 0, Math.PI * 2);
    ctx.fillStyle = C.ice;
    ctx.fill();
  } else {
    drawText(
      ctx,
      "LIVE",
      x + w - 11,
      y + 11,
      `500 5.8px ${MONO}`,
      C.green,
      "right",
    );
    ctx.beginPath();
    ctx.arc(x + w - 13 - 13, y + 11, 1.7, 0, Math.PI * 2);
    ctx.fillStyle = C.green;
    ctx.globalAlpha = 0.55 + pulse * 0.45;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawChart(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  compact: boolean,
  time: number,
  pulse: number,
): void {
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, C.cardTop);
  grad.addColorStop(1, C.card);
  fillRoundRect(ctx, x, y, w, h, 8, grad);
  strokeRoundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 8, C.borderSoft);

  const headerH = compact ? 25 : 31;
  drawChartHeader(ctx, x, y, w, compact, pulse);

  ctx.strokeStyle = C.borderSoft;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 1, y + headerH);
  ctx.lineTo(x + w - 1, y + headerH);
  ctx.stroke();

  const showYAxis = !compact && w > 300;
  const leftPad = showYAxis ? 29 : 11;
  const rightPad = 12;
  const topPad = compact ? 9 : 13;
  const bottomPad = compact ? 15 : 21;
  const plotX = x + leftPad;
  const plotY = y + headerH + topPad;
  const plotW = w - leftPad - rightPad;
  const plotH = h - headerH - topPad - bottomPad;
  if (plotW < 40 || plotH < 26) return;

  const captures = [2180, 2940, 2660, 4140, 3860, 5310, 6070];
  const notes = [940, 1420, 1300, 2620, 2160, 3220, 3620];
  const maxValue = 6800;

  // Horizontal grid.
  const gridLines = compact ? 3 : 4;
  for (let i = 0; i < gridLines; i += 1) {
    const t = i / (gridLines - 1);
    const gy = plotY + t * plotH;
    ctx.strokeStyle =
      i === gridLines - 1 ? "rgba(139, 177, 242, 0.16)" : C.borderSoft;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotX, gy + 0.5);
    ctx.lineTo(plotX + plotW, gy + 0.5);
    ctx.stroke();
    if (showYAxis) {
      drawText(
        ctx,
        i === gridLines - 1 ? "0" : `${Math.round(maxValue * (1 - t)) / 1000}k`,
        plotX - 9,
        gy,
        `400 6px ${MONO}`,
        C.faint,
        "right",
      );
    }
  }

  const pointFor = (values: number[], index: number) => ({
    x: plotX + (index / (values.length - 1)) * plotW,
    y: plotY + plotH - (values[index] / maxValue) * plotH,
  });
  const capturePoints = captures.map((_, index) => pointFor(captures, index));
  const notePoints = notes.map((_, index) => pointFor(notes, index));

  // Area under the capture line.
  ctx.save();
  ctx.beginPath();
  smoothPath(ctx, capturePoints);
  ctx.lineTo(plotX + plotW, plotY + plotH);
  ctx.lineTo(plotX, plotY + plotH);
  ctx.closePath();
  const area = ctx.createLinearGradient(0, plotY, 0, plotY + plotH);
  area.addColorStop(0, "rgba(127, 231, 255, 0.24)");
  area.addColorStop(0.7, "rgba(94, 166, 255, 0.06)");
  area.addColorStop(1, "rgba(94, 166, 255, 0)");
  ctx.fillStyle = area;
  ctx.fill();
  ctx.restore();

  // Secondary line.
  ctx.save();
  ctx.beginPath();
  smoothPath(ctx, notePoints);
  ctx.strokeStyle = "rgba(92, 125, 255, 0.8)";
  ctx.lineWidth = 1.15;
  ctx.setLineDash([3, 3.5]);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();

  // Primary line with a soft under-stroke.
  ctx.save();
  ctx.beginPath();
  smoothPath(ctx, capturePoints);
  ctx.strokeStyle = "rgba(127, 231, 255, 0.16)";
  ctx.lineWidth = compact ? 4 : 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.beginPath();
  smoothPath(ctx, capturePoints);
  ctx.strokeStyle = C.ice;
  ctx.lineWidth = compact ? 1.5 : 1.8;
  ctx.stroke();
  ctx.restore();

  // Highlight Thursday.
  const highlightIndex = 3;
  const highlight = capturePoints[highlightIndex];
  ctx.save();
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = "rgba(127, 231, 255, 0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(highlight.x, plotY);
  ctx.lineTo(highlight.x, plotY + plotH);
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(highlight.x, highlight.y, compact ? 2.2 : 2.6, 0, Math.PI * 2);
  ctx.fillStyle = "#dffbff";
  ctx.fill();
  ctx.strokeStyle = "#0b1728";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  if (!compact && plotH > 76) {
    const tipText = "Thu · 4,140";
    ctx.font = `500 7px ${MONO}`;
    const tipW = ctx.measureText(tipText).width + 14;
    const tipH = 20;
    const tipX = Math.min(
      Math.max(highlight.x - tipW / 2, x + 6),
      x + w - tipW - 6,
    );
    const tipY = Math.max(y + headerH + 4, highlight.y - tipH - 10);
    fillRoundRect(ctx, tipX, tipY, tipW, tipH, 4.5, "rgba(6, 13, 25, 0.96)");
    strokeRoundRect(
      ctx,
      tipX + 0.5,
      tipY + 0.5,
      tipW - 1,
      tipH - 1,
      4.5,
      C.border,
    );
    drawText(
      ctx,
      tipText,
      tipX + 7,
      tipY + tipH / 2 + 0.5,
      `500 7px ${MONO}`,
      C.ink,
    );
  }

  // X labels.
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const labelFont = `400 ${compact ? 5.5 : 6.1}px ${MONO}`;
  for (let i = 0; i < labels.length; i += 1) {
    const px = capturePoints[i].x;
    drawText(
      ctx,
      labels[i],
      px,
      plotY + plotH + (compact ? 8 : 10),
      labelFont,
      i === highlightIndex ? C.muted : C.faint,
      "center",
    );
  }

  // Live endpoint.
  const last = capturePoints[capturePoints.length - 1];
  const ring = 3.2 + pulse * 5;
  ctx.beginPath();
  ctx.arc(last.x, last.y, ring, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(127, 231, 255, 0.38)";
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.8 * (1 - pulse);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(last.x, last.y, 2.8, 0, Math.PI * 2);
  ctx.fillStyle = C.ice;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(last.x, last.y, 1.2, 0, Math.PI * 2);
  ctx.fillStyle = "#f4feff";
  ctx.fill();

  // A very quiet scan pass to make the preview feel alive.
  if (!compact) {
    const scanX = plotX + ((time * 0.035) % 1) * plotW;
    const scan = ctx.createLinearGradient(scanX - 24, 0, scanX + 4, 0);
    scan.addColorStop(0, "rgba(127, 231, 255, 0)");
    scan.addColorStop(0.9, "rgba(127, 231, 255, 0.055)");
    scan.addColorStop(1, "rgba(127, 231, 255, 0)");
    ctx.fillStyle = scan;
    ctx.fillRect(scanX - 24, plotY, 28, plotH);
  }
}

type Note = {
  initials: string;
  name: string;
  time: string;
  text: string;
  color: string;
};

function drawNotes(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  pulse: number,
): void {
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, C.cardTop);
  grad.addColorStop(1, C.card);
  fillRoundRect(ctx, x, y, w, h, 8, grad);
  strokeRoundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 8, C.borderSoft);

  drawText(ctx, "Review notes", x + 11, y + 13, `600 9.5px ${SANS}`, C.ink);
  fillRoundRect(ctx, x + w - 25, y + 7, 15, 13, 4, "rgba(127, 231, 255, 0.08)");
  drawText(
    ctx,
    "3",
    x + w - 17.5,
    y + 13.7,
    `500 6.5px ${MONO}`,
    C.ice,
    "center",
  );

  ctx.strokeStyle = C.borderSoft;
  ctx.beginPath();
  ctx.moveTo(x + 1, y + 26);
  ctx.lineTo(x + w - 1, y + 26);
  ctx.stroke();

  const notes: Note[] = [
    {
      initials: "MC",
      name: "Maya Chen",
      time: "2m",
      text: "The landing pass reads clean. Let’s ship the chart label fix.",
      color: C.ice,
    },
    {
      initials: "JR",
      name: "Jonas Reed",
      time: "9m",
      text: "Blur the account email before this goes out.",
      color: C.blue,
    },
  ];

  let noteY = y + 38;
  const maxNoteY = y + h - 40;
  for (const note of notes) {
    if (noteY > maxNoteY - 28) break;
    ctx.beginPath();
    ctx.arc(x + 19, noteY + 6, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(127, 231, 255, 0.1)";
    ctx.fill();
    if (note.color === C.blue) {
      ctx.fillStyle = "rgba(92, 125, 255, 0.13)";
      ctx.fill();
    }
    drawText(
      ctx,
      note.initials,
      x + 19,
      noteY + 6.5,
      `600 5.8px ${SANS}`,
      note.color,
      "center",
    );
    drawText(ctx, note.name, x + 32, noteY + 1, `600 7.2px ${SANS}`, C.body);
    drawText(
      ctx,
      note.time,
      x + w - 11,
      noteY + 1,
      `400 5.8px ${MONO}`,
      C.faint,
      "right",
    );

    ctx.font = `400 7.2px ${SANS}`;
    const lines = wrapLines(ctx, note.text, w - 43, 3);
    lines.forEach((line, index) => {
      drawText(
        ctx,
        line,
        x + 32,
        noteY + 13 + index * 10,
        `400 7.2px ${SANS}`,
        C.muted,
      );
    });
    noteY += 19 + lines.length * 10;
  }

  const inputY = y + h - 27;
  ctx.strokeStyle = C.borderSoft;
  ctx.beginPath();
  ctx.moveTo(x + 1, inputY - 8);
  ctx.lineTo(x + w - 1, inputY - 8);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x + 18, inputY + 4, 6.2, 0, Math.PI * 2);
  ctx.strokeStyle = C.faint;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = C.dim;
  ctx.beginPath();
  ctx.moveTo(x + 15, inputY + 4);
  ctx.lineTo(x + 21, inputY + 4);
  ctx.moveTo(x + 18, inputY + 1);
  ctx.lineTo(x + 18, inputY + 7);
  ctx.stroke();

  drawText(ctx, "Add a note…", x + 31, inputY + 4, `400 7px ${SANS}`, C.dim);
  if (pulse > 0.5) {
    ctx.fillStyle = "rgba(127, 231, 255, 0.55)";
    ctx.fillRect(x + 31 + 47, inputY - 1, 1, 10);
  }
}

export function drawPreview(
  ctx: Ctx,
  w: number,
  h: number,
  time: number,
): void {
  const compact = w < 560;
  const pulse = 0.5 + 0.5 * Math.sin(time * 2.1);
  ctx.clearRect(0, 0, w, h);

  const background = ctx.createLinearGradient(0, 0, w * 0.35, h);
  background.addColorStop(0, C.bgTop);
  background.addColorStop(0.55, "#091322");
  background.addColorStop(1, C.bgBottom);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const halo = ctx.createRadialGradient(
    w * 0.75,
    -h * 0.15,
    0,
    w * 0.75,
    -h * 0.15,
    h * 0.95,
  );
  halo.addColorStop(0, "rgba(53, 116, 255, 0.18)");
  halo.addColorStop(0.55, "rgba(43, 91, 200, 0.05)");
  halo.addColorStop(1, "rgba(6, 12, 23, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  const topH = compact ? 34 : Math.max(38, Math.min(46, h * 0.095));
  drawTopbar(ctx, w, topH, compact);

  const sidebarW = compact ? 0 : Math.max(120, Math.min(158, w * 0.2));
  if (!compact) drawSidebar(ctx, h, topH, sidebarW, pulse);

  const pad = compact ? 12 : 18;
  const left = compact ? pad : sidebarW + 16;
  const right = w - pad;
  const contentW = right - left;
  let cursorY = topH + (compact ? 10 : 16);

  // Breadcrumb + page header.
  if (!compact) {
    drawText(
      ctx,
      "WORKSPACE  /  WEEKLY REVIEW",
      left,
      cursorY + 2,
      `500 5.9px ${MONO}`,
      C.faint,
    );
  }

  const titleY = cursorY + (compact ? 8 : 12);
  drawText(
    ctx,
    "Weekly review",
    left,
    titleY + (compact ? 7 : 9),
    `600 ${compact ? 15 : 20}px ${SANS}`,
    C.ink,
  );

  if (compact) {
    fillRoundRect(
      ctx,
      right - 22,
      titleY - 1,
      22,
      22,
      5,
      "rgba(127, 231, 255, 0.1)",
    );
    strokeRoundRect(
      ctx,
      right - 21.5,
      titleY - 0.5,
      21,
      21,
      5,
      "rgba(127, 231, 255, 0.18)",
    );
    drawText(
      ctx,
      "+",
      right - 11,
      titleY + 10.5,
      `400 13px ${SANS}`,
      C.ice,
      "center",
    );
  } else {
    const primaryW = 88;
    const primaryX = right - primaryW;
    const primaryY = titleY + 2;
    fillRoundRect(ctx, primaryX, primaryY, primaryW, 23, 5.5, C.ice);
    drawText(
      ctx,
      "+",
      primaryX + 12,
      primaryY + 12,
      `500 12px ${SANS}`,
      C.panelInk,
      "center",
    );
    drawText(
      ctx,
      "New capture",
      primaryX + 19,
      primaryY + 12,
      `600 8px ${SANS}`,
      C.panelInk,
    );

    const dateW = 80;
    const dateX = primaryX - 9 - dateW;
    fillRoundRect(
      ctx,
      dateX,
      primaryY,
      dateW,
      23,
      5.5,
      "rgba(12, 22, 38, 0.8)",
    );
    strokeRoundRect(
      ctx,
      dateX + 0.5,
      primaryY + 0.5,
      dateW - 1,
      22,
      5.5,
      C.borderSoft,
    );
    drawText(
      ctx,
      "May 12 – 18",
      dateX + 10,
      primaryY + 12,
      `500 7.5px ${MONO}`,
      C.muted,
    );
    drawText(
      ctx,
      "⌄",
      dateX + dateW - 10,
      primaryY + 11,
      `400 8px ${SANS}`,
      C.dim,
      "center",
    );
  }

  const headerH = compact ? 28 : 38;
  const metricsY = cursorY + headerH + (compact ? 8 : 12);
  const metricH = compact ? 44 : Math.max(54, Math.min(72, h * 0.165));
  drawMetrics(ctx, left, metricsY, contentW, metricH, compact);

  const chartY = metricsY + metricH + (compact ? 8 : 11);
  const bottom = h - (compact ? 12 : 16);
  const chartH = bottom - chartY;

  if (chartH < 50) return;

  if (compact) {
    drawChart(ctx, left, chartY, contentW, chartH, true, time, pulse);
  } else {
    const notesW = Math.max(154, Math.min(212, contentW * 0.31));
    const gap = 10;
    const chartW = contentW - notesW - gap;
    drawChart(ctx, left, chartY, chartW, chartH, false, time, pulse);
    drawNotes(ctx, left + chartW + gap, chartY, notesW, chartH, pulse);
  }
}

type PreviewRendererOptions = {
  onFrame?: () => void;
};

/**
 * Draws the sample app and runs its ambient animation only while the canvas is
 * visible, the tab is active, and the renderer is enabled.
 */
export class PreviewRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: Ctx;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private raf = 0;
  private lastPaint = 0;
  private startedAt = performance.now();
  private active = true;
  private inView = true;
  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;
  private motionQuery: MediaQueryList;
  private options: PreviewRendererOptions;

  constructor(canvas: HTMLCanvasElement, options: PreviewRendererOptions = {}) {
    this.canvas = canvas;
    this.options = options;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Capture: Canvas 2D is unavailable.");
    this.ctx = ctx;
    this.motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        this.inView = entries.some((entry) => entry.isIntersecting);
        this.sync();
      },
      { threshold: 0.01, rootMargin: "80px" },
    );
    this.intersectionObserver.observe(canvas);

    document.addEventListener("visibilitychange", this.onVisibility);
    this.motionQuery.addEventListener("change", this.sync);
    window.addEventListener("resize", this.resize);

    this.resize();
    void document.fonts?.ready.then(() => {
      this.render(this.elapsed());
    });
  }

  private elapsed(): number {
    return (performance.now() - this.startedAt) / 1000;
  }

  private onVisibility = (): void => {
    this.sync();
  };

  private resize = (): void => {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));
    if (
      this.canvas.width !== pixelWidth ||
      this.canvas.height !== pixelHeight
    ) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
      this.options.onFrame?.();
    }
    this.render(this.elapsed());
  };

  private render(time: number): void {
    if (this.width < 2 || this.height < 2) return;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawPreview(
      ctx,
      this.width,
      this.height,
      this.motionQuery.matches ? 0.42 : time,
    );
  }

  private tick = (now: number): void => {
    if (!this.active) return;
    this.raf = requestAnimationFrame(this.tick);
    if (now - this.lastPaint < 33) return;
    this.lastPaint = now;
    this.render(this.elapsed());
  };

  private sync = (): void => {
    const shouldRun =
      this.active &&
      this.inView &&
      document.visibilityState === "visible" &&
      !this.motionQuery.matches;
    if (shouldRun && !this.raf) {
      this.lastPaint = 0;
      this.raf = requestAnimationFrame(this.tick);
    } else if (!shouldRun && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.render(this.elapsed());
    }
  };

  setActive(active: boolean): void {
    this.active = active;
    if (!active && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    this.sync();
  }

  refresh(): void {
    this.resize();
  }

  get pixelWidth(): number {
    return this.canvas.width;
  }
}
