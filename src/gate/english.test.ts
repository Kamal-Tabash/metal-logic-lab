// The English gate: with the lab opened in English, no Arabic letter may reach
// the reader — not in a title, a hint, a check, an example, a drawing label —
// at the opening values, at the extremes, or inside any ready example. The
// numbers and verdicts must be the same ones the Arabic lab gives.
import { beforeAll, describe, expect, it } from "vitest";
import type { Sheet } from "../core/cad/sheet";
import type { Ctl, ToolDef } from "../core/kit";

(globalThis as Record<string, unknown>).__LOM_LANG__ = "en"; // before any lab module loads

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDef = ToolDef<any>;
const AR = /[؀-ۿ]/;
const loaders = import.meta.glob<{ DEF: AnyDef }>("../tools/*/def.ts");

let defs: AnyDef[] = [];
let kit: typeof import("../core/kit");
let SheetC: typeof Sheet;
let registry: typeof import("../core/registry");
let books: typeof import("../core/books");
let i18n: typeof import("../core/i18n");
let prongCases: typeof import("../tools/prong/cases");

beforeAll(async () => {
  const g = globalThis as Record<string, unknown>;
  g.document ??= { documentElement: {} };
  g.getComputedStyle ??= () => ({ getPropertyValue: () => "" });
  i18n = await import("../core/i18n");
  kit = await import("../core/kit");
  SheetC = (await import("../core/cad/sheet")).Sheet;
  registry = await import("../core/registry");
  books = await import("../core/books");
  prongCases = await import("../tools/prong/cases");
  defs = await Promise.all(Object.values(loaders).map(async (l) => (await l()).DEF));
});

/** A sheet that keeps every label drawn on it. */
function recordingSheet(w: number, h: number, drawn: string[]): Sheet {
  const store: Record<string, unknown> = {};
  const ctx = new Proxy(store, {
    get: (t, k: string) => (k in t ? t[k]
      : k === "measureText" ? (s: string) => ({ width: 7 * String(s).length })
      : k === "canvas" ? { width: w, height: h }
      : k === "fillText" || k === "strokeText" ? (s: string) => { drawn.push(String(s)); }
      : () => undefined),
    set: (t, k: string, v) => { t[k] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  return new SheetC(ctx, w, h);
}

const controls = (d: AnyDef): Ctl<Record<string, unknown>>[] => d.stations.flatMap((s) => kit.stationControls(s));
function extreme(d: AnyDef, hi: boolean) {
  const s = { ...d.defaults };
  for (const c of controls(d)) {
    if (c.kind === "range") s[c.key] = hi ? c.max : c.min;
    if (c.kind === "seg") s[c.key] = c.options[hi ? c.options.length - 1 : 0].value;
  }
  return s;
}
/** Every state a reader can reach by a single choice, plus the corners. */
function states(d: AnyDef) {
  const out = [d.defaults, extreme(d, false), extreme(d, true)];
  for (const e of d.examples) out.push({ ...d.defaults, ...e.state });
  for (const c of controls(d)) if (c.kind === "seg") for (const o of c.options) out.push({ ...d.defaults, [c.key]: o.value }, { ...extreme(d, true), [c.key]: o.value }, { ...extreme(d, false), [c.key]: o.value });
  return out;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function texts(d: AnyDef, s: any): string[] {
  const dyn = <T,>(v: T | ((x: unknown) => T)): T => (typeof v === "function" ? (v as (x: unknown) => T)(s) : v);
  const out: string[] = [d.title, d.material?.(s) ?? "", d.unit ?? "", ...d.guide.models, ...d.guide.notModeled, ...d.guide.sources];
  for (const st of d.stations) {
    const r = st.result(s);
    out.push(st.label, st.idea.text, books.refLabel(st.idea.ref), st.aria(s), st.grid ?? "", r.label, r.value,
      ...(r.readings ?? []).flatMap((x) => [x.label, x.value]), ...(r.checks ?? []).map((c) => c.text));
    for (const c of kit.stationControls(st)) {
      if (c.kind === "note") { out.push(dyn(c.text)); continue; }
      out.push(c.label, dyn(c.hint));
      if (c.kind === "seg") out.push(...c.options.map((o) => o.label));
      if (c.kind === "range") out.push(c.fmt(c.get ? c.get(s) : s[c.key], s), ...(dyn(c.marks) ?? []).map((m) => m.label));
    }
    st.draw(recordingSheet(720, 460, out), s);
    st.draw(recordingSheet(330, 300, out), s);
  }
  for (const e of d.examples) { out.push(e.title, e.says, e.note); if (e.ref) out.push(books.refLabel(e.ref)); const run = kit.runExample(d, e, s); out.push(run.value); }
  return out;
}

describe("the lab in English", () => {
  it("is called METAL LOGIC LAB and names its rights holder", () => {
    expect(i18n.EN).toBe(true);
    expect(i18n.BRAND).toBe("METAL LOGIC LAB");
    expect(i18n.RIGHTS).toMatch(/^© .+ 2026/);
    expect(i18n.RIGHTS).not.toMatch(AR);
  });

  it("names every tool, book and chapter in English", () => {
    for (const t of registry.TOOLS) for (const v of [t.title, t.summary, t.code, t.keywords ?? ""]) expect(v, `${t.id}: ${v}`).not.toMatch(AR);
    expect(new Set(registry.TOOLS.map((t) => t.title)).size).toBe(registry.TOOLS.length);
    for (const b of Object.values(books.BOOKS)) {
      expect(b.title).not.toMatch(AR);
      for (const c of b.chapters) { expect(c, c).not.toMatch(AR); expect(c.length).toBeGreaterThan(3); }
    }
  });

  it("links carry the language: #en/prong in English, #prong in Arabic", () => {
    expect(i18n.withLang("#prong", "en")).toBe("en/prong");
    expect(i18n.withLang("#en/prong", "en")).toBe("en/prong");
    expect(i18n.withLang("", "en")).toBe("en");
    expect(i18n.withLang("#en/prong", "ar")).toBe("prong");
    expect(i18n.stripLang("#en/limits-10")).toBe("limits-10");
    expect(i18n.hashLang("#en")).toBe("en");
    expect(i18n.hashLang("#engrave")).toBe(null); // a tool whose name starts with "en"
    expect(i18n.stripLang("#engrave")).toBe("engrave");
  });

  it("counts in English", () => {
    expect(kit.years(1)).toBe("1 year");
    expect(kit.years(3)).toBe("3 years");
    expect(kit.times(1)).toBe("once");
    expect(kit.times(2)).toBe("twice");
    expect(kit.times(5)).toBe("5 times");
    expect(kit.pct(0.25)).toBe("25%");
    expect(kit.span(0.5)).toBe("6 months");
  });

  it("has fifteen tools: fourteen on the kit and the prong", () => {
    expect(defs.length).toBe(14);
  });

  it("leaves no Arabic in any tool, at any reachable choice, in text or in drawing", () => {
    for (const d of defs) for (const s of states(d)) for (const t of texts(d, s)) {
      expect(t, `${d.id}: ${t}`).not.toMatch(AR);
      expect(t, `${d.id}: ${t}`).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it("gives the same verdicts as the Arabic lab: opens sound, every example sound", () => {
    for (const d of defs) {
      for (const st of d.stations) expect((st.result(d.defaults).checks ?? []).filter((c) => c.level !== "ok").map((c) => `${d.id}/${st.id}: ${c.text}`)).toEqual([]);
      for (const e of d.examples) expect(kit.runExample(d, e, d.defaults).pass, `${d.id}/${e.id}`).toBe(true);
    }
  });

  it("leaves no Arabic in the prong tool's examples", () => {
    for (const c of prongCases.CASES) for (const v of [c.title, c.bookSays, c.note ?? ""]) expect(v, `${c.id}: ${v}`).not.toMatch(AR);
  });
});
