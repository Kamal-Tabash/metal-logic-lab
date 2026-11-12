import { tx } from "../../core/i18n";
import type { BookCase } from "../../core/cases";
import { near, within } from "../../core/cases";
import { diameterForAlloy, lengthRatios, losses, seatChecks, stone } from "./model";
import type { ProngState } from "./state";

type C = BookCase<ProngState>;
const pct = (v: number) => tx(`${Math.round(v * 100)}٪`, `${Math.round(v * 100)}%`);
const x = (v: number, n = 2) => `× ${v.toFixed(n)}`;
const L = (chapter: number, where?: string) => ({ book: "limits" as const, chapter, where });

export const CASES: C[] = [
  /* ----- the seat: fixed cases are sound designs. Each sets every value of the station,
     so pressing one always brings the whole drawing back to a correct state. ----- */
  {
    id: "b-solitaire21", station: "seat", kind: "check", ref: L(10),
    title: tx("ورشة 1 · سوليتير عيار 21", "Workshop 1 · 21k solitaire"),
    quote: "ولذلك أضع لعمق المجرى حداً حرجاً لا يُتجاوز، هو ألا يتعدى عمق المجرى المقطوع في المخلب ربع قطره (d/4) بأي حال في عيار 21.",
    note: tx("ماسة قيراط (6.5 ملم) في عيار 21: مخلب 1.3 ملم، والمقعد ربع قطره فقط، وتحت الحجر نصف ملم. المقعد بهذا العمق يُبقي نصف قوة المخلب.", "A one-carat diamond (6.5 mm) in 21k: a 1.3 mm prong, a seat cut only a quarter of its diameter, and half a millimetre of metal under the stone. At this depth the seat leaves the prong half its strength."),
    bookSays: tx("مخلب 1.3 ملم، ومقعد بالربع", "1.3 mm prong, quarter-depth seat"),
    state: { alloy: "k21", stoneId: "diamond", cut: "brilliant", stoneD: 6.5, d: 1.3, h: 0.25, under: 0.5, tipR: 1.25, cuts: 1 },
    run: (s) => sound(s),
  },
  {
    id: "b-four", station: "seat", kind: "check", ref: L(10),
    title: tx("ورشة 2 · حجر 4 ملم", "Workshop 2 · 4 mm stone"),
    quote: "ومع حجر قطره أربعة ملمترات أرسمه بقطر يقارب ملماً واحداً، وهذه أرقام ورشتي في عيار 21",
    note: tx("حجر 4 ملم في عيار 21 يأخذ مخلباً قطره نحو 1 ملم: الحجر الأصغر أخف، فيكفيه مخلب أنحف.", "A 4 mm stone in 21k takes a prong about 1 mm across: the smaller stone is lighter, so a slimmer prong is enough."),
    bookSays: tx("مخلب نحو 1 ملم", "prong about 1 mm"),
    state: { alloy: "k21", stoneId: "diamond", cut: "brilliant", stoneD: 4, d: 1.0, h: 0.25, under: 0.5, tipR: 1.25, cuts: 1 },
    run: (s) => sound(s),
  },
  {
    id: "b-row", station: "seat", kind: "check", ref: L(10),
    title: tx("ورشة 3 · مخلب مشترك لصف أحجار", "Workshop 3 · shared prong in a row"),
    quote: "والمخلب المشترك بين حجرين يُقطع فيه مجريان، واحد لكل حجر، من جهتين متقابلتين، فيأخذ التثبيت منه أكثر مما يأخذ من مخلب يمسك حجراً واحداً.",
    note: tx("صف أحجار 1.10 ملم في عيار 21: مخلب 0.52 ملم بين كل حجرين، وفيه مقعدان. لذلك يُقطع كل مقعد أقل من الربع ليبقى في الوسط ما يحمل الحجرين.", "A row of 1.10 mm stones in 21k: a 0.52 mm prong between each pair, carrying two seats. Each seat is therefore cut to less than a quarter, so enough is left in the middle to hold both stones."),
    bookSays: tx("مخلب 0.52 ملم بمقعدين", "0.52 mm prong with two seats"),
    state: { alloy: "k21", stoneId: "diamond", cut: "brilliant", stoneD: 1.1, d: 0.52, h: 0.2, under: 0.5, tipR: 1.25, cuts: 2 },
    run: (s) => sound(s),
  },

  /* ----- diameter and free length ----- */
  {
    id: "len-12", station: "length", kind: "check", ref: L(1),
    title: tx("1.2 ملم مقابل 1 ملم", "1.2 mm against 1 mm"),
    quote: "فمخلب قطره عند القاعدة 1.2 ملم يحتمل قبل أن يميل قرابة مرة وثلاثة أرباع ما يحتمله مخلب قطره 1 ملم من السبيكة نفسها وفي الحالة نفسها.",
    bookSays: tx("قرابة مرة وثلاثة أرباع", "about one and three-quarter times"),
    state: { dA: 1, LA: 2, dB: 1.2, LB: 2 },
    run: (s) => { const v = lengthRatios(s.dA, s.LA, s.dB, s.LB).tip; return { value: x(v), pass: within(v, 1.65, 1.8) }; },
  },
  {
    id: "len-k21", station: "length", kind: "check", ref: L(2, tx("حالة على طاولة العمل", "A case on the bench")),
    title: tx("عيار 21: من 1 إلى 1.15–1.2 ملم", "21k: from 1 to 1.15–1.2 mm"),
    quote: tx("يكبر قطر المخلب عند قاعدته من 1 ملم إلى نحو 1.15–1.2 ملم. مقاومة الثني تكبر مع مكعب القطر، فهذه الزيادة الصغيرة ترفعها بين مرة ونصف ومرة وثلاثة أرباع.", "The prong grows at its base from 1 mm to about 1.15–1.2 mm. Bending resistance grows with the cube of the diameter, so this small increase raises it by one and a half to one and three-quarter times."),
    bookSays: tx("بين ×1.5 و×1.75", "between ×1.5 and ×1.75"),
    state: { dA: 1, LA: 2, dB: 1.15, LB: 2 },
    run: () => {
      const a = lengthRatios(1, 2, 1.15, 2).mp, b = lengthRatios(1, 2, 1.2, 2).mp;
      return { value: tx(`${x(a)} إلى ${x(b)}`, `${x(a)} to ${x(b)}`), pass: within(a, 1.45, 1.6) && within(b, 1.65, 1.8) };
    },
  },
  {
    id: "len-solitaire", station: "length", kind: "check", ref: L(10, tx("حالة على طاولة العمل", "A case on the bench")),
    title: tx("السوليتير: من 1.1 إلى 1.3 ملم", "Solitaire: from 1.1 to 1.3 mm"),
    quote: tx("الزيادة من 1.1 إلى 1.3 ترفع مقاومة الثني نحو 1.65 مرة، ويختبرها نموذج أول قبل الإنتاج.", "Going from 1.1 to 1.3 raises bending resistance about 1.65 times; a first prototype tests it before production."),
    bookSays: tx("نحو ×1.65", "about ×1.65"),
    state: { dA: 1.1, LA: 2, dB: 1.3, LB: 2 },
    run: (s) => { const v = lengthRatios(s.dA, s.LA, s.dB, s.LB).mp; return { value: x(v), pass: near(v, 1.65, 0.03) }; },
  },
  {
    id: "len-row", station: "length", kind: "check", ref: L(10),
    title: tx("1 ملم مقابل 0.52 ملم", "1 mm against 0.52 mm"),
    quote: "فالمخلب الذي سمكه ملم واحد يحتمل نحو سبعة أضعاف ما يحتمله مخلب سمكه 0.52 ملم.",
    bookSays: tx("نحو سبعة أضعاف", "about seven times"),
    state: { dA: 0.52, LA: 1.5, dB: 1, LB: 1.5 },
    run: (s) => { const v = lengthRatios(s.dA, s.LA, s.dB, s.LB).mp; return { value: x(v, 1), pass: within(v, 6.5, 7.5) }; },
  },
  {
    id: "len-double", station: "length", kind: "check", ref: L(10),
    title: tx("الطول الحر إلى الضعف", "Free length doubled"),
    quote: "فإن المخلب الذي طال إلى الضعف يحتاج، لكي يحتمل ما كان يحتمله القصير، أن يكبر قطره قرابة الربع.",
    bookSays: tx("قطر أكبر قرابة الربع", "diameter about a quarter larger"),
    state: { dA: 1, LA: 1.5, dB: Math.round(Math.cbrt(2) * 100) / 100, LB: 3 },
    run: (s) => {
      const f = Math.cbrt(2), tip = lengthRatios(s.dA, s.LA, s.dB, s.LB).tip;
      return { value: tx(`القطر × ${f.toFixed(2)} يعيد الحمل إلى ${x(tip)}`, `Diameter × ${f.toFixed(2)} brings the load back to ${x(tip)}`), pass: within(f, 1.22, 1.28) && near(tip, 1, 0.03) };
    },
  },
  {
    id: "len-alloy", station: "length", kind: "check", ref: L(2, tx("ملحق الورشة", "Workshop appendix")),
    title: tx("عيار 18 (150 HV) مقابل عيار 22 (60 HV)", "18k (150 HV) against 22k (60 HV)"),
    quote: "ونسبة 150 إلى 60 HV تبرر قطراً أكبر بنحو 1.36.",
    bookSays: tx("قطر أكبر بنحو 1.36", "diameter larger by about 1.36"),
    state: { hvA: 150, hvB: 60 },
    run: (s) => { const v = diameterForAlloy(s.hvA, s.hvB); return { value: x(v), pass: near(v, 1.36, 0.01) }; },
  },

  /* ----- the stone ----- */
  {
    id: "stone-lab", station: "stone", kind: "check", ref: L(9, tx("حالة على طاولة العمل", "A case on the bench")),
    title: tx("قيراط ثم قيراطان", "One carat, then two"),
    quote: tx("الوزن ضعف الوزن الأول، نحو 0.4 غرام بدل 0.2. والقطر نحو 8.1 ملم بدل 6.5. والعمق، في قطع مستدير بنسب شائعة، نحو 4.9 ملم بدل 3.9، فيرتفع سطح الحجر عن الإصبع نحو ملم.", "The weight doubles, about 0.4 g instead of 0.2. The diameter is about 8.1 mm instead of 6.5. And the depth, in a round cut of common proportions, is about 4.9 mm instead of 3.9, so the stone's table sits about a millimetre higher off the finger."),
    bookSays: tx("0.2 ← 0.4 غ، والعمق 3.9 ← 4.9 ملم", "0.2 → 0.4 g, depth 3.9 → 4.9 mm"),
    state: { sDA: 6.5, sMA: "diamond", sCA: "brilliant", sCB: "brilliant", sDB: 8.1, sMB: "diamond" },
    run: (s) => {
      const a = stone(s.sDA, s.sMA, s.sCA), b = stone(s.sDB, s.sMB, s.sCB);
      return {
        value: tx(`${a.g.toFixed(2)} ← ${b.g.toFixed(2)} غ · ${a.depth.toFixed(1)} ← ${b.depth.toFixed(1)} ملم`, `${a.g.toFixed(2)} → ${b.g.toFixed(2)} g · ${a.depth.toFixed(1)} → ${b.depth.toFixed(1)} mm`),
        pass: near(a.g, 0.2, 0.015) && near(b.g, 0.4, 0.025) && near(a.depth, 3.9, 0.05) && near(b.depth, 4.9, 0.1),
      };
    },
  },
  {
    id: "stone-cz", station: "stone", kind: "check", ref: L(9, tx("حالة على طاولة العمل", "A case on the bench")),
    title: tx("الزركونيا بقطر 8.1 ملم", "Cubic zirconia at 8.1 mm"),
    quote: tx("كثافتها نحو 1.7 مرة من كثافة الماس، فيزن الحجر نحو 0.68 غرام، أي ما يعادل نحو ثلاثة قراريط وثلث من الماس.", "It is about 1.7 times as dense as diamond, so the stone weighs about 0.68 g — what a diamond of roughly three and a third carats would weigh."),
    bookSays: tx("نحو 0.68 غ، ثلاثة قراريط وثلث", "about 0.68 g, three and a third carats"),
    state: { sDA: 8.1, sMA: "diamond", sCA: "brilliant", sCB: "brilliant", sDB: 8.1, sMB: "cz" },
    run: (s) => {
      const b = stone(s.sDB, s.sMB, s.sCB);
      return { value: tx(`${b.g.toFixed(2)} غ · ${b.ct.toFixed(1)} قيراط`, `${b.g.toFixed(2)} g · ${b.ct.toFixed(1)} ct`), pass: near(b.g, 0.68, 0.04) && near(b.ct, 3.33, 0.2) };
    },
  },
  {
    id: "stone-50", station: "stone", kind: "check", ref: L(10),
    title: tx("حجر 4 ملم مقابل 1.10 ملم", "4 mm stone against 1.10 mm"),
    quote: "فالحجر الذي قطره أربعة ملمترات يزن قرابة خمسين ضعف حجر قطره 1.10 ملم من المادة نفسها.",
    bookSays: tx("قرابة خمسين ضعفاً", "about fifty times"),
    state: { sDA: 1.1, sMA: "diamond", sCA: "brilliant", sCB: "brilliant", sDB: 4, sMB: "diamond" },
    run: (s) => { const v = stone(s.sDB, s.sMB, s.sCB).g / stone(s.sDA, s.sMA, s.sCA).g; return { value: x(v, 0), pass: within(v, 45, 55) }; },
  },
  {
    id: "stone-4x", station: "stone", kind: "check", ref: L(10, tx("حالة على طاولة العمل", "A case on the bench")),
    title: tx("ماسة 6.5 ملم مقابل حجر 4 ملم", "6.5 mm diamond against a 4 mm stone"),
    quote: tx("والحجر هنا أكبر بكثير: وزنه نحو أربعة أضعاف حجر الأربعة ملمترات، وارتفاعه أكبر.", "The stone here is far bigger: about four times the weight of the 4 mm stone, and taller."),
    bookSays: tx("نحو أربعة أضعاف", "about four times"),
    state: { sDA: 4, sMA: "diamond", sCA: "brilliant", sCB: "brilliant", sDB: 6.5, sMB: "diamond" },
    run: (s) => { const v = stone(s.sDB, s.sMB, s.sCB).g / stone(s.sDA, s.sMA, s.sCA).g; return { value: x(v, 1), pass: within(v, 3.8, 4.6) }; },
  },

  /* ----- the path ----- */
  {
    id: "loss-solitaire", station: "losses", kind: "explore", ref: L(10, tx("حالة على طاولة العمل", "A case on the bench")),
    title: tx("السوليتير: يضيع خُمس ملم ثم يُقطع المقعد", "Solitaire: a fifth of a millimetre is lost, then the seat is cut"),
    quote: "فاحسب ما يبقى من المخلب عند المجرى الذي سيُقطع فيه، ثم ما يبقى منه إن أخذ الإنتاج منه خُمس ملم.",
    bookSays: tx("يُحسب هنا أمامك", "worked out here in front of you"),
    state: { ld: 1.1, ll: 0.2, lg: 0.25 },
    run: (s) => { const r = losses(s.ld, s.ll, s.lg); return { value: tx(`Ø ${r.dEff.toFixed(2)} ملم · يبقى ${pct(r.I)} من قوة المخلب المرسوم`, `Ø ${r.dEff.toFixed(2)} mm · ${pct(r.I)} of the drawn prong's strength remains`) }; },
  },
  {
    id: "loss-row", station: "losses", kind: "explore", ref: L(10),
    title: tx("مخلب الصف 0.52 ملم", "The 0.52 mm row prong"),
    quote: "فالمخلب الذي رُسم بقطر 0.52 ملم يبقى منه عند المجرى، في الموضع الذي يمسك الحجر بالضبط، أقل من ذلك بكثير.",
    bookSays: tx("أقل من ذلك بكثير", "much less than that"),
    state: { ld: 0.52, ll: 0.08, lg: 0.25 },
    run: (s) => { const r = losses(s.ld, s.ll, s.lg); return { value: tx(`Ø ${r.dEff.toFixed(2)} ملم · يبقى ${pct(r.I)} من قوة المخلب المرسوم`, `Ø ${r.dEff.toFixed(2)} mm · ${pct(r.I)} of the drawn prong's strength remains`) }; },
  },

  /* ----- published international practice: fixed cases that bring everything back to a sound seat ----- */
  {
    id: "w-solitaire18", station: "seat", kind: "check", origin: "world",
    title: tx("عالمية 1 · سوليتير عيار 18", "International 1 · 18k solitaire"),
    quote: "",
    note: tx("ماسة قيراط في عيار 18: السبيكة أقسى من عيار 21، فيكفيها مخلب 1.1 ملم، ويُسمح بمقعد أعمق (40 إلى 50٪ من سماكة المخلب).", "A one-carat diamond in 18k: the alloy is harder than 21k, so a 1.1 mm prong is enough, and a deeper seat is allowed (40 to 50% of the prong's thickness)."),
    bookSays: tx("مقعد 40–50٪، ومخلب 1.0–1.3 ملم", "seat 40–50%, prong 1.0–1.3 mm"),
    state: { alloy: "k18", stoneD: 6.5, stoneId: "diamond", cut: "brilliant", tipR: 1.25, d: 1.1, h: 0.42, under: 0.6, cuts: 1 },
    run: (s) => sound(s),
  },
  {
    id: "w-half14", station: "seat", kind: "check", origin: "world",
    title: tx("عالمية 2 · مقعد بنصف السماكة", "International 2 · seat at half thickness"),
    quote: "",
    note: tx("حجر 6.1 ملم في عيار 14 بمخلب 1.2 ملم: المقعد يأخذ نصف السماكة ويبقى نصفها. هذا أعمق ما يُقطع في أي سبيكة.", "A 6.1 mm stone in 14k with a 1.2 mm prong: the seat takes half the thickness and half remains. This is the deepest cut allowed in any alloy."),
    bookSays: tx("نصف السماكة حداً أقصى", "half the thickness at most"),
    state: { alloy: "k14", stoneD: 6.1, stoneId: "diamond", cut: "brilliant", tipR: 1.25, d: 1.2, h: 0.5, under: 0.6, cuts: 1 },
    run: (s) => sound(s),
  },
  {
    id: "w-micro", station: "seat", kind: "check", origin: "world",
    title: tx("عالمية 3 · أصغر مخلب لحجر دقيق", "International 3 · smallest prong for a melee stone"),
    quote: "",
    note: tx("حجر دقيق 1.1 ملم في عيار 18: المخلب لا يصغر عن 0.45 ملم مهما صغر الحجر. ولأنه مشترك بين حجرين، لا يأخذ كل مقعد أكثر من ربعه.", "A 1.1 mm melee stone in 18k: the prong never goes below 0.45 mm, however small the stone. And because it is shared between two stones, each seat takes no more than a quarter of it."),
    bookSays: tx("0.45 ملم حداً أدنى، وربع لكل مقعد", "0.45 mm minimum, a quarter per seat"),
    state: { alloy: "k18", stoneD: 1.1, stoneId: "diamond", cut: "brilliant", tipR: 1.25, d: 0.45, h: 0.2, under: 0.5, cuts: 2 },
    run: (s) => sound(s),
  },
  {
    id: "w-platinum", station: "seat", kind: "check", origin: "world",
    title: tx("عالمية 4 · بلاتين لحجر قيراطين", "International 4 · platinum for a two-carat stone"),
    quote: "",
    note: tx("حجر قيراطين (8.2 ملم) في البلاتين: مخلب 1.25 ملم، والمقعد 42٪ من سماكته.", "A two-carat stone (8.2 mm) in platinum: a 1.25 mm prong, with a seat 42% of its thickness."),
    bookSays: tx("1.2 ملم فأكثر", "1.2 mm or more"),
    state: { alloy: "pt", stoneD: 8.2, stoneId: "diamond", cut: "brilliant", tipR: 1.25, d: 1.25, h: 0.42, under: 0.6, cuts: 1 },
    run: (s) => sound(s),
  },
];

/** A fixed seat case passes only when every check at the seat is sound: nothing red, nothing at its limit. */
function sound(s: ProngState) {
  const c = seatChecks(s);
  const fail = c.some((x) => x.level === "fail"), near = c.some((x) => x.level === "near");
  return { value: fail || near ? c[0].text : tx("الفحوص كلها سليمة", "All checks pass"), pass: !fail && !near };
}
