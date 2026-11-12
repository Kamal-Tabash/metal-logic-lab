import { describe, expect, it } from "vitest";
import { runCase } from "../../core/cases";
import { CASES } from "./cases";
import { DEFAULT_STATE } from "./state";
import { inertiaCurve, lengthRatios, losses, remaining, seatProfile, seatVerdict, section, stone } from "./model";

describe("round section with seat cuts", () => {
  it("matches the closed form for an uncut circle (I = πd⁴/64)", () => {
    const s = section(0, 1);
    expect(s.Iu).toBeCloseTo(Math.PI / 64, 5);
    expect(s.A).toBeCloseTo(Math.PI / 4, 5);
  });
  it("keeps about half of I at d/4 and about 35% at d/3", () => {
    expect(remaining(0.25).I).toBeCloseTo(0.503, 2);
    expect(remaining(1 / 3).I).toBeCloseTo(0.352, 2);
  });
  it("loses monotonically as the groove deepens", () => {
    const c = inertiaCurve(1);
    for (let i = 1; i < c.length; i++) expect(c[i][1]).toBeLessThan(c[i - 1][1]);
  });
  it("leaves nothing when two cuts meet", () => {
    expect(remaining(0.5, 2).I).toBe(0);
  });
  it("classifies depths in the book's words", () => {
    expect(seatVerdict(0.2)).toBe("within");
    expect(seatVerdict(0.25)).toBe("atLimit");
    expect(seatVerdict(0.29)).toBe("over");
    expect(seatVerdict(1 / 3)).toBe("collapse");
  });
});

describe("cantilever ratios", () => {
  it("follows the cube of the diameter and the inverse of the free length", () => {
    expect(lengthRatios(1, 2, 2, 2).mp).toBeCloseTo(8);
    expect(lengthRatios(1, 2, 1, 4).tip).toBeCloseTo(0.5);
  });
});

describe("stone", () => {
  it("weighs a 6.5 mm round brilliant at about one carat, 3.9 mm deep", () => {
    const s = stone(6.5, "diamond");
    expect(s.ct).toBeGreaterThan(0.95);
    expect(s.ct).toBeLessThan(1.06);
    expect(s.depth).toBeCloseTo(3.9, 2);
  });
  it("uses the classic crown and pavilion angles", () => {
    const s = stone(10, "diamond");
    expect(s.pavilion / 10).toBeCloseTo(0.43, 2);
    expect(s.crown / 10).toBeCloseTo(0.148, 2);
  });
});

describe("path losses", () => {
  it("scales the moment by the fourth power of the remaining diameter", () => {
    const r = losses(1, 0.1, 0);
    expect(r.I).toBeCloseTo(0.9 ** 4, 5);
  });
});

describe("seat profile", () => {
  it("cuts the seat back wall at the girdle edge and keeps the prong closed", () => {
    const p = seatProfile(1.1, 0.25, 6.5, "diamond", 0.4);
    expect(p.seatBack).toBeCloseTo(3.25);
    expect(p.inner).toBeCloseTo(3.25 - 0.275);
    expect(p.prong.length).toBeGreaterThan(20);
    expect(p.headBottom).toBeCloseTo(-0.4);
  });
});

describe("every book case reproduces the book", () => {
  for (const c of CASES) {
    it(`${c.id}: ${c.title}`, () => {
      const { result } = runCase(c, DEFAULT_STATE);
      expect(result.value.length).toBeGreaterThan(0);
      if (c.kind === "check") expect(result.pass, `${c.title}: ${result.value} — الكتاب: ${c.bookSays}`).toBe(true);
      else expect(result.pass).toBeUndefined();
    });
  }
});

describe("prong diameter against the book's workshop sizes", () => {
  it("puts the book's three workshop numbers on one curve (0.5·√D)", async () => {
    const { workshopProng } = await import("../../core/data");
    expect(workshopProng(1.1)).toBeCloseTo(0.52, 1);
    expect(workshopProng(4)).toBeCloseTo(1.0, 2);
    expect(workshopProng(6.5)).toBeGreaterThan(1.25);
    expect(workshopProng(6.5)).toBeLessThan(1.3);
  });
  it("does not pass a hair-thin prong because its groove is only a quarter deep", async () => {
    const { seatChecks } = await import("./model");
    const c = seatChecks({ d: 0.3, h: 0.25, stoneD: 6.5, under: 0.6 });
    expect(c[0].id).toBe("prong");
    expect(c[0].level).toBe("fail");
  });
  it("passes the book's corrected solitaire", async () => {
    const { seatChecks } = await import("./model");
    expect(seatChecks({ d: 1.3, h: 0.25, stoneD: 6.5, under: 0.5 }).every((c) => c.level !== "fail")).toBe(true);
  });
});
