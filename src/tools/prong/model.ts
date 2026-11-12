import { tx } from "../../core/i18n";
// Prong lab — pure mechanics, no drawing. Everything here is what the book
// computes, by ratio, as the book does (no absolute yield strength is assumed
// for 21 karat; the book refers that number to the alloy supplier).

import { BRILLIANT, CARAT_GRAMS, PRONG_BULKY, PRONG_FLOOR, PRONG_HEIGHT, SEAT_RULES, UNDER_MIN, cutById, seatAlloy, stoneById } from "../../core/data";

/* ---------- the cross-section of a round prong with flat seat cuts ---------- */

export interface SectionProps {
  A: number;   // area
  Iu: number;  // second moment for bending toward / away from the stone
  Iv: number;  // second moment for sideways bending
  Su: number;  // section modulus, toward the stone
  uc: number;  // centroid shift along the stone axis
  core: number; // diameter left across the cut(s), fraction of d
}

/**
 * Round section of diameter 1. A cut of depth `h` (fraction of d) removes
 * the material on the stone side (u < -1/2 + h); a shared prong in a row of
 * stones has a second cut on the opposite side.
 */
export function section(h: number, cuts: 1 | 2 = 1, n = 4000): SectionProps {
  const r = 0.5;
  const lo = -r + h, hi = cuts === 2 ? r - h : r;
  if (hi <= lo) return { A: 0, Iu: 0, Iv: 0, Su: 0, uc: 0, core: 0 };
  const du = (hi - lo) / n;
  let A = 0, Q = 0;
  const us: number[] = [], ws: number[] = [];
  for (let i = 0; i < n; i++) {
    const u = lo + (i + 0.5) * du;
    const w = 2 * Math.sqrt(Math.max(r * r - u * u, 0));
    us.push(u); ws.push(w); A += w * du; Q += w * u * du;
  }
  const uc = Q / A;
  let Iu = 0, Iv = 0;
  for (let i = 0; i < n; i++) { Iu += ws[i] * (us[i] - uc) ** 2 * du; Iv += (ws[i] ** 3 / 12) * du; }
  const c = Math.max(hi - uc, uc - lo);
  return { A, Iu, Iv, Su: Iu / c, uc, core: hi - lo };
}

const FULL = section(0, 1);

export interface Remaining { I: number; Iside: number; S: number; A: number; core: number }

/** What is left of the full round section, as fractions. */
export function remaining(h: number, cuts: 1 | 2 = 1): Remaining {
  const s = section(h, cuts);
  return { I: s.Iu / FULL.Iu, Iside: s.Iv / FULL.Iv, S: s.Su / FULL.Su, A: s.A / FULL.A, core: s.core };
}

export type SeatVerdict = "within" | "atLimit" | "over" | "collapse";

/** The deepest seat this alloy allows, as a fraction of d, for one seat or for each of two. */
export function depthLimit(alloy = "k21", cuts: 1 | 2 = 1) {
  const r = SEAT_RULES[seatAlloy(alloy).rules];
  return { limit: cuts === 2 ? r.depthShared : r.depthSingle, collapse: r.collapse, band: r.nearBand };
}

export function seatVerdict(h: number, alloy = "k21", cuts: 1 | 2 = 1): SeatVerdict {
  const { limit, collapse, band } = depthLimit(alloy, cuts), eps = 0.004;
  if (collapse !== undefined && h >= collapse - eps) return "collapse";
  if (h > limit + eps) return "over";
  if (h >= limit * (1 - band) - eps / 2) return "atLimit";
  return "within";
}

function verdictText(v: SeatVerdict, alloy: string, cuts: 1 | 2): string {
  const a = seatAlloy(alloy);
  const { limit } = depthLimit(alloy, cuts);
  const lim = limit === 0.25 ? tx("ربع القطر", "a quarter of the diameter") : tx("نصف السماكة", "half the thickness");
  const each = cuts === 2 ? tx(" لكل مقعد", " per seat") : "";
  if (v === "collapse") return tx("المقعد بلغ ثلث القطر أو تجاوزه: المخلب ينثني عنده ولا يعود", "The seat has reached a third of the diameter or more: the prong bends there and does not spring back");
  if (v === "over") return a.rules === "world" && limit === 0.5
    ? tx("أعمق من نصف السماكة: لا يبقى للجدار ما يحمل الحجر", "Deeper than half the thickness: the wall has nothing left to hold the stone")
    : cuts === 2 && a.rules === "world"
      ? tx("المقعدان معاً يأخذان أكثر من نصف المخلب", "The two seats together take more than half the prong")
      : tx(`تجاوز الحد في ${a.name}: أعمق من ${lim}${each}`, `Over the limit for ${a.name}: deeper than ${lim}${each}`);
  if (v === "atLimit") return tx(`عند الحد المسموح في ${a.name}: ${lim}${each}`, `At the allowed limit for ${a.name}: ${lim}${each}`);
  return tx(`ضمن الحد في ${a.name}: لا يتعدى ${lim}${each}`, `Within the limit for ${a.name}: no more than ${lim}${each}`);
}

/** Kept for callers that show the 21 karat wording. */
export const VERDICT_TEXT: Record<SeatVerdict, string> = {
  within: verdictText("within", "k21", 1),
  atLimit: verdictText("atLimit", "k21", 1),
  over: verdictText("over", "k21", 1),
  collapse: verdictText("collapse", "k21", 1),
};

export function underStoneOk(mm: number): boolean {
  return mm >= UNDER_MIN - 1e-9;
}

export type ProngFit = "ok" | "near" | "thin" | "thick";

export interface ProngCheck {
  ref: number;      // the reference diameter for this stone in this alloy
  weight: number;   // the stone's weight ÷ a diamond of the same size
  ratio: number;    // drawn diameter ÷ reference
  fit: ProngFit;
  floor: boolean;   // thinner than the thinnest prong that is made
  covered: boolean; // stone size inside the range the references cover
}

/**
 * Compares the prong with the reference size for a stone of diameter D in this
 * alloy. The references are for diamond. A denser stone of the same size is a
 * heavier load, and the bending a prong resists grows with the cube of its
 * diameter, so the reference grows with the cube root of the weight.
 */
export function prongCheck(d: number, D: number, alloy = "k21", stoneId = "diamond", cutId = "brilliant"): ProngCheck {
  const r = SEAT_RULES[seatAlloy(alloy).rules];
  const weight = stone(D, stoneId, cutId).ct / stone(D, "diamond").ct;
  const ref = Math.max(r.prongK * Math.sqrt(D) * Math.cbrt(weight), PRONG_FLOOR);
  const ratio = d / ref;
  const floor = d < PRONG_FLOOR - 1e-6;
  const fit: ProngFit = floor ? "thin" : ratio > PRONG_BULKY ? "thick" : ratio >= 0.98 ? "ok" : ratio >= 0.85 ? "near" : "thin";
  const covered = D >= r.coveredFrom - 1e-6 && D <= r.coveredTo + 1e-6;
  return { ref, weight, ratio, fit, floor, covered };
}

export interface SeatCheck { id: "depth" | "prong" | "bulk" | "under" | "height"; ok: boolean; level: "ok" | "near" | "fail"; text: string }

export interface SeatInput { d: number; h: number; stoneD: number; under: number; alloy?: string; cuts?: 1 | 2; stoneId?: string; cut?: string; tipR?: number }

/** What is checked at the seat, worst first. A bulky prong is a warning, shown only when it applies. */
export function seatChecks(st: SeatInput): SeatCheck[] {
  const alloy = st.alloy ?? "k21", cuts = st.cuts ?? 1;
  const v = seatVerdict(st.h, alloy, cuts);
  const p = prongCheck(st.d, st.stoneD, alloy, st.stoneId ?? "diamond", st.cut ?? "brilliant");
  const ht = prongHeight(st.d, st.stoneD, st.stoneId ?? "diamond", st.cut ?? "brilliant", st.tipR ?? PRONG_HEIGHT.usual);
  const u = underStoneOk(st.under);
  const ref = p.ref.toFixed(2);
  const list: SeatCheck[] = [
    { id: "depth", ok: v === "within" || v === "atLimit", level: v === "within" || v === "atLimit" ? "ok" : "fail", text: verdictText(v, alloy, cuts) },
    {
      id: "prong", ok: p.fit !== "thin",
      level: p.fit === "thin" ? "fail" : p.fit === "near" ? "near" : "ok",
      text: p.floor
        ? tx(`المخلب أنحف من أصغر مخلب يُصنع (${PRONG_FLOOR} ملم)`, `The prong is thinner than the smallest prong that can be made (${PRONG_FLOOR} mm)`)
        : p.fit === "thin"
          ? tx(`المخلب أنحف كثيراً من اللازم لهذا الحجر (المناسب نحو ${ref} ملم)`, `The prong is far too thin for this stone (about ${ref} mm suits it)`)
          : p.fit === "near"
            ? tx(`المخلب أنحف قليلاً من المناسب لهذا الحجر (نحو ${ref} ملم)`, `The prong is a little thinner than suits this stone (about ${ref} mm)`)
            : tx(`سماكة المخلب تكفي لهذا الحجر (المناسب نحو ${ref} ملم)`, `The prong is thick enough for this stone (about ${ref} mm suits it)`),
    },
    {
      id: "height", ok: ht.level !== "fail", level: ht.level,
      text: ht.level === "fail"
        ? tx(`المخلب ${ht.prong.toFixed(2)} ملم أقصر من أن يُثنى فوق التاج: يلزم ${ht.need.toFixed(2)} على الأقل`, `The ${ht.prong.toFixed(2)} mm prong is too short to bend over the crown: it needs at least ${ht.need.toFixed(2)}`)
        : ht.ratio > PRONG_HEIGHT.okTo
          ? tx(`المخلب ${ht.prong.toFixed(2)} ملم أطول بكثير من الحجر (${ht.stoneH.toFixed(2)}): يُقص الزائد`, `The ${ht.prong.toFixed(2)} mm prong is much taller than the stone (${ht.stoneH.toFixed(2)}): the excess is trimmed`)
          : ht.level === "near"
            ? tx(`المخلب ${ht.prong.toFixed(2)} ملم يكاد يكفي ليُثنى فوق التاج (المعتاد ${(ht.stoneH * PRONG_HEIGHT.usual).toFixed(2)})`, `The ${ht.prong.toFixed(2)} mm prong is barely enough to bend over the crown (usual: ${(ht.stoneH * PRONG_HEIGHT.usual).toFixed(2)})`)
            : tx(`المخلب ${ht.prong.toFixed(2)} ملم لحجر ارتفاعه ${ht.stoneH.toFixed(2)}: يكفي ليُثنى فوق التاج`, `The ${ht.prong.toFixed(2)} mm prong for a stone ${ht.stoneH.toFixed(2)} tall: enough to bend over the crown`),
    },
    {
      id: "under", ok: u, level: u ? "ok" : "fail",
      text: u ? tx(`المعدن تحت الحجر لا يقل عن ${UNDER_MIN} ملم`, `Metal under the stone is at least ${UNDER_MIN} mm`) : tx(`المعدن تحت الحجر ${st.under.toFixed(2)} ملم: أقل من ${UNDER_MIN}`, `Metal under the stone is ${st.under.toFixed(2)} mm: less than ${UNDER_MIN}`),
    },
  ];
  if (p.fit === "thick") list.push({ id: "bulk", ok: true, level: "near", text: tx(`المخلب أثخن من اللازم: يغطي الحجر ويثقل الشكل (المناسب نحو ${ref} ملم)`, `The prong is thicker than needed: it covers the stone and weighs the design down (about ${ref} mm suits it)`) });
  const rank = { fail: 0, near: 1, ok: 2 } as const;
  return list.sort((a, b) => rank[a.level] - rank[b.level]);
}

/* ---------- diameter and free length (bending of a cantilever) ---------- */

export interface LengthResult {
  mp: number;    // plastic moment ratio B/A  (d³)
  tip: number;   // tip load before permanent bend, B/A  (d³ / L)
}

export function lengthRatios(dA: number, LA: number, dB: number, LB: number): LengthResult {
  const mp = (dB / dA) ** 3;
  return { mp, tip: mp * (LA / LB) };
}

/** Diameter factor that restores the same tip load when the free length grows by `k`. */
export const diameterForLength = (k: number) => Math.cbrt(k);

/** Diameter factor for a softer alloy to reach the same plastic moment (hardness as yield proxy). */
export const diameterForAlloy = (hvHard: number, hvSoft: number) => Math.cbrt(hvHard / hvSoft);

/* ---------- the stone as a load ---------- */

export interface StoneResult { ct: number; g: number; depth: number; crown: number; pavilion: number }

/** A stone of width D: its weight and heights. Round brilliant unless a cut is given. */
export function stone(D: number, stoneId: string, cutId = "brilliant"): StoneResult {
  const rho = stoneById(stoneId).density.value / stoneById("diamond").density.value;
  if (cutId === "brilliant") {
    const depth = BRILLIANT.depthRatio * D;
    const tc = Math.tan((BRILLIANT.crownAngleDeg * Math.PI) / 180);
    const tp = Math.tan((BRILLIANT.pavilionAngleDeg * Math.PI) / 180);
    const ct = BRILLIANT.caratFactor * D * D * depth * rho;
    return { ct, g: ct * CARAT_GRAMS, depth, crown: ((D * (1 - BRILLIANT.tableRatio)) / 2) * tc, pavilion: (D / 2) * tp };
  }
  const c = cutById(cutId);
  const depth = (c.crown + c.pavilion + c.girdle) * D;
  const ct = c.caratK * (c.lw * D) * D * depth * rho;
  return { ct, g: ct * CARAT_GRAMS, depth, crown: c.crown * D, pavilion: c.pavilion * D };
}

/* ---------- what the path from file to setting takes ---------- */

export interface LossResult { dEff: number; grooveMm: number; I: number; Ibench: number }

/** d: diameter in the file; loss: lost to cleaning, sanding, polishing; h: groove depth as a fraction of what is left. */
export function losses(d: number, loss: number, h: number): LossResult {
  const dEff = Math.max(d - loss, 0.05);
  const Ibench = (dEff / d) ** 4;
  return { dEff, grooveMm: h * dEff, Ibench, I: Ibench * remaining(h, 1).I };
}

/* ---------- prong height before setting ---------- */

export interface HeightCheck { prong: number; stoneH: number; ratio: number; need: number; level: "ok" | "near" | "fail" }

/**
 * The prong as drawn, from the culet's level, against the stone's height.
 * It must reach the girdle, then lie over the crown for a third of its slope,
 * with a little more for the bend; less than that and it cannot hold.
 */
export function prongHeight(d: number, D: number, stoneId: string, cutId: string, ratio: number): HeightCheck {
  const g = cutGeometry(D, stoneId, cutId);
  const stoneH = g.tableY - g.culetY;
  const prong = ratio * stoneH;
  const slant = Math.hypot(g.R - g.tableHalf, g.crown);
  const need = (g.girdleTop - g.culetY) + PRONG_HEIGHT.contact * slant + PRONG_HEIGHT.bend * d;
  const level = prong < need - 1e-9 ? "fail" : ratio < PRONG_HEIGHT.okFrom || ratio > PRONG_HEIGHT.okTo ? "near" : "ok";
  return { prong, stoneH, ratio, need, level };
}

/* ---------- side profile of the seat, matched to the stone ---------- */

export interface CutGeometry {
  R: number; tableHalf: number; culetHalf: number;
  crown: number; pavilion: number; girdle: number;
  culetY: number; girdleBot: number; girdleTop: number; tableY: number;
  roofSlope: number;  // rise per mm of the crown next to the girdle
  shelfSlope: number; // fall per mm of the pavilion next to the girdle
  outline: [number, number][];
  facets: [number, number][][];
}

/** The stone in side view across its width, sitting with its culet 0.08 mm above the floor. */
export function cutGeometry(D: number, stoneId: string, cutId: string): CutGeometry {
  const c = cutById(cutId), st = stone(D, stoneId, cutId);
  const R = D / 2, tableHalf = R * c.table, culetHalf = D * c.culet;
  const girdle = Math.max(c.girdle * D, 0.05);
  const culetY = 0.08, girdleBot = culetY + st.pavilion, girdleTop = girdleBot + girdle, tableY = girdleTop + st.crown;

  // right half, from the culet up to the table; steps bulge the pavilion a little
  const half: [number, number][] = [[culetHalf, culetY]];
  const facets: [number, number][][] = [];
  if (c.steps > 0) {
    for (let k = 1; k < c.steps; k++) {
      const f = k / c.steps;
      const x = culetHalf + (R - culetHalf) * Math.sqrt(f), y = culetY + st.pavilion * f;
      half.push([x, y]); facets.push([[-x, y], [x, y]]);
    }
  }
  half.push([R, girdleBot], [R, girdleTop]);
  if (c.steps > 0) {
    const x = tableHalf + (R - tableHalf) * 0.45, y = girdleTop + st.crown * 0.6;
    half.push([x, y]); facets.push([[-x, y], [x, y]]);
  }
  half.push([tableHalf, tableY]);
  const outline: [number, number][] = [...half.map(([x, y]) => [-x, y] as [number, number]).reverse(), ...half.slice(culetHalf > 0 ? 0 : 1)];

  facets.push([[-R, girdleBot], [R, girdleBot]], [[-R, girdleTop], [R, girdleTop]]);
  if (c.steps === 0) {
    const m = c.id === "princess" ? 0.35 : 0.55;
    facets.push(
      [[tableHalf, tableY], [R * m, girdleTop]], [[-tableHalf, tableY], [-R * m, girdleTop]],
      [[R * m, girdleBot], [culetHalf, culetY]], [[-R * m, girdleBot], [-culetHalf, culetY]],
    );
    if (c.id === "princess") facets.push([[R * 0.75, girdleBot], [0, culetY + st.pavilion * 0.35]], [[-R * 0.75, girdleBot], [0, culetY + st.pavilion * 0.35]]);
    else facets.push([[0, tableY], [0, girdleTop]]);
  }

  // slopes of the faces the seat is cut to: the segments touching the girdle
  const iBot = half.findIndex(([x, y]) => x === R && y === girdleBot);
  const below = half[iBot - 1], above = half[iBot + 2];
  const shelfSlope = (girdleBot - below[1]) / Math.max(R - below[0], 1e-6);
  const roofSlope = (above[1] - girdleTop) / Math.max(R - above[0], 1e-6);
  return { R, tableHalf, culetHalf, crown: st.crown, pavilion: st.pavilion, girdle, culetY, girdleBot, girdleTop, tableY, roofSlope, shelfSlope, outline, facets };
}

export interface Profile {
  prong: [number, number][];
  stoneOutline: [number, number][];
  facets: [number, number][][];
  girdleY: number;
  girdleTop: number;
  girdleBot: number;
  culetY: number;
  tableY: number;
  tableHalf: number;
  crown: number;
  roofSlope: number;
  shelfSlope: number;
  headTop: number;     // top face of the metal under the stone
  headBottom: number;
  inner: number;       // x of the prong's inner face (toward the stone)
  outer: number;
  seatBack: number;    // x of the seat's back wall (= girdle edge)
  tipY: number;
  R: number;
}

/**
 * Half profile: the stone's axis at x = 0, the prong to the right of the
 * girdle edge. The seat is cut to the stone's own faces: a shelf along the
 * pavilion, a wall at the girdle, and a roof along the crown. The prong stands
 * to `tipR` × the stone's height, as drawn before setting.
 */
export function seatProfile(d: number, hRatio: number, D: number, stoneId: string, under: number, cuts: 1 | 2 = 1, tipR = 1.25, cutId = "brilliant"): Profile {
  const g = cutGeometry(D, stoneId, cutId);
  const R = g.R, h = hRatio * d, tc = g.roofSlope, tp = g.shelfSlope;
  const headTop = 0;
  const inner = R - h, outer = inner + d, seatBack = R;
  const tipY = Math.max(g.culetY + tipR * (g.tableY - g.culetY), g.girdleTop + h * tc + d / 2 + 0.02);
  const base = headTop - under;
  const { girdleBot, girdleTop } = g;

  const prong: [number, number][] = [[inner, base], [outer, base]];
  if (cuts === 2 && h > 1e-4) {
    prong.push([outer, girdleBot - h * tp], [outer - h, girdleBot], [outer - h, girdleTop], [outer, girdleTop + h * tc]);
  }
  prong.push([outer, tipY - d / 2]);
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI;
    prong.push([inner + d / 2 + (d / 2) * Math.cos(a), tipY - d / 2 + (d / 2) * Math.sin(a)]);
  }
  if (h > 1e-4) {
    prong.push([inner, girdleTop + h * tc], [seatBack, girdleTop], [seatBack, girdleBot], [inner, girdleBot - h * tp]);
  }

  return {
    prong, stoneOutline: g.outline, facets: g.facets,
    girdleY: (girdleBot + girdleTop) / 2, girdleTop, girdleBot, culetY: g.culetY, tableY: g.tableY, tableHalf: g.tableHalf,
    crown: g.crown, roofSlope: tc, shelfSlope: tp,
    headTop, headBottom: base, inner, outer, seatBack, tipY, R,
  };
}

/**
 * A shared prong: the neighbouring stone, the same size, sits in the second
 * seat, so its girdle edge touches the far wall of the prong at outer − h.
 * Returns where a point of the near stone (axis at x = 0) lands on it.
 */
export function twinPoint(p: Profile, hMm: number, [x, y]: [number, number]): [number, number] {
  const axis = p.outer - hMm + p.R;
  return [axis - x, y];
}

/** The I/I₀ curve over groove depth, for the chart. */
export function inertiaCurve(cuts: 1 | 2, steps = 50): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const h = (0.6 * i) / steps;
    pts.push([h, remaining(h, cuts).I]);
  }
  return pts;
}
