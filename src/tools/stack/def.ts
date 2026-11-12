import { tx } from "../../core/i18n";
// م15 — from file to piece: small errors that add up, and a loss that can or cannot be compensated.
import { L3, f2, fail, mm, near, ok, sortChecks, type ToolDef } from "../../core/kit";
import type { Check } from "../../core/ui/controls";

export interface StackState {
  n: number; tol: number; allow: number; ref: "each" | "common"; // parts in a chain
  loss: number; spread: number; comp: number; band: number;       // compensation
}
/** Worst case: every part off the same way. Usual case: errors partly cancel (root of the sum of squares). */
export const worst = (n: number, tol: number) => n * tol;
export const usual = (n: number, tol: number) => tol * Math.sqrt(n);

function chainChecks(s: StackState): Check[] {
  const n = Math.round(s.n);
  if (s.ref === "common") return [s.tol <= s.allow + 1e-9 ? ok(tx(`بمرجع مشترك يبقى الفرق ${f2(s.tol)} ملم مهما كثرت الأجزاء`, `With a shared reference the deviation stays at ${f2(s.tol)} mm however many parts there are`)) : fail(tx(`حتى بمرجع مشترك، دقة ${f2(s.tol)} ملم أوسع من المسموح`, `Even with a shared reference, an accuracy of ${f2(s.tol)} mm is wider than allowed`))];
  const w = worst(n, s.tol), u = usual(n, s.tol);
  return [w <= s.allow + 1e-9 ? ok(tx(`حتى في أسوأ قطعة يبقى الفرق ${f2(w)} ملم ضمن المسموح`, `Even in the worst piece the deviation of ${f2(w)} mm stays within what is allowed`))
    : u <= s.allow + 1e-9 ? near(tx(`أغلب القطع تتركب (${f2(u)} ملم)، وبعضها لا (حتى ${f2(w)} ملم)`, `Most pieces assemble (${f2(u)} mm); some do not (up to ${f2(w)} mm)`))
    : fail(tx(`الفروق تتراكم إلى ${f2(u)} ملم في أغلب القطع: المحوران لا يتقابلان`, `The deviations add up to ${f2(u)} mm in most pieces: the two axes do not line up`))];
}
function compChecks(s: StackState): Check[] {
  const off = Math.abs(s.comp - s.loss), list: Check[] = [];
  list.push(s.spread > s.band + 1e-9 ? fail(tx(`الفقد يتفاوت بين النسخ ±${f2(s.spread)} ملم: لا يصلحه تعويض ثابت`, `The loss varies between copies by ±${f2(s.spread)} mm: a fixed allowance cannot fix it`)) : ok(tx(`الفقد مستقر بين النسخ (±${f2(s.spread)} ملم): يصلح تعويضه`, `The loss is steady between copies (±${f2(s.spread)} mm): it can be compensated`)));
  list.push(off + s.spread <= s.band + 1e-9 ? ok(tx(`بعد التعويض تخرج كل النسخ ضمن ±${f2(s.band)} ملم`, `After compensation every copy comes out within ±${f2(s.band)} mm`)) : off <= s.band + 1e-9 ? near(tx("النسخة الوسطى سليمة، وبعض النسخ يخرج عن المسموح", "The middle copy is fine, but some copies fall outside what is allowed")) : fail(s.comp > s.loss ? tx(`التعويض أكبر من الفقد بـ ${f2(off)} ملم: القطعة تخرج أثقل وأغلظ`, `The allowance is ${f2(off)} mm more than the loss: the piece comes out heavier and thicker`) : tx(`التعويض أقل من الفقد بـ ${f2(off)} ملم: القطعة تخرج أنحف من المرسوم`, `The allowance is ${f2(off)} mm less than the loss: the piece comes out thinner than drawn`)));
  return sortChecks(list);
}

export const DEF: ToolDef<StackState> = {
  id: "stack", title: tx("فرق التنفيذ", "Tolerance Stack-up"),
  defaults: { n: 2, tol: 0.05, allow: 0.15, ref: "each", loss: 0.1, spread: 0.02, comp: 0.1, band: 0.05 },
  stations: [
    {
      id: "chain", label: tx("تراكم الفروق", "How deviations add up"),
      idea: { ref: L3(13), text: tx("كل جزء يخرج من الورشة ضمن حدوده وحده. لكن حين تُركَّب الأجزاء تُجمع فروقها الصغيرة، فقد لا يتقابل ثقبان يجب أن يمر منهما مسمار واحد. الحل قياس الأجزاء معاً من مرجع مشترك.", "Each part leaves the workshop within its own limits. But when the parts are assembled their small deviations add up, and two holes meant for one pin may not line up. The answer is to measure the parts together from a shared reference.") },
      primary: { kind: "range", key: "n", label: tx("عدد الأجزاء المتسلسلة", "Number of parts in a chain"), min: 1, max: 10, step: 1, fmt: (v) => `${Math.round(v)}`, hint: tx("كم جزءاً يُركَّب واحداً بعد الآخر قبل الموضع الذي يجب أن يتطابق. حرّكه وانظر كيف تكبر الفروق.", "How many parts are assembled one after another before the place that has to match. Move it and watch the deviations grow.") },
      groups: [{ title: tx("الدقة والمسموح", "Accuracy and allowance"), controls: [
        { kind: "range", key: "tol", label: tx("دقة الجزء الواحد", "Accuracy of one part"), min: 0.01, max: 0.3, step: 0.005, fmt: (v) => `±${f2(v)} mm`, hint: tx("أكبر ما يبتعد به الجزء عن مقاسه المرسوم، زيادةً أو نقصاً، في القطع التي تقبلها ورشتك. يتبع الصب والتشطيب.", "The most a part strays from its drawn dimension, over or under, among the pieces your workshop accepts. It depends on casting and finishing.") },
        { kind: "range", key: "allow", label: tx("الفرق المسموح عند التركيب", "Deviation allowed at assembly"), min: 0.02, max: 0.6, step: 0.005, fmt: (v) => mm(v), hint: tx("أكبر فرق يحتمله موضع التركيب، كالخلوص بين المسمار وأنبوب المفصل.", "The largest deviation the assembly point can take, such as the clearance between a pin and its hinge tube.") },
        { kind: "seg", key: "ref", label: tx("كيف تُقاس الأجزاء؟", "How are the parts measured?"), options: [{ value: "each", label: tx("كل جزء وحده", "Each part alone") }, { value: "common", label: tx("معاً من مرجع مشترك", "Together, from a shared reference") }], hint: tx("قياس كل جزء وحده يترك الفروق تتراكم. قياس الجزأين معاً بعد صنعهما، أو ثقبهما معاً، يلغي التراكم.", "Measuring each part alone lets the deviations add up. Measuring the two parts together after they are made — or drilling them together — cancels the stack-up.") },
      ] }],
      result: (s) => { const n = Math.round(s.n), u = s.ref === "common" ? s.tol : usual(n, s.tol), w = s.ref === "common" ? s.tol : worst(n, s.tol); return {
        label: tx("الفرق عند التركيب في أغلب القطع", "Deviation at assembly in most pieces"), value: mm(u), fraction: Math.min(u / s.allow, 1), tone: chainChecks(s)[0].level === "fail" ? "warn" : "gold",
        readings: [{ label: tx("في أسوأ قطعة", "In the worst piece"), value: mm(w) }, { label: tx("المسموح", "Allowed"), value: mm(s.allow) }], checks: chainChecks(s) }; },
      draw: (sh, s) => {
        const v = sh.view({ x: 0, y: 0, w: sh.w, h: sh.h }), ink = sh.ink, n = Math.round(s.n), lvl = chainChecks(s)[0].level, tone = lvl === "fail" ? ink.warn : ink.gold;
        const w = s.ref === "common" ? s.tol : worst(n, s.tol), k = 6; // errors drawn six times larger so they can be seen
        v.fitXY({ x0: -0.5, y0: -2.2, x1: n + 1.6, y1: 2.4 }, [26, 28, 26, 28]); v.tag(tx("الفروق مكبّرة ست مرات لتُرى", "Deviations enlarged six times to be visible"));
        for (let i = 0; i < n; i++) { const dy = s.ref === "common" ? 0 : (i + 1) * s.tol * k * 0; v.section([[i + 0.05, -0.5 + dy], [i + 0.95, -0.5 + dy], [i + 0.95, 0.5 + dy], [i + 0.05, 0.5 + dy]], { stroke: ink.gold, hatch: ink.goldDim }); }
        const off = Math.min(w * k, 1.6);
        v.stroke([[n + 0.1, 0], [n + 1.4, 0]], { color: ink.muted, width: 1, dash: [4, 4] });
        v.stroke([[n + 0.1, off], [n + 1.4, off]], { color: tone, width: 2 });
        v.stroke([[n + 0.1, -s.allow * k], [n + 1.4, -s.allow * k]], { color: ink.muted, width: 1 }); v.stroke([[n + 0.1, s.allow * k], [n + 1.4, s.allow * k]], { color: ink.muted, width: 1 });
        v.sheet.text(tx("المسموح", "allowed"), v.X(n + 0.75), v.Y(s.allow * k) - 9, { size: 10.5, color: ink.muted, halo: true });
        v.sheet.text(`${f2(w)}`, v.X(n + 0.75), v.Y(off) + 13, { mono: true, size: 11, color: tone, halo: true });
        v.sheet.text(s.ref === "common" ? tx("الأجزاء مقيسة معاً", "parts measured together") : tx("الأجزاء: كل واحد يضيف فرقه", "parts: each adds its own deviation"), v.X(n / 2), v.Y(0.5) - 12, { size: 12, color: ink.line, halo: true });
        v.sheet.text(tx("موضع التركيب", "assembly point"), v.X(n + 0.75), v.Y(-s.allow * k) + 14, { size: 10.5, color: ink.muted, halo: true });
        v.sheet.text(tx("أين يجب أن يقع", "where it should fall"), v.X(n + 0.75), v.Y(0) + 12, { size: 10, color: ink.muted, halo: true });
      },
      aria: (s) => tx(`${Math.round(s.n)} أجزاء دقة كل منها ${f2(s.tol)} ملم: الفرق عند التركيب ${f2(s.ref === "common" ? s.tol : usual(Math.round(s.n), s.tol))} ملم والمسموح ${f2(s.allow)}.`, `${Math.round(s.n)} parts, each accurate to ${f2(s.tol)} mm: deviation at assembly ${f2(s.ref === "common" ? s.tol : usual(Math.round(s.n), s.tol))} mm, allowed ${f2(s.allow)}.`),
    },
    {
      id: "comp", label: tx("تعويض الفقد", "Compensating for loss"),
      idea: { ref: L3(15), text: tx("التشطيب يأخذ من القطعة. إذا كان ما يأخذه ثابتاً يتكرر في كل نسخة عُوِّض بزيادة في النموذج. وإذا تفاوت من نسخة إلى أخرى فلا يصلحه رقم يُضاف في الملف.", "Finishing takes metal off the piece. If what it takes is constant and repeats in every copy, it is compensated by an allowance in the model. If it varies from copy to copy, no number added in the file will fix it.") },
      primary: { kind: "range", key: "comp", label: tx("الزيادة المضافة في النموذج", "Allowance added in the model"), min: 0, max: 0.4, step: 0.005, fmt: (v) => mm(v), hint: tx("ما تضيفه إلى المقاس في الملف ليعوّض ما سيأخذه التشطيب. حرّكه حتى يساوي الفقد.", "What you add to the dimension in the file to make up for what finishing will take. Move it until it equals the loss.") },
      groups: [{ title: tx("ما يأخذه التشطيب", "What finishing takes"), controls: [
        { kind: "range", key: "loss", label: tx("الفقد المعتاد", "Usual loss"), min: 0, max: 0.4, step: 0.005, fmt: (v) => mm(v), hint: tx("متوسط ما يأخذه التنظيف والصنفرة والصقل من هذا الموضع. يُقاس على نسخ ورشتك، لا يُفترض.", "The average that cleaning, sanding and polishing take from this spot. It is measured on your workshop's copies, not assumed.") },
        { kind: "range", key: "spread", label: tx("تفاوت الفقد بين النسخ", "Variation in loss between copies"), min: 0, max: 0.2, step: 0.005, fmt: (v) => `±${f2(v)} mm`, hint: tx("كم يختلف الفقد من نسخة إلى أخرى. قمة حافة يأكلها القرص قبل القاع تتفاوت كثيراً.", "How much the loss differs from one copy to another. The crest of an edge, which the wheel eats before the valley, varies a lot.") },
        { kind: "range", key: "band", label: tx("الفرق المقبول في القطعة", "Acceptable deviation in the piece"), min: 0.01, max: 0.3, step: 0.005, fmt: (v) => `±${f2(v)} mm`, hint: tx("كم يُسمح أن تبتعد القطعة النهائية عن مقاسها المرسوم.", "How far the finished piece may stray from its drawn dimension.") },
      ] }],
      result: (s) => ({ label: tx("بُعد القطعة عن المقاس المرسوم", "Distance of the piece from the drawn dimension"), value: `${s.comp - s.loss >= 0 ? "+" : "−"}${f2(Math.abs(s.comp - s.loss))} mm`, tone: compChecks(s)[0].level === "fail" ? "warn" : "gold",
        readings: [{ label: tx("أسوأ نسخة", "Worst copy"), value: `±${f2(Math.abs(s.comp - s.loss) + s.spread)} mm` }], checks: compChecks(s) }),
      draw: (sh, s) => {
        const v = sh.view({ x: 0, y: 0, w: sh.w, h: sh.h }), ink = sh.ink, lvl = compChecks(s)[0].level, tone = lvl === "fail" ? ink.warn : ink.gold, c = s.comp - s.loss;
        const reach = Math.max(Math.abs(c) + s.spread, s.band) * 1.35 + 0.02; v.fitXY({ x0: -reach, y0: -1, x1: reach, y1: 3 }, [30, 30, 34, 30]); v.tag(tx("مقاس القطعة بعد التشطيب · ملم", "Size of the piece after finishing · mm"));
        v.fill([[-s.band, 0], [s.band, 0], [s.band, 2.4], [-s.band, 2.4]], "rgba(134,184,140,0.14)");
        v.stroke([[0, -0.4], [0, 2.7]], { color: ink.muted, width: 1, dash: [4, 4] });
        v.section([[c - s.spread, 0.7], [c + s.spread, 0.7], [c + s.spread, 1.7], [c - s.spread, 1.7]], { stroke: tone, hatch: lvl === "fail" ? "#7a3a2c" : ink.goldDim });
        v.stroke([[c, 0.5], [c, 1.9]], { color: tone, width: 2 });
        v.sheet.text(tx("المقاس المرسوم", "drawn dimension"), v.X(0), v.Y(2.7) - 8, { size: 11, color: ink.muted, halo: true });
        v.sheet.text(tx("المقبول", "acceptable"), v.X(s.band), v.Y(0) + 13, { size: 10.5, color: ink.ok, halo: true });
        v.sheet.text(tx("النسخ بعد التشطيب", "copies after finishing"), v.X(c), v.Y(0.7) + 14, { size: 11.5, color: tone, halo: true });
      },
      aria: (s) => tx(`فقد معتاد ${f2(s.loss)} ملم بتفاوت ${f2(s.spread)} وتعويض ${f2(s.comp)}: القطعة تبتعد ${f2(Math.abs(s.comp - s.loss))} ملم عن المرسوم.`, `A usual loss of ${f2(s.loss)} mm varying by ${f2(s.spread)}, with an allowance of ${f2(s.comp)}: the piece ends up ${f2(Math.abs(s.comp - s.loss))} mm from the drawing.`),
    },
  ],
  examples: [
    { id: "common", station: "chain", origin: "book", ref: L3(13), title: tx("ورشة 1 · سوار من نصفين بمرجع مشترك", "Workshop 1 · two-half bangle with a shared reference"), says: tx("المحوران يتقابلان", "the two axes line up"),
      note: tx("سوار من نصفين يجمعهما مسمار. يُثقب الأنبوبان معاً بعد صنع النصفين، فلا يبقى بين محوريهما إلا فرق واحد صغير.", "A bangle in two halves joined by a pin. The two tubes are drilled together after the halves are made, so only one small deviation is left between their axes."), state: { n: 2, tol: 0.05, allow: 0.15, ref: "common" } },
    { id: "tight", station: "chain", origin: "book", ref: L3(13), title: tx("ورشة 2 · جزءان دقيقان يُقاس كل منهما وحده", "Workshop 2 · two accurate parts, each measured alone"), says: tx("يتركبان في كل النسخ", "they assemble in every copy"),
      note: tx("إذا كانت دقة كل نصف ±0.05 ملم والمسموح 0.15 ملم، فحتى أسوأ نسخة (0.10 ملم) تتركب. قياس كل جزء وحده يكفي هنا.", "If each half is accurate to ±0.05 mm and 0.15 mm is allowed, even the worst copy (0.10 mm) assembles. Measuring each part alone is enough here."), state: { n: 2, tol: 0.05, allow: 0.15, ref: "each" } },
    { id: "steady", station: "comp", origin: "book", ref: L3(15), title: tx("ورشة 1 · فقد ثابت يُعوَّض", "Workshop 1 · a constant loss, compensated"), says: tx("زيادة تساوي الفقد", "an allowance equal to the loss"),
      note: tx("الصقل يأخذ من هذا الموضع عُشر ملم في كل نسخة تقريباً (±0.02). زيادة عُشر ملم في النموذج تعيد القطعة إلى مقاسها.", "Polishing takes about a tenth of a millimetre from this spot in every copy (±0.02). An allowance of a tenth of a millimetre in the model brings the piece back to size."), state: { loss: 0.1, spread: 0.02, comp: 0.1, band: 0.05 } },
    { id: "small", station: "comp", origin: "book", ref: L3(15), title: tx("ورشة 2 · فقد صغير لا يحتاج تعويضاً", "Workshop 2 · a small loss that needs no allowance"), says: tx("بلا زيادة", "no allowance"),
      note: tx("حين يكون الفقد صغيراً ومستقراً (0.02 ±0.01) ضمن المقبول (±0.05)، تُترك القطعة بلا زيادة في النموذج.", "When the loss is small and steady (0.02 ±0.01) within what is acceptable (±0.05), the piece is left with no allowance in the model."), state: { loss: 0.02, spread: 0.01, comp: 0, band: 0.05 } },
  ],
  guide: {
    models: [
      tx("أسوأ نسخة: كل الأجزاء تنحرف في الاتجاه نفسه، فيُجمع الفرق: عدد الأجزاء × دقة الجزء.", "Worst copy: every part strays in the same direction, so the deviations add: number of parts × accuracy of a part."),
      tx("أغلب القطع: الفروق يلغي بعضها بعضاً جزئياً، فالمجموع = الدقة × جذر عدد الأجزاء. يصح هذا حين يُصنع كل جزء مستقلاً عن الآخر. إذا خرجت الأجزاء من قالب واحد ينحرف في اتجاه واحد فاحسب بأسوأ قطعة.", "Most pieces: the deviations partly cancel each other, so the total = accuracy × square root of the number of parts. This holds when each part is made independently. If the parts come from one mould that strays in one direction, calculate with the worst piece."),
      tx("المرجع المشترك: قياس الأجزاء أو ثقبها معاً بعد صنعها يلغي التراكم.", "Shared reference: measuring or drilling the parts together after they are made cancels the stack-up."),
      tx("التعويض يصلح الفقد الثابت وحده. الفقد الذي يتفاوت أكثر من المقبول لا يصلحه رقم في الملف.", "An allowance fixes a constant loss only. A loss that varies by more than is acceptable cannot be fixed by a number in the file."),
    ],
    notModeled: [
      tx("مقادير الفقد نفسها: تُقاس على نسخ ورشتك، ولا يصير التعويض قاعدة إلا بعد اختباره على نسخة لاحقة.", "The loss figures themselves: measure them on your workshop's copies; an allowance becomes a rule only after it is tested on a later copy."),
      tx("الانكماش في الصب، والاتجاهات الثلاثة للفرق: هنا اتجاه واحد.", "Casting shrinkage, and the three directions of deviation: here there is one direction."),
    ],
    sources: [tx("الفكرتان من «صياغة القرار»، الفصلين الثالث عشر والخامس عشر. وطريقتا الجمع (أسوأ حال والجمع الإحصائي) من هندسة التفاوتات المعروفة.", "Both ideas come from “The Craft of Decision”, chapters 13 and 15. The two ways of adding (worst case and statistical sum) come from standard tolerance engineering.")],
  },
};
