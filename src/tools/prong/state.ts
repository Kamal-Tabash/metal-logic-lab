export type ProngStation = "seat" | "length" | "stone" | "losses";

export interface ProngState {
  // the seat (side profile + section A–A)
  d: number;       // prong diameter at the seat, mm
  h: number;       // seat depth as a fraction of d
  cuts: 1 | 2;     // one stone, or shared between two
  stoneD: number;  // stone diameter, mm
  stoneId: string;
  alloy: string;   // the seat's alloy: decides which limits apply
  under: number;   // metal under the stone, mm
  cut: string;     // the stone's cut
  tipR: number;    // prong height before setting ÷ the stone's height
  // diameter and free length
  dA: number; LA: number; dB: number; LB: number;
  hvA: number; hvB: number;
  // the stone as a load
  sDA: number; sMA: string; sCA: string; sDB: number; sMB: string; sCB: string;
  // the path from file to setting
  ld: number; ll: number; lg: number;
}

/** Opens on a sound design: the book's corrected solitaire, 6.5 mm diamond, 1.3 mm prongs, 0.5 mm under the stone. */
export const DEFAULT_STATE: ProngState = {
  d: 1.3, h: 0.25, cuts: 1, stoneD: 6.5, stoneId: "diamond", cut: "brilliant", alloy: "k21", under: 0.5, tipR: 1.25,
  dA: 1, LA: 2, dB: 1.2, LB: 2, hvA: 150, hvB: 60,
  sDA: 6.5, sMA: "diamond", sCA: "brilliant", sDB: 8.1, sMB: "diamond", sCB: "brilliant",
  ld: 1.1, ll: 0.2, lg: 0.25,
};

export const LIMITS = {
  d: [0.3, 2.0], h: [0, 0.6], stoneD: [0.8, 12], under: [0.2, 1.5], tipR: [0.6, 2.0],
  dAB: [0.4, 1.8], LAB: [0.8, 5], hv: [20, 240],
  sD: [1, 12], ld: [0.4, 1.8], ll: [0, 0.3], lg: [0, 0.5],
} as const;
