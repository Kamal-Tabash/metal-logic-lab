import { EN } from "../i18n";
// Drafting kit shared by every tool. World units are millimetres with y up,
// as on a drawing sheet. The scale is always derived from the size of the
// panel, never fixed, so a drawing fits a 360 px phone and a 1920 px screen.

export interface Rect { x: number; y: number; w: number; h: number }
export interface Bounds { x0: number; y0: number; x1: number; y1: number }
export type Pt = [number, number];

export interface Ink {
  sheet: string; grid: string; gridMajor: string; line: string; muted: string;
  gold: string; goldDim: string; warn: string; ok: string; stone: string; stoneDim: string;
  mono: string; body: string; display: string;
}

export function readInk(): Ink {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
  return {
    sheet: v("--sheet", "#181b20"), grid: v("--grid", "#20242b"), gridMajor: v("--grid-major", "#2b3039"),
    line: v("--line", "#d4d7dc"), muted: v("--muted", "#8d939c"), gold: v("--gold", "#d6a24a"),
    goldDim: v("--gold-dim", "#8f6c30"), warn: v("--warn", "#e2725b"), ok: v("--ok", "#86b88c"),
    stone: v("--stone", "#8fa8c8"), stoneDim: v("--stone-dim", "#5f7491"),
    mono: v("--f-mono", "monospace"), body: v("--f-body", "serif"), display: v("--f-display", "sans-serif"),
  };
}

export class Sheet {
  readonly ink: Ink;
  constructor(readonly ctx: CanvasRenderingContext2D, readonly w: number, readonly h: number) {
    this.ink = readInk();
  }

  static prepare(canvas: HTMLCanvasElement): Sheet | null {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const s = new Sheet(ctx, w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = s.ink.sheet;
    ctx.fillRect(0, 0, w, h);
    return s;
  }

  view(r: Rect): View { return new View(this, r); }

  /** Text in screen pixels. Arabic is drawn right-to-left, numbers left-to-right. */
  text(str: string, x: number, y: number, o: TextOpts = {}) {
    const c = this.ctx;
    c.save();
    c.font = `${o.weight ?? 400} ${o.size ?? 12}px ${o.mono ? this.ink.mono : o.display ? this.ink.display : this.ink.body}`;
    c.fillStyle = o.color ?? this.ink.muted;
    c.textAlign = o.align ?? "center";
    c.textBaseline = o.base ?? "middle";
    c.direction = o.mono || EN ? "ltr" : "rtl";
    if (o.halo) { c.lineWidth = 4; c.strokeStyle = this.ink.sheet; c.lineJoin = "round"; c.strokeText(str, x, y); }
    c.fillText(str, x, y);
    c.restore();
  }

  measure(str: string, o: TextOpts = {}): number {
    const c = this.ctx;
    c.save();
    c.font = `${o.weight ?? 400} ${o.size ?? 12}px ${o.mono ? this.ink.mono : this.ink.body}`;
    const m = c.measureText(str).width;
    c.restore();
    return m;
  }

  rule(x0: number, y0: number, x1: number, y1: number, color = this.ink.gridMajor) {
    const c = this.ctx;
    c.save(); c.strokeStyle = color; c.lineWidth = 1;
    c.beginPath(); c.moveTo(Math.round(x0) + 0.5, Math.round(y0) + 0.5); c.lineTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5); c.stroke();
    c.restore();
  }
}

export interface TextOpts {
  size?: number; color?: string; mono?: boolean; display?: boolean; weight?: number;
  align?: CanvasTextAlign; base?: CanvasTextBaseline; halo?: boolean;
}

export interface StrokeOpts { color?: string; width?: number; dash?: number[] }

export class View {
  sx = 1; sy = 1; ox = 0; oy = 0;
  readonly ctx: CanvasRenderingContext2D;
  readonly ink: Ink;
  constructor(readonly sheet: Sheet, readonly r: Rect) {
    this.ctx = sheet.ctx;
    this.ink = sheet.ink;
  }

  /** Equal scale on both axes (a drawing). */
  fit(b: Bounds, pad = 24): this {
    const s = Math.min((this.r.w - 2 * pad) / (b.x1 - b.x0), (this.r.h - 2 * pad) / (b.y1 - b.y0));
    this.sx = this.sy = Math.max(s, 0.0001);
    this.ox = this.r.x + this.r.w / 2 - ((b.x0 + b.x1) / 2) * this.sx;
    this.oy = this.r.y + this.r.h / 2 + ((b.y0 + b.y1) / 2) * this.sy;
    return this;
  }

  /** Independent scales (a chart). Padding: [left, right, top, bottom] px. */
  fitXY(b: Bounds, pad: [number, number, number, number]): this {
    const [pl, pr, pt, pb] = pad;
    this.sx = (this.r.w - pl - pr) / (b.x1 - b.x0);
    this.sy = (this.r.h - pt - pb) / (b.y1 - b.y0);
    this.ox = this.r.x + pl - b.x0 * this.sx;
    this.oy = this.r.y + this.r.h - pb + b.y0 * this.sy;
    return this;
  }

  X(x: number) { return this.ox + x * this.sx; }
  Y(y: number) { return this.oy - y * this.sy; }
  /** px per mm */
  get scale() { return this.sx; }

  clip(fn: () => void) {
    const c = this.ctx;
    c.save(); c.beginPath(); c.rect(this.r.x, this.r.y, this.r.w, this.r.h); c.clip(); fn(); c.restore();
  }

  /** Millimetre grid; the step adapts so lines stay at least ~7 px apart. */
  grid(): { minor: number; major: number } {
    const steps = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10];
    const minor = steps.find((s) => s * this.sx >= 7) ?? 10;
    const major = minor * (minor === 0.25 ? 4 : 5);
    const c = this.ctx;
    this.clip(() => {
      const x0 = (this.r.x - this.ox) / this.sx, x1 = (this.r.x + this.r.w - this.ox) / this.sx;
      const y1 = (this.oy - this.r.y) / this.sy, y0 = (this.oy - this.r.y - this.r.h) / this.sy;
      c.lineWidth = 1;
      for (let k = Math.ceil(x0 / minor); k * minor <= x1; k++) {
        const isMajor = Math.abs((k * minor) / major - Math.round((k * minor) / major)) < 1e-6;
        c.strokeStyle = isMajor ? this.ink.gridMajor : this.ink.grid;
        const x = Math.round(this.X(k * minor)) + 0.5;
        c.beginPath(); c.moveTo(x, this.r.y); c.lineTo(x, this.r.y + this.r.h); c.stroke();
      }
      for (let k = Math.ceil(y0 / minor); k * minor <= y1; k++) {
        const isMajor = Math.abs((k * minor) / major - Math.round((k * minor) / major)) < 1e-6;
        c.strokeStyle = isMajor ? this.ink.gridMajor : this.ink.grid;
        const y = Math.round(this.Y(k * minor)) + 0.5;
        c.beginPath(); c.moveTo(this.r.x, y); c.lineTo(this.r.x + this.r.w, y); c.stroke();
      }
    });
    return { minor, major };
  }

  private trace(pts: Pt[], close = true) {
    const c = this.ctx;
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(this.X(x), this.Y(y)) : c.moveTo(this.X(x), this.Y(y))));
    if (close) c.closePath();
  }

  stroke(pts: Pt[], o: StrokeOpts & { close?: boolean } = {}) {
    const c = this.ctx;
    c.save();
    this.trace(pts, o.close ?? false);
    c.strokeStyle = o.color ?? this.ink.line; c.lineWidth = o.width ?? 1.5; c.lineJoin = "round";
    if (o.dash) c.setLineDash(o.dash);
    c.stroke(); c.restore();
  }

  fill(pts: Pt[], color: string) {
    const c = this.ctx;
    c.save(); this.trace(pts); c.fillStyle = color; c.fill(); c.restore();
  }

  /** ISO 128 section hatching: thin lines at 45°, spacing in px. */
  hatch(pts: Pt[], color = this.ink.goldDim, spacing = 6) {
    const c = this.ctx;
    const xs = pts.map((p) => this.X(p[0])), ys = pts.map((p) => this.Y(p[1]));
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    c.save(); this.trace(pts); c.clip();
    c.strokeStyle = color; c.lineWidth = 1; c.beginPath();
    const span = maxY - minY;
    for (let t = minX - span; t < maxX; t += spacing) { c.moveTo(t, maxY); c.lineTo(t + span, minY); }
    c.stroke(); c.restore();
  }

  /** Hatched solid with outline — a cut through metal. */
  section(pts: Pt[], o: { stroke?: string; hatch?: string; tint?: string; width?: number } = {}) {
    if (o.tint) this.fill(pts, o.tint);
    this.hatch(pts, o.hatch ?? this.ink.goldDim, Math.max(4.5, Math.min(8, this.sx * 0.12)));
    this.stroke(pts, { color: o.stroke ?? this.ink.gold, width: o.width ?? 2, close: true });
  }

  centerline(a: Pt, b: Pt, color = this.ink.muted) {
    this.stroke([a, b], { color, width: 1, dash: [10, 3, 2, 3] });
  }

  arrow(x: number, y: number, ang: number, color: string, size = 6) {
    const c = this.ctx;
    c.save(); c.fillStyle = color; c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - size * Math.cos(ang - 0.38), y - size * Math.sin(ang - 0.38));
    c.lineTo(x - size * Math.cos(ang + 0.38), y - size * Math.sin(ang + 0.38));
    c.closePath(); c.fill(); c.restore();
  }

  /** Horizontal dimension between x0 and x1 (mm), drawn `off` px below y (mm). */
  dimH(x0: number, x1: number, y: number, label: string, o: { off?: number; color?: string } = {}) {
    const color = o.color ?? this.ink.line, off = o.off ?? 18;
    const X0 = this.X(Math.min(x0, x1)), X1 = this.X(Math.max(x0, x1)), Yb = this.Y(y), Yd = Yb + off;
    const s = this.sheet;
    const ext = Math.sign(off) * 4;
    s.rule(X0, Yb + Math.sign(off) * 3, X0, Yd + ext, color);
    s.rule(X1, Yb + Math.sign(off) * 3, X1, Yd + ext, color);
    const inside = X1 - X0 > 22;
    if (inside) {
      s.rule(X0, Yd, X1, Yd, color);
      this.arrow(X0, Yd, Math.PI, color); this.arrow(X1, Yd, 0, color);
    } else {
      s.rule(X0 - 16, Yd, X1 + 16, Yd, color);
      this.arrow(X0, Yd, 0, color); this.arrow(X1, Yd, Math.PI, color);
    }
    s.text(label, (X0 + X1) / 2, Yd + (off > 0 ? 11 : -11), { mono: true, size: 11, color, halo: true });
  }

  /** Vertical dimension between y0 and y1 (mm), drawn `off` px right of x (mm). */
  dimV(y0: number, y1: number, x: number, label: string, o: { off?: number; color?: string } = {}) {
    const color = o.color ?? this.ink.line, off = o.off ?? 18;
    const Ya = this.Y(Math.max(y0, y1)), Yb = this.Y(Math.min(y0, y1)), Xb = this.X(x), Xd = Xb + off;
    const s = this.sheet, ext = Math.sign(off) * 4;
    s.rule(Xb + Math.sign(off) * 3, Ya, Xd + ext, Ya, color);
    s.rule(Xb + Math.sign(off) * 3, Yb, Xd + ext, Yb, color);
    if (Yb - Ya > 22) {
      s.rule(Xd, Ya, Xd, Yb, color);
      this.arrow(Xd, Ya, -Math.PI / 2, color); this.arrow(Xd, Yb, Math.PI / 2, color);
    } else {
      s.rule(Xd, Ya - 16, Xd, Yb + 16, color);
      this.arrow(Xd, Ya, Math.PI / 2, color); this.arrow(Xd, Yb, -Math.PI / 2, color);
    }
    const c = this.ctx;
    c.save(); c.translate(Xd + (off > 0 ? 11 : -11), (Ya + Yb) / 2); c.rotate(-Math.PI / 2);
    s.text(label, 0, 0, { mono: true, size: 11, color, halo: true });
    c.restore();
  }

  /** Cutting-plane line with A–A letters at both ends. */
  cutLine(x0: number, x1: number, y: number, letter = "A", color = this.ink.warn) {
    const Y = this.Y(y), X0 = this.X(x0), X1 = this.X(x1);
    this.stroke([[x0, y], [x1, y]], { color, width: 1.2, dash: [7, 3, 2, 3] });
    const c = this.ctx;
    c.save(); c.strokeStyle = color; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(X0, Y); c.lineTo(X0 + 12, Y); c.moveTo(X1 - 12, Y); c.lineTo(X1, Y); c.stroke();
    c.restore();
    this.arrow(X0 + 4, Y - 12, -Math.PI / 2, color, 7); this.arrow(X1 - 4, Y - 12, -Math.PI / 2, color, 7);
    this.sheet.rule(X0 + 4, Y, X0 + 4, Y - 12, color); this.sheet.rule(X1 - 4, Y, X1 - 4, Y - 12, color);
    this.sheet.text(letter, X0 - 8, Y - 10, { mono: true, size: 13, color, weight: 500 });
    this.sheet.text(letter, X1 + 8, Y - 10, { mono: true, size: 13, color, weight: 500 });
  }

  /** Small caption tag in the top corner of the view. */
  tag(label: string) {
    // the drawing's title, in the reader's language, where reading starts
    if (EN) this.sheet.text(label, this.r.x + 10, this.r.y + 14, { size: 11, color: this.ink.muted, align: "left" });
    else this.sheet.text(label, this.r.x + this.r.w - 10, this.r.y + 14, { size: 11, color: this.ink.muted, align: "right" });
  }
}

/** A circle as a polygon, optionally trimmed by flat cuts (seat grooves). */
export function circlePts(cx: number, cy: number, r: number, n = 120): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return pts;
}

/** Circle of radius r at (cx,cy) with material removed beyond x < cx - r + h (and x > cx + r - h when two cuts). */
export function cutCirclePts(cx: number, cy: number, r: number, h: number, cuts: 1 | 2, n = 160): Pt[] {
  const xl = cx - r + h, xr = cuts === 2 ? cx + r - h : cx + r + 1;
  return circlePts(cx, cy, r, n).map(([x, y]) => {
    if (x < xl) return [xl, cy + Math.sign(y - cy) * Math.min(Math.abs(y - cy), Math.sqrt(Math.max(r * r - (xl - cx) ** 2, 0)))] as Pt;
    if (x > xr) return [xr, cy + Math.sign(y - cy) * Math.min(Math.abs(y - cy), Math.sqrt(Math.max(r * r - (xr - cx) ** 2, 0)))] as Pt;
    return [x, y] as Pt;
  });
}
