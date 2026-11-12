import { tx } from "../../core/i18n";
// م9 — the clasp tongue: under a fixed press distance, a thicker tongue works closer to its limit.
import type { Pt } from "../../core/cad/sheet";
import { L2, f1, f2, fail, mm, near, ok, pct, type ToolDef } from "../../core/kit";
import type { Check } from "../../core/ui/controls";

export interface TongueState { t: number; L: number; press: number; metal: string }

// How far a springy strip of each alloy can be strained and still return, as a
// fraction (work-hardened). These are estimates; the exact figure comes from
// the alloy's supplier. The higher karats reach their limit sooner (book 2, ch. 7).
export const SPRING: Record<string, { name: string; limit: number }> = {
  k22: { name: tx("عيار 22", "22k"), limit: 0.002 }, k21: { name: tx("عيار 21", "21k"), limit: 0.003 },
  k18: { name: tx("عيار 18", "18k"), limit: 0.005 }, k14: { name: tx("عيار 14", "14k"), limit: 0.006 },
};
/** Strain at the root of a strip of thickness t and length L pressed down by `press` at its tip. */
export const rootStrain = (t: number, L: number, press: number) => (1.5 * t * press) / (L * L);
export const usage = (s: TongueState) => rootStrain(s.t, s.L, s.press) / SPRING[s.metal].limit;
/** Holding force, relative: grows with t³ and the press, falls with L³. */
export const grip = (t: number, L: number, press: number) => (t ** 3 * press) / L ** 3;
const REF = grip(0.35, 10, 0.6);

function checks(s: TongueState): Check[] {
  const u = usage(s);
  return [u >= 1 ? fail(tx(`اللسان يعبر حده (${pct(u)}): ينثني ولا يرتد، فيغلق القفل ولا يمسك`, `The tongue goes past its limit (${pct(u)}): it bends and does not spring back, so the clasp closes but does not hold`))
    : u > 0.5 ? near(tx(`اللسان يعمل عند ${pct(u)} من حده: يمسك اليوم ويتعب مع تكرار الإغلاق`, `The tongue works at ${pct(u)} of its limit: it holds today and tires with repeated closing`))
    : ok(tx(`اللسان يعمل عند ${pct(u)} من حده: بعيد عنه، فيعيش آلاف الإغلاقات`, `The tongue works at ${pct(u)} of its limit: well clear of it, so it lasts thousands of closings`))];
}

export const DEF: ToolDef<TongueState> = {
  id: "tongue", title: tx("لسان القفل", "Clasp Tongue"),
  defaults: { t: 0.35, L: 12, press: 0.6, metal: "k18" },
  material: (s) => SPRING[s.metal].name,
  stations: [{
    id: "bend", label: tx("اللسان تحت الضغط", "The tongue under pressure"),
    idea: { ref: L2(7), text: tx("علبة القفل تفرض على اللسان مسافة ضغط ثابتة. اللسان الأسمك يبلغ حده أسرع تحت المسافة نفسها، فيتعب. الحل غالباً لسان أطول، لا أسمك.", "The clasp box forces a fixed squeeze on the tongue. A thicker tongue reaches its limit sooner under the same squeeze, and tires. The answer is usually a longer tongue, not a thicker one.") },
    primary: { kind: "range", key: "t", label: tx("سماكة اللسان", "Tongue thickness"), min: 0.15, max: 1, step: 0.01, fmt: (v) => mm(v), hint: tx("حرّكه ليسمك اللسان. يقوى إمساكه كثيراً، لكنه يقترب من حده مع كل إغلاق.", "Move it to thicken the tongue. Its grip gets much stronger, but it comes closer to its limit with every closing.") },
    groups: [{ title: tx("اللسان والعلبة", "Tongue and box"), controls: [
      { kind: "range", key: "L", label: tx("طول اللسان", "Tongue length"), min: 4, max: 20, step: 0.1, fmt: (v) => mm(v, 1), hint: tx("طول الجزء الذي ينثني. اللسان الأطول يوزع الثني على مسافة أكبر، فيبتعد عن حده.", "Length of the part that bends. A longer tongue spreads the bending over more length, and stays further from its limit.") },
      { kind: "range", key: "press", label: tx("مسافة الضغط", "Squeeze distance"), min: 0.1, max: 2, step: 0.01, fmt: (v) => mm(v), hint: tx("المسافة التي ينضغطها طرف اللسان حين يدخل العلبة. تحددها العلبة، لا اللسان.", "How far the tip of the tongue is squeezed when it enters the box. The box sets it, not the tongue.") },
      { kind: "seg", key: "metal", label: tx("العيار", "Karat"), options: Object.entries(SPRING).map(([value, m]) => ({ value, label: m.name })), hint: tx("العيار العالي أنعم، ونابضه يبلغ حده بمسافة أقصر. عيار 21 يحتاج لساناً أطول أو ضغطاً أقل.", "A high karat is softer, and its spring reaches its limit in a shorter distance. 21k needs a longer tongue or less squeeze.") },
    ] }],
    result: (s) => { const u = usage(s); return {
      label: tx("كم يقترب اللسان من حده", "How close the tongue comes to its limit"), value: pct(u), fraction: Math.min(u, 1), tone: u >= 1 ? "warn" : "gold",
      readings: [{ label: tx("قوة الإمساك مقارنةً بلسان 0.35 × 10 ملم", "Grip compared with a 0.35 × 10 mm tongue"), value: `× ${f2(grip(s.t, s.L, s.press) / REF)}`, tone: "gold" }, { label: tx("أقصى مسافة ضغط قبل الحد", "Most squeeze before the limit"), value: mm(s.press / u) }, { label: tx("أقصر طول يُبقيه في نصف مداه", "Shortest length that keeps it at half its range"), value: mm(s.L * Math.sqrt(u / 0.5), 1) }],
      checks: checks(s) }; },
    draw: (sh, s) => {
      const v = sh.view({ x: 0, y: 0, w: sh.w, h: sh.h }), ink = sh.ink, u = usage(s), tone = u >= 1 ? ink.warn : ink.gold;
      const L = s.L, t = s.t, d = s.press, box = Math.max(d + t + 0.6, 1.4);
      v.fit({ x0: -2.2, y0: -box - 0.9, x1: L + 1.5, y1: 1.6 }, 30); v.grid(); v.tag(tx("اللسان من الجانب · ملم", "Tongue from the side · mm"));
      v.section([[-2, 1], [0, 1], [0, -box], [-2, -box]], { stroke: ink.muted, hatch: ink.gridMajor, width: 1 }); // the root block
      v.stroke([[0, 1], [L + 1, 1]], { color: ink.muted, width: 1.4 }); v.stroke([[0, -box], [L + 1, -box]], { color: ink.muted, width: 1.4 }); // the box
      const free: Pt[] = [], bent: Pt[] = [], n = 30;
      const y = (x: number) => -d * (x * x * (3 * L - x)) / (2 * L ** 3);
      for (let i = 0; i <= n; i++) { const x = (L * i) / n; free.push([x, 0]); bent.push([x, y(x)]); }
      v.stroke([...free, ...free.map(([x]) => [x, -t] as Pt).reverse()], { color: ink.muted, width: 1, dash: [4, 4], close: true });
      v.section([...bent, ...bent.map(([x, yy]) => [x, yy - t] as Pt).reverse()], { stroke: tone, hatch: u >= 1 ? "#7a3a2c" : ink.goldDim });
      v.dimV(-d, 0, L, f2(d), { off: 18, color: ink.line });
      v.dimH(0, L, -d - t, f1(L), { off: 22, color: ink.muted });
      v.sheet.text(`${pct(u)}`, v.X(0.6), v.Y(0) - 12, { mono: true, size: 12, color: tone, align: "left", halo: true });
      v.sheet.text(tx("أشد الإجهاد عند القاعدة", "highest stress at the root"), v.X(0.6), v.Y(-t) + 14, { size: 10.5, color: tone, align: "left", halo: true });
    },
    aria: (s) => tx(`لسان سماكته ${f2(s.t)} وطوله ${f1(s.L)} ملم يُضغط ${f2(s.press)} ملم، فيعمل عند ${pct(usage(s))} من حده.`, `A tongue ${f2(s.t)} thick and ${f1(s.L)} mm long is squeezed ${f2(s.press)} mm, so it works at ${pct(usage(s))} of its limit.`),
  }],
  examples: [
    { id: "long18", station: "bend", origin: "book", ref: L2(7), title: tx("ورشة 1 · لسان طويل من عيار 18", "Workshop 1 · long tongue in 18k"), says: tx("يعمل في أقل من نصف مداه", "works at less than half its range"),
      quote: "فاللسان الذي يُضغط في كل إغلاق حتى يكاد يبلغ حد خضوعه يتعب أسرع بكثير من لسان يعمل في نصف هذا المدى",
      note: tx("لسان طوله 12 ملم وسماكته 0.35 ملم يُضغط 0.6 ملم. يعمل في أقل من نصف مداه، فيعيش آلاف الإغلاقات.", "A tongue 12 mm long and 0.35 mm thick is squeezed 0.6 mm. It works at less than half its range, so it lasts thousands of closings."), state: { t: 0.35, L: 12, press: 0.6, metal: "k18" } },
    { id: "k21", station: "bend", origin: "book", ref: L2(7), title: tx("ورشة 2 · قفل من عيار 21", "Workshop 2 · a 21k clasp"), says: tx("لسان أطول ومسافة ضغط أقصر", "longer tongue, shorter squeeze"),
      note: tx("عيار 21 يبلغ حده بمسافة أقصر، فيُعطى لساناً أطول (14 ملم) ومسافة ضغط أصغر (0.45 ملم) ليبقى بعيداً عن حده.", "21k reaches its limit in a shorter distance, so it gets a longer tongue (14 mm) and a smaller squeeze (0.45 mm) to stay clear of its limit."), state: { t: 0.3, L: 14, press: 0.45, metal: "k21" } },
    { id: "stronger", station: "bend", origin: "book", ref: L2(1, tx("حالة على طاولة العمل", "A case on the bench")), title: tx("ورشة 3 · إمساك أقوى بلا تعب", "Workshop 3 · stronger grip without tiring"), says: tx("أسمك وأطول معاً", "thicker and longer together"),
      note: tx("لإمساك أقوى يُزاد الطول مع السماكة: لسان 0.5 × 16 ملم يمسك أقوى من لسان 0.35 × 12 ويبقى في نصف مداه. السماكة وحدها كانت ستتعبه.", "For a stronger grip, add length along with thickness: a 0.5 × 16 mm tongue grips harder than a 0.35 × 12 one and stays at half its range. Thickness alone would have tired it."), state: { t: 0.5, L: 16, press: 0.6, metal: "k18" } },
  ],
  guide: {
    models: [
      tx("اللسان شريط مثبت من طرف، يُضغط طرفه الآخر مسافة ثابتة تحددها العلبة.", "The tongue is a strip fixed at one end; its other end is squeezed a fixed distance set by the box."),
      tx("تحت المسافة نفسها يكبر الإجهاد عند قاعدة اللسان مع سماكته، ويصغر مع مربع طوله. لذلك يتعب الأسمك ويعيش الأطول.", "Under the same squeeze, the stress at the root of the tongue grows with its thickness and shrinks with the square of its length. That is why the thicker one tires and the longer one lasts."),
      tx("قوة الإمساك تكبر مع مكعب السماكة وتصغر مع مكعب الطول، وهي معروضة بالنسبة إلى لسان مرجعي.", "Grip grows with the cube of the thickness and shrinks with the cube of the length; it is shown relative to a reference tongue."),
      tx("لماذا نصف المدى: اللسان الذي يُضغط حتى يكاد يبلغ حده يتعب أسرع بكثير من لسان يعمل في نصف هذا المدى. فالأخضر حتى النصف، والأصفر بعده، والأحمر حين يعبر حده.", "Why half the range: a tongue squeezed almost to its limit tires far sooner than one working at half that range. So green up to half, yellow beyond it, and red when it passes its limit."),
    ],
    notModeled: [
      tx("رقم سبيكتك بالضبط: حد المرونة المستعمل هنا لمعدن مشغول (0.2٪ لعيار 22، و0.3٪ لعيار 21، و0.5٪ لعيار 18، و0.6٪ لعيار 14)، ويرتفع بالتشغيل وينخفض بالتلدين.", "The exact figure for your alloy: the elastic limit used here is for worked metal (0.2% for 22k, 0.3% for 21k, 0.5% for 18k, 0.6% for 14k); it rises with working and falls with annealing."),
      tx("اللسان المثني على هيئة حرف V: الثني يجمع الإجهاد في رأس الثنية. الأداة تحسب لساناً مستقيماً، فاحسب المثني أقرب إلى حده مما تُظهره.", "A tongue folded into a V: the fold gathers the stress at its tip. The tool calculates a straight tongue, so take a folded one as closer to its limit than shown."),
      tx("عدد الإغلاقات حتى الكسر، وأثر الزاوية الحادة عند قاعدة اللسان، والمعدن المصبوب مقابل المشغول.", "The number of closings to failure, the effect of a sharp corner at the root of the tongue, and cast metal against worked metal."),
    ],
    sources: [tx("الفكرة من «حدود المادة»: حالة الفصل الأول، والفصل السابع.", "The idea comes from “The Limits of Material”: the case of chapter 1, and chapter 7.")],
  },
};
