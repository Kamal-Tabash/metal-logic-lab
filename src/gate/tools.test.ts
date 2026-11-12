// The gate for every tool built with the kit. A tool passes only if:
//   - it opens on a sound design;
//   - every ready example is sound, whatever the reader had set before;
//   - no reachable value gives a broken number or a drawing that throws;
//   - every control explains itself, in the lab's own plain voice;
//   - any sentence quoted from a book is in that book.
import { existsSync, readFileSync } from "node:fs";
import fc from "fast-check";
import { beforeAll, describe, expect, it } from "vitest";
import { Sheet } from "../core/cad/sheet";
import { runExample, stationControls, type Ctl, type ToolDef } from "../core/kit";
import { TOOLS } from "../core/registry";
import { norm } from "./quotes.test";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDef = ToolDef<any>;
const modules = import.meta.glob<{ DEF: AnyDef }>("../tools/*/def.ts", { eager: true });
const defs = Object.values(modules).map((m) => m.DEF);

const FILE = { impact: "b1.txt", limits: "b2.txt", decision: "b3.txt" } as const;
// The book texts are the author's and are not published with the source. Where
// they are present (the author's machine) every quotation is checked word for
// word; where they are absent these checks are skipped and say so.
const HAVE_BOOKS = Object.values(FILE).every((f) => existsSync(new URL(`../../reference/${f}`, import.meta.url)));
const read = (f: string) => (HAVE_BOOKS ? norm(readFileSync(new URL(`../../reference/${f}`, import.meta.url), "utf8")) : "");
const books = Object.fromEntries(Object.entries(FILE).map(([k, f]) => [k, read(f)])) as Record<keyof typeof FILE, string>;

function mockSheet(w: number, h: number): Sheet {
  const store: Record<string, unknown> = {};
  const ctx = new Proxy(store, {
    get: (t, k: string) => (k in t ? t[k] : k === "measureText" ? (s: string) => ({ width: 7 * String(s).length }) : k === "canvas" ? { width: w, height: h } : () => undefined),
    set: (t, k: string, v) => { t[k] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  return new Sheet(ctx, w, h);
}

beforeAll(() => {
  const g = globalThis as Record<string, unknown>;
  g.document ??= { documentElement: {} };
  g.getComputedStyle ??= () => ({ getPropertyValue: () => "" });
});

const allControls = (d: AnyDef): Ctl<Record<string, unknown>>[] => d.stations.flatMap((s) => stationControls(s));
const extreme = (d: AnyDef, hi: boolean) => {
  const s = { ...d.defaults };
  for (const c of allControls(d)) {
    if (c.kind === "range") s[c.key] = hi ? c.max : c.min;
    if (c.kind === "seg") s[c.key] = c.options[hi ? c.options.length - 1 : 0].value;
  }
  return s;
};
const arb = (d: AnyDef) => {
  const rec: Record<string, fc.Arbitrary<unknown>> = {};
  for (const c of allControls(d)) {
    if (c.kind === "range") rec[c.key] = fc.double({ min: c.min, max: c.max, noNaN: true });
    if (c.kind === "seg") rec[c.key] = fc.constantFrom(...c.options.map((o) => o.value));
  }
  return fc.record(rec).map((r) => ({ ...d.defaults, ...r }));
};
const BROKEN = /NaN|Infinity|undefined|null/;
const STRANGER = /الكتاب يقرر|الكتاب:|المحرك|عزم القصور|اضغط حالة|ورشة الكتاب/;

describe("the registry and the built tools agree", () => {
  it("every tool marked ready has a definition, and the other way round", () => {
    const ready = TOOLS.filter((t) => t.status === "ready" && t.id !== "prong").map((t) => t.id).sort();
    expect(defs.map((d) => d.id).sort()).toEqual(ready);
  });
});

for (const d of defs) {
  describe(`tool: ${d.id} · ${d.title}`, () => {
    it("opens on a sound design", () => {
      for (const st of d.stations) expect((st.result(d.defaults).checks ?? []).filter((c) => c.level !== "ok").map((c) => `${st.id}: ${c.text}`)).toEqual([]);
    });

    it("has ready examples in every station, each one sound whatever was set before", () => {
      for (const st of d.stations) expect(d.examples.filter((e) => e.station === st.id).length, `examples in ${st.id}`).toBeGreaterThanOrEqual(2);
      for (const e of d.examples) for (const base of [d.defaults, extreme(d, false), extreme(d, true)]) {
        const out = runExample(d, e, base);
        expect(out.pass, `${e.id} «${e.title}»: ${out.value}`).toBe(true);
        expect(e.note.length).toBeGreaterThan(20);
        expect(out.value).not.toMatch(BROKEN);
      }
    });

    it("never gives a broken number or a drawing that fails, at any reachable value", () => {
      fc.assert(fc.property(arb(d), (s) => {
        for (const st of d.stations) {
          const r = st.result(s);
          const texts = [r.label, r.value, ...(r.readings ?? []).flatMap((x) => [x.label, x.value]), ...(r.checks ?? []).map((c) => c.text), st.aria(s)];
          for (const c of stationControls(st)) {
            if (c.kind === "range") { texts.push(c.fmt(s[c.key], s), typeof c.hint === "function" ? c.hint(s) : c.hint); for (const m of (typeof c.marks === "function" ? c.marks(s) : c.marks) ?? []) expect(Number.isFinite(m.at)).toBe(true); }
            if (c.kind === "note") texts.push(typeof c.text === "function" ? c.text(s) : c.text);
          }
          for (const t of texts) { expect(t.length).toBeGreaterThan(0); expect(t).not.toMatch(BROKEN); }
          if (r.fraction !== undefined) expect(Number.isFinite(r.fraction)).toBe(true);
          st.draw(mockSheet(720, 460), s);
          st.draw(mockSheet(330, 300), s);
        }
      }), { numRuns: 300 });
    });

    it("explains every control and speaks in its own plain voice", () => {
      const s = d.defaults;
      const texts: string[] = [d.title, ...d.guide.models, ...d.guide.notModeled, ...d.guide.sources];
      for (const st of d.stations) {
        texts.push(st.label, st.idea.text);
        expect(st.idea.text.length).toBeGreaterThan(30);
        for (const c of stationControls(st)) {
          if (c.kind === "note") { texts.push(typeof c.text === "function" ? c.text(s) : c.text); continue; }
          const hint = typeof c.hint === "function" ? c.hint(s) : c.hint;
          expect(hint.length, `hint of «${c.label}»`).toBeGreaterThan(15);
          texts.push(c.label, hint);
        }
        const r = st.result(s);
        texts.push(r.label, ...(r.readings ?? []).map((x) => x.label), ...(r.checks ?? []).map((c) => c.text));
      }
      for (const e of d.examples) texts.push(e.title, e.says, e.note);
      for (const t of texts) expect(t, t).not.toMatch(STRANGER);
      expect(d.guide.models.length).toBeGreaterThanOrEqual(2);
      expect(d.guide.notModeled.length).toBeGreaterThanOrEqual(1);
    });

    it.skipIf(!HAVE_BOOKS)("quotes the book word for word wherever it quotes it", () => {
      for (const e of d.examples.filter((x) => x.quote)) {
        expect(e.ref, `${e.id} names its chapter`).toBeDefined();
        expect(books[e.ref!.book].includes(norm(e.quote!)), `${e.id}: «${e.quote}»`).toBe(true);
      }
    });
  });
}
