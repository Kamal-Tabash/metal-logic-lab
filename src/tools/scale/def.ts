import { tx } from "../../core/i18n";
// م1 — weight and karat: the same volume weighs differently in each alloy, and the same weight is a different size.
import type { Sheet } from "../../core/cad/sheet";
import { METALS, METAL_OPTS, metalById } from "../../core/data";
import { L2, f1, f2, pct, type ToolDef } from "../../core/kit";

export interface ScaleState { vol: number; metal: string; price: number; grams: number }

export const weightOf = (cm3: number, metal: string) => cm3 * metalById(metal).density;
export const volumeOf = (g: number, metal: string) => g / metalById(metal).density;
export const pureGold = (g: number, metal: string) => (g * metalById(metal).fine) / 1000;

function bars(s: Sheet, values: { name: string; v: number; on: boolean }[], unit: string, title: string) {
  const v = s.view({ x: 0, y: 0, w: s.w, h: s.h }), ink = s.ink;
  const max = Math.max(...values.map((x) => x.v), 1e-6), n = values.length;
  v.fitXY({ x0: 0, y0: 0, x1: n, y1: max * 1.18 }, [44, 20, 34, 40]); v.tag(tx("مقارنة العيارات", "Karats compared"));
  for (const t of [0, 0.25, 0.5, 0.75, 1]) { s.rule(v.X(0), v.Y(max * t), v.X(n), v.Y(max * t), ink.grid); s.text((max * t).toFixed(max < 3 ? 2 : 1), v.X(0) - 6, v.Y(max * t), { mono: true, size: 10, align: "right" }); }
  values.forEach((x, i) => {
    const a = i + 0.2, b = i + 0.8;
    v.section([[a, 0], [b, 0], [b, x.v], [a, x.v]], { stroke: x.on ? ink.gold : ink.muted, hatch: x.on ? ink.goldDim : ink.gridMajor, width: x.on ? 1.8 : 1 });
    s.text(x.name, v.X(i + 0.5), v.Y(0) + 14, { size: 11, color: x.on ? ink.gold : ink.muted });
    s.text(`${x.v.toFixed(x.v < 3 ? 2 : 1)} ${unit}`, v.X(i + 0.5), v.Y(x.v) - 9, { mono: true, size: 11, color: x.on ? ink.gold : ink.line });
  });
  s.text(title, v.X(n / 2), v.r.y + 14, { size: 12, color: ink.line });
}

export const DEF: ToolDef<ScaleState> = {
  id: "scale", title: tx("الوزن والعيار", "Weight & Karat"), unit: "",
  defaults: { vol: 0.4, metal: "k21", price: 100, grams: 10 },
  material: (s) => metalById(s.metal).name,
  stations: [
    {
      id: "weight", label: tx("وزن الحجم نفسه", "Weight of the same volume"),
      idea: { ref: L2(2), text: tx("النموذج الواحد يزن في كل عيار وزناً مختلفاً، لأن الذهب أثقل من المعادن التي تُخلط به. العيار الأعلى أثقل، وفي كل غرام منه ذهب أكثر، فثمنه يزيد من الجهتين معاً.", "One model weighs differently in every karat, because gold is heavier than the metals alloyed with it. A higher karat is heavier, and every gram of it holds more gold — so its price climbs from both sides at once.") },
      primary: { kind: "range", key: "vol", label: tx("حجم القطعة (من برنامج الرسم)", "Volume of the piece (from the CAD program)"), min: 0.05, max: 6, step: 0.01, fmt: (v) => `${f2(v)} cm³`, hint: tx("حجم المعدن في النموذج كما يحسبه برنامج الرسم، بالسنتيمتر المكعب. حرّكه وانظر الوزن في كل عيار.", "The volume of metal in the model as the CAD program reports it, in cubic centimetres. Move it and see the weight in each karat.") },
      groups: [{ title: tx("العيار والسعر", "Karat and price"), controls: [
        { kind: "seg", key: "metal", label: tx("العيار", "Karat"), options: METAL_OPTS, hint: tx("اختر العيار الذي ستُصنع به القطعة. الأعمدة تقارنه بباقي العيارات.", "Choose the karat the piece will be made in. The bars compare it with the other karats.") },
        { kind: "range", key: "price", label: tx("سعر غرام الذهب الخالص", "Price of a gram of fine gold"), min: 20, max: 300, step: 1, fmt: (v) => `${Math.round(v)}`, hint: tx("ضع سعر غرام الذهب الخالص (عيار 24) بعملتك، لتظهر قيمة الذهب في القطعة.", "Enter the price of a gram of fine gold (24k) in your currency to see the value of the gold in the piece.") },
      ] }],
      result: (s) => { const g = weightOf(s.vol, s.metal), au = pureGold(g, s.metal); return {
        label: tx("وزن القطعة", "Weight of the piece"), value: `${f1(g)} g`,
        readings: [{ label: tx("الذهب الخالص فيها", "Fine gold in it"), value: `${f1(au)} g`, tone: "gold" }, { label: tx("قيمة ذهبها (بعملة السعر)", "Value of its gold (in the price's currency)"), value: `${Math.round(au * s.price)}` }, { label: tx("وزنها لو كانت عيار 18", "Its weight if it were 18k"), value: `${f1(weightOf(s.vol, "k18"))} g` }, { label: tx("نسبة وزنها إلى عيار 18", "Its weight relative to 18k"), value: `× ${f2(g / weightOf(s.vol, "k18"))}` }] }; },
      draw: (sh, s) => bars(sh, METALS.map((m) => ({ name: m.name, v: weightOf(s.vol, m.id), on: m.id === s.metal })), "g", tx("الحجم نفسه في كل عيار", "The same volume in each karat")),
      aria: (s) => tx(`قطعة حجمها ${f2(s.vol)} سنتيمتر مكعب تزن ${f1(weightOf(s.vol, s.metal))} غراماً في ${metalById(s.metal).name}.`, `A piece with a volume of ${f2(s.vol)} cm³ weighs ${f1(weightOf(s.vol, s.metal))} g in ${metalById(s.metal).name}.`),
    },
    {
      id: "volume", label: tx("حجم الوزن نفسه", "Volume of the same weight"),
      idea: { ref: L2(1, tx("حالة على طاولة العمل", "A case on the bench")), text: tx("إذا حدد الزبون وزناً لا يتجاوزه، فالعيار الأعلى يعطيه قطعة أصغر. الوزن نفسه من عيار 22 أصغر حجماً من عيار 18 بنحو الثُمن.", "If the customer sets a weight not to be exceeded, a higher karat gives a smaller piece. The same weight in 22k is about an eighth smaller in volume than in 18k.") },
      primary: { kind: "range", key: "grams", label: tx("الوزن المحدد", "Set weight"), min: 1, max: 100, step: 0.5, fmt: (v) => `${f1(v)} g`, hint: tx("الوزن الذي يريده الزبون أو يسمح به ثمنه. حرّكه وانظر كم يخرج من حجم في كل عيار.", "The weight the customer wants, or the price allows. Move it and see how much volume it gives in each karat.") },
      groups: [{ title: tx("العيار والسعر", "Karat and price"), controls: [
        { kind: "seg", key: "metal", label: tx("العيار", "Karat"), options: METAL_OPTS, hint: tx("اختر العيار. الأعمدة تقارن حجمه بباقي العيارات للوزن نفسه.", "Choose the karat. The bars compare its volume with the other karats for the same weight.") },
        { kind: "range", key: "price", label: tx("سعر غرام الذهب الخالص", "Price of a gram of fine gold"), min: 20, max: 300, step: 1, fmt: (v) => `${Math.round(v)}`, hint: tx("سعر غرام الذهب الخالص بعملتك.", "The price of a gram of fine gold in your currency.") },
      ] }],
      result: (s) => { const v = volumeOf(s.grams, s.metal), au = pureGold(s.grams, s.metal); return {
        label: tx("حجم القطعة بهذا الوزن", "Volume of the piece at this weight"), value: `${f2(v)} cm³`,
        readings: [{ label: tx("الذهب الخالص فيها", "Fine gold in it"), value: `${f1(au)} g`, tone: "gold" }, { label: tx("قيمة ذهبها (بعملة السعر)", "Value of its gold (in the price's currency)"), value: `${Math.round(au * s.price)}` }, { label: tx("حجمها مقارنةً بعيار 18", "Its volume compared with 18k"), value: pct(v / volumeOf(s.grams, "k18")) }] }; },
      draw: (sh, s) => bars(sh, METALS.map((m) => ({ name: m.name, v: volumeOf(s.grams, m.id), on: m.id === s.metal })), "cm³", tx("الوزن نفسه في كل عيار", "The same weight in each karat")),
      aria: (s) => tx(`وزن ${f1(s.grams)} غراماً يعطي حجماً قدره ${f2(volumeOf(s.grams, s.metal))} سنتيمتر مكعب في ${metalById(s.metal).name}.`, `A weight of ${f1(s.grams)} g gives a volume of ${f2(volumeOf(s.grams, s.metal))} cm³ in ${metalById(s.metal).name}.`),
    },
  ],
  examples: [
    { id: "v40-18", station: "weight", origin: "book", ref: L2(2), title: tx("ورشة 1 · 0.40 سم³ في عيار 18", "Workshop 1 · 0.40 cm³ in 18k"), says: tx("نحو 6.2 غرام", "about 6.2 grams"),
      note: tx("نموذج حجمه 0.40 سنتيمتر مكعب يزن في عيار 18 الأصفر نحو 6.2 غرام.", "A model with a volume of 0.40 cm³ weighs about 6.2 grams in 18k yellow."), state: { vol: 0.4, metal: "k18" },
      expect: (s) => ({ value: tx(`${f1(weightOf(s.vol, s.metal))} غ`, `${f1(weightOf(s.vol, s.metal))} g`), pass: Math.abs(weightOf(s.vol, s.metal) - 6.2) < 0.1 }) },
    { id: "v40-21", station: "weight", origin: "book", ref: L2(2), title: tx("ورشة 2 · النموذج نفسه في عيار 21", "Workshop 2 · the same model in 21k"), says: tx("بين 6.7 و6.9 غرام", "between 6.7 and 6.9 grams"),
      note: tx("النموذج نفسه في عيار 21 يزن نحو 6.8 غرام، أي نحو مرة وعُشر ما يزنه في عيار 18، وفيه ذهب خالص أكثر.", "The same model in 21k weighs about 6.8 grams — about one and a tenth times its weight in 18k — and holds more fine gold."), state: { vol: 0.4, metal: "k21" },
      expect: (s) => ({ value: tx(`${f1(weightOf(s.vol, s.metal))} غ`, `${f1(weightOf(s.vol, s.metal))} g`), pass: weightOf(s.vol, s.metal) >= 6.65 && weightOf(s.vol, s.metal) <= 6.95 }) },
    { id: "v45", station: "weight", origin: "book", ref: L2(1, tx("حالة على طاولة العمل", "A case on the bench")), title: tx("ورشة 3 · تكبير النموذج إلى 0.45 سم³", "Workshop 3 · model enlarged to 0.45 cm³"), says: tx("نحو 7 غرامات", "about 7 grams"),
      note: tx("حين كبر النموذج من 0.30 إلى 0.45 سنتيمتر مكعب في عيار 18 صار وزنه نحو 7 غرامات بدل 4.7.", "When the model grew from 0.30 to 0.45 cm³ in 18k, its weight became about 7 grams instead of 4.7."), state: { vol: 0.45, metal: "k18" },
      expect: (s) => ({ value: tx(`${f1(weightOf(s.vol, s.metal))} غ`, `${f1(weightOf(s.vol, s.metal))} g`), pass: Math.abs(weightOf(s.vol, s.metal) - 7) < 0.1 }) },
    { id: "g31", station: "volume", origin: "book", ref: L2(1), title: tx("ورشة 1 · سوار 31 غراماً من عيار 18", "Workshop 1 · a 31-gram bangle in 18k"), says: tx("حجمه 2 سم³", "its volume is 2 cm³"),
      note: tx("سوار حجمه سنتيمتران مكعبان يزن في عيار 18 نحو 31 غراماً.", "A bangle with a volume of two cubic centimetres weighs about 31 grams in 18k."), state: { grams: 31, metal: "k18" },
      expect: (s) => ({ value: tx(`${f2(volumeOf(s.grams, s.metal))} سم³`, `${f2(volumeOf(s.grams, s.metal))} cm³`), pass: Math.abs(volumeOf(s.grams, s.metal) - 2) < 0.03 }) },
    { id: "g31-22", station: "volume", origin: "book", ref: L2(2), title: tx("ورشة 2 · الوزن نفسه من عيار 22", "Workshop 2 · the same weight in 22k"), says: tx("حجم أصغر: 1.74 سم³", "smaller volume: 1.74 cm³"),
      note: tx("الوزن نفسه، 31 غراماً، يعطي في عيار 22 قطعة أصغر: 1.74 سنتيمتر مكعب بدل 2. الثمن أعلى والقطعة أصغر.", "The same weight, 31 grams, gives a smaller piece in 22k: 1.74 cm³ instead of 2. The price is higher and the piece is smaller."), state: { grams: 31, metal: "k22" },
      expect: (s) => ({ value: tx(`${f2(volumeOf(s.grams, s.metal))} سم³`, `${f2(volumeOf(s.grams, s.metal))} cm³`), pass: Math.abs(volumeOf(s.grams, s.metal) - 1.74) < 0.02 }) },
  ],
  guide: {
    models: [
      tx("الوزن = الحجم × كثافة السبيكة. الكثافات: 17.8 لعيار 22، ونحو 17 لعيار 21 (بين 16.7 و17.2 بحسب السبيكة)، و15.5 لعيار 18 الأصفر، و11.2 لعيار 9.", "Weight = volume × alloy density. Densities: 17.8 for 22k, about 17 for 21k (between 16.7 and 17.2 depending on the alloy), 15.5 for 18k yellow, and 11.2 for 9k."),
      tx("الذهب الخالص = الوزن × نسبة العيار (875 من الألف في عيار 21، و750 في عيار 18).", "Fine gold = weight × karat fineness (875 per thousand in 21k, 750 in 18k)."),
    ],
    notModeled: [
      tx("أجر الصياغة والأحجار والضرائب: القيمة المعروضة قيمة الذهب الخالص وحده.", "Labour, stones and taxes: the value shown is that of the fine gold alone."),
      tx("فرق الكثافة بين ألوان العيار الواحد (الأبيض والوردي)، وكثافة عيار 14 من المراجع العامة.", "The density difference between colours of the same karat (white and rose), and the density of 14k from general references."),
      tx("ما يضيع في الصب والتشطيب: وزن القطعة النهائي يُقاس على الميزان.", "What is lost in casting and finishing: the final weight of the piece is measured on the scale."),
    ],
    sources: [tx("الكثافات والأوزان من «حدود المادة»، الفصلين الأول والثاني.", "The densities and weights come from “The Limits of Material”, chapters 1 and 2.")],
  },
};
