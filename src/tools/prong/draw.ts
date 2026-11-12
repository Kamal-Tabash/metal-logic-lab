import { tx as tr } from "../../core/i18n";
import type { Pt, Rect, Sheet, View } from "../../core/cad/sheet";
import { cutCirclePts } from "../../core/cad/sheet";
import { cutGeometry, depthLimit, inertiaCurve, prongHeight, seatChecks, twinPoint, lengthRatios, losses, prongCheck, remaining, seatProfile, seatVerdict, stone, underStoneOk } from "./model";
import type { ProngState } from "./state";
import { stoneById } from "../../core/data";

const f2 = (v: number) => v.toFixed(2);
const pct = (v: number) => `${Math.round(v * 100)}%`;

/* ================= the seat: profile + section A–A + I curve ================= */

export function drawSeat(s: Sheet, st: ProngState) {
  const { w, h } = s;
  const wide = w >= 420 && w / h >= 1.15;
  const gap = 10;
  let rP: Rect, rS: Rect, rC: Rect;
  if (wide) {
    const pw = Math.round(w * 0.58);
    rP = { x: 0, y: 0, w: pw, h };
    rS = { x: pw + gap, y: 0, w: w - pw - gap, h: Math.round(h * 0.5) };
    rC = { x: pw + gap, y: rS.h, w: w - pw - gap, h: h - rS.h };
    s.rule(pw + gap / 2, 16, pw + gap / 2, h - 16);
  } else {
    const ph = Math.round(h * 0.56);
    rP = { x: 0, y: 0, w, h: ph };
    rS = { x: 0, y: ph, w: Math.round(w * 0.44), h: h - ph };
    rC = { x: rS.w, y: ph, w: w - rS.w, h: h - ph };
    s.rule(16, ph, w - 16, ph);
  }
  drawProfile(s.view(rP), st);
  drawSectionAA(s.view(rS), st);
  drawCurve(s.view(rC), st);
}

function drawProfile(v: View, st: ProngState) {
  const p = seatProfile(st.d, st.h, st.stoneD, st.stoneId, st.under, st.cuts, st.tipR, st.cut);
  const stoneInk = stoneById(st.stoneId).color;
  const tipLevel = seatChecks(st).find((c) => c.id === "height")!.level;
  const ink = v.ink;
  const hmm = st.h * st.d;
  const twin = st.cuts === 2;
  const c2 = p.outer - hmm + p.R; // axis of the neighbouring stone
  const x0 = -0.15 * p.R - 0.2;
  const x1 = twin ? c2 + 0.15 * p.R + 0.2 : p.outer + Math.max(0.9, st.d * 0.9);
  const b = { x0, y0: p.headBottom - 0.45, x1, y1: p.tipY + 0.45 };
  v.fit(b, 30);
  v.grid();
  v.tag(tr("المخلب والحجر من الجانب · ملم", "Prong and stone, side view · mm"));

  // metal under the stone
  const head: Pt[] = [[x0 + 0.1, p.headBottom], [twin ? x1 - 0.1 : p.outer + 0.3, p.headBottom], [twin ? x1 - 0.1 : p.outer + 0.3, p.headTop], [x0 + 0.1, p.headTop]];
  v.section(head, { stroke: ink.muted, hatch: ink.gridMajor, width: 1 });

  // stones (the near one, and the neighbour when the prong is shared)
  const drawStone = (map: (q: Pt) => Pt) => {
    const out = p.stoneOutline.map(map);
    v.fill(out, stoneInk + "1a");
    p.facets.forEach((seg) => v.stroke(seg.map(map), { color: stoneInk + "88", width: 1 }));
    v.stroke(out, { color: stoneInk, width: 1.4, close: true });
  };
  drawStone((q) => q);
  if (twin) drawStone((q) => twinPoint(p, hmm, q));
  v.centerline([0, p.headBottom - 0.3], [0, p.tipY + 0.3]);
  if (twin) v.centerline([c2, p.headBottom - 0.3], [c2, p.tipY + 0.3]);

  // the prong, hatched as a cut through metal; red when it is far thinner than its reference size
  const pc = prongCheck(st.d, st.stoneD, st.alloy, st.stoneId, st.cut);
  v.section(p.prong, { stroke: pc.fit === "thin" ? ink.warn : ink.gold, hatch: pc.fit === "thin" ? "#7a3a2c" : ink.goldDim, tint: "rgba(214,162,74,0.06)" });
  if (pc.fit !== "ok") {
    const x0 = p.inner, x1 = p.inner + pc.ref, top = p.tipY - st.d / 2 + pc.ref / 2;
    const ghost: Pt[] = [[x0, p.headBottom], [x1, p.headBottom], [x1, top - pc.ref / 2]];
    for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; ghost.push([x0 + pc.ref / 2 + (pc.ref / 2) * Math.cos(a), top - pc.ref / 2 + (pc.ref / 2) * Math.sin(a)]); }
    v.stroke(ghost, { color: ink.gold, width: 1.2, dash: [5, 4], close: true });
    v.sheet.text(tr(`المناسب ${pc.ref.toFixed(2)}`, `suitable ${pc.ref.toFixed(2)}`), v.X(x1) + 6, v.Y(top - pc.ref * 0.3), { size: 10.5, color: ink.gold, align: "left", halo: true });
  }
  v.centerline([p.inner + st.d / 2, p.headBottom - 0.2], [p.inner + st.d / 2, p.tipY + 0.25]);

  // removed material, coloured by the verdict
  const verdict = seatVerdict(st.h, st.alloy, st.cuts);
  if (hmm > 1e-3) {
    const tc = p.roofSlope, tp = p.shelfSlope;
    const notch: Pt[] = [[p.inner, p.girdleTop + hmm * tc], [p.seatBack, p.girdleTop], [p.seatBack, p.girdleBot], [p.inner, p.girdleBot - hmm * tp]];
    v.fill(notch, verdict === "within" || verdict === "atLimit" ? "rgba(214,162,74,0.18)" : "rgba(226,114,91,0.32)");
  }

  // section line through the seat
  v.cutLine(p.inner - 0.45, p.outer + 0.45, p.girdleY);

  // dimensions
  const dimColor = ink.line;
  v.dimH(p.inner, p.outer, p.tipY, `d ${f2(st.d)}`, { off: -16, color: dimColor });
  if (hmm > 0.01) v.dimH(p.inner, p.seatBack, p.girdleBot - hmm * 0.9 - 0.15, `h ${hmm.toFixed(3)}`, { off: 22, color: verdict === "within" || verdict === "atLimit" ? ink.gold : ink.warn });
  const uColor = underStoneOk(st.under) ? ink.muted : ink.warn;
  v.dimV(p.headBottom, p.headTop, twin ? x1 - 0.1 : p.outer + 0.3, f2(st.under), { off: 16, color: uColor });
  const ct = stone(st.stoneD, st.stoneId, st.cut).ct;
  v.sheet.text(`Ø ${f2(st.stoneD)} · ${ct < 0.1 ? ct.toFixed(3) : f2(ct)} ct`, v.X(0) + 6, v.Y(p.girdleTop + (p.tipY - p.girdleTop) * 0.25), { mono: true, size: 11, color: stoneInk, align: "left", halo: true });
  // heights: the stone, and the prong as drawn (both from the culet's level)
  const ht = prongHeight(st.d, st.stoneD, st.stoneId, st.cut, st.tipR);
  const tipColor = tipLevel === "ok" ? ink.muted : tipLevel === "near" ? ink.gold : ink.warn;
  v.dimV(p.culetY, p.tableY, 0, f2(ht.stoneH), { off: -12, color: stoneInk });
  v.dimV(p.culetY, p.tipY, twin ? p.outer + 0.15 : p.outer + 0.22, `${f2(ht.prong)} · ×${st.tipR.toFixed(2)}`, { off: 14, color: tipColor });

  // after setting: the part above the girdle pushed over the crown, touching a third of its slope
  if (!twin && ht.level !== "fail") {
    const run = p.R - p.tableHalf, slope = p.crown / run;
    const len = Math.hypot(run, p.crown);
    const ux = -run / len, uy = p.crown / len;          // along the crown, inward
    const nx = uy, ny = -ux;                             // outward normal of the crown
    const t = st.d * 0.55, reach = len * 0.4;
    const tipX = p.R + ux * reach, tipYc = p.girdleTop + uy * reach;
    const fold: Pt[] = [
      [p.R, p.girdleTop], [tipX, tipYc],
      [tipX + nx * t * 0.6, tipYc + ny * t * 0.6],
      [p.R + nx * t, p.girdleTop + ny * t + slope * 0],
      [p.outer, p.girdleTop + t * 1.1], [p.outer, p.girdleTop + p.crown * 0.15],
    ];
    v.stroke(fold, { color: ink.gold, width: 1.1, dash: [4, 3], close: true });
    v.sheet.text(tr("بعد التثبيت", "after setting"), v.X(tipX + nx * t), v.Y(tipYc + ny * t) - 8, { size: 10.5, color: ink.gold, align: "right", halo: true });
  }
}

function drawSectionAA(v: View, st: ProngState) {
  const ink = v.ink;
  const r = 0.5;
  v.fit({ x0: -0.95, y0: -0.78, x1: 0.95, y1: 0.78 }, 22);
  v.tag(tr("مقطع المخلب عند المقعد", "Prong section at the seat"));
  const hh = st.h;
  // the full outline, dashed: what the file drew
  const full = cutCirclePts(0, 0, r, 0, 1);
  v.stroke(full, { color: ink.muted, width: 1, dash: [3, 3], close: true });
  const pts = cutCirclePts(0, 0, r, hh, st.cuts);
  if (hh < (st.cuts === 2 ? 0.5 : 1)) v.section(pts, { stroke: ink.gold, hatch: ink.goldDim, tint: "rgba(214,162,74,0.08)" });

  // neutral axis for bending toward the stone
  const sec = remaining(hh, st.cuts);
  const uc = st.cuts === 2 ? 0 : (() => {
    // centroid shift of a one-sided cut, from the integral
    const n = 600, lo = -r + hh, du = (r - lo) / n; let A = 0, Q = 0;
    for (let i = 0; i < n; i++) { const u = lo + (i + 0.5) * du, wv = 2 * Math.sqrt(Math.max(r * r - u * u, 0)); A += wv * du; Q += wv * u * du; }
    return A ? Q / A : 0;
  })();
  v.centerline([uc, -0.66], [uc, 0.66], ink.gold);
  
  v.sheet.text(tr("← جهة الحجر", "← stone side"), v.X(-0.62), v.Y(0.68), { size: 10.5, color: ink.stone, halo: true });
  v.sheet.text(tr(`بقي ${pct(sec.I)} من القوة`, `${pct(sec.I)} of strength left`), v.X(0), v.Y(-0.7), { size: 12, color: ink.gold, halo: true });
}

function drawCurve(v: View, st: ProngState) {
  const ink = v.ink, s = v.sheet;
  v.fitXY({ x0: 0, y0: 0, x1: 0.6, y1: 1 }, [42, 16, 30, 34]);
  // grid
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    s.rule(v.X(0), v.Y(t), v.X(0.6), v.Y(t), ink.grid);
    s.text(`${t * 100}%`, v.X(0) - 6, v.Y(t), { mono: true, size: 10, align: "right" });
  }
  for (const t of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6]) s.text(`${Math.round(t * 100)}%`, v.X(t), v.Y(0) + 13, { mono: true, size: 10 });
  s.text(tr("قوة المخلب الباقية (عمودياً) كلما زاد عمق المقعد من قطره (أفقياً)", "Strength left ↑ · seat depth ÷ diameter →"), v.X(0.3), v.r.y + 30, { size: 11.5, color: ink.line });
  // limits
  const mark = (t: number, label: string, color: string) => {
    v.stroke([[t, 0], [t, 1]], { color, width: 1, dash: [3, 3] });
    s.text(label, v.X(t), v.Y(1) - 8, { size: 10.5, color, halo: true });
  };
  const lim = depthLimit(st.alloy, st.cuts);
  if (lim.collapse !== undefined) { mark(lim.limit, tr("الربع", "¼"), ink.gold); mark(lim.collapse, tr("الثلث", "⅓"), ink.warn); }
  else mark(lim.limit, lim.limit === 0.5 ? tr("النصف", "½") : tr("الربع", "¼"), ink.warn);
  // curve
  v.stroke(inertiaCurve(st.cuts, 60), { color: ink.line, width: 2 });
  const cur = remaining(st.h, st.cuts).I;
  const c = v.ctx;
  c.save(); c.fillStyle = ink.gold; c.beginPath(); c.arc(v.X(st.h), v.Y(cur), 5, 0, Math.PI * 2); c.fill(); c.restore();
  s.text(pct(cur), v.X(st.h) + (st.h > 0.45 ? -10 : 10), v.Y(cur) - 12, { mono: true, size: 11.5, color: ink.gold, align: st.h > 0.45 ? "right" : "left", halo: true });
}

/* ================= diameter and free length ================= */

export function drawLength(s: Sheet, st: ProngState) {
  const v = s.view({ x: 0, y: 0, w: s.w, h: s.h });
  const ink = v.ink;
  const maxL = Math.max(st.LA, st.LB);
  const sep = Math.max(1.6, Math.max(st.dA, st.dB) * 1.4 + 0.6);
  v.fit({ x0: -sep - 1.4, y0: -0.7, x1: sep + 1.4, y1: maxL + 0.7 }, 28);
  v.grid();
  v.tag(tr("المخلبان من الجانب · ملم", "The two prongs, side view · mm"));
  v.section([[-sep - 1.2, -0.45], [sep + 1.2, -0.45], [sep + 1.2, 0], [-sep - 1.2, 0]], { stroke: ink.muted, hatch: ink.gridMajor, width: 1 });
  s.text(tr("رأس الخاتم", "Ring head"), v.X(0), v.Y(-0.22), { size: 11, color: ink.muted });
  const r = lengthRatios(st.dA, st.LA, st.dB, st.LB);
  const prongs = [
    { cx: sep, d: st.dA, L: st.LA, color: ink.line, name: tr("المخلب أ", "Prong A") },
    { cx: -sep, d: st.dB, L: st.LB, color: ink.gold, name: tr("المخلب ب", "Prong B") },
  ];
  for (const p of prongs) {
    const x0 = p.cx - p.d / 2, x1 = p.cx + p.d / 2;
    const pts: Pt[] = [[x0, 0], [x1, 0], [x1, p.L - p.d / 2]];
    for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; pts.push([p.cx + (p.d / 2) * Math.cos(a), p.L - p.d / 2 + (p.d / 2) * Math.sin(a)]); }
    v.section(pts, { stroke: p.color, hatch: p.color === ink.gold ? ink.goldDim : ink.gridMajor, tint: p.color === ink.gold ? "rgba(214,162,74,0.07)" : "rgba(212,215,220,0.04)" });
    v.centerline([p.cx, -0.3], [p.cx, p.L + 0.3]);
    // the same blow at the girdle height
    const ay = p.L - p.d / 2;
    v.stroke([[x0 - 0.9, ay], [x0 - 0.08, ay]], { color: ink.warn, width: 2 });
    v.arrow(v.X(x0 - 0.06), v.Y(ay), 0, ink.warn, 8);
    v.dimH(x0, x1, 0, `d ${f2(p.d)}`, { off: 34, color: p.color });
    v.dimV(0, p.L, x1, `L ${f2(p.L)}`, { off: 18, color: p.color });
    s.text(p.name, v.X(p.cx), v.Y(p.L) - 30, { size: 13, color: p.color, weight: 600, halo: true }); // above the centre line's end, on a clear patch
  }
  s.text(tr(`الحمل قبل الميل الدائم: ب = ${r.tip.toFixed(2)} × أ`, `Load before it bends for good: B = ${r.tip.toFixed(2)} × A`), s.w / 2, s.h - 12, { size: 12, color: ink.gold, halo: true });
}

/* ================= the stone as a load ================= */

export function drawStoneLoad(s: Sheet, st: ProngState) {
  const v = s.view({ x: 0, y: 0, w: s.w, h: s.h });
  const ink = v.ink;
  const gA = cutGeometry(st.sDA, st.sMA, st.sCA), gB = cutGeometry(st.sDB, st.sMB, st.sCB);
  const hA = gA.tableY - gA.culetY, hB = gB.tableY - gB.culetY;
  const gap = Math.max(0.6, 0.12 * Math.max(st.sDA, st.sDB));
  const cA = st.sDA / 2 + gap / 2, cB = -(st.sDB / 2 + gap / 2); // side by side, as close as they can sit
  const floor = 0.5; // metal under the stone
  const lift = floor + 0.1 - gA.culetY;
  const hi = floor + 0.1 + Math.max(hA, hB);
  v.fit({ x0: cB - st.sDB / 2 - 0.5, y0: -0.7, x1: cA + st.sDA / 2 + 1.3, y1: hi + 0.7 }, 26);
  v.grid();
  v.tag(tr("الحجران من الجانب · ملم", "The two stones, side view · mm"));
  v.stroke([[cB - st.sDB / 2 - 0.4, 0], [cA + st.sDA / 2 + 1.2, 0]], { color: ink.muted, width: 1 });
  s.text(tr("سطح الإصبع", "finger surface"), v.X(cA + st.sDA / 2 + 1.2), v.Y(0) + 12, { size: 11, align: "right" });
  const one = (cx: number, D: number, g: ReturnType<typeof cutGeometry>, color: string, solid: boolean, label: string) => {
    const map = ([x, y]: Pt): Pt => [cx + x, y + lift];
    const out = g.outline.map(map);
    v.fill(out, color + (solid ? "26" : "10"));
    g.facets.forEach((seg) => v.stroke(seg.map(map), { color: color + "88", width: 1 }));
    v.stroke(out, { color, width: solid ? 1.8 : 1.3, close: true, dash: solid ? undefined : [5, 4] });
    v.dimH(cx - D / 2, cx + D / 2, lift + g.culetY, `Ø ${f2(D)}`, { off: 22, color });
    s.text(label, v.X(cx), v.Y(lift + g.tableY) - 16, { size: 13, color, weight: 600 });
    return lift + g.tableY;
  };
  const topA = one(cA, st.sDA, gA, stoneById(st.sMA).color, false, tr("المرجع", "reference"));
  const topB = one(cB, st.sDB, gB, stoneById(st.sMB).color, true, tr("الجديد", "new"));
  [topA, topB].forEach((y) => v.stroke([[cB - st.sDB / 2 - 0.3, y], [cA + st.sDA / 2 + 0.3, y]], { color: ink.muted, width: 1, dash: [2, 4] }));
  if (Math.abs(topA - topB) > 0.02) v.dimV(Math.min(topA, topB), Math.max(topA, topB), cA + st.sDA / 2 + 0.35, `Δ ${f2(Math.abs(topB - topA))}`, { off: 14, color: ink.gold });
}

/* ================= the path from file to setting ================= */

export function drawLosses(s: Sheet, st: ProngState) {
  const ink = s.ink;
  const r = losses(st.ld, st.ll, st.lg);
  const stack = s.w < 520 || s.h > s.w * 1.05;
  const n = 3;
  const cells: Rect[] = [];
  for (let i = 0; i < n; i++) {
    cells.push(stack
      ? { x: 0, y: (s.h / n) * i, w: s.w, h: s.h / n }
      : { x: s.w - (s.w / n) * (i + 1), y: 0, w: s.w / n, h: s.h });
  }
  // the grid across the whole sheet, at the shared scale
  const R0 = st.ld / 2;
  const labelRoom = stack ? 0 : 70;
  const probe = s.view({ ...cells[0], h: cells[0].h - labelRoom }).fit({ x0: -R0 * 1.25, y0: -R0 * 1.25, x1: R0 * 1.25, y1: R0 * 1.25 }, stack ? 26 : 22);
  const scale = Math.min(probe.sx, stack ? (cells[0].w * 0.3) / R0 : Infinity);
  const sheetView = s.view({ x: 0, y: 0, w: s.w, h: s.h });
  sheetView.sx = sheetView.sy = scale; sheetView.ox = s.w / 2; sheetView.oy = s.h / 2;
  sheetView.grid();

  const items = [
    { title: tr("في الملف", "in the file"), d: st.ld, h: 0, I: 1, color: ink.line },
    { title: tr("بعد التصنيع", "after making"), d: r.dEff, h: 0, I: r.Ibench, color: ink.gold },
    { title: tr("عند المقعد", "at the seat"), d: r.dEff, h: st.lg, I: r.I, color: ink.gold },
  ];
  const centres: [number, number][] = [];
  items.forEach((it, i) => {
    const c = cells[i];
    const v = s.view(c);
    v.sx = v.sy = scale;
    v.ox = stack ? c.x + c.w * 0.62 : c.x + c.w / 2;
    v.oy = stack ? c.y + c.h / 2 : c.y + (c.h - labelRoom) / 2 + 10;
    centres.push([v.ox, v.oy]);
    const R = it.d / 2;
    // the layer lost on the way, as a ring
    if (i > 0 && R < R0) {
      const ring = s.ctx;
      ring.save(); ring.beginPath();
      ring.arc(v.X(0), v.Y(0), R0 * scale, 0, Math.PI * 2); ring.arc(v.X(0), v.Y(0), R * scale, 0, Math.PI * 2, true);
      ring.fillStyle = "rgba(236,128,104,0.22)"; ring.fill(); ring.restore();
      v.stroke(cutCirclePts(0, 0, R0, 0, 1), { color: ink.warn, width: 1, dash: [3, 3], close: true });
    }
    // the groove's bite
    if (it.h > 0) {
      const bite = cutCirclePts(0, 0, R, 0, 1).filter(([x]) => x <= -R + it.h * it.d);
      const xl = -R + it.h * it.d, yl = Math.sqrt(Math.max(R * R - xl * xl, 0));
      v.fill([[xl, yl], ...bite.sort((a, b) => b[1] - a[1]), [xl, -yl]], "rgba(236,128,104,0.32)");
    }
    v.section(cutCirclePts(0, 0, R, it.h * it.d, 1), { stroke: it.color, hatch: ink.goldDim, tint: "rgba(214,162,74,0.07)" });
    if (it.h > 0) v.sheet.text(tr("← جهة الحجر", "← stone side"), v.X(-R * 0.35), v.Y(R0) - 12, { size: 10.5, color: ink.stone, halo: true });

    const tx = stack ? c.x + c.w * 0.3 : v.X(0);
    const ty = stack ? c.y + c.h / 2 - 18 : c.y + c.h - labelRoom + 6;
    s.text(it.title, tx, ty, { size: 13, color: it.color, weight: 600 });
    s.text(`Ø ${f2(it.d)} mm`, tx, ty + 19, { mono: true, size: 11.5, color: ink.line });
    s.text(tr(`القوة ${pct(it.I)}`, `strength ${pct(it.I)}`), tx, ty + 37, { mono: true, size: 13, color: i === 2 ? ink.warn : i === 1 ? ink.gold : ink.line, weight: 500 });
  });
  // arrows from one state to the next, in reading order
  for (let i = 0; i < n - 1; i++) {
    const [ax, ay] = centres[i], [bx, by] = centres[i + 1];
    const gap = R0 * scale + 14;
    if (stack) {
      s.rule(ax, ay + gap, bx, by - gap, ink.muted);
      sheetView.arrow(bx, by - gap, Math.PI / 2, ink.muted, 8);
    } else {
      s.rule(ax - gap, ay, bx + gap, by, ink.muted);
      sheetView.arrow(bx + gap, by, Math.PI, ink.muted, 8);
    }
  }
}
