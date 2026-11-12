import { tx } from "../../core/i18n";
// م12 — comparing versions: one thing changes by declared steps, the rest stays, and the eye judges.
// This tool gives no verdict and no red: perception is a weighing, not a rule (book 1).
import { circlePts, type Pt, type Sheet, type View } from "../../core/cad/sheet";
import { L1, f1, f2, type ToolDef } from "../../core/kit";

export interface StepsState { d: number; dStep: number; g: number; gStep: number; k: number; kStep: number; what: "stone" | "all" }

/** Five different values around `v`, kept inside the range: near an end the window slides instead of repeating. */
export function five(v: number, step: number, lo: number, hi: number): number[] {
  const st = Math.min(step, (hi - lo) / 4);
  const start = Math.min(Math.max(v - 2 * st, lo), hi - 4 * st);
  return [0, 1, 2, 3, 4].map((i) => start + i * st);
}
const nearest = (values: number[], v: number) => values.reduce((b, x, i) => (Math.abs(x - v) < Math.abs(values[b] - v) ? i : b), 0);

/** Five small sheets, the smallest value first on the right; in two rows on a narrow screen. Your value is framed. */
function strip(sh: Sheet, values: number[], current: number, label: (v: number) => string, paint: (v: View, value: number) => void) {
  const ink = sh.ink, narrow = sh.w < 520, cols = narrow ? 3 : 5, rows = narrow ? 2 : 1, gap = 8, on = nearest(values, current);
  const w = (sh.w - gap * (cols + 1)) / cols, h = (sh.h - 14 - rows * 26 - (rows - 1) * gap) / rows;
  values.forEach((val, i) => {
    const row = Math.floor(i / cols), col = i % cols, inRow = Math.min(cols, values.length - row * cols);
    const rowW = inRow * w + (inRow - 1) * gap, right = (sh.w + rowW) / 2;
    const x = right - (col + 1) * w - col * gap, y = 10 + row * (h + 26 + gap), mid = i === on;
    const v = sh.view({ x, y, w, h });
    sh.ctx.save(); sh.ctx.strokeStyle = mid ? ink.gold : ink.gridMajor; sh.ctx.lineWidth = mid ? 1.6 : 1; sh.ctx.strokeRect(x, y, w, h); sh.ctx.restore();
    v.clip(() => paint(v, val));
    sh.text(label(val), x + w / 2, y + h + 14, { mono: true, size: 11.5, color: mid ? ink.gold : ink.muted });
  });
}

function unitsAround(v: View, d: number) {
  const ink = v.ink; v.fit({ x0: -22, y0: -22, x1: 22, y1: 22 }, 6);
  v.fill(circlePts(0, 0, 4), "rgba(143,168,200,0.18)"); v.stroke(circlePts(0, 0, 4), { color: ink.stone, width: 1.4, close: true });
  for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i * Math.PI) / 2, cx = Math.cos(a) * (4 + d + 2.5), cy = Math.sin(a) * (4 + d + 2.5); v.section(circlePts(cx, cy, 2.5, 40), { stroke: ink.gold, hatch: ink.goldDim, width: 1.2 }); }
}
function rhythm(v: View, g: number) {
  const ink = v.ink; v.fit({ x0: -26, y0: -6, x1: 26, y1: 20 }, 6);
  const R = 30, arc: Pt[] = []; for (let i = 0; i <= 60; i++) { const a = -0.8 + (1.6 * i) / 60; arc.push([Math.sin(a) * R, R - Math.cos(a) * R]); }
  v.stroke(arc, { color: ink.muted, width: 1 });
  for (let i = 0; i < 6; i++) { const base = -0.62 + (1.24 * i) / 5, pull = (i % 2 === 0 ? 1 : -1) * g * 0.105, a = base + pull; v.section(circlePts(Math.sin(a) * R, R - Math.cos(a) * R, 2, 40), { stroke: ink.gold, hatch: ink.goldDim, width: 1.2 }); }
}
function scaleStone(v: View, k: number, what: "stone" | "all") {
  const ink = v.ink; v.fit({ x0: -24, y0: -30, x1: 24, y1: 20 }, 6);
  const body = what === "all" ? k : 1, R = 9 * body, r = 3.2 * k;
  v.stroke([[0, 20], [0, R]], { color: ink.muted, width: 1 });
  v.section(circlePts(0, 0, R), { stroke: ink.gold, hatch: ink.goldDim, width: 1.2 });
  v.fill(circlePts(0, 0, r), v.ink.sheet); v.fill(circlePts(0, 0, r), "rgba(143,168,200,0.2)"); v.stroke(circlePts(0, 0, r), { color: ink.stone, width: 1.4, close: true });
}

const stepCtl = (key: "dStep" | "gStep" | "kStep", min: number, max: number, step: number, fmt: (v: number) => string) => ({ kind: "range" as const, key, label: tx("مقدار الدرجة", "Step size"), min, max, step, fmt, hint: tx("الفرق بين كل نسخة والتي تليها. درجة صغيرة تُري متى يبدأ الفرق بالظهور، ودرجة كبيرة تُري الاتجاه.", "The difference between each version and the next. A small step shows when the difference starts to appear; a large one shows the direction.") });
const same = (value: string) => ({ value, pass: true });

export const DEF: ToolDef<StepsState> = {
  id: "steps", title: tx("مقارنة النسخ", "Comparing Versions"), unit: "",
  defaults: { d: 6, dStep: 2, g: 0.4, gStep: 0.2, k: 1, kStep: 0.2, what: "stone" },
  stations: [
    {
      id: "units", label: tx("وحدات حول حجر", "Units around a stone"),
      idea: { ref: L1(4), text: tx("أربع وحدات حول حجر في الوسط. حين تبتعد تُقرأ خمسة أشياء، وحين تقترب تصير مع الحجر كتلة واحدة. لم يُضف ذهب ولم يُنقص، وتغيّر ما تراه العين.", "Four units around a central stone. When they stand apart, five things are read; when they close in, they and the stone become one mass. No gold was added or removed — and what the eye sees has changed.") },
      primary: { kind: "range", key: "d", label: tx("بُعد الوحدات عن الحجر", "Distance of the units from the stone"), min: 0, max: 14, step: 0.1, fmt: (v) => `${f1(v)} mm`, hint: tx("حرّكه لتقرّب الوحدات الأربع من الحجر أو تبعدها. النسخة ذات الإطار الذهبي هي قيمتك، وحولها نسخ أقرب ونسخ أبعد. اسأل نفسك: عند أي نسخة يتغير ما أراه؟", "Move it to bring the four units closer to the stone or further away. The version with the gold frame is your value, with closer and further versions around it. Ask yourself: at which version does what I see change?") },
      groups: [{ title: tx("الدرجات", "Steps"), controls: [stepCtl("dStep", 0.5, 4, 0.1, (v) => `${f1(v)} mm`)] }],
      result: (s) => ({ label: tx("بُعد الوحدات في نسختك", "Unit distance in your version"), value: `${f1(s.d)} mm`, readings: [{ label: tx("النسخ الخمس", "The five versions"), value: five(s.d, s.dStep, 0, 14).map(f1).join(" · ") }] }),
      draw: (sh, s) => strip(sh, five(s.d, s.dStep, 0, 14), s.d, (v) => f1(v), unitsAround),
      aria: (s) => tx(`خمس نسخ من أربع وحدات حول حجر، ببُعد ${five(s.d, s.dStep, 0, 14).map(f1).join(" و")} ملم.`, `Five versions of four units around a stone, at distances of ${five(s.d, s.dStep, 0, 14).map(f1).join(", ")} mm.`),
    },
    {
      id: "rhythm", label: tx("إيقاع على منحنى", "Rhythm on a curve"),
      idea: { ref: L1(3), text: tx("ست وحدات على منحنى بمسافات متساوية تماماً تُقرأ صفاً هادئاً. إذا اقتربت كل وحدتين صار الصف ثلاثة أزواج بإيقاع آخر. أداة التكرار الآلي توزع بالتساوي، والعين لا تقرأ بالتساوي.", "Six units on a curve at perfectly equal spacing read as a calm row. If every two units move closer, the row becomes three pairs with a different rhythm. An array tool spaces evenly; the eye does not read evenly.") },
      primary: { kind: "range", key: "g", label: tx("تقارب كل وحدتين", "Pairing of every two units"), min: 0, max: 1, step: 0.01, fmt: (v) => f2(v), hint: tx("صفر: مسافات متساوية. واحد: كل وحدتين متلاصقتان. حرّكه وابحث عن اللحظة التي يتحول فيها الصف إلى أزواج.", "Zero: equal spacing. One: every two units touching. Move it and look for the moment the row turns into pairs.") },
      groups: [{ title: tx("الدرجات", "Steps"), controls: [stepCtl("gStep", 0.05, 0.4, 0.01, f2)] }],
      result: (s) => ({ label: tx("التقارب في نسختك", "Pairing in your version"), value: f2(s.g), readings: [{ label: tx("النسخ الخمس", "The five versions"), value: five(s.g, s.gStep, 0, 1).map(f2).join(" · ") }] }),
      draw: (sh, s) => strip(sh, five(s.g, s.gStep, 0, 1), s.g, f2, rhythm),
      aria: (s) => tx(`خمس نسخ من ست وحدات على منحنى، بتقارب ${five(s.g, s.gStep, 0, 1).map(f2).join(" و")}.`, `Five versions of six units on a curve, with pairing of ${five(s.g, s.gStep, 0, 1).map(f2).join(", ")}.`),
    },
    {
      id: "scale", label: tx("تكبير الحجر أم القطعة", "Enlarge the stone, or the piece?"),
      idea: { ref: L1(4), text: tx("تكبير الحجر وحده يغيّر علاقته بما حوله: يضيق الإطار ويثقل الوسط. وتكبير القلادة كلها يُبقي العلاقات كما هي ويغيّر حجمها على الجسد. الطلب واحد، «أكبر»، والنتيجتان مختلفتان.", "Enlarging the stone alone changes its relationship to what surrounds it: the frame narrows and the centre gets heavy. Enlarging the whole pendant keeps the relationships and changes its size on the body. One request — “bigger” — and two different results.") },
      primary: { kind: "range", key: "k", label: tx("نسبة التكبير", "Scale factor"), min: 0.5, max: 2, step: 0.01, fmt: (v) => `× ${f2(v)}`, hint: tx("حرّكه ليكبر ما اخترته أو يصغر. قارن النسخ: متى يبتلع الحجر إطاره؟", "Move it to enlarge or shrink what you chose. Compare the versions: when does the stone swallow its frame?") },
      groups: [{ title: tx("ما الذي يتغير", "What changes"), controls: [
        { kind: "seg", key: "what", label: tx("ما الذي يكبر؟", "What gets bigger?"), options: [{ value: "stone", label: tx("الحجر وحده", "The stone alone") }, { value: "all", label: tx("القلادة كلها", "The whole pendant") }], hint: tx("الحجر وحده: الإطار ثابت والحجر يتغير. القلادة كلها: الحجر والإطار يتغيران بالنسبة نفسها.", "The stone alone: the frame is fixed and the stone changes. The whole pendant: stone and frame change in the same proportion.") },
        stepCtl("kStep", 0.05, 0.5, 0.01, (v) => `× ${f2(v)}`),
      ] }],
      result: (s) => ({ label: tx("التكبير في نسختك", "Scale in your version"), value: `× ${f2(s.k)}`, readings: [{ label: tx("النسخ الخمس", "The five versions"), value: five(s.k, s.kStep, 0.5, 2).map(f2).join(" · ") }, { label: tx("نسبة الحجر إلى الإطار", "Stone-to-frame ratio"), value: f2(s.what === "all" ? 3.2 / 9 : (3.2 * s.k) / 9) }] }),
      draw: (sh, s) => strip(sh, five(s.k, s.kStep, 0.5, 2), s.k, (v) => `×${f2(v)}`, (v, val) => scaleStone(v, val, s.what)),
      aria: (s) => tx(`خمس نسخ من قلادة ${s.what === "all" ? "تكبر كلها" : "يكبر حجرها وحده"} بنسب ${five(s.k, s.kStep, 0.5, 2).map(f2).join(" و")}.`, `Five versions of a pendant ${s.what === "all" ? "that grows as a whole" : "whose stone alone grows"}, at scales of ${five(s.k, s.kStep, 0.5, 2).map(f2).join(", ")}.`),
    },
  ],
  examples: [
    { id: "apart", station: "units", origin: "book", ref: L1(4), title: tx("مثال 1 · وحدات متباعدة", "Example 1 · units well apart"), says: tx("خمسة أشياء", "five things"),
      note: tx("الوحدات على 10 ملم من الحجر، والدرجة ملمتران. في النسخ كلها تُقرأ الوحدات أشياء مستقلة حول الحجر.", "The units are 10 mm from the stone, and the step is two millimetres. In every version the units read as separate things around the stone."), state: { d: 10, dStep: 2 }, expect: (s) => same(tx(`${f1(s.d)} ملم`, `${f1(s.d)} mm`)) },
    { id: "close", station: "units", origin: "book", ref: L1(4), title: tx("مثال 2 · عتبة الالتحام", "Example 2 · the merging threshold"), says: tx("أين تصير كتلة؟", "where does it become one mass?"),
      note: tx("الوحدات على ملمترين من الحجر، والدرجة ملم واحد. بين النسخ الخمس تقع اللحظة التي تلتحم فيها الوحدات بالحجر في كتلة واحدة.", "The units are two millimetres from the stone, and the step is one millimetre. Somewhere among the five versions is the moment the units merge with the stone into one mass."), state: { d: 2, dStep: 1 }, expect: (s) => same(tx(`${f1(s.d)} ملم`, `${f1(s.d)} mm`)) },
    { id: "even", station: "rhythm", origin: "book", ref: L1(3), title: tx("مثال 1 · مسافات متساوية", "Example 1 · equal spacing"), says: tx("صف هادئ", "a calm row"),
      note: tx("التقارب صفر في النسخة الأولى ويزيد بدرجات صغيرة. النسخ الأولى صف واحد منتظم كما توزعه أداة التكرار.", "Pairing is zero in the first version and grows in small steps. The first versions are one regular row, as an array tool would space it."), state: { g: 0.2, gStep: 0.1 }, expect: (s) => same(f2(s.g)) },
    { id: "pairs", station: "rhythm", origin: "book", ref: L1(3), title: tx("مثال 2 · ثلاثة أزواج", "Example 2 · three pairs"), says: tx("إيقاع آخر", "a different rhythm"),
      note: tx("التقارب 0.7 والدرجة 0.15. الوحدات الست تُقرأ ثلاثة أزواج، ولم يتغير عددها ولا المنحنى.", "Pairing 0.7 and a step of 0.15. The six units read as three pairs — yet neither their number nor the curve has changed."), state: { g: 0.7, gStep: 0.15 }, expect: (s) => same(f2(s.g)) },
    { id: "stone", station: "scale", origin: "book", ref: L1(4), title: tx("مثال 1 · الحجر وحده يكبر", "Example 1 · the stone alone grows"), says: tx("الإطار يضيق", "the frame narrows"),
      note: tx("الإطار ثابت والحجر يكبر بدرجات. في النسخ الأخيرة يملأ الحجر إطاره ويختفي ما حوله.", "The frame is fixed and the stone grows in steps. In the last versions the stone fills its frame and what surrounds it disappears."), state: { k: 1.4, kStep: 0.3, what: "stone" }, expect: (s) => same(`× ${f2(s.k)}`) },
    { id: "all", station: "scale", origin: "book", ref: L1(4), title: tx("مثال 2 · القلادة كلها تكبر", "Example 2 · the whole pendant grows"), says: tx("العلاقة ثابتة", "the relationship holds"),
      note: tx("الحجر والإطار يكبران معاً بالنسبة نفسها. العلاقة بينهما لا تتغير في أي نسخة، ويتغير حجم القلادة على الصدر.", "Stone and frame grow together in the same proportion. The relationship between them does not change in any version; the size of the pendant on the chest does."), state: { k: 1.4, kStep: 0.3, what: "all" }, expect: (s) => same(`× ${f2(s.k)}`) },
  ],
  guide: {
    models: [
      tx("في كل مشهد يتغير شيء واحد بدرجات معلنة ويثبت كل ما عداه، وتُعرض خمس نسخ متجاورة تبدأ بأصغرها من اليمين، وقيمتك ذات الإطار الذهبي.", "In every scene one thing changes in declared steps while everything else stays fixed. Five versions are shown side by side, the smallest on the right, with your value in the gold frame."),
      tx("كيف تستعملها: حرّك المنزلق وابحث بعينك عن النسخة التي يتغير عندها ما تقرؤه (متى تصير الوحدات كتلة؟ متى يصير الصف أزواجاً؟). تلك هي العتبة، وهي ما تقرره في تصميمك.", "How to use it: move the slider and look for the version at which what you read changes (when do the units become a mass? when does the row become pairs?). That is the threshold — and it is what you decide in your design."),
      tx("هذه الأداة لا تحكم ولا تلوّن بالأحمر والأخضر: المقارنة للعين، والغاية البحث عن العتبة التي يتغير عندها ما يُقرأ.", "This tool does not judge and does not colour things red and green: the comparison is for the eye, and the aim is to find the threshold at which the reading changes."),
    ],
    notModeled: [
      tx("مسار النظر ونقطة الانقسام: العين لا تسير على المنحنى كما توزع أداة التكرار العناصر، فلا تحسبهما الأداة.", "The path of the gaze and the splitting point: the eye does not travel along the curve the way an array tool spaces elements, so the tool does not compute them."),
      tx("اللون واللمعان والحجم الحقيقي على الجسد: الأشكال هنا مجردة.", "Colour, shine and true size on the body: the shapes here are abstract."),
    ],
    sources: [tx("المشاهد الثلاثة من «بنية الأثر»، الفصلين الثالث والرابع، وطريقة الدرجات المعلنة من الفصل السادس عشر.", "The three scenes come from “Architecture of Impact”, chapters 3 and 4, and the declared-steps method from chapter 16.")],
  },
};
