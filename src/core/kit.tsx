import { EN, tx } from "./i18n";
// The tool kit: a tool is described once (stations, controls, checks, ready
// examples, drawing) and this renders it in the pinned pattern:
//   - every control moves freely between a real minimum and maximum;
//   - the verdict turns red only when the reader's own numbers leave what is sound;
//   - every ready example is a sound design that sets all of its station's values;
//   - each control explains itself behind a "?" mark, in plain words.
import { useMemo, useState } from "preact/hooks";
import { CadCanvas } from "./cad/CadCanvas";
import type { Sheet } from "./cad/sheet";
import { refLabel, type ChapterRef } from "./books";
import type { CaseChip, FieldGuide, Layout, ToolComponent } from "./tool";
import { Group, Range, Result, Segmented, type Check, type Reading } from "./ui/controls";

type Dyn<S, T> = T | ((s: S) => T);
const val = <S, T>(d: Dyn<S, T>, s: S): T => (typeof d === "function" ? (d as (s: S) => T)(s) : d);

export interface Mark { at: number; label: string; tone?: "gold" | "warn" }
export interface RangeCtl<S> {
  kind: "range"; key: keyof S & string; label: string;
  min: number; max: number; step: number;
  fmt: (v: number, s: S) => string;
  hint: Dyn<S, string>;
  marks?: Dyn<S, Mark[]>;
  /** A slider that shows the state in another scale (e.g. a ring size for a circumference). */
  get?: (s: S) => number;
  set?: (v: number, s: S) => Partial<S>;
  id?: string;
}
export interface SegCtl<S> {
  kind: "seg"; key: keyof S & string; label: string;
  options: { value: string | number; label: string }[];
  hint: string;
  /** Extra values that follow the choice (e.g. a material sets its usual numbers). */
  also?: (v: string | number, s: S) => Partial<S>;
}
export interface NoteCtl<S> { kind: "note"; text: Dyn<S, string> }
export type Ctl<S> = RangeCtl<S> | SegCtl<S> | NoteCtl<S>;

export interface ResultDef {
  label: string; value: string; fraction?: number; tone?: "gold" | "warn";
  readings?: Reading[]; checks?: Check[];
}

export interface StationDef<S> {
  id: string; label: string;
  /** The idea in plain words, with where it sits in the book. */
  idea: { ref: ChapterRef; text: string };
  primary: RangeCtl<S> | SegCtl<S>;
  groups: { title: string; controls: Ctl<S>[] }[];
  result: (s: S) => ResultDef;
  draw: (sheet: Sheet, s: S) => void;
  /** One sentence describing the drawing, for readers who cannot see it. */
  aria: (s: S) => string;
  grid?: string;
}

export interface Example<S> {
  id: string; station: string; origin: "book" | "world";
  ref?: ChapterRef;
  title: string;
  says: string;  // the expected figure, in a few words
  note: string;  // what the example is and why it is sound
  quote?: string; // the book's sentence, checked against the book's text when given
  state: Partial<S>;
  /** For stations without a verdict: the figure the example is checked against. */
  expect?: (s: S) => { value: string; pass: boolean };
}

export interface ToolDef<S> {
  id: string; title: string;
  defaults: S;
  stations: StationDef<S>[];
  examples: Example<S>[];
  guide: FieldGuide;
  material?: (s: S) => string;
  /** The unit shown in the status bar; empty for tools that measure nothing in millimetres. */
  unit?: string;
}

/** Runs an example on top of any state: its figure, and whether it is sound. */
export function runExample<S>(def: ToolDef<S>, ex: Example<S>, base: S): { state: S; value: string; pass: boolean } {
  const state = { ...base, ...ex.state };
  const st = def.stations.find((x) => x.id === ex.station)!;
  const checks = st.result(state).checks ?? [];
  const bad = checks.find((c) => c.level !== "ok");
  if (ex.expect) { const e = ex.expect(state); return { state, value: e.value, pass: e.pass && !bad }; }
  return { state, value: bad ? bad.text : tx("الفحوص كلها سليمة", "All checks pass"), pass: !bad };
}

export const stationControls = <S,>(st: StationDef<S>): Ctl<S>[] => [st.primary, ...st.groups.flatMap((g) => g.controls)];

export function makeTool<S extends object>(def: ToolDef<S>): ToolComponent {
  return function Tool({ Layout }: { Layout: Layout }) {
    const [st, setSt] = useState<S>(def.defaults);
    const [stationId, setStation] = useState(def.stations[0].id);
    const [results, setResults] = useState<Record<string, { value: string; pass: boolean }>>({});
    const [active, setActive] = useState<{ id: string; before: S } | null>(null);
    const set = (patch: Partial<S>) => { setActive(null); setSt((s) => ({ ...s, ...patch })); };
    const station = def.stations.find((x) => x.id === stationId)!;

    const cases: CaseChip[] = useMemo(() => def.examples.filter((e) => e.station === stationId).map((e) => {
      const r = results[e.id];
      return {
        id: e.id, title: e.title, kind: "check" as const, origin: e.origin, bookSays: e.says, quote: e.quote ?? "", note: e.note,
        refLabel: e.ref ? refLabel(e.ref) : tx("مقاسات عالمية", "International sizes"),
        result: r?.value, state: !r ? "idle" as const : r.pass ? "pass" as const : "fail" as const,
        active: active?.id === e.id,
        onRun: () => {
          if (active?.id === e.id) { setSt(active.before); setActive(null); return; }
          const before = active ? active.before : st;
          const out = runExample(def, e, before);
          setSt(out.state); setActive({ id: e.id, before });
          setResults((m) => ({ ...m, [e.id]: { value: out.value, pass: out.pass } }));
        },
      };
    }), [stationId, results, st, active]);

    const render = (c: Ctl<S>, i: number) => {
      if (c.kind === "note") return <p class="note" key={i}>{val(c.text, st)}</p>;
      if (c.kind === "seg") return (
        <Segmented key={c.key} label={c.label} value={st[c.key] as unknown as string | number} options={c.options} hint={c.hint}
          onChange={(v) => set({ [c.key]: v, ...(c.also ? c.also(v, st) : {}) } as Partial<S>)} />
      );
      const v = c.get ? c.get(st) : (st[c.key] as unknown as number);
      return (
        <Range key={c.id ?? c.key} id={`${def.id}-${c.id ?? c.key}`} label={c.label} value={v} min={c.min} max={c.max} step={c.step}
          display={c.fmt(v, st)} hint={val(c.hint, st)} marks={c.marks ? val(c.marks, st) : undefined}
          onInput={(nv) => set(c.set ? c.set(nv, st) : ({ [c.key]: nv } as Partial<S>))} />
      );
    };

    const label = station.aria(st);
    return Layout({
      title: def.title,
      stations: def.stations.map((x) => ({ id: x.id, label: x.label })),
      station: stationId,
      onStation: setStation,
      drawing: <CadCanvas draw={(s) => station.draw(s, st)} deps={[st, stationId]} label={label} />,
      result: <Result {...station.result(st)} />,
      primary: render(station.primary, -1),
      controls: <>{station.groups.map((g) => <Group title={g.title}>{g.controls.map(render)}</Group>)}</>,
      bookline: { ref: station.idea.ref, quote: station.idea.text },
      cases,
      onReset: () => { setActive(null); setSt(def.defaults); },
      guide: def.guide,
      status: { grid: station.grid, material: def.material?.(st), unit: def.unit ?? "mm" },
    });
  };
}

/* ---------- small helpers every tool uses ---------- */
/** Arabic counting: 1 سنة واحدة، 2 سنتان، 3–10 سنوات، 11+ سنة. */
export function count(n: number, w: { one: string; two: string; few: string; many: string }): string {
  const k = Math.round(n);
  if (k === 0) return `0 ${w.many}`;
  if (k === 1) return w.one;
  if (k === 2) return w.two;
  const r = k % 100;
  return `${k} ${r >= 3 && r <= 10 ? w.few : w.many}`;
}
/** English counting: 1 year, 2 years. */
const plural = (n: number, one: string, many: string) => { const k = Math.round(n); return k === 1 ? one : `${k} ${many}`; };
export const years = (n: number) => EN ? plural(n, "1 year", "years") : count(n, { one: "سنة واحدة", two: "سنتان", few: "سنوات", many: "سنة" });
export const months = (n: number) => EN ? plural(n, "1 month", "months") : count(n, { one: "شهر واحد", two: "شهران", few: "أشهر", many: "شهراً" });
export const days = (n: number) => EN ? plural(n, "1 day", "days") : count(n, { one: "يوم واحد", two: "يومان", few: "أيام", many: "يوماً" });
export const times = (n: number) => EN ? (Math.round(n) === 2 ? "twice" : plural(n, "once", "times")) : count(n, { one: "مرة واحدة", two: "مرتان", few: "مرات", many: "مرة" });
/** A span of time in the largest unit that fits. */
export function span(yrs: number): string {
  if (yrs >= 1) return yrs < 10 && Math.abs(yrs - Math.round(yrs)) > 0.05 ? tx(`${yrs.toFixed(1)} سنة`, `${yrs.toFixed(1)} years`) : years(yrs);
  if (yrs * 12 >= 1) return months(yrs * 12);
  if (yrs * 365 >= 1) return days(yrs * 365);
  return tx("أقل من يوم", "less than a day");
}
export const f1 = (v: number) => v.toFixed(1);
export const f2 = (v: number) => v.toFixed(2);
export const pct = (v: number) => tx(`${Math.round(v * 100)}٪`, `${Math.round(v * 100)}%`);
export const mm = (v: number, n = 2) => `${v.toFixed(n)} mm`;
export const ok = (text: string): Check => ({ level: "ok", text });
export const near = (text: string): Check => ({ level: "near", text });
export const fail = (text: string): Check => ({ level: "fail", text });
/** Worst first, so the phone's folded sheet shows the check that matters. */
export const sortChecks = (list: Check[]): Check[] => { const r = { fail: 0, near: 1, ok: 2 } as const; return [...list].sort((a, b) => r[a.level] - r[b.level]); };
export const L2 = (chapter: number, where?: string): ChapterRef => ({ book: "limits", chapter, where });
export const L3 = (chapter: number, where?: string): ChapterRef => ({ book: "decision", chapter, where });
export const L1 = (chapter: number, where?: string): ChapterRef => ({ book: "impact", chapter, where });
