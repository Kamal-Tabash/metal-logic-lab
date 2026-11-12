// "What should happen if…" for every tool: the direction each control must push
// the answer, written from the principle and not from the code.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { slotClearance, runOut } from "../tools/access/def";
import { depthAfterPolish, lineVolume, remainingUnder } from "../tools/engrave/def";
import { mismatch } from "../tools/enamel/def";
import { topHeavy } from "../tools/finger/def";
import { DEF as HEAT } from "../tools/heat/def";
import { bangleWeight, wallForWeight } from "../tools/hollow/def";
import { pitch, tilt, wobble } from "../tools/pendant/def";
import { pureGold, volumeOf, weightOf } from "../tools/scale/def";
import { cFromJp, cFromUs, jpFromC, stretched, usFromC } from "../tools/size/def";
import { usual, worst } from "../tools/stack/def";
import { grip, rootStrain } from "../tools/tongue/def";
import { spotPerYear, spreadPerYear } from "../tools/wear/def";
import { DEF as ARG } from "../tools/argument/def";
import { DEF as STACK } from "../tools/stack/def";

const d = (min: number, max: number) => fc.double({ min, max, noNaN: true });
const RUNS = { numRuns: 400 };
const worstLevel = (checks: { level: string }[] | undefined) => Math.min(...(checks ?? []).map((c) => ({ fail: 0, near: 1, ok: 2 })[c.level as "fail" | "near" | "ok"]));

describe("what should happen if…", () => {
  it("hollow: a thicker wall or a higher karat is always heavier; the wall found for a weight gives that weight back", () => {
    fc.assert(fc.property(d(50, 75), d(2, 10), d(0.15, 0.9), d(5, 100), (Di, ds, wall, g) => {
      const w = Math.min(wall, ds / 2 - 0.01);
      expect(bangleWeight(Di, ds, w + 0.01, "k21")).toBeGreaterThan(bangleWeight(Di, ds, w, "k21"));
      expect(bangleWeight(Di, ds, w, "k22")).toBeGreaterThan(bangleWeight(Di, ds, w, "k18"));
      const t = wallForWeight(Di, ds, g, "k21");
      if (t < ds / 2 - 1e-6) expect(bangleWeight(Di, ds, t, "k21")).toBeCloseTo(g, 6);
      else expect(bangleWeight(Di, ds, ds, "k21")).toBeLessThanOrEqual(g + 1e-6);
    }), RUNS);
  });
  it("engrave: deeper cuts leave less; polishing never deepens a line; twice the length takes twice the gold", () => {
    expect(remainingUnder({ T: 1.2, go: 0.4, gi: 0.15, over: "yes" })).toBeLessThan(remainingUnder({ T: 1.2, go: 0.3, gi: 0.15, over: "yes" }));
    expect(remainingUnder({ T: 1.2, go: 0.3, gi: 0.15, over: "no" })).toBeGreaterThan(remainingUnder({ T: 1.2, go: 0.3, gi: 0.15, over: "yes" }));
    fc.assert(fc.property(d(0.05, 0.8), d(0, 40), d(2, 40), (go, n, um) => { const a = depthAfterPolish(go, n, um); expect(a).toBeLessThanOrEqual(go); expect(a).toBeGreaterThanOrEqual(0); expect(depthAfterPolish(go, n + 1, um)).toBeLessThanOrEqual(a); }), RUNS);
    expect(lineVolume(0.3, 0.2, 2)).toBeCloseTo(2 * lineVolume(0.3, 0.2, 1), 9);
  });
  it("scale: weight and volume undo each other; pure gold is never more than the weight; a higher karat holds more gold", () => {
    fc.assert(fc.property(d(0.05, 6), fc.constantFrom("k22", "k21", "k18", "k14", "k9"), (v, m) => { expect(volumeOf(weightOf(v, m), m)).toBeCloseTo(v, 9); expect(pureGold(weightOf(v, m), m)).toBeLessThan(weightOf(v, m)); }), RUNS);
    expect(pureGold(10, "k21")).toBeGreaterThan(pureGold(10, "k18"));
  });
  it("tongue: thicker or more pressed is closer to its limit; longer is further from it; thicker grips harder", () => {
    fc.assert(fc.property(d(0.15, 1), d(4, 20), d(0.1, 2), (t, L, p) => {
      expect(rootStrain(t * 1.1, L, p)).toBeGreaterThan(rootStrain(t, L, p)); expect(rootStrain(t, L, p * 1.1)).toBeGreaterThan(rootStrain(t, L, p));
      expect(rootStrain(t, L * 1.1, p)).toBeLessThan(rootStrain(t, L, p)); expect(grip(t * 1.1, L, p)).toBeGreaterThan(grip(t, L, p));
    }), RUNS);
    // doubling both thickness and length: twice as far from... the strain halves, the grip stays
    expect(rootStrain(0.8, 20, 0.6)).toBeCloseTo(rootStrain(0.4, 10, 0.6) / 2, 9);
  });
  it("wear: the same loss digs deeper in a smaller area, and a contact point far outruns a spread surface", () => {
    expect(spreadPerYear(6, "k18", 100)).toBeCloseTo(3 * spreadPerYear(6, "k18", 300), 9);
    expect(spotPerYear(6, "k18", 1, 0.02) * 1000).toBeGreaterThan(spreadPerYear(6, "k18", 350));
    expect(spotPerYear(6, "k21", 1, 0.02)).toBeLessThan(spotPerYear(6, "k18", 1, 0.02)); // same mass is less volume in the denser alloy
  });
  it("heat: raising any later fire toward an earlier one never makes the order safer", () => {
    const st = HEAT.stations[0], en = HEAT.stations[1], base = HEAT.defaults;
    fc.assert(fc.property(d(550, 980), d(550, 980), d(0, 60), (s1, s2, up) => {
      expect(worstLevel(st.result({ ...base, s1, s2: Math.min(s2 + up, 980) }).checks)).toBeLessThanOrEqual(worstLevel(st.result({ ...base, s1, s2 }).checks));
    }), RUNS);
    expect(worstLevel(en.result({ ...base, enamel: 790, under: 700 }).checks)).toBe(0); // the solder under the enamel would run in its kiln
    expect(worstLevel(en.result({ ...base, metal: "s925", enamel: 870, under: 790 }).checks)).toBe(0); // high-fire enamel on sterling: past its melting
  });
  it("size: the tables undo each other and match the published points; stretching always thins", () => {
    fc.assert(fc.property(d(40, 76), (C) => { expect(cFromJp(jpFromC(C))).toBeCloseTo(C, 9); expect(cFromUs(usFromC(C))).toBeCloseTo(C, 9); }), RUNS);
    expect(cFromJp(9)).toBeCloseTo(49.2, 1); expect(cFromUs(7)).toBeCloseTo(54.4, 1);
    expect(cFromUs(8) / Math.PI - cFromUs(7) / Math.PI).toBeCloseTo(0.81, 2);
    expect(stretched(1.4, 53, 3)).toBeLessThan(1.4);
  });
  it("enamel: metal shrinking more puts the enamel in compression; the reverse puts it in tension", () => {
    expect(mismatch(15, 13)).toBeGreaterThan(0); expect(mismatch(13, 15)).toBeLessThan(0); expect(mismatch(15, 15)).toBe(0);
  });
  it("access: tilting, a deeper seat, a thicker tool or a narrower gap never leave more room", () => {
    fc.assert(fc.property(d(0.6, 8), d(0.3, 8), d(0, 55), d(0.2, 3), d(1, 4), d(0.5, 15), (gap, depth, tiltA, tip, body, tipLen) => {
      const s = { gap, depth, tilt: tiltA, tip, body: Math.max(body, tip), tipLen }, r = slotClearance(s).room;
      expect(slotClearance({ ...s, tilt: tiltA + 5 }).room).toBeLessThanOrEqual(r + 1e-9);
      expect(slotClearance({ ...s, depth: depth + 0.5 }).room).toBeLessThanOrEqual(r + 1e-9);
      expect(slotClearance({ ...s, body: s.body + 0.3 }).room).toBeLessThanOrEqual(r + 1e-9);
      expect(slotClearance({ ...s, gap: gap - 0.2 }).room).toBeLessThan(r);
      expect(slotClearance({ ...s, tipLen: tipLen + 1 }).room).toBeGreaterThanOrEqual(r - 1e-9); // a longer thin tip keeps the body out
    }), RUNS);
    expect(runOut(3, 25)).toBeCloseTo(2 * runOut(1.5, 25), 9); expect(runOut(1.5, 40)).toBeLessThan(runOut(1.5, 25));
  });
  it("stack: errors grow with the number of parts, the usual case never exceeds the worst, a common reference removes the build-up", () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 10 }), d(0.01, 0.3), (n, t) => { expect(usual(n, t)).toBeLessThanOrEqual(worst(n, t) + 1e-12); expect(worst(n + 1, t)).toBeGreaterThan(worst(n, t)); }), RUNS);
    const st = STACK.stations[0], bad = { ...STACK.defaults, n: 8, tol: 0.1, allow: 0.15 };
    expect(worstLevel(st.result({ ...bad, ref: "each" }).checks)).toBe(0);
    expect(worstLevel(st.result({ ...bad, ref: "common" }).checks)).toBe(2);
    const cp = STACK.stations[1];
    expect(worstLevel(cp.result({ ...STACK.defaults, loss: 0.1, comp: 0.1, spread: 0.1, band: 0.05 }).checks)).toBe(0); // an unsteady loss cannot be compensated
  });
  it("pendant: the bail over the centre of mass hangs straight; a longer drop tilts less; a longer hinge rocks less", () => {
    fc.assert(fc.property(d(-12, 12), d(0, 0.8), d(2, 40), (x, share, drop) => { expect(tilt({ bail: share * x, stoneX: x, stone: share, drop })).toBeCloseTo(0, 9); }), RUNS);
    expect(Math.abs(tilt({ bail: 0, stoneX: 6, stone: 0.4, drop: 30 }))).toBeLessThan(Math.abs(tilt({ bail: 0, stoneX: 6, stone: 0.4, drop: 10 })));
    expect(tilt({ bail: 0, stoneX: 6, stone: 0.4, drop: 12 })).toBeCloseTo(-tilt({ bail: 0, stoneX: -6, stone: 0.4, drop: 12 }), 9);
    // the same law seen from the side: weight in front of the bail tips the face down, a bail moved over it stands it up
    expect(pitch({ fwd: 3, bailZ: 0, drop: 12 })).toBeGreaterThan(5); expect(pitch({ fwd: 3, bailZ: 3, drop: 12 })).toBeCloseTo(0, 9);
    expect(pitch({ fwd: 3, bailZ: 0, drop: 30 })).toBeLessThan(pitch({ fwd: 3, bailZ: 0, drop: 10 }));
    expect(wobble(0.1, 12)).toBeLessThan(wobble(0.1, 6)); expect(wobble(0.2, 6)).toBeGreaterThan(wobble(0.1, 6));
  });
  it("finger: a heavier or taller head is more top-heavy; more weight under the finger balances it", () => {
    const b = { head: 4, headH: 5, shank: 3, base: 54 };
    expect(topHeavy({ ...b, head: 6 })).toBeGreaterThan(topHeavy(b)); expect(topHeavy({ ...b, headH: 8 })).toBeGreaterThan(topHeavy(b)); expect(topHeavy({ ...b, shank: 5 })).toBeLessThan(topHeavy(b));
  });
  it("argument: every missing move is flagged, and only a complete argument is clean", () => {
    const st = ARG.stations[0];
    expect(worstLevel(st.result(ARG.defaults).checks)).toBe(2);
    for (const k of ["claim", "seen", "bridge", "standard"] as const) expect(worstLevel(st.result({ ...ARG.defaults, [k]: "no" }).checks)).toBe(0);
    expect(worstLevel(st.result({ ...ARG.defaults, limit: "no" }).checks)).toBe(1);
  });
});

describe("numbers are written as the books write them", () => {
  it("no Arabic-Indic digits anywhere in the interface: Latin digits only", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? walk(p) : [p]; });
    const root = new URL("..", import.meta.url).pathname;
    const bad = walk(root).filter((p) => /\.(ts|tsx|css)$/.test(p) && !/\.test\.ts$/.test(p)).filter((p) => /[٠-٩۰-۹]/.test(readFileSync(p, "utf8")));
    expect(bad).toEqual([]);
  });
});

describe("what the first outside tester found stays fixed", () => {
  it("version strips never repeat a version, even at the ends of the slider", async () => {
    const { five } = await import("../tools/steps/def");
    fc.assert(fc.property(d(0, 14), d(0.5, 4), (v, st) => { const f = five(v, st, 0, 14); expect(new Set(f.map((x) => x.toFixed(6))).size).toBe(5); expect(Math.min(...f)).toBeGreaterThanOrEqual(-1e-9); expect(Math.max(...f)).toBeLessThanOrEqual(14 + 1e-9); }), RUNS);
    expect(five(14, 2, 0, 14)).toEqual([6, 8, 10, 12, 14]);
  });
  it("time spans use the unit that fits and count in correct Arabic", async () => {
    const { span, years, times } = await import("../core/kit");
    expect(span(0.0004)).toBe("أقل من يوم"); expect(span(0.02)).toBe("7 أيام"); expect(span(0.5)).toBe("6 أشهر"); expect(span(1)).toBe("سنة واحدة");
    expect(years(2)).toBe("سنتان"); expect(years(10)).toBe("10 سنوات"); expect(years(60)).toBe("60 سنة"); expect(times(5)).toBe("5 مرات"); expect(times(30)).toBe("30 مرة");
  });
  it("no change of size means no joints and no verdict about joints; a light head is called stable, not balanced", async () => {
    const { DEF: SIZE } = await import("../tools/size/def"); const { DEF: FINGER } = await import("../tools/finger/def");
    const r = SIZE.stations[1].result({ ...SIZE.defaults, dC: 0 });
    expect(r.checks!.map((c) => c.text)).toEqual(["لا تغيير في المقاس"]); expect(r.readings!.find((x) => x.label.includes("وصلات"))!.value).toBe("0");
    expect(SIZE.stations[1].result({ ...SIZE.defaults, dC: -2 }).checks!.some((c) => c.text.includes("الوصلتين"))).toBe(false);
    expect(SIZE.stations[0].result({ ...SIZE.defaults, C: 40 }).readings!.find((x) => x.label === "المقاس الياباني")!.value).toBe("خارج الجدول"); // 40 mm is below Japanese size 1
    expect(FINGER.stations[1].result({ ...FINGER.defaults, head: 0.2, shank: 15 }).checks![0].text).toContain("مستقر");
  });
  it("polishing that eats the ring itself is flagged", async () => {
    const { DEF: ENG } = await import("../tools/engrave/def");
    expect(worstLevel(ENG.stations[1].result({ ...ENG.defaults, T: 1.2, polishes: 40, perPolish: 40 }).checks)).toBe(0);
  });
});
