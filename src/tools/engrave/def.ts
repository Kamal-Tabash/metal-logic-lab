import { tx } from "../../core/i18n";
// م4 — engraving depth: what stays under the cut, what polishing takes, what the cut weighs.
import type { Pt, Sheet } from "../../core/cad/sheet";
import { ENGRAVE, METAL_OPTS, metalById } from "../../core/data";
import { L2, f2, fail, mm, near, ok, pct, sortChecks, times, type ToolDef } from "../../core/kit";
import type { Check } from "../../core/ui/controls";

export interface EngraveState {
  T: number; W: number; go: number; gi: number; over: "yes" | "no"; how: "hand" | "machine";
  polishes: number; perPolish: number; // station B (per polish in microns)
  lw: number; ld: number; len: number; metal: string; // station C
}

/** Metal left between the outer engraving and the inner inscription (or the inside face). */
export const remainingUnder = (s: Pick<EngraveState, "T" | "go" | "gi" | "over">) => s.T - s.go - (s.over === "yes" ? s.gi : 0);
/** A V-shaped line, w wide at the surface and d deep, takes w·d/2 mm³ per mm of its length. */
export const lineVolume = (w: number, d: number, metres: number) => (w * d / 2) * metres * 1000;
export const depthAfterPolish = (go: number, n: number, micron: number) => Math.max(go - (n * micron) / 1000, 0);

function underChecks(s: EngraveState): Check[] {
  const rem = remainingUnder(s), list: Check[] = [];
  const min = s.how === "hand" ? ENGRAVE.handMin : ENGRAVE.machineMin;
  list.push(rem < min - 1e-9 ? fail(tx(`يبقى ${f2(Math.max(rem, 0))} ملم تحت النقش: أقل من ${min} فتثقبه الأداة أو يظهر أثرها في الوجه الآخر`, `${f2(Math.max(rem, 0))} mm is left under the engraving: less than ${min}, so the tool pierces it or shows through on the other face`))
    : rem < ENGRAVE.handGood - 1e-9 ? near(tx(`يبقى ${f2(rem)} ملم تحت النقش: أدنى ما يُقبل، والأفضل ${ENGRAVE.handGood}`, `${f2(rem)} mm is left under the engraving: the least acceptable; ${ENGRAVE.handGood} is better`))
    : ok(tx(`يبقى ${f2(rem)} ملم تحت النقش: يكفي`, `${f2(rem)} mm is left under the engraving: enough`)));
  list.push(s.T < 0.8 - 1e-9 ? fail(tx(`خاتم سماكته ${f2(s.T)} ملم يفقد استدارته تحت ضغط اليد`, `A ring ${f2(s.T)} mm thick loses its roundness under the pressure of the hand`)) : s.T < 1 - 1e-9 ? near(tx(`سماكة ${f2(s.T)} ملم رقيقة لخاتم يُلبس كل يوم`, `${f2(s.T)} mm is thin for a ring worn every day`)) : ok(tx(`سماكة الخاتم ${f2(s.T)} ملم تحتمل اللبس اليومي`, `A ring thickness of ${f2(s.T)} mm stands up to daily wear`)));
  if (s.gi > 0.005) list.push(s.W < 2 - 1e-9 ? fail(tx(`عرض ${f2(s.W)} ملم أضيق من أن تُكتب في باطنه كلمة مقروءة`, `A width of ${f2(s.W)} mm is too narrow for a readable word inside`)) : s.W < 2.5 - 1e-9 ? near(tx(`عرض ${f2(s.W)} ملم يكاد يكفي للكتابة في الباطن`, `A width of ${f2(s.W)} mm is barely enough for lettering inside`)) : ok(tx(`عرض ${f2(s.W)} ملم يتسع للكتابة في الباطن`, `A width of ${f2(s.W)} mm has room for lettering inside`)));
  return sortChecks(list);
}
function polishChecks(s: EngraveState): Check[] {
  const d = depthAfterPolish(s.go, s.polishes, s.perPolish), T = Math.max(s.T - (s.polishes * s.perPolish) / 1000, 0);
  return sortChecks([T < 0.8 - 1e-9 ? fail(tx(`الصقل أخذ من الخاتم نفسه: بقيت سماكته ${f2(T)} ملم`, `Polishing has eaten into the ring itself: ${f2(T)} mm of thickness is left`)) : T < 1 - 1e-9 ? near(tx(`الصقل رقّق الخاتم إلى ${f2(T)} ملم`, `Polishing has thinned the ring to ${f2(T)} mm`)) : ok(tx(`سماكة الخاتم بعد الصقل ${f2(T)} ملم`, `Ring thickness after polishing: ${f2(T)} mm`)), d <= 1e-6 ? fail(tx("اختفى النقش: أخذ الصقل عمقه كله", "The engraving is gone: polishing took its whole depth")) : d < s.go / 2 - 1e-9 ? near(tx(`بقي من عمق النقش ${f2(d)} ملم: ضحل وبدأ يبهت`, `${f2(d)} mm of engraving depth is left: shallow and starting to fade`)) : ok(tx(`بقي من عمق النقش ${f2(d)} ملم: ما زال واضحاً`, `${f2(d)} mm of engraving depth is left: still clear`))]);
}

function band(s: Sheet, st: EngraveState, go: number, ghostTop = 0) {
  const v = s.view({ x: 0, y: 0, w: s.w, h: s.h }), ink = s.ink;
  const W = st.W, T = st.T, x0 = -W / 2, x1 = W / 2;
  v.fit({ x0: x0 - 1, y0: -0.7, x1: x1 + 1.4, y1: T + ghostTop + 0.9 }, 30); v.grid(); v.tag(tx("مقطع في الخاتم · ملم", "Section through the ring · mm"));
  const lvl = underChecks({ ...st, go })[0].level, tone = lvl === "fail" ? ink.warn : ink.gold;
  const wo = Math.min(go * 1.5, W * 0.4), wi = Math.min(st.gi * 1.5, W * 0.3), xi = st.over === "yes" ? 0 : -W * 0.28;
  const pts: Pt[] = [[x0, 0], [xi - wi / 2, 0], [xi, st.gi], [xi + wi / 2, 0], [x1, 0], [x1, T], [wo / 2, T], [0, T - go], [-wo / 2, T], [x0, T]];
  v.section(pts, { stroke: tone, hatch: lvl === "fail" ? "#7a3a2c" : ink.goldDim });
  if (ghostTop > 0) v.stroke([[x0, T + ghostTop], [x1, T + ghostTop]], { color: ink.muted, width: 1, dash: [4, 4] });
  v.dimV(0, T, x1, f2(T), { off: 18, color: ink.line });
  v.dimH(x0, x1, 0, f2(W), { off: 24, color: ink.muted });
  if (go > 0.01) v.dimV(T - go, T, 0, f2(go), { off: -12, color: tone });
  v.sheet.text(tx("الوجه الخارجي", "outer face"), v.X(x0 + 0.1), v.Y(T) - 10, { size: 11, color: ink.muted, align: "right" });
  v.sheet.text(tx("باطن الخاتم", "inside of the ring"), v.X(x0 + 0.1), v.Y(0) + 12, { size: 11, color: ink.muted, align: "right" });
}

export const DEF: ToolDef<EngraveState> = {
  id: "engrave", title: tx("عمق النقش", "Engraving Depth"),
  defaults: { T: 1.2, W: 4, go: 0.3, gi: 0.15, over: "yes", how: "hand", polishes: 5, perPolish: 10, lw: 0.3, ld: 0.2, len: 1, metal: "k21" },
  stations: [
    {
      id: "under", label: tx("ما يبقى تحت النقش", "What is left under the engraving"),
      idea: { ref: L2(6), text: tx("أداة النقش تضغط على المعدن وهي تقطعه. ما يهم ليس عمق النقش وحده، بل ما يبقى تحته من معدن ليحمل هذا الضغط.", "The graver presses on the metal as it cuts. What matters is not the depth of the engraving alone, but how much metal is left under it to take that pressure.") },
      primary: { kind: "range", key: "go", label: tx("عمق النقش الخارجي", "Depth of the outer engraving"), min: 0, max: 0.8, step: 0.01, fmt: (v) => mm(v), hint: tx("حرّكه ليعمق النقش على وجه الخاتم. كل ما يأخذه النقش ينقص مما يبقى تحته.", "Move it to deepen the engraving on the face of the ring. Whatever the engraving takes comes off what is left beneath it.") },
      groups: [
        { title: tx("الخاتم", "The ring"), controls: [
          { kind: "range", key: "T", label: tx("سماكة الخاتم", "Ring thickness"), min: 0.6, max: 2.5, step: 0.05, fmt: (v) => mm(v), hint: tx("سماكة جدار الحلقة من الباطن إلى الوجه. هي كل ما يملكه النقش من معدن.", "Thickness of the band's wall from the inside to the face. It is all the metal the engraving has to work with."), marks: [{ at: 0.8, label: "0.8", tone: "warn" }] },
          { kind: "range", key: "W", label: tx("عرض الخاتم", "Ring width"), min: 1.5, max: 10, step: 0.1, fmt: (v) => mm(v, 1), hint: tx("عرض الحلقة على الإصبع. الكتابة المقروءة في الباطن تحتاج عرضاً لا يقل عن 2 إلى 2.5 ملم.", "Width of the band on the finger. Readable lettering inside needs a width of at least 2 to 2.5 mm.") },
        ] },
        { title: tx("الكتابة في الباطن", "Lettering inside"), controls: [
          { kind: "range", key: "gi", label: tx("عمق الكتابة في الباطن", "Depth of the inside lettering"), min: 0, max: 0.4, step: 0.01, fmt: (v) => mm(v), hint: tx("الاسم أو التاريخ المحفور داخل الخاتم. إذا وقع تحت النقش الخارجي أخذ الاثنان من السماكة نفسها.", "The name or date cut inside the ring. If it falls under the outer engraving, both take from the same thickness.") },
          { kind: "seg", key: "over", label: tx("هل تقع الكتابة تحت النقش الخارجي؟", "Does the lettering fall under the outer engraving?"), options: [{ value: "yes", label: tx("نعم، متقابلان", "Yes, back to back") }, { value: "no", label: tx("لا، في موضع آخر", "No, somewhere else") }], hint: tx("حين يتقابل النقش والكتابة يبقى بين قاعيهما أقل ما في الخاتم من معدن.", "Where the engraving and the lettering meet back to back, the least metal in the ring is left between their floors.") },
          { kind: "seg", key: "how", label: tx("طريقة النقش", "Engraving method"), options: [{ value: "hand", label: tx("باليد", "By hand") }, { value: "machine", label: tx("بالآلة", "By machine") }], hint: tx("اليد تخفف ضغطها حين يرقّ المعدن، والآلة تضغط بقوة ثابتة، فتحتاج معدناً أسمك تحتها.", "The hand eases off as the metal gets thin; a machine presses with a constant force, so it needs thicker metal beneath it.") },
        ] },
      ],
      result: (s) => { const rem = Math.max(remainingUnder(s), 0); return {
        label: tx("ما يبقى من المعدن تحت النقش", "Metal left under the engraving"), value: mm(rem), fraction: rem / s.T, tone: underChecks(s)[0].level === "fail" ? "warn" : "gold",
        readings: [{ label: tx("نسبته من سماكة الخاتم", "As a share of ring thickness"), value: pct(rem / s.T) }, { label: tx("ما أخذه النقش والكتابة", "Taken by engraving and lettering"), value: mm(s.T - rem) }],
        checks: underChecks(s) }; },
      draw: (sh, s) => band(sh, s, s.go),
      aria: (s) => tx(`مقطع خاتم سماكته ${f2(s.T)} ملم بنقش خارجي عمقه ${f2(s.go)} ملم، يبقى تحته ${f2(Math.max(remainingUnder(s), 0))} ملم.`, `Section of a ring ${f2(s.T)} mm thick with an outer engraving ${f2(s.go)} mm deep, leaving ${f2(Math.max(remainingUnder(s), 0))} mm under it.`),
    },
    {
      id: "polish", label: tx("ما يأخذه الصقل", "What polishing takes"),
      idea: { ref: L2(6), text: tx("كل صقل يعيد اللمعان يأخذ شيئاً من السطح، فيأخذ من عمق النقش معه. النقش الضحل يختفي بعد صقلات قليلة، والعميق يعيش أطول.", "Every polish that brings back the shine takes a little off the surface, and with it some of the engraving's depth. A shallow engraving disappears after a few polishes; a deep one lives longer.") },
      primary: { kind: "range", key: "polishes", label: tx("عدد مرات الصقل عبر السنين", "Number of polishes over the years"), min: 0, max: 40, step: 1, fmt: (v) => times(v), hint: tx("كم مرة سيعود الخاتم إلى الصائغ ليُصقل. حرّكه وانظر كيف يضحل النقش.", "How many times the ring will go back to the jeweller for polishing. Move it and watch the engraving grow shallow.") },
      groups: [{ title: tx("النقش والصقل", "Engraving and polishing"), controls: [
        { kind: "range", key: "go", label: tx("عمق النقش يوم صُنع", "Engraving depth when made"), min: 0.05, max: 0.8, step: 0.01, fmt: (v) => mm(v), hint: tx("العمق الذي يُحفر به النقش أول مرة. هو رصيده أمام الصقل.", "The depth the engraving is first cut to. It is its reserve against polishing.") },
        { kind: "range", key: "T", label: tx("سماكة الخاتم", "Ring thickness"), min: 0.6, max: 2.5, step: 0.05, fmt: (v) => mm(v), hint: tx("الصقل يأخذ من سطح الخاتم كله، لا من النقش وحده. الخاتم الرقيق يرقّ أكثر.", "Polishing takes from the whole surface of the ring, not the engraving alone. A thin ring gets thinner still.") },
        { kind: "range", key: "perPolish", label: tx("ما يأخذه الصقل الواحد", "What one polish takes"), min: 2, max: 40, step: 1, fmt: (v) => `${Math.round(v)} µm`, hint: tx("سماكة ما يزيله قرص الصقل في المرة الواحدة، بالميكرون (جزء من ألف من الملم). يختلف من ورشة إلى أخرى، فضع رقم ورشتك.", "Thickness the polishing wheel removes each time, in microns (a thousandth of a millimetre). It varies from one workshop to another, so enter your own workshop's figure.") },
      ] }],
      result: (s) => { const d = depthAfterPolish(s.go, s.polishes, s.perPolish); return {
        label: tx("عمق النقش الباقي", "Engraving depth left"), value: mm(d), fraction: d / s.go, tone: d <= 1e-6 ? "warn" : "gold",
        readings: [{ label: tx("ما أخذه الصقل", "Taken by polishing"), value: mm(s.go - d) }, { label: tx("عدد الصقلات حتى يختفي", "Polishes until it disappears"), value: times(Math.ceil((s.go * 1000) / s.perPolish)) }],
        checks: polishChecks(s) }; },
      draw: (sh, s) => { const took = Math.min((s.polishes * s.perPolish) / 1000, s.T - 0.1); band(sh, { ...s, T: s.T - took, gi: 0 }, depthAfterPolish(s.go, s.polishes, s.perPolish), took); },
      aria: (s) => tx(`نقش عمقه ${f2(s.go)} ملم بعد الصقل ${times(s.polishes)} يبقى منه ${f2(depthAfterPolish(s.go, s.polishes, s.perPolish))} ملم.`, `An engraving ${f2(s.go)} mm deep, after polishing ${times(s.polishes)}, has ${f2(depthAfterPolish(s.go, s.polishes, s.perPolish))} mm left.`),
    },
    {
      id: "weight", label: tx("وزن ما يأخذه النقش", "Weight the engraving removes"),
      idea: { ref: L2(6), text: tx("الشريط الذي تقطعه أداة النقش ذهب يخرج من القطعة. القطعة المنقوشة أخف مما دخلت، ووزنها يُكتب بعد النقش لا قبله.", "The sliver the graver cuts is gold leaving the piece. An engraved piece is lighter than it went in, and its weight is recorded after engraving, not before.") },
      primary: { kind: "range", key: "len", label: tx("مجموع طول خطوط النقش", "Total length of engraved lines"), min: 0, max: 12, step: 0.1, fmt: (v) => `${v.toFixed(1)} m`, hint: tx("اجمع أطوال كل خطوط الزخرفة. السوار المزخرف بكثافة يجمع أمتاراً منها.", "Add up the lengths of all the lines in the pattern. A densely decorated bangle adds up to metres of them.") },
      groups: [{ title: tx("الخط المحفور", "The engraved line"), controls: [
        { kind: "range", key: "lw", label: tx("عرض الخط عند السطح", "Line width at the surface"), min: 0.1, max: 1, step: 0.01, fmt: (v) => mm(v), hint: tx("عرض فم الخط المحفور. الخط الأعرض يأخذ معدناً أكثر.", "Width of the mouth of the engraved line. A wider line takes more metal.") },
        { kind: "range", key: "ld", label: tx("عمق الخط", "Line depth"), min: 0.05, max: 0.6, step: 0.01, fmt: (v) => mm(v), hint: tx("عمق الخط المحفور على هيئة حرف V.", "Depth of the line, cut in a V shape.") },
        { kind: "seg", key: "metal", label: tx("العيار", "Karat"), options: METAL_OPTS, hint: tx("الحجم نفسه من المعدن يزن أكثر في العيار الأعلى.", "The same volume of metal weighs more in a higher karat.") },
      ] }],
      result: (s) => { const v = lineVolume(s.lw, s.ld, s.len), g = (v / 1000) * metalById(s.metal).density; return {
        label: tx("وزن الذهب الذي أخذه النقش", "Weight of gold removed by engraving"), value: `${f2(g)} g`,
        readings: [{ label: tx("حجمه", "Its volume"), value: `${v.toFixed(1)} mm³` }, { label: tx("لكل متر من الخط", "Per metre of line"), value: `${f2(s.len > 0 ? g / s.len : (lineVolume(s.lw, s.ld, 1) / 1000) * metalById(s.metal).density)} g` }] }; },
      draw: (sh, s) => {
        const v = sh.view({ x: 0, y: 0, w: sh.w, h: sh.h }), ink = sh.ink, w = s.lw, d = s.ld;
        v.fit({ x0: -w * 1.6, y0: -d * 1.5, x1: w * 1.6, y1: d * 0.9 }, 34); v.grid(); v.tag(tx("مقطع في الخط المحفور · ملم", "Section through the engraved line · mm"));
        v.section([[-w * 1.5, 0], [-w / 2, 0], [0, -d], [w / 2, 0], [w * 1.5, 0], [w * 1.5, -d * 1.4], [-w * 1.5, -d * 1.4]], { stroke: ink.gold, hatch: ink.goldDim });
        v.fill([[-w / 2, 0], [0, -d], [w / 2, 0]], "rgba(214,162,74,0.18)");
        v.dimH(-w / 2, w / 2, 0, f2(w), { off: -16, color: ink.line }); v.dimV(-d, 0, w / 2, f2(d), { off: 22, color: ink.line });
      },
      aria: (s) => tx(`خط محفور عرضه ${f2(s.lw)} وعمقه ${f2(s.ld)} ملم بطول ${s.len.toFixed(1)} متر يأخذ ${f2((lineVolume(s.lw, s.ld, s.len) / 1000) * metalById(s.metal).density)} غراماً.`, `An engraved line ${f2(s.lw)} wide and ${f2(s.ld)} mm deep, ${s.len.toFixed(1)} m long, removes ${f2((lineVolume(s.lw, s.ld, s.len) / 1000) * metalById(s.metal).density)} g.`),
    },
  ],
  examples: [
    { id: "ring12", station: "under", origin: "book", ref: L2(6, tx("حالة على طاولة العمل", "A case on the bench")), title: tx("ورشة 1 · خاتم زواج سماكته 1.2 ملم", "Workshop 1 · wedding band 1.2 mm thick"), says: tx("يبقى 0.75 ملم", "0.75 mm is left"),
      quote: "حيث تقع الكتابة في الباطن، وعمقها 0.15 ملم، تحت النقش الخارجي، يبقى بين القاعين 0.75 ملم. هذا كاف لخاتم مصمت.",
      note: tx("خاتم سماكته 1.2 ملم بنقش خارجي عمقه 0.3 ملم واسمين في الباطن بعمق 0.15 ملم. حتى حيث يتقابلان يبقى ثلاثة أرباع الملم.", "A ring 1.2 mm thick with an outer engraving 0.3 mm deep and two names inside at 0.15 mm. Even where they meet back to back, three quarters of a millimetre is left."),
      state: { T: 1.2, W: 4, go: 0.3, gi: 0.15, over: "yes", how: "hand" },
      expect: (s) => ({ value: mm(remainingUnder(s)), pass: Math.abs(remainingUnder(s) - 0.75) < 0.005 }) },
    { id: "apart", station: "under", origin: "book", ref: L2(6), title: tx("ورشة 2 · الكتابة بعيدة عن النقش", "Workshop 2 · lettering away from the engraving"), says: tx("يبقى 0.7 ملم بالآلة", "0.7 mm is left, by machine"),
      note: tx("خاتم سماكته 1 ملم يُنقش بالآلة بعمق 0.3 ملم، والكتابة في موضع آخر من الباطن. يبقى تحت النقش 0.7 ملم، فوق ما تحتاجه الآلة.", "A ring 1 mm thick is machine-engraved 0.3 mm deep, with the lettering somewhere else inside. 0.7 mm is left under the engraving, more than the machine needs."),
      state: { T: 1, W: 4, go: 0.3, gi: 0.15, over: "no", how: "machine" },
      expect: (s) => ({ value: mm(remainingUnder(s)), pass: Math.abs(remainingUnder(s) - 0.7) < 0.005 }) },
    { id: "deep", station: "polish", origin: "book", ref: L2(6), title: tx("ورشة 1 · نقش عميق يعيش", "Workshop 1 · a deep engraving that lasts"), says: tx("يبقى أكثر من نصفه", "more than half is left"),
      note: tx("نقش عمقه 0.3 ملم يُصقل عشر مرات، وكل صقلة تأخذ نحو 10 ميكرون. يبقى منه 0.2 ملم واضحاً.", "An engraving 0.3 mm deep is polished ten times, each polish taking about 10 microns. 0.2 mm of it is left, still clear."),
      state: { go: 0.3, polishes: 10, perPolish: 10, T: 1.2 },
      expect: (s) => { const d = depthAfterPolish(s.go, s.polishes, s.perPolish); return { value: mm(d), pass: Math.abs(d - 0.2) < 0.005 }; } },
    { id: "few", station: "polish", origin: "book", ref: L2(13), title: tx("ورشة 2 · صقل قليل ورفيق", "Workshop 2 · few, gentle polishes"), says: tx("يبقى معظمه", "most of it is left"),
      note: tx("نقش عمقه 0.2 ملم يُصقل خمس مرات برفق (5 ميكرون في المرة). يكاد لا يتغير، لأن الصقل الرفيق القليل يحفظ النقش.", "An engraving 0.2 mm deep is polished gently five times (5 microns each). It hardly changes, because few, gentle polishes preserve the engraving."),
      state: { go: 0.2, polishes: 5, perPolish: 5, T: 1.2 },
      expect: (s) => { const d = depthAfterPolish(s.go, s.polishes, s.perPolish); return { value: mm(d), pass: d > 0.17 }; } },
    { id: "metre", station: "weight", origin: "book", ref: L2(6), title: tx("ورشة 1 · متر واحد من الخط", "Workshop 1 · one metre of line"), says: tx("نحو نصف غرام", "about half a gram"),
      quote: "يأخذ من كل متر من طوله نحو ثلاثين ملمتراً مكعباً من المعدن، أي نحو نصف غرام من ذهب عيار 21",
      note: tx("خط عرضه ثلاثة أعشار الملم وعمقه خُمس الملم يأخذ من كل متر نحو 30 ملم مكعب، أي نحو نصف غرام في عيار 21.", "A line three tenths of a millimetre wide and a fifth deep takes about 30 cubic millimetres per metre, which is about half a gram in 21k."),
      state: { lw: 0.3, ld: 0.2, len: 1, metal: "k21" },
      expect: (s) => { const g = (lineVolume(s.lw, s.ld, s.len) / 1000) * metalById(s.metal).density; return { value: tx(`${f2(g)} غ`, `${f2(g)} g`), pass: Math.abs(g - 0.5) < 0.03 }; } },
    { id: "dense", station: "weight", origin: "book", ref: L2(6), title: tx("ورشة 2 · سوار بزخرفة كثيفة", "Workshop 2 · a densely decorated bangle"), says: tx("نحو غرامين ونصف", "about two and a half grams"),
      note: tx("سوار تدور حوله زخرفة مجموع خطوطها خمسة أمتار. يخرج من تحت يد النقاش أخف بنحو غرامين ونصف.", "A bangle wrapped in a pattern whose lines total five metres. It leaves the engraver's hands about two and a half grams lighter."),
      state: { lw: 0.3, ld: 0.2, len: 5, metal: "k21" },
      expect: (s) => { const g = (lineVolume(s.lw, s.ld, s.len) / 1000) * metalById(s.metal).density; return { value: tx(`${f2(g)} غ`, `${f2(g)} g`), pass: Math.abs(g - 2.55) < 0.1 }; } },
  ],
  guide: {
    models: [
      tx("ما يبقى تحت النقش = سماكة الخاتم − عمق النقش − عمق الكتابة إذا وقعت تحته.", "Metal left under the engraving = ring thickness − engraving depth − lettering depth if it falls beneath it."),
      tx("حدود ورشتي في عيار 21: لا يُنقش باليد معدن أرق من 0.35 ملم والأفضل 0.5، وآلة النقش تحتاج 0.5 ملم. وخاتم بسماكة 0.8 ملم رقيق للبس اليومي.", "My workshop's limits in 21k: metal thinner than 0.35 mm is not engraved by hand, and 0.5 is better; an engraving machine needs 0.5 mm. A ring 0.8 mm thick is thin for daily wear."),
      tx("الخط المحفور على هيئة حرف V يأخذ من كل ملم من طوله نصف حاصل ضرب عرضه في عمقه.", "A V-shaped engraved line takes, for every millimetre of its length, half its width multiplied by its depth."),
    ],
    notModeled: [
      tx("مقدار ما يأخذه الصقل الواحد: يختلف بحسب الورشة والقرص واليد، والرقم هنا يضعه القارئ من ورشته.", "How much one polish takes: it depends on the workshop, the wheel and the hand; the figure here is for the reader to set from their own workshop."),
      tx("استدارة حواف النقش بالاحتكاك اليومي قبل أن يضحل، وفرق السبائك في حفظ الحواف.", "The rounding of the engraving's edges through daily rubbing before it grows shallow, and how alloys differ in keeping edges."),
      tx("أثر عرض الخاتم ومقاسه في استدارته: الخاتم العريض يحتمل سماكة أقل من الرفيع.", "The effect of the ring's width and size on its roundness: a wide ring can take less thickness than a narrow one."),
    ],
    sources: [tx("الأرقام من «حدود المادة»، الفصل السادس وحالته، والفصل الثالث عشر.", "The figures come from “The Limits of Material”, chapter 6 and its case, and chapter 13.")],
  },
};
