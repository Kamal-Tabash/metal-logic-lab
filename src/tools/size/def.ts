import { tx } from "../../core/i18n";
// م8 — ring size: one number in millimetres, and how a ring can be resized.
import { circlePts } from "../../core/cad/sheet";
import { L2, f1, f2, fail, mm, near, ok, sortChecks, type ToolDef } from "../../core/kit";
import type { Check } from "../../core/ui/controls";

export interface SizeState { C: number; dC: number; tb: number; method: "cut" | "stretch"; engr: "none" | "zone" | "all" }

// Published tables. Japanese: inner diameter = (size + 38) / 3 mm. American: diameter = 11.63 + 0.8128 × size.
export const jpFromC = (C: number) => (C / Math.PI) * 3 - 38;
export const usFromC = (C: number) => (C / Math.PI - 11.63) / 0.8128;
export const cFromJp = (n: number) => ((n + 38) / 3) * Math.PI;
export const cFromUs = (n: number) => (11.63 + 0.8128 * n) * Math.PI;
/** Stretching spreads the same metal over a longer ring: the section thins in proportion. */
export const stretched = (tb: number, C: number, dC: number) => (tb * C) / (C + dC);
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
/** A size as the table prints it, or a plain note when the ring is outside the table. */
const inTable = (n: number, lo: number, hi: number) => (n < lo - 0.25 || n > hi + 0.25 ? tx("خارج الجدول", "off the chart") : f1(n));
export const STRETCH_MAX = 1.5; // mm of circumference: about a size and a half

function resizeChecks(s: SizeState): Check[] {
  const list: Check[] = [];
  if (Math.abs(s.dC) < 0.05) return [ok(tx("لا تغيير في المقاس", "No change in size"))];
  if (s.method === "stretch") {
    list.push(s.dC < -1e-9 ? fail(tx("المط يكبّر فقط: التصغير يحتاج قطعاً", "Stretching only enlarges: sizing down needs a cut")) : s.dC > STRETCH_MAX + 1e-9 ? fail(tx(`تكبير ${f1(s.dC)} ملم أكبر مما يحتمله المط (نحو ${STRETCH_MAX})`, `Enlarging by ${f1(s.dC)} mm is more than stretching can take (about ${STRETCH_MAX})`)) : ok(tx(`تكبير ${f1(Math.max(s.dC, 0))} ملم يحتمله المط`, `Enlarging by ${f1(Math.max(s.dC, 0))} mm is within what stretching can take`)));
    list.push(s.engr === "all" ? fail(tx("المط يشد النقش فتتشوه خطوطه وتتسع", "Stretching pulls the engraving, so its lines distort and widen")) : s.engr === "zone" ? near(tx("المط يشد الحلقة كلها: يُراقب النقش", "Stretching pulls the whole band: keep an eye on the engraving")) : ok(tx("لا نقش يتشوه بالمط", "No engraving for stretching to distort")));
    const t = stretched(s.tb, s.C, Math.max(s.dC, 0));
    list.push(t < 1 - 1e-9 ? near(tx(`بعد المط ترقّ السماكة إلى ${f2(t)} ملم ويقسو المعدن`, `After stretching the thickness drops to ${f2(t)} mm and the metal hardens`)) : ok(tx(`بعد المط تبقى السماكة ${f2(t)} ملم`, `After stretching the thickness stays at ${f2(t)} mm`)));
  } else {
    const joints = s.dC > 0 ? tx("الوصلتين", "the two joints") : tx("وصلة اللحام", "the solder joint");
    list.push(s.tb < 1 - 1e-9 ? fail(tx(`سماكة ${f2(s.tb)} ملم في أسفل الحلقة أرق من أن تحمل ${joints}`, `${f2(s.tb)} mm at the bottom of the band is too thin to carry ${joints}`)) : s.tb < 1.4 - 1e-9 ? near(tx(`سماكة ${f2(s.tb)} ملم تحمل ${joints} بحذر، والأفضل 1.4`, `${f2(s.tb)} mm carries ${joints} with care; 1.4 is better`)) : ok(tx(`سماكة ${f2(s.tb)} ملم في أسفل الحلقة تحمل ${joints}`, `${f2(s.tb)} mm at the bottom of the band carries ${joints}`)));
    list.push(s.engr === "all" ? near(s.dC > 0 ? tx("خطا اللحام يقطعان النقش، والقطعة المضافة بلا نقش", "The two solder seams cut through the engraving, and the added piece has none") : tx("خط اللحام يقطع النقش", "The solder seam cuts through the engraving")) : s.engr === "zone" ? ok(tx("القطع يقع في المنطقة الملساء: النقش سليم", "The cut falls in the plain zone: the engraving is safe")) : ok(tx("لا نقش يقطعه اللحام", "No engraving for the solder to cut")));
  }
  return sortChecks(list);
}

export const DEF: ToolDef<SizeState> = {
  id: "size", title: tx("تعديل المقاس", "Ring Resizing"),
  defaults: { C: 53.4, dC: 3, tb: 1.4, method: "cut", engr: "zone" },
  stations: [
    {
      id: "convert", label: tx("تحويل المقاس", "Size conversion"),
      idea: { ref: L2(12), text: tx("كل بلد يسمّي مقاس الخاتم بطريقته: أرقام في اليابان وأمريكا، وحروف في بريطانيا. النموذج يعرف الملمترات وحدها، فيُحوَّل كل مقاس إلى محيط داخلي قبل الرسم.", "Every country names ring sizes its own way: numbers in Japan and America, letters in Britain. The model knows only millimetres, so every size is converted to an inner circumference before drawing.") },
      primary: { kind: "range", key: "C", id: "jp", label: tx("المقاس الياباني", "Japanese size"), min: 1, max: 30, step: 0.5, fmt: (v) => f1(v), get: (s) => clamp(Math.round(jpFromC(s.C) * 2) / 2, 1, 30), set: (v) => ({ C: Math.round(cFromJp(v) * 100) / 100 }),
        hint: tx("حرّكه إلى رقم المقاس الياباني، وهو الأكثر استعمالاً في أسواق الشرق الأوسط، لتقرأ محيطه بالملمترات وما يقابله في الأنظمة الأخرى.", "Move it to the Japanese size number — the one most used in Middle Eastern markets — to read its circumference in millimetres and its match in the other systems.") },
      groups: [{ title: tx("أو أدخل المقاس بنظام آخر", "Or enter the size in another system"), controls: [
        { kind: "range", key: "C", id: "us", label: tx("المقاس الأمريكي", "US size"), min: 1, max: 15, step: 0.25, fmt: (v) => f2(v), get: (s) => clamp(Math.round(usFromC(s.C) * 4) / 4, 1, 15), set: (v) => ({ C: Math.round(cFromUs(v) * 100) / 100 }), hint: tx("حرّكه إلى رقم المقاس الأمريكي. كل رقم يزيد قطر الخاتم نحو 0.8 ملم.", "Move it to the US size number. Each size adds about 0.8 mm to the ring's diameter.") },
        { kind: "range", key: "C", id: "eu", label: tx("المحيط الداخلي (المقاس الأوروبي)", "Inner circumference (European size)"), min: 40, max: 76, step: 0.1, fmt: (v) => mm(v, 1), hint: tx("محيط باطن الخاتم بالملمترات، وهو نفسه المقاس الأوروبي. هذا هو الرقم الذي يُرسم به النموذج.", "The circumference of the inside of the ring in millimetres, which is also the European size. This is the number the model is drawn with.") },
      ] }],
      result: (s) => ({ label: tx("المحيط الداخلي", "Inner circumference"), value: mm(s.C, 1),
        readings: [{ label: tx("القطر الداخلي", "Inner diameter"), value: mm(s.C / Math.PI), tone: "gold" }, { label: tx("المقاس الياباني", "Japanese size"), value: inTable(jpFromC(s.C), 1, 30) }, { label: tx("المقاس الأمريكي", "US size"), value: inTable(usFromC(s.C), 1, 15) }, { label: tx("المقاس الأوروبي", "European size"), value: f1(s.C) }] }),
      draw: (sh, s) => {
        const v = sh.view({ x: 0, y: 0, w: sh.w, h: sh.h }), ink = sh.ink, r = s.C / Math.PI / 2;
        v.fit({ x0: -14, y0: -14.5, x1: 14, y1: 14.5 }, 26); v.grid(); v.tag(tx("باطن الخاتم · ملم", "Inside of the ring · mm"));
        v.section(circlePts(0, 0, r + 1.6), { stroke: ink.gold, hatch: ink.goldDim }); v.fill(circlePts(0, 0, r), ink.sheet); v.stroke(circlePts(0, 0, r), { color: ink.gold, width: 1.5, close: true });
        v.centerline([-r - 3, 0], [r + 3, 0]); v.dimH(-r, r, 0, `Ø ${f2(2 * r)}`, { off: -16, color: ink.line });
        v.sheet.text(tx(`ياباني ${inTable(jpFromC(s.C), 1, 30)} · أمريكي ${inTable(usFromC(s.C), 1, 15)}`, `Japanese ${inTable(jpFromC(s.C), 1, 30)} · US ${inTable(usFromC(s.C), 1, 15)}`), v.X(0), v.Y(-r * 0.45), { size: 12, color: ink.gold, halo: true });
      },
      aria: (s) => tx(`خاتم محيطه الداخلي ${f1(s.C)} ملم وقطره ${f2(s.C / Math.PI)} ملم، يقابل المقاس الياباني ${f1(jpFromC(s.C))} والأمريكي ${f1(usFromC(s.C))}.`, `A ring with an inner circumference of ${f1(s.C)} mm and a diameter of ${f2(s.C / Math.PI)} mm, matching Japanese size ${f1(jpFromC(s.C))} and US size ${f1(usFromC(s.C))}.`),
    },
    {
      id: "resize", label: tx("تكبير وتصغير", "Sizing up and down"),
      idea: { ref: L2(5, tx("حالة على طاولة العمل", "A case on the bench")), text: tx("الخاتم يُكبَّر بالمط أو بقطعه وإضافة قطعة. المط يرقّق المقطع ويشوّه النقش، والقطع يترك وصلتي لحام في أسفل الحلقة. لذلك تُترك هناك منطقة ملساء سميكة من البداية.", "A ring is enlarged by stretching, or by cutting it and adding a piece. Stretching thins the section and distorts engraving; cutting leaves two solder joints at the bottom of the band. That is why a thick, plain zone is left there from the start.") },
      primary: { kind: "range", key: "dC", label: tx("مقدار التغيير في المحيط", "Change in circumference"), min: -6, max: 8, step: 0.1, fmt: (v) => `${v >= 0 ? "+" : "−"}${f1(Math.abs(v))} mm`, hint: tx("كم يُكبَّر محيط الخاتم (موجب) أو يُصغَّر (سالب). ثلاثة ملمترات تساوي نحو ثلاثة مقاسات يابانية.", "How much the ring's circumference is enlarged (positive) or reduced (negative). Three millimetres is about three Japanese sizes.") },
      groups: [{ title: tx("الخاتم والطريقة", "The ring and the method"), controls: [
        { kind: "seg", key: "method", label: tx("الطريقة", "Method"), options: [{ value: "cut", label: tx("قطع وإضافة", "Cut and add") }, { value: "stretch", label: tx("مط", "Stretch") }], hint: tx("القطع والإضافة: يُقطع الخاتم في أسفله وتُلحم فيه قطعة. المط: يُوسَّع على عمود فيتوزع معدنه على محيط أكبر.", "Cut and add: the ring is cut at the bottom and a piece is soldered in. Stretch: it is widened on a mandrel, spreading its metal over a larger circumference.") },
        { kind: "range", key: "tb", label: tx("السماكة في أسفل الحلقة", "Thickness at the bottom of the band"), min: 0.6, max: 2.5, step: 0.05, fmt: (v) => mm(v), hint: tx("سماكة المعدن حيث سيُقطع الخاتم أو يُمط. هي ما سيحمل الوصلتين بعد التعديل.", "Thickness of the metal where the ring will be cut or stretched. It is what will carry the two joints after resizing."), marks: [{ at: 1.4, label: "1.4", tone: "gold" }] },
        { kind: "seg", key: "engr", label: tx("النقش", "Engraving"), options: [{ value: "none", label: tx("بلا نقش", "None") }, { value: "zone", label: tx("يترك أسفل الحلقة أملس", "Leaves the bottom plain") }, { value: "all", label: tx("يدور حول الحلقة كلها", "Runs all the way round") }], hint: tx("النقش الذي يدور حول الحلقة كلها يقطعه اللحام ويشوّهه المط. ترك نحو 10 ملم ملساء في الأسفل يحفظه.", "Engraving that runs all the way round is cut by the solder and distorted by stretching. Leaving about 10 mm plain at the bottom protects it.") },
        { kind: "range", key: "C", label: tx("المحيط الداخلي الحالي", "Current inner circumference"), min: 40, max: 76, step: 0.1, fmt: (v) => mm(v, 1), hint: tx("محيط الخاتم قبل التعديل.", "The ring's circumference before resizing.") },
      ] }],
      result: (s) => ({ label: tx("المحيط بعد التعديل", "Circumference after resizing"), value: mm(s.C + s.dC, 1), tone: resizeChecks(s)[0].level === "fail" ? "warn" : "gold",
        readings: [{ label: tx("المقاس الياباني قبل ← بعد", "Japanese size before → after"), value: tx(`${inTable(jpFromC(s.C), 1, 30)} ← ${inTable(jpFromC(s.C + s.dC), 1, 30)}`, `${inTable(jpFromC(s.C), 1, 30)} → ${inTable(jpFromC(s.C + s.dC), 1, 30)}`), tone: "gold" }, { label: tx("عدد وصلات اللحام", "Number of solder joints"), value: s.method === "cut" && Math.abs(s.dC) >= 0.05 ? (s.dC > 0 ? "2" : "1") : "0" }, { label: tx("السماكة بعد التعديل", "Thickness after resizing"), value: mm(s.method === "stretch" ? stretched(s.tb, s.C, Math.max(s.dC, 0)) : s.tb) }],
        checks: resizeChecks(s) }),
      draw: (sh, s) => {
        const v = sh.view({ x: 0, y: 0, w: sh.w, h: sh.h }), ink = sh.ink, lvl = resizeChecks(s)[0].level, tone = lvl === "fail" ? ink.warn : ink.gold;
        const r = (s.C + s.dC) / Math.PI / 2, r0 = s.C / Math.PI / 2, t = s.method === "stretch" ? stretched(s.tb, s.C, Math.max(s.dC, 0)) : s.tb;
        v.fit({ x0: -16, y0: -17, x1: 16, y1: 16 }, 26); v.grid(); v.tag(tx("الخاتم من الأمام · ملم", "Ring from the front · mm"));
        v.section(circlePts(0, 0, r + t), { stroke: tone, hatch: lvl === "fail" ? "#7a3a2c" : ink.goldDim }); v.fill(circlePts(0, 0, r), ink.sheet); v.stroke(circlePts(0, 0, r), { color: tone, width: 1.5, close: true });
        v.stroke(circlePts(0, 0, r0), { color: ink.muted, width: 1, dash: [4, 4], close: true });
        if (s.method === "cut" && Math.abs(s.dC) > 0.05) { const half = Math.abs(s.dC) / 2 / r; for (const a of s.dC > 0 ? [-half, half] : [0]) { const x = Math.sin(a), y = -Math.cos(a); v.stroke([[x * (r - 0.4), y * (r - 0.4)], [x * (r + t + 0.4), y * (r + t + 0.4)]], { color: ink.warn, width: 2 }); } v.sheet.text(tx("وصلة اللحام", "solder joint"), v.X(0), v.Y(-r - t) + 16, { size: 11, color: ink.warn, halo: true }); }
        if (s.engr !== "none") { const a0 = s.engr === "zone" ? 5 / r : 0; const arc: [number, number][] = []; for (let i = 0; i <= 80; i++) { const a = a0 + ((2 * Math.PI - 2 * a0) * i) / 80; arc.push([Math.sin(a) * (r + t + 0.5), -Math.cos(a) * (r + t + 0.5)]); } v.stroke(arc, { color: ink.line, width: 1.4, dash: [2, 3] }); v.sheet.text(tx("النقش", "engraving"), v.X(0), v.Y(r + t) - 14, { size: 11, color: ink.line, halo: true }); }
        v.dimH(-r, r, 0, `Ø ${f2(2 * r)}`, { off: -14, color: ink.line });
      },
      aria: (s) => tx(`خاتم محيطه ${f1(s.C)} ملم يُعدَّل ${f1(s.dC)} ملم ${s.method === "cut" ? "بالقطع والإضافة" : "بالمط"}، وسماكة أسفله ${f2(s.tb)} ملم.`, `A ring ${f1(s.C)} mm around is resized by ${f1(s.dC)} mm ${s.method === "cut" ? "by cutting and adding" : "by stretching"}, with ${f2(s.tb)} mm of thickness at its bottom.`),
    },
  ],
  examples: [
    { id: "jp9", station: "convert", origin: "world", title: tx("عالمية 1 · المقاس الياباني 9", "International 1 · Japanese size 9"), says: tx("محيطه نحو 49.3 ملم", "about 49.3 mm around"),
      note: tx("المقاس الياباني 9 قطره الداخلي 15.67 ملم ومحيطه نحو 49.2 ملم. المقاس الياباني هو الأكثر استعمالاً في أسواق الشرق الأوسط.", "Japanese size 9 has an inner diameter of 15.67 mm and a circumference of about 49.2 mm. The Japanese system is the one most used in Middle Eastern markets."), state: { C: 49.22 },
      expect: (s) => ({ value: mm(s.C, 1), pass: Math.abs(jpFromC(s.C) - 9) < 0.1 && Math.abs(cFromJp(9) - 49.3) < 0.15 }) },
    { id: "us7", station: "convert", origin: "world", title: tx("عالمية 2 · المقاس الأمريكي 7", "International 2 · US size 7"), says: tx("محيطه نحو 54.4 ملم", "about 54.4 mm around"),
      note: tx("المقاس الأمريكي 7 قطره الداخلي نحو 17.3 ملم ومحيطه نحو 54.4 ملم، أي قريب من المقاس الأوروبي 54. وكل مقاس أمريكي يزيد القطر نحو 0.8 ملم.", "US size 7 has an inner diameter of about 17.3 mm and a circumference of about 54.4 mm — close to European size 54. Each US size adds about 0.8 mm to the diameter."), state: { C: 54.4 },
      expect: (s) => ({ value: mm(s.C, 1), pass: Math.abs(usFromC(s.C) - 7) < 0.1 && Math.abs(cFromUs(7) - 54.4) < 0.1 }) },
    { id: "add3", station: "resize", origin: "book", ref: L2(5, tx("حالة على طاولة العمل", "A case on the bench")), title: tx("ورشة 1 · تكبير 3 ملم بالقطع والإضافة", "Workshop 1 · up 3 mm by cutting and adding"), says: tx("وصلتان في منطقة ملساء", "two joints in a plain zone"),
      note: tx("خاتم زواج من عيار 21 سماكة أسفله 1.4 ملم يُكبَّر 3 ملم: يُقطع في أسفله وتُضاف قطعة طولها 3 ملم. السماكة تحمل الوصلتين، والمنطقة الملساء تحفظ النقش.", "A 21k wedding band 1.4 mm thick at the bottom is enlarged by 3 mm: it is cut at the bottom and a 3 mm piece is added. The thickness carries the two joints, and the plain zone protects the engraving."), state: { dC: 3, tb: 1.4, method: "cut", engr: "zone", C: 53.4 } },
    { id: "stretch1", station: "resize", origin: "book", ref: L2(5), title: tx("ورشة 2 · تكبير مقاس واحد بالمط", "Workshop 2 · up one size by stretching"), says: tx("حلقة ملساء سميكة", "a thick, plain band"),
      note: tx("حلقة ملساء بلا نقش سماكتها 1.6 ملم تُكبَّر ملمتراً واحداً بالمط. التغيير صغير، ولا نقش يتشوه، والسماكة تكاد لا تتغير.", "A plain, unengraved band 1.6 mm thick is enlarged by one millimetre by stretching. The change is small, there is no engraving to distort, and the thickness hardly changes."), state: { dC: 1, tb: 1.6, method: "stretch", engr: "none", C: 53.4 } },
  ],
  guide: {
    models: [
      tx("المقاس الأوروبي هو المحيط الداخلي بالملمترات. المقاس الياباني: القطر = (المقاس + 38) ÷ 3. المقاس الأمريكي: كل مقاس يزيد القطر نحو 0.8 ملم.", "The European size is the inner circumference in millimetres. Japanese size: diameter = (size + 38) ÷ 3. US size: each size adds about 0.8 mm to the diameter."),
      tx("القطع والإضافة يترك وصلتي لحام في أسفل الحلقة، فيحتاج سماكة تحملهما: 1.4 ملم تكفي.", "Cutting and adding leaves two solder joints at the bottom of the band, so it needs enough thickness to carry them: 1.4 mm is enough."),
      tx("المط يوزع المعدن نفسه على محيط أكبر، فترقّ السماكة بالنسبة نفسها ويقسو المعدن ويتشوه النقش.", "Stretching spreads the same metal over a larger circumference, so the thickness drops in the same proportion, the metal hardens and engraving distorts."),
      tx("لماذا ملم ونصف للمط: المعتاد أن تُمط الحلقة الملساء نصف مقاس إلى مقاس واحد، وبعده يرقّ المقطع ويتشقق.", "Why a millimetre and a half for stretching: a plain band is usually stretched half a size to one size; beyond that the section thins and cracks."),
      tx("لماذا ملم واحد للوصلة: تحته لا يبقى حول خط اللحام معدن يحمل ثني الحلقة في اللبس.", "Why one millimetre for the joint: below it, no metal is left around the solder seam to take the bending of the band in wear."),
    ],
    notModeled: [
      tx("الأحجار في الحلقة تغيّر كل شيء: المط يرخي مقاعدها.", "Stones in the band change everything: stretching loosens their seats."),
      tx("الوصل بالليزر أو القوس النبضي، واستبدال نصف الحلقة.", "Joining by laser or pulse-arc, and replacing half the band."),
      tx("مقاسات الأساور والسلاسل.", "Bangle and chain sizes."),
    ],
    sources: [tx("حالة التكبير من «حدود المادة»، الفصل الخامس، والمقاسات من الفصل الثاني عشر. وجدولا المقاس الياباني والأمريكي من الجداول المنشورة.", "The enlarging case comes from “The Limits of Material”, chapter 5, and the sizes from chapter 12. The Japanese and US size charts come from published tables.")],
  },
};
