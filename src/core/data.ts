import { tx } from "./i18n";
// Single source of truth for every number the tools use.
// Each value carries where it comes from, so the book, the appendix and the
// tools cannot drift apart: a value taken from the book cites its chapter;
// a value the book does not give is marked "external" and says so on screen.

import type { ChapterRef } from "./books";

export type Source =
  | { kind: "book"; ref: ChapterRef; note?: string }
  | { kind: "external"; note: string };

export interface Value<T = number> {
  value: T;
  unit?: string;
  source: Source;
}

const b2 = (chapter: number, where?: string): Source => ({
  kind: "book",
  ref: { book: "limits", chapter, where },
});

/* ---------- workshop limits for 21 karat (book 2) ---------- */

export const WORKSHOP = {
  seatDepthMax: { value: 1 / 4, source: b2(10) } as Value,
  plasticCollapse: { value: 1 / 3, source: b2(10, tx("مسرد المصطلحات", "Glossary")) } as Value,
  underStoneMin: { value: 0.5, unit: "mm", source: b2(10) } as Value,
  prongForRow110: { value: 0.52, unit: "mm", source: b2(10) } as Value,
  prongFor4mm: { value: 1.0, unit: "mm", source: b2(10) } as Value,
  prongFor65: { value: 1.275, unit: "mm", source: b2(10, tx("حالة على طاولة العمل: الاتجاه 1.25 إلى 1.3", "A case on the bench: the 1.25 to 1.3 direction")) } as Value,
};

/**
 * The book's three workshop prong sizes (1.10 mm stones → 0.52, 4 mm → 1.0,
 * 6.5 mm → 1.25–1.3) lie on one curve, d ≈ 0.5·√D, within 1%. The lab uses
 * that curve only as a reading of the book's own numbers, and says so when a
 * stone falls outside the range they cover.
 */
export const WORKSHOP_LINE = {
  k: 0.5,
  coveredFrom: 1.1,
  coveredTo: 6.5,
  nearRatio: 0.85, // the book calls 1.1 mm on a 6.5 mm stone (0.86 of the line) "قريب من حده"
};

export const workshopProng = (D: number) => WORKSHOP_LINE.k * Math.sqrt(D);

/* ---------- seat rules per alloy: the book, and published practice ---------- */
// "book": 21 and 22 karat, where the book's limits are the stricter ones.
// "world": harder alloys, where published practice applies:
//   - the seat takes 40–50% of the prong's thickness at the bearing, and at
//     least half is left for the wall (so two seats on a shared prong may take
//     a quarter each);
//   - a one-carat (6.5 mm) solitaire takes a 1.0–1.3 mm prong, a 6.1 mm stone
//     1.2 mm, a two-carat (8.2 mm) stone 1.2 mm or more: 0.4·√D runs along the
//     lower edge of those figures;
//   - no prong is made thinner than 0.45 mm, whatever the stone.
// The metal under the stone keeps the book's 0.5 mm for every alloy: no
// published figure for other alloys was found.

export type RuleSet = "book" | "world";

export interface SeatAlloy { id: string; name: string; rules: RuleSet }

export const SEAT_ALLOYS: SeatAlloy[] = [
  { id: "k21", name: tx("عيار 21", "21k"), rules: "book" },
  { id: "k22", name: tx("عيار 22", "22k"), rules: "book" },
  { id: "k18", name: tx("عيار 18", "18k"), rules: "world" },
  { id: "k14", name: tx("عيار 14", "14k"), rules: "world" },
  { id: "pt", name: tx("بلاتين 950", "Platinum 950"), rules: "world" },
];

export const seatAlloy = (id: string): SeatAlloy => SEAT_ALLOYS.find((a) => a.id === id) ?? SEAT_ALLOYS[0];

export const SEAT_RULES: Record<RuleSet, {
  depthSingle: number; depthShared: number; collapse?: number;
  nearBand: number; // fraction of the limit counted as "at the limit"
  prongK: number; coveredFrom: number; coveredTo: number;
}> = {
  book: { depthSingle: 1 / 4, depthShared: 1 / 4, collapse: 1 / 3, nearBand: 0.016, prongK: WORKSHOP_LINE.k, coveredFrom: 1.1, coveredTo: 6.5 },
  world: { depthSingle: 1 / 2, depthShared: 1 / 4, nearBand: 0.1, prongK: 0.4, coveredFrom: 1.0, coveredTo: 8.5 },
};

export const PRONG_FLOOR = 0.45;   // mm, the thinnest prong that is made
export const PRONG_BULKY = 1.6;    // × the reference: heavier than the stone needs
export const UNDER_MIN = 0.5;      // mm

/**
 * Prong height as drawn, before setting, from the stone's culet level, as a
 * multiple of the stone's own height. The author's workshop habit: a stone
 * 0.8 mm high takes a 1 mm prong (× 1.25). When set, the part above the girdle
 * is pushed over the crown and finishes touching a third to a half of the
 * crown's slope; a prong too short to reach a third of the way is red.
 */
export const PRONG_HEIGHT = { usual: 1.25, okFrom: 1.15, okTo: 1.6, contact: 1 / 3, bend: 0.3 };

/* ---------- cuts: the shape of the stone in side view ---------- */
// Proportions as fractions of the width D (the side seen in the drawing).
// Weight ≈ caratK × length × width × depth, the trade's estimating formulas.

export interface Cut {
  id: string;
  name: string;
  table: number;   // table width
  crown: number;   // crown height
  pavilion: number; // pavilion depth
  girdle: number;
  culet: number;   // half-width of the culet or keel
  steps: number;   // step facets on crown and pavilion (0: brilliant-style)
  lw: number;      // length ÷ width
  caratK: number;
  defaultFor?: string[];
}

const BR_CROWN = ((1 - 0.57) / 2) * Math.tan((34.5 * Math.PI) / 180);
const BR_PAV = 0.5 * Math.tan((40.75 * Math.PI) / 180);

export const CUTS: Cut[] = [
  { id: "brilliant", name: tx("مستدير لامع", "Round brilliant"), table: 0.57, crown: BR_CROWN, pavilion: BR_PAV, girdle: 0.02, culet: 0, steps: 0, lw: 1, caratK: 0.0061 },
  { id: "oval", name: tx("بيضاوي", "Oval"), table: 0.57, crown: BR_CROWN, pavilion: BR_PAV, girdle: 0.02, culet: 0, steps: 0, lw: 1.35, caratK: 0.0062 },
  { id: "princess", name: tx("أميرة (مربع)", "Princess (square)"), table: 0.7, crown: 0.1, pavilion: 0.58, girdle: 0.025, culet: 0, steps: 0, lw: 1, caratK: 0.0083 },
  { id: "emerald", name: tx("زمردي متدرّج", "Emerald step cut"), table: 0.62, crown: 0.12, pavilion: 0.5, girdle: 0.025, culet: 0.07, steps: 3, lw: 1.4, caratK: 0.009, defaultFor: ["emerald"] },
];

export const cutById = (id: string): Cut => CUTS.find((c) => c.id === id) ?? CUTS[0];
/** The cut a material is usually given; the reader can change it. */
export const defaultCut = (stoneId: string): string => CUTS.find((c) => c.defaultFor?.includes(stoneId))?.id ?? "brilliant";

/* ---------- alloys (hardness used only as a yield-strength proxy) ---------- */

export interface Alloy {
  id: string;
  name: string;
  hvAnnealed: Value;
}

export const ALLOYS: Alloy[] = [
  { id: "k18y", name: tx("عيار 18 أصفر", "18k yellow"), hvAnnealed: { value: 150, unit: "HV", source: b2(2) } },
  { id: "k22", name: tx("عيار 22", "22k"), hvAnnealed: { value: 60, unit: "HV", source: b2(2) } },
];

/* ---------- stones ---------- */

export interface Stone {
  id: string;
  name: string;
  color: string;   // drawing ink, so a change of material shows on the sheet
  density: Value; // g/cm³
}

export const STONES: Stone[] = [
  { id: "diamond", name: tx("ماس", "Diamond"), color: "#8fa8c8", density: { value: 3.52, unit: "g/cm³", source: b2(9, tx("الكتاب: نحو 3.5", "Book: about 3.5")) } },
  { id: "cz", name: tx("زركونيا مكعبة", "Cubic zirconia"), color: "#d2d6de", density: { value: 5.95, unit: "g/cm³", source: b2(9, tx("الكتاب: بين 5.6 و6", "Book: between 5.6 and 6")) } },
  {
    id: "moissanite",
    name: tx("مويسانيت", "Moissanite"),
    color: "#9cc4b6",
    density: { value: 3.21, unit: "g/cm³", source: { kind: "external", note: tx("الكتاب: أقل من الماس قليلاً؛ الرقم من المراجع الجمولوجية", "Book: slightly less than diamond; figure from gemmological references") } },
  },
  {
    id: "emerald",
    name: tx("زمرد", "Emerald"),
    color: "#4fb07e",
    density: { value: 2.72, unit: "g/cm³", source: { kind: "external", note: tx("ليس في الكتاب؛ من المراجع الجمولوجية", "Not in the book; from gemmological references") } },
  },
];

export const stoneById = (id: string): Stone => STONES.find((s) => s.id === id) ?? STONES[0];

/* ---------- round brilliant proportions (common, not ideal) ---------- */
// Total depth ≈ 60% of diameter, as the book assumes in ch9 ("بنسب شائعة").
// Crown and pavilion angles: the classic 34.5° / 40.75°.

export const BRILLIANT = {
  depthRatio: 0.6,
  crownAngleDeg: 34.5,
  pavilionAngleDeg: 40.75,
  tableRatio: 0.57,
  girdleRatio: 0.02,
  // carat ≈ D² × depth × 0.0061 (D, depth in mm) — the trade formula for round brilliants
  caratFactor: 0.0061,
};

export const CARAT_GRAMS = 0.2;

/* ---------- metals by weight (book 2, ch. 2) ---------- */
export interface Metal { id: string; name: string; density: number; fine: number; soft: boolean }
// density in g/cm³; fine = gold parts per thousand; soft: the alloys the book treats as soft (21 and 22 karat)
export const METALS: Metal[] = [
  { id: "k22", name: tx("عيار 22", "22k"), density: 17.8, fine: 916, soft: true },
  { id: "k21", name: tx("عيار 21", "21k"), density: 17.0, fine: 875, soft: true },
  { id: "k18", name: tx("عيار 18", "18k"), density: 15.5, fine: 750, soft: false },
  { id: "k14", name: tx("عيار 14", "14k"), density: 13.0, fine: 585, soft: false }, // not in the book: the usual figure for yellow 14 karat
  { id: "k9", name: tx("عيار 9", "9k"), density: 11.2, fine: 375, soft: false },
];
export const metalById = (id: string): Metal => METALS.find((m) => m.id === id) ?? METALS[1];
export const METAL_OPTS = METALS.map((m) => ({ value: m.id, label: m.name }));
/** Engraving needs metal under the tool (book 2, ch. 4 and 6): by hand 0.35 mm at least and 0.5 better; by machine 0.5. */
export const ENGRAVE = { handMin: 0.35, handGood: 0.5, machineMin: 0.5, edgeMargin: 0.8 };
