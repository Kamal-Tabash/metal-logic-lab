// Gate check 3 (logic): what a knowledgeable setter expects in each situation,
// written before the engine was changed. The rule for each alloy is the stricter
// of the book (21 and 22 karat) and published international practice.
import { describe, expect, it } from "vitest";
import { cutGeometry, prongCheck, prongHeight, seatChecks, seatProfile, seatVerdict, stone, twinPoint } from "./model";
import { defaultCut } from "../../core/data";
import { runCase } from "../../core/cases";
import { CASES } from "./cases";
import { DEFAULT_STATE } from "./state";

type S = Parameters<typeof seatChecks>[0];
const base: S = { d: 1.3, h: 0.25, stoneD: 6.5, under: 0.5, alloy: "k21", cuts: 1 };
const worst = (s: Partial<S>) => seatChecks({ ...base, ...s })[0].level;
const level = (s: Partial<S>, id: string) => seatChecks({ ...base, ...s }).find((c) => c.id === id)?.level;

describe("what should happen if…", () => {
  it("…the book's corrected solitaire is set in 21 karat: nothing is red", () => {
    expect(worst({})).not.toBe("fail");
  });
  it("…a 21 karat seat is cut to 40%: red, past the plastic-collapse threshold", () => {
    expect(seatVerdict(0.4, "k21", 1)).toBe("collapse");
  });
  it("…the same 40% seat is cut in 18 karat or platinum: sound practice", () => {
    expect(level({ alloy: "k18", h: 0.4, d: 1.1 }, "depth")).toBe("ok");
    expect(level({ alloy: "pt", h: 0.4, d: 1.1 }, "depth")).toBe("ok");
  });
  it("…a seat goes past half the prong in any alloy: red, the wall keeps less than half", () => {
    for (const alloy of ["k14", "k18", "pt"]) expect(level({ alloy, h: 0.55 }, "depth")).toBe("fail");
  });
  it("…a shared prong takes two seats: together they may not take more than half, so 40% each is red", () => {
    expect(level({ alloy: "k18", cuts: 2, h: 0.4 }, "depth")).toBe("fail");
    expect(level({ alloy: "k18", cuts: 2, h: 0.2 }, "depth")).toBe("ok");
  });
  it("…a hair-thin prong holds a large stone: red in every alloy, however shallow the seat", () => {
    for (const alloy of ["k21", "k18", "pt"]) expect(level({ alloy, d: 0.3, h: 0.1 }, "prong")).toBe("fail");
  });
  it("…a prong is thinner than the smallest that can be made (0.45 mm): red even on a tiny stone", () => {
    expect(level({ alloy: "k18", d: 0.4, stoneD: 0.8 }, "prong")).toBe("fail");
    expect(prongCheck(0.45, 0.8, "k18").fit).not.toBe("thin");
  });
  it("…1.1 mm holds a 6.5 mm diamond: near its limit in 21 karat (the book), enough in 18 karat", () => {
    expect(level({ d: 1.1 }, "prong")).toBe("near");
    expect(level({ d: 1.1, alloy: "k18" }, "prong")).toBe("ok");
  });
  it("…a 2 mm prong holds a 1.1 mm stone: a warning that it is too heavy, never a failure", () => {
    expect(level({ d: 2, stoneD: 1.1 }, "bulk")).toBe("near");
    expect(seatChecks({ ...base, d: 2, stoneD: 1.1 }).filter((c) => c.id === "prong" || c.id === "depth").some((c) => c.level === "fail")).toBe(false);
    // and so thick a prong cannot be pushed over so small a stone at the usual height
    expect(level({ d: 2, stoneD: 1.1 }, "height")).toBe("fail");
  });
  it("…the floor under the stone is 0.4 mm: red", () => {
    expect(level({ under: 0.4 }, "under")).toBe("fail");
  });
  it("…the stone is outside the sizes the references cover: the verdict still comes, marked for a first model", () => {
    expect(prongCheck(1.3, 10, "k21").covered).toBe(false);
    expect(prongCheck(1.3, 10, "k21").fit).toBeDefined();
  });
  it("…the same 6.5 mm stone is cubic zirconia: it weighs 1.7 times as much, so it asks for a thicker prong", () => {
    expect(prongCheck(1.3, 6.5, "k21", "cz").ref).toBeGreaterThan(prongCheck(1.3, 6.5, "k21", "diamond").ref * 1.15);
    expect(level({ stoneId: "cz" }, "prong")).not.toBe("ok");
  });
  it("…the stone is emerald, lighter than diamond: the prong it needs is a little thinner", () => {
    expect(prongCheck(1.3, 6.5, "k21", "emerald").ref).toBeLessThan(prongCheck(1.3, 6.5, "k21", "diamond").ref);
  });
  it("…the workshop habit, a stone 0.8 mm high with a 1 mm prong: sound", () => {
    // a round stone 0.8 mm high is about 1.33 mm across
    const D = 0.8 / 0.6;
    const h = prongHeight(0.5, D, "diamond", "brilliant", 1 / 0.8);
    expect(Math.abs(h.prong - 1)).toBeLessThan(0.05);
    expect(h.level).toBe("ok");
  });
  it("…the prong is cut level with the stone: too short to be pushed over the crown, red", () => {
    expect(level({ tipR: 0.9 }, "height")).toBe("fail");
  });
  it("…the prong is twice the stone's height: a warning that the excess is cut away, not a failure", () => {
    expect(level({ tipR: 2 }, "height")).toBe("near");
  });
  it("…the stone is emerald: it takes the step cut, and a cut changes the stone's shape and weight", () => {
    expect(defaultCut("emerald")).toBe("emerald");
    const round = cutGeometry(6.5, "diamond", "brilliant"), step = cutGeometry(6.5, "diamond", "emerald");
    expect(step.outline.length).toBeGreaterThan(round.outline.length);
    expect(stone(6.5, "diamond", "emerald").ct).toBeGreaterThan(stone(6.5, "diamond", "brilliant").ct);
    expect(prongCheck(1.3, 6.5, "k21", "diamond", "emerald").ref).toBeGreaterThan(prongCheck(1.3, 6.5, "k21", "diamond", "brilliant").ref);
  });
  it("…a prong is shared: the second stone sits in the second seat, right against the prong, not further away", () => {
    for (const [d, hR, D] of [[0.52, 0.25, 1.1], [1.0, 0.2, 4], [0.45, 0.1, 0.8]]) {
      const p = seatProfile(d, hR, D, "diamond", 0.4, 2);
      const hMm = hR * d;
      const [gx] = twinPoint(p, hMm, [p.R, p.girdleBot]); // the neighbour's girdle edge facing the prong
      expect(gx).toBeCloseTo(p.outer - hMm, 9);            // in the far seat
      const [cx] = twinPoint(p, hMm, [0, p.culetY]);        // its axis
      expect(cx - p.R).toBeCloseTo(p.outer - hMm, 9);
      // the gap between the two stones is the prong's core, never more than the prong itself
      expect(gx - p.seatBack).toBeLessThanOrEqual(d + 1e-9);
    }
  });
  it("…any fixed seat case is pressed, whatever the reader had set before: every check is sound, none red, none at its limit", () => {
    const messy = [
      { d: 0.3, h: 0.6, stoneD: 12, under: 0.2, alloy: "k22", cuts: 2 as const, stoneId: "cz", cut: "emerald", tipR: 0.6 },
      { d: 2, h: 0, stoneD: 0.8, under: 1.5, alloy: "pt", cuts: 1 as const, stoneId: "emerald", cut: "princess", tipR: 2 },
    ];
    const seat = CASES.filter((c) => c.station === "seat");
    expect(seat.length).toBeGreaterThanOrEqual(7);
    for (const c of seat) for (const m of messy) {
      const { state, result } = runCase(c, { ...DEFAULT_STATE, ...m });
      expect(seatChecks(state).map((k) => `${c.id}:${k.id}:${k.level}`).filter((t) => !t.endsWith(":ok"))).toEqual([]);
      expect(result.pass).toBe(true);
      expect(c.note, "each case explains itself in plain words").toBeTruthy();
    }
  });
  it("…the tool is opened: it starts on a sound design", () => {
    expect(seatChecks(DEFAULT_STATE).every((k) => k.level === "ok")).toBe(true);
  });
});
