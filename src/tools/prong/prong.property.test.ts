// Gate check 3 (edges): properties that must hold for every value the
// controls can reach, tried on random combinations.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { lengthRatios, losses, remaining, seatChecks, seatProfile, stone } from "./model";
import { LIMITS } from "./state";
import { CUTS } from "../../core/data";

const r = ([lo, hi]: readonly [number, number]) => fc.double({ min: lo, max: hi, noNaN: true });
const RUNS = { numRuns: 1000 };

describe("prong engine holds at every reachable value", () => {
  it("what remains is a fraction, and a deeper groove never leaves more", () => {
    fc.assert(fc.property(r(LIMITS.h), r(LIMITS.h), fc.constantFrom(1 as const, 2 as const), (a, b, cuts) => {
      const [lo, hi] = a < b ? [a, b] : [b, a];
      const A = remaining(lo, cuts), B = remaining(hi, cuts);
      // the section modulus S is left out of the ≤ 1 bound: shaving the outermost
      // fibre shortens the lever faster than it removes stiffness, so S rises a hair
      // for very shallow cuts. That is real, not an error.
      for (const v of [A.S, B.S]) { expect(Number.isFinite(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1.05); }
      for (const v of [A.I, A.A, A.core, B.I, B.A, B.core]) { expect(Number.isFinite(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1 + 1e-6); }
      expect(B.I).toBeLessThanOrEqual(A.I + 1e-6);
      expect(remaining(lo, 2).I).toBeLessThanOrEqual(remaining(lo, 1).I + 1e-6);
    }), RUNS);
  });

  const ALLOY_IDS = ["k21", "k22", "k18", "k14", "pt"];
  const rank = { fail: 0, near: 1, ok: 2 } as const;
  // left out: the "too heavy" warning and the height, which a thinner prong may rightly clear
  // (a thin prong is easier to push over the crown)
  const strength = (s: Parameters<typeof seatChecks>[0]) => seatChecks(s).filter((c) => c.id !== "bulk" && c.id !== "height");
  const worst = (s: Parameters<typeof seatChecks>[0]) => Math.min(...strength(s).map((c) => rank[c.level]));

  it("in every alloy, the strength verdict never gets better when the prong thins, the seat deepens, the floor thins or the stone grows", () => {
    fc.assert(fc.property(r(LIMITS.d), r(LIMITS.h), r(LIMITS.stoneD), r(LIMITS.under), fc.double({ min: 0.5, max: 1, noNaN: true }), fc.constantFrom(...ALLOY_IDS), fc.constantFrom(1 as const, 2 as const),
      (d, h, stoneD, under, k, alloy, cuts) => {
        const base = { d, h, stoneD, under, alloy, cuts };
        const w = worst(base);
        expect(worst({ ...base, d: Math.max(LIMITS.d[0], d * k) })).toBeLessThanOrEqual(w);
        expect(worst({ ...base, h: Math.min(LIMITS.h[1], h / k) })).toBeLessThanOrEqual(w);
        expect(worst({ ...base, under: under * k })).toBeLessThanOrEqual(w);
        expect(worst({ ...base, stoneD: Math.min(LIMITS.stoneD[1], stoneD / k) })).toBeLessThanOrEqual(w);
        expect(worst({ ...base, cuts: 2 })).toBeLessThanOrEqual(worst({ ...base, cuts: 1 }));
      }), RUNS);
  });

  it("whatever is red under the international rules is red under the book's too", () => {
    fc.assert(fc.property(r(LIMITS.d), r(LIMITS.h), r(LIMITS.stoneD), r(LIMITS.under), fc.constantFrom("k18", "k14", "pt"), fc.constantFrom(1 as const, 2 as const),
      (d, h, stoneD, under, alloy, cuts) => {
        const world = strength({ d, h, stoneD, under, alloy, cuts }), book = strength({ d, h, stoneD, under, alloy: "k21", cuts });
        for (const c of world) if (c.level === "fail") expect(book.find((b) => b.id === c.id)?.level).toBe("fail");
      }), RUNS);
  });

  it("every drawing input, in every cut and height, gives finite geometry", () => {
    fc.assert(fc.property(r(LIMITS.d), r(LIMITS.h), r(LIMITS.stoneD), r(LIMITS.under), fc.constantFrom(1 as const, 2 as const), fc.constantFrom(...CUTS.map((c) => c.id)), r(LIMITS.tipR), (d, h, D, under, cuts, cut, tipR) => {
      const p = seatProfile(d, h, D, "diamond", under, cuts, tipR, cut);
      expect(p.roofSlope).toBeGreaterThan(0); expect(p.shelfSlope).toBeGreaterThan(0);
      expect(p.tipY).toBeGreaterThan(p.girdleTop);
      for (const [x, y] of [...p.prong, ...p.stoneOutline]) { expect(Number.isFinite(x)).toBe(true); expect(Number.isFinite(y)).toBe(true); }
    }), RUNS);
  });

  it("weights, ratios and losses stay finite and positive", () => {
    fc.assert(fc.property(r(LIMITS.sD), r(LIMITS.dAB), r(LIMITS.LAB), r(LIMITS.dAB), r(LIMITS.LAB), r(LIMITS.ld), r(LIMITS.ll), r(LIMITS.lg), (D, dA, LA, dB, LB, ld, ll, lg) => {
      const s = stone(D, "diamond"); expect(s.ct).toBeGreaterThan(0); expect(Number.isFinite(s.g)).toBe(true);
      const q = lengthRatios(dA, LA, dB, LB); expect(q.mp).toBeGreaterThan(0); expect(Number.isFinite(q.tip)).toBe(true);
      const l = losses(ld, ll, lg); expect(l.I).toBeGreaterThanOrEqual(0); expect(l.I).toBeLessThanOrEqual(1 + 1e-6);
    }), RUNS);
  });
});
