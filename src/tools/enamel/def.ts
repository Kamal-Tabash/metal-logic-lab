import { tx } from "../../core/i18n";
// م6 — enamel: the cavity it sits in, and whether it cools in compression or in tension.
import { L2, f1, f2, fail, mm, near, ok, pct, sortChecks, type ToolDef } from "../../core/kit";
import type { Check } from "../../core/ui/controls";

export interface EnamelState { tp: number; cav: number; back: "yes" | "no"; am: number; ae: number }

/** How much less the enamel shrinks than the metal on cooling, as a share of the metal's own shrinkage. */
export const mismatch = (am: number, ae: number) => (am - ae) / am;

function cavityChecks(s: EnamelState): Check[] {
  const r = s.cav / s.tp, left = s.tp - s.cav;
  return sortChecks([
    r > 0.65 + 1e-9 ? fail(tx(`التجويف يأخذ ${pct(r)} من الصفيحة: يبقى تحته ${f2(Math.max(left, 0))} ملم فقط`, `The recess takes ${pct(r)} of the plate: only ${f2(Math.max(left, 0))} mm is left under it`)) : r > 0.55 + 1e-9 ? near(tx(`التجويف ${pct(r)} من الصفيحة: أعمق من النصف المعتاد`, `The recess is ${pct(r)} of the plate: deeper than the usual half`)) : ok(tx(`التجويف ${pct(r)} من الصفيحة، ويبقى تحته ${f2(left)} ملم`, `The recess is ${pct(r)} of the plate, with ${f2(left)} mm left under it`)),
    s.back === "yes" ? ok(tx("وجه خلفي من المينا يوازن الشد على الوجهين", "Counter-enamel on the back balances the pull on both faces")) : s.tp < 1 - 1e-9 ? fail(tx(`صفيحة ${f2(s.tp)} ملم بلا وجه خلفي: تتقوس عند التبريد فتتشقق المينا`, `A ${f2(s.tp)} mm plate with no counter-enamel: it bows as it cools and the enamel cracks`)) : ok(tx(`صفيحة ${f2(s.tp)} ملم مسطحة تستغني عن الوجه الخلفي`, `A flat ${f2(s.tp)} mm plate can do without counter-enamel`)),
  ]);
}
// Published enamel tables give expansions about a fifth to two fifths below the
// metals they are made for (enamels for gold against gold, for copper against
// copper), and warn of cracking when an enamel is about half the metal's or less.
export const FIT = { weak: 0.1, okTo: 0.45, peel: 0.55 };
function fitChecks(s: EnamelState): Check[] {
  const m = mismatch(s.am, s.ae);
  return [m < 0 ? fail(tx("المينا تنكمش أكثر من المعدن: تبقى مشدودة فتتشقق", "The enamel shrinks more than the metal: it stays in tension and cracks"))
    : m > FIT.peel ? fail(tx(`المعدن ينكمش أكثر من المينا بـ ${pct(m)}: الضغط أكبر مما تحتمل فتتكسر أو تتقشر`, `The metal shrinks ${pct(m)} more than the enamel: more squeeze than it can take, so it breaks or flakes off`))
    : m > FIT.okTo ? near(tx(`الفرق ${pct(m)}: عند طرف ما تُصنع له المينا، تُراقب للتشقق`, `A ${pct(m)} difference: at the edge of what enamels are made for; watch for cracking`))
    : m < FIT.weak ? near(tx(`الفرق ${pct(m)} فقط: ضغط ضعيف لا يحمي المينا من الشد عند أي انحناء`, `Only a ${pct(m)} difference: a weak squeeze that will not protect the enamel from tension at any bend`))
    : ok(tx(`المعدن ينكمش أكثر من المينا بـ ${pct(m)}: المينا تبقى مضغوطة، وهذا ما يحميها`, `The metal shrinks ${pct(m)} more than the enamel: the enamel stays in compression, and that is what protects it`))];
}

export const DEF: ToolDef<EnamelState> = {
  id: "enamel", title: tx("تشقق المينا", "Enamel Cracking"),
  defaults: { tp: 1.3, cav: 0.65, back: "no", am: 15, ae: 11 },
  stations: [
    {
      id: "cavity", label: tx("تجويف المينا", "Enamel recess"),
      idea: { ref: L2(11), text: tx("المينا تملأ تجويفاً يُحفر في وجه الصفيحة، وهي لا تحمل شيئاً من الحمل. الحفر يذهب عادة إلى نحو نصف السماكة، والصفيحة الرقيقة تحتاج مينا على ظهرها أيضاً حتى لا تتقوس.", "Enamel fills a recess cut into the face of the plate, and carries none of the load. The cut usually goes to about half the thickness, and a thin plate needs enamel on its back too so it does not bow.") },
      primary: { kind: "range", key: "cav", label: tx("عمق التجويف", "Recess depth"), min: 0.1, max: 2, step: 0.01, fmt: (v) => mm(v), hint: tx("عمق الحفر الذي ستملؤه المينا. حرّكه وانظر ما يبقى تحته من معدن.", "Depth of the cut the enamel will fill. Move it and see how much metal is left underneath.") },
      groups: [{ title: tx("الصفيحة", "The plate"), controls: [
        { kind: "range", key: "tp", label: tx("سماكة الصفيحة", "Plate thickness"), min: 0.4, max: 3, step: 0.05, fmt: (v) => mm(v), hint: tx("سماكة المعدن قبل الحفر. صفيحة ملم وثلث تُحفر إلى نحو ثلثي الملم.", "Thickness of the metal before cutting. A plate of one and a third millimetres is cut to about two thirds of a millimetre."), marks: [{ at: 1, label: "1", tone: "gold" }] },
        { kind: "seg", key: "back", label: tx("مينا على ظهر الصفيحة؟", "Enamel on the back of the plate?"), options: [{ value: "no", label: tx("لا", "No") }, { value: "yes", label: tx("نعم، وجه خلفي", "Yes, counter-enamel") }], hint: tx("المينا على وجه واحد تشد الصفيحة فتتقوس عند التبريد. الوجه الخلفي يوازنها، لكنه يأخذ ظهر القطعة كله، فلا نقش فيه ولا دمغة.", "Enamel on one face pulls the plate so it bows as it cools. Counter-enamel on the back balances it, but it takes up the whole back of the piece — no engraving there, no hallmark.") },
      ] }],
      result: (s) => { const left = Math.max(s.tp - s.cav, 0); return {
        label: tx("ما يبقى من المعدن تحت المينا", "Metal left under the enamel"), value: mm(left), fraction: left / s.tp, tone: cavityChecks(s)[0].level === "fail" ? "warn" : "gold",
        readings: [{ label: tx("التجويف من سماكة الصفيحة", "Recess as a share of plate thickness"), value: pct(Math.min(s.cav / s.tp, 1)) }], checks: cavityChecks(s) }; },
      draw: (sh, s) => {
        const v = sh.view({ x: 0, y: 0, w: sh.w, h: sh.h }), ink = sh.ink, lvl = cavityChecks(s)[0].level, tone = lvl === "fail" ? ink.warn : ink.gold;
        const c = Math.min(s.cav, s.tp - 0.02), tb = s.back === "yes" ? 0.25 : 0;
        v.fit({ x0: -5, y0: -tb - 0.8, x1: 5, y1: s.tp + 0.9 }, 30); v.grid(); v.tag(tx("مقطع في الصفيحة · ملم", "Section through the plate · mm"));
        v.section([[-4.5, 0], [4.5, 0], [4.5, s.tp], [3, s.tp], [3, s.tp - c], [-3, s.tp - c], [-3, s.tp], [-4.5, s.tp]], { stroke: tone, hatch: lvl === "fail" ? "#7a3a2c" : ink.goldDim });
        v.fill([[-3, s.tp - c], [3, s.tp - c], [3, s.tp], [-3, s.tp]], "rgba(120,170,210,0.35)"); v.stroke([[-3, s.tp], [3, s.tp]], { color: ink.stone, width: 1.4 });
        if (tb) { v.fill([[-4.5, -tb], [4.5, -tb], [4.5, 0], [-4.5, 0]], "rgba(120,170,210,0.35)"); v.sheet.text(tx("الوجه الخلفي", "counter-enamel"), v.X(0), v.Y(-tb) + 12, { size: 11, color: ink.stone }); }
        v.sheet.text(tx("المينا", "enamel"), v.X(0), v.Y(s.tp - c / 2), { size: 12, color: ink.stone, halo: true });
        v.dimV(0, s.tp - c, 3, f2(s.tp - c), { off: 30, color: tone }); v.dimV(0, s.tp, -4.5, f2(s.tp), { off: -16, color: ink.line });
      },
      aria: (s) => tx(`صفيحة سماكتها ${f2(s.tp)} ملم بتجويف مينا عمقه ${f2(s.cav)} ملم، يبقى تحته ${f2(Math.max(s.tp - s.cav, 0))} ملم.`, `A plate ${f2(s.tp)} mm thick with an enamel recess ${f2(s.cav)} mm deep, leaving ${f2(Math.max(s.tp - s.cav, 0))} mm under it.`),
    },
    {
      id: "fit", label: tx("التمدد والانكماش", "Expansion and shrinkage"),
      idea: { ref: L2(11), text: tx("المعدن والمينا يبردان معاً وينكمش كل منهما بمقداره. إذا انكمش المعدن أكثر بقليل بقيت المينا مضغوطة، والزجاج يحتمل الضغط. وإذا انكمشت هي أكثر انشدّت فتشققت.", "Metal and enamel cool together, and each shrinks by its own amount. If the metal shrinks a little more, the enamel stays in compression — and glass can take compression. If the enamel shrinks more, it is pulled into tension and cracks.") },
      primary: { kind: "range", key: "ae", label: tx("تمدد المينا بالحرارة (من موردها)", "Enamel thermal expansion (from its supplier)"), min: 6, max: 20, step: 0.1, fmt: (v) => `${f1(v)} ppm`, hint: tx("مقدار تمدد المينا بالحرارة، بالجزء من المليون لكل درجة. يُؤخذ من مورد المينا. حرّكه حول تمدد المعدن وانظر متى تتشقق ومتى تتقشر.", "How much the enamel expands with heat, in parts per million per degree. It comes from the enamel supplier. Move it around the metal's expansion and see when it cracks and when it flakes.") },
      groups: [{ title: tx("المعدن", "The metal"), controls: [
        { kind: "range", key: "am", label: tx("تمدد المعدن بالحرارة", "Metal thermal expansion"), min: 10, max: 22, step: 0.1, fmt: (v) => `${f1(v)} ppm`, hint: tx("مقدار تمدد السبيكة بالحرارة. عيار 18 الأصفر بين 14 و16 جزءاً من المليون لكل درجة.", "How much the alloy expands with heat. 18k yellow is between 14 and 16 parts per million per degree."), marks: [{ at: 14, label: "14" }, { at: 16, label: "16" }] },
      ] }],
      result: (s) => { const m = mismatch(s.am, s.ae); return {
        label: tx("فرق الانكماش بين المعدن والمينا", "Shrinkage difference between metal and enamel"), value: `${m >= 0 ? "+" : "−"}${pct(Math.abs(m))}`, tone: fitChecks(s)[0].level === "fail" ? "warn" : "gold",
        readings: [{ label: tx("حال المينا بعد التبريد", "State of the enamel after cooling"), value: m < 0 ? tx("مشدودة", "in tension") : tx("مضغوطة", "in compression"), tone: m < 0 ? "warn" : "gold" }, { label: tx("الفرق بالأرقام", "The difference in numbers"), value: `${f1(s.am - s.ae)} ppm` }], checks: fitChecks(s) }; },
      draw: (sh, s) => {
        const v = sh.view({ x: 0, y: 0, w: sh.w, h: sh.h }), ink = sh.ink, m = mismatch(s.am, s.ae), lvl = fitChecks(s)[0].level, tone = lvl === "fail" ? ink.warn : ink.gold;
        v.fitXY({ x0: -6, y0: -2.2, x1: 6, y1: 3 }, [26, 30, 26, 30]); v.tag(tx("بعد التبريد", "After cooling"));
        const k = 60, wm = 4.5 * (1 - (s.am * k) / 1e4 * 0), we = 4.5 * (1 + Math.max(Math.min(m, 0.5), -0.5) * 0.35);
        v.section([[-wm, -1], [wm, -1], [wm, 0], [-wm, 0]], { stroke: ink.gold, hatch: ink.goldDim });
        v.fill([[-4.5, 0], [4.5, 0], [4.5, 0.8], [-4.5, 0.8]], "rgba(120,170,210,0.35)"); v.stroke([[-4.5, 0], [4.5, 0], [4.5, 0.8], [-4.5, 0.8]], { color: tone, width: 1.5, close: true });
        v.stroke([[-we, 1.3], [we, 1.3]], { color: ink.stone, width: 2, dash: [5, 4] });
        v.sheet.text(tx("طول المينا لو بردت وحدها", "enamel length if it cooled alone"), v.X(0), v.Y(1.3) - 12, { size: 11, color: ink.stone, halo: true });
        const dir = m >= 0 ? 0 : Math.PI;
        v.arrow(v.X(-4.5) + (m >= 0 ? 26 : -4), v.Y(0.4), dir, tone, 9); v.arrow(v.X(4.5) - (m >= 0 ? 26 : -4), v.Y(0.4), dir + Math.PI, tone, 9);
        v.sheet.text(m >= 0 ? tx("المعدن يضغط المينا", "the metal squeezes the enamel") : tx("المعدن يشد المينا", "the metal pulls the enamel"), v.X(0), v.Y(0.4), { size: 12.5, color: tone, halo: true });
        v.sheet.text(tx("المعدن", "metal"), v.X(0), v.Y(-0.5), { size: 12, color: ink.gold, halo: true });
      },
      aria: (s) => tx(`معدن تمدده ${f1(s.am)} ومينا تمددها ${f1(s.ae)} جزءاً من المليون: المينا بعد التبريد ${mismatch(s.am, s.ae) < 0 ? "مشدودة" : "مضغوطة"}.`, `Metal expanding ${f1(s.am)} and enamel expanding ${f1(s.ae)} parts per million: after cooling the enamel is ${mismatch(s.am, s.ae) < 0 ? "in tension" : "in compression"}.`),
    },
  ],
  examples: [
    { id: "half", station: "cavity", origin: "book", ref: L2(11), title: tx("ورشة 1 · صفيحة ملم وثلث", "Workshop 1 · plate of one and a third mm"), says: tx("تُحفر إلى نحو ثلثي الملم", "cut to about two thirds of a millimetre"),
      quote: "فالصفيحة التي سمكها ملم وثلث تُحفر إلى نحو ثلثي الملم، ويبقى تحت المينا نحو ثلثي الملم من المعدن",
      note: tx("صفيحة سماكتها 1.33 ملم يُحفر تجويفها إلى نصف السماكة، فيبقى تحت المينا نحو ثلثي الملم. وهي مسطحة تبلغ الملم، فتستغني عن الوجه الخلفي.", "A plate 1.33 mm thick has its recess cut to half the thickness, leaving about two thirds of a millimetre under the enamel. It is flat and reaches a millimetre, so it can do without counter-enamel."), state: { tp: 1.33, cav: 0.66, back: "no" },
      expect: (s) => ({ value: mm(s.tp - s.cav), pass: Math.abs(s.tp - s.cav - 0.67) < 0.02 }) },
    { id: "thin", station: "cavity", origin: "book", ref: L2(11), title: tx("ورشة 2 · صفيحة رقيقة بوجه خلفي", "Workshop 2 · thin plate with counter-enamel"), says: tx("مينا على الوجهين", "enamel on both faces"),
      note: tx("صفيحة سماكتها 0.7 ملم أرق من أن تقاوم التقوس وحدها، فتُعطى مينا على ظهرها توازن الوجه. والتجويف 0.3 ملم، أقل من نصفها.", "A plate 0.7 mm thick is too thin to resist bowing on its own, so it gets enamel on the back to balance the face. The recess is 0.3 mm, less than half of it."), state: { tp: 0.7, cav: 0.3, back: "yes" },
      expect: (s) => ({ value: mm(s.tp - s.cav), pass: Math.abs(s.tp - s.cav - 0.4) < 0.01 }) },
    { id: "k18", station: "fit", origin: "book", ref: L2(11), title: tx("ورشة 1 · مينا على عيار 18 الأصفر", "Workshop 1 · enamel on 18k yellow"), says: tx("المينا مضغوطة", "the enamel is in compression"),
      note: tx("عيار 18 الأصفر تمدده نحو 15 جزءاً من المليون. مينا الذهب المعتادة تمددها نحو 11، أي أقل بنحو الربع، فتبقى مضغوطة بعد التبريد.", "18k yellow expands about 15 parts per million. The usual enamel for gold expands about 11 — roughly a quarter less — so it stays in compression after cooling."), state: { am: 15, ae: 11 } },
    { id: "close", station: "fit", origin: "book", ref: L2(11), title: tx("ورشة 2 · مينا قريبة من معدنها", "Workshop 2 · enamel close to its metal"), says: tx("فرق أصغر وما زال كافياً", "a smaller difference, still enough"),
      note: tx("معدن تمدده 16 ومينا تمددها 13: الفرق أقل من الخُمس بقليل، ويكفي لتبقى المينا مضغوطة.", "Metal expanding 16 and enamel expanding 13: the difference is a little under a fifth, enough to keep the enamel in compression."), state: { am: 16, ae: 13 } },
  ],
  guide: {
    models: [
      tx("التجويف المحفور يذهب عادة إلى نحو نصف سماكة الصفيحة، وما يبقى تحته هو ما يحمل القطعة.", "The cut recess usually goes to about half the plate's thickness; what is left under it is what carries the piece."),
      tx("الصفيحة المسطحة التي تبلغ ملماً فأكثر تستغني أحياناً عن المينا على ظهرها، والأرق منها تحتاجها.", "A flat plate of a millimetre or more can sometimes do without enamel on its back; a thinner one needs it."),
      tx("عند التبريد: إذا انكمش المعدن أكثر من المينا بقيت المينا مضغوطة وسلمت. وإذا انكمشت المينا أكثر انشدّت وتشققت.", "On cooling: if the metal shrinks more than the enamel, the enamel stays in compression and survives. If the enamel shrinks more, it is pulled into tension and cracks."),
      tx("لماذا بين العُشر و45٪: جداول المينا المنشورة تصنعها بتمدد أقل من معدنها بنحو الخُمس إلى الخُمسين، وتحذّر من التشقق حين ينزل تمدد المينا إلى نحو نصف تمدد المعدن.", "Why between a tenth and 45%: published enamel tables make enamels with about a fifth to two fifths less expansion than their metal, and warn of cracking once the enamel's expansion drops to around half the metal's."),
    ],
    notModeled: [
      tx("رقم مينا بعينها ولونها: يُؤخذ من موردها، وتُحرق قطعة اختبار قبل القطعة.", "The figure for a particular enamel and colour: take it from the supplier, and fire a test piece before the real one."),
      tx("تمدد المينا نفسه: يختلف من نوع إلى آخر ومن لون إلى آخر.", "The enamel's own expansion: it differs from one type to another and from one colour to another."),
      tx("شكل القطعة وانحناؤها، وعدد مرات الحرق، وسماكة طبقة المينا.", "The shape and curvature of the piece, the number of firings, and the thickness of the enamel layer."),
    ],
    sources: [tx("«حدود المادة»، الفصل الحادي عشر وحالته: التجويف بنصف السماكة، والوجه الخلفي، وتمدد عيار 18 الأصفر (14 إلى 16).", "“The Limits of Material”, chapter 11 and its case: the half-thickness recess, counter-enamel, and the expansion of 18k yellow (14 to 16).")],
  },
};
