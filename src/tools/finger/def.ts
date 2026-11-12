import { tx } from "../../core/i18n";
// م14 — the ring on the finger: it must pass the knuckle, then stay put on a thinner base.
import { circlePts } from "../../core/cad/sheet";
import { L3, f1, f2, fail, mm, near, ok, sortChecks, type ToolDef } from "../../core/kit";
import type { Check } from "../../core/ui/controls";

export interface FingerState {
  knuckle: number; base: number; ring: number;       // circumferences, mm
  head: number; headH: number; shank: number;         // head mass g, its height above the finger, mass of the lower half of the band g
}
export const GIVE = 1; // mm of circumference the knuckle's skin gives when the ring is pushed over it
/** How much the head wants to roll the ring over, against the weight under the finger. */
export function topHeavy(s: Pick<FingerState, "head" | "headH" | "shank" | "base">): number {
  const r = s.base / (2 * Math.PI);
  return (s.head * (r + s.headH)) / Math.max(s.shank * (r + 0.8), 1e-6);
}

function fitChecks(s: FingerState): Check[] {
  const loose = s.ring - s.base;
  return sortChecks([
    s.ring < s.knuckle - GIVE - 1e-9 ? fail(tx(`الخاتم أضيق من المفصل بـ ${f1(s.knuckle - s.ring)} ملم: لا يعبره`, `The ring is ${f1(s.knuckle - s.ring)} mm smaller than the knuckle: it will not pass`)) : s.ring < s.knuckle - 1e-9 ? ok(tx("الخاتم يعبر المفصل بضغطة خفيفة", "The ring passes the knuckle with a light push")) : ok(tx("الخاتم يعبر المفصل بسهولة", "The ring passes the knuckle easily")),
    loose < -1e-9 ? fail(tx("الخاتم أضيق من قاعدة الإصبع: يضغطها", "The ring is smaller than the base of the finger: it squeezes it")) : loose > 4 + 1e-9 ? fail(tx(`الخاتم أوسع من قاعدة الإصبع بـ ${f1(loose)} ملم: يدور ويسقط`, `The ring is ${f1(loose)} mm larger than the base of the finger: it spins and falls off`)) : loose > 2 + 1e-9 ? near(tx(`الخاتم أوسع من قاعدة الإصبع بـ ${f1(loose)} ملم: يدور حولها`, `The ring is ${f1(loose)} mm larger than the base of the finger: it spins around it`)) : ok(tx(`الخاتم يستقر عند قاعدة الإصبع (فراغ ${f1(Math.max(loose, 0))} ملم)`, `The ring sits at the base of the finger (${f1(Math.max(loose, 0))} mm of play)`)),
  ]);
}
function headChecks(s: FingerState): Check[] {
  const t = topHeavy(s);
  return [t > 3 ? fail(tx(`الواجهة أثقل من أسفل الحلقة ${f1(t)} مرة: تنقلب إلى جانب الإصبع`, `The top is ${f1(t)} times heavier than the bottom of the band: it rolls to the side of the finger`)) : t > 1.5 ? near(tx(`الواجهة أثقل من أسفل الحلقة ${f1(t)} مرة: تميل إن لم يكن الخاتم محكماً`, `The top is ${f1(t)} times heavier than the bottom of the band: it tilts unless the ring is snug`)) : t < 0.67 ? ok(tx("أسفل الحلقة أثقل من الواجهة: الخاتم مستقر على الإصبع", "The bottom of the band outweighs the top: the ring is stable on the finger")) : ok(tx(`الواجهة وأسفل الحلقة متوازنان (× ${f2(t)})`, `The top and the bottom of the band are balanced (× ${f2(t)})`))];
}
const circ = (key: "knuckle" | "base", label: string, hint: string) => ({ kind: "range" as const, key, label, min: 40, max: 80, step: 0.1, fmt: (v: number) => mm(v, 1), hint });

export const DEF: ToolDef<FingerState> = {
  id: "finger", title: tx("ثبات الخاتم", "Ring Stability"),
  defaults: { knuckle: 56, base: 54, ring: 55.5, head: 2, headH: 4, shank: 2.5 },
  stations: [
    {
      id: "fit", label: tx("العبور والاستقرار", "Passing and sitting"),
      idea: { ref: L3(2), text: tx("الخاتم يُقاس على موضعين لا على موضع واحد: يجب أن يعبر المفصل، ثم يستقر عند قاعدة الإصبع وهي أنحف منه. ما يعبر بسهولة قد يدور بعد أن يستقر.", "A ring is sized against two places, not one: it must pass the knuckle, then sit at the base of the finger, which is slimmer. What passes easily may spin once it sits.") },
      primary: { kind: "range", key: "ring", label: tx("المحيط الداخلي للخاتم", "Inner circumference of the ring"), min: 40, max: 80, step: 0.1, fmt: (v) => mm(v, 1), hint: tx("مقاس الخاتم بالملمترات. حرّكه بين محيط القاعدة ومحيط المفصل وانظر متى يعبر ومتى يدور.", "The ring size in millimetres. Move it between the base and knuckle circumferences and see when it passes and when it spins.") },
      groups: [{ title: tx("الإصبع", "The finger"), controls: [
        circ("knuckle", tx("محيط المفصل", "Knuckle circumference"), tx("محيط أعرض موضع يعبره الخاتم. يُقاس على إصبع صاحبه.", "Circumference of the widest place the ring has to pass. Measured on the wearer's finger.")),
        circ("base", tx("محيط قاعدة الإصبع", "Finger base circumference"), tx("محيط الموضع الذي يستقر فيه الخاتم. يُقاس على إصبع صاحبه، وهو في الغالب أنحف من المفصل.", "Circumference of the place where the ring sits. Measured on the wearer's finger; usually slimmer than the knuckle.")),
      ] }],
      result: (s) => ({ label: tx("الفراغ عند قاعدة الإصبع", "Play at the base of the finger"), value: mm(s.ring - s.base, 1), tone: fitChecks(s)[0].level === "fail" ? "warn" : "gold",
        readings: [{ label: tx("الفرق بين المفصل والقاعدة", "Difference between knuckle and base"), value: mm(s.knuckle - s.base, 1) }, { label: tx("أصغر خاتم يعبر المفصل", "Smallest ring that passes the knuckle"), value: mm(s.knuckle - GIVE, 1), tone: "gold" }], checks: fitChecks(s) }),
      draw: (sh, s) => {
        const v = sh.view({ x: 0, y: 0, w: sh.w, h: sh.h }), ink = sh.ink, c = fitChecks(s), tone = c[0].level === "fail" ? ink.warn : ink.gold;
        const rk = s.knuckle / (2 * Math.PI), rb = s.base / (2 * Math.PI), rr = s.ring / (2 * Math.PI);
        v.fit({ x0: -30, y0: -16, x1: 30, y1: 17 }, 24); v.grid(); v.tag(tx("مقطعان في الإصبع · ملم", "Two sections through the finger · mm"));
        for (const [cx, r, name] of [[14, rk, tx("عند المفصل", "at the knuckle")], [-14, rb, tx("عند القاعدة", "at the base")]] as const) {
          v.fill(circlePts(cx, 0, r), "rgba(200,170,150,0.16)"); v.stroke(circlePts(cx, 0, r), { color: ink.muted, width: 1.2, close: true });
          v.section(circlePts(cx, 0, rr + 1.3), { stroke: tone, hatch: c[0].level === "fail" ? "#7a3a2c" : ink.goldDim });
          v.fill(circlePts(cx, 0, rr), ink.sheet); v.fill(circlePts(cx, 0, Math.min(r, rr)), "rgba(200,170,150,0.16)");
          v.stroke(circlePts(cx, 0, rr), { color: tone, width: 1.4, close: true }); v.stroke(circlePts(cx, 0, r), { color: r > rr ? ink.warn : ink.muted, width: 1.2, close: true, dash: r > rr ? [3, 3] : undefined });
          v.sheet.text(name, v.X(cx), v.Y(-rr - 1.3) + 16, { size: 12, color: ink.line, halo: true });
        }
      },
      aria: (s) => tx(`خاتم محيطه ${f1(s.ring)} ملم على إصبع محيط مفصله ${f1(s.knuckle)} وقاعدته ${f1(s.base)} ملم: الفراغ عند القاعدة ${f1(s.ring - s.base)} ملم.`, `A ring ${f1(s.ring)} mm around on a finger with a ${f1(s.knuckle)} mm knuckle and a ${f1(s.base)} mm base: ${f1(s.ring - s.base)} mm of play at the base.`),
    },
    {
      id: "head", label: tx("ثقل الواجهة", "A heavy top"),
      idea: { ref: L3(2), text: tx("الواجهة الكبيرة مشكلتها موضع ثقلها: هو فوق الإصبع وبعيد عن محوره، فيسعى إلى الدوران نحو الأسفل. يقاومه ثقل أسفل الحلقة وإحكام الخاتم.", "The trouble with a big top is where its weight sits: above the finger and far from its axis, so it tries to roll downward. The weight of the bottom of the band and the snugness of the ring resist it.") },
      primary: { kind: "range", key: "head", label: tx("وزن الواجهة", "Weight of the top"), min: 0.2, max: 20, step: 0.1, fmt: (v) => `${f1(v)} g`, hint: tx("وزن الحجر وما يحمله فوق الإصبع. حرّكه وانظر متى تنقلب الواجهة.", "Weight of the stone and whatever carries it above the finger. Move it and see when the top rolls over.") },
      groups: [{ title: tx("الحلقة", "The band"), controls: [
        { kind: "range", key: "headH", label: tx("ارتفاع ثقل الواجهة فوق الإصبع", "Height of the top's weight above the finger"), min: 1, max: 15, step: 0.1, fmt: (v) => mm(v, 1), hint: tx("كم يرتفع مركز ثقل الواجهة فوق ظهر الإصبع. الواجهة العالية تنقلب أسهل.", "How high the top's centre of gravity sits above the back of the finger. A tall top rolls over more easily.") },
        { kind: "range", key: "shank", label: tx("وزن النصف السفلي من الحلقة", "Weight of the lower half of the band"), min: 0.3, max: 15, step: 0.1, fmt: (v) => `${f1(v)} g`, hint: tx("وزن المعدن تحت الإصبع. تسميك أسفل الحلقة يوازن الواجهة.", "Weight of the metal under the finger. Thickening the bottom of the band balances the top.") },
        circ("base", tx("محيط قاعدة الإصبع", "Finger base circumference"), tx("محيط الموضع الذي يستقر فيه الخاتم.", "Circumference of the place where the ring sits.")),
      ] }],
      result: (s) => ({ label: tx("كم مرة تثقل الواجهة أسفلَ الحلقة", "How many times the top outweighs the bottom of the band"), value: `× ${f2(topHeavy(s))}`, fraction: Math.min(topHeavy(s) / 4, 1), tone: headChecks(s)[0].level === "fail" ? "warn" : "gold",
        readings: [{ label: tx("وزن أسفل الحلقة الذي يوازنها", "Bottom-of-band weight that would balance it"), value: `${f1(s.shank * topHeavy(s))} g`, tone: "gold" }], checks: headChecks(s) }),
      draw: (sh, s) => {
        const v = sh.view({ x: 0, y: 0, w: sh.w, h: sh.h }), ink = sh.ink, t = topHeavy(s), lvl = headChecks(s)[0].level, tone = lvl === "fail" ? ink.warn : ink.gold;
        const r = s.base / (2 * Math.PI), a = (Math.min(Math.max(t - 1, 0), 3) / 3) * 1.2, co = Math.cos(a), si = Math.sin(a);
        const rot = (x: number, y: number): [number, number] => [x * co + y * si, -x * si + y * co];
        v.fit({ x0: -24, y0: -r - 8, x1: 24, y1: r + 20 }, 24); v.grid(); v.tag(tx("الخاتم على الإصبع من الأمام · ملم", "Ring on the finger, front view · mm"));
        v.fill(circlePts(0, 0, r), "rgba(200,170,150,0.16)"); v.stroke(circlePts(0, 0, r), { color: ink.muted, width: 1.2, close: true });
        v.section(circlePts(0, 0, r + 1.4), { stroke: tone, hatch: lvl === "fail" ? "#7a3a2c" : ink.goldDim }); v.fill(circlePts(0, 0, r), ink.sheet); v.fill(circlePts(0, 0, r), "rgba(200,170,150,0.16)"); v.stroke(circlePts(0, 0, r), { color: tone, width: 1.4, close: true });
        const hr = 1.5 + Math.sqrt(s.head) * 1.4, [hx, hy] = rot(0, r + 1.4 + s.headH), [bx, by] = rot(0, -(r + 0.8)), br = 0.8 + Math.sqrt(s.shank) * 0.9;
        v.stroke([rot(0, r + 1.4), [hx, hy]], { color: tone, width: 2 });
        v.fill(circlePts(hx, hy, hr), ink.sheet); v.stroke(circlePts(hx, hy, hr), { color: ink.stone, width: 1.6, close: true });
        v.fill(circlePts(bx, by, br), tone);
        v.sheet.text(tx("الواجهة", "top"), v.X(hx), v.Y(hy + hr) - 10, { size: 11.5, color: ink.stone, halo: true }); v.sheet.text(tx("ثقل أسفل الحلقة", "weight of the band's bottom"), v.X(bx), v.Y(by - br) + 13, { size: 11, color: tone, halo: true });
      },
      aria: (s) => tx(`واجهة وزنها ${f1(s.head)} غرام على ارتفاع ${f1(s.headH)} ملم، وأسفل الحلقة ${f1(s.shank)} غرام: نسبة الثقل ${f2(topHeavy(s))}.`, `A top weighing ${f1(s.head)} g at a height of ${f1(s.headH)} mm, and a band bottom of ${f1(s.shank)} g: weight ratio ${f2(topHeavy(s))}.`),
    },
  ],
  examples: [
    { id: "snug", station: "fit", origin: "book", ref: L3(2), title: tx("ورشة 1 · مفصل قريب من القاعدة", "Workshop 1 · knuckle close to the base"), says: tx("يعبر ويستقر", "passes and sits"),
      note: tx("إصبع مفصله 56 ملم وقاعدته 54. خاتم محيطه 55.5 ملم يعبر المفصل بضغطة خفيفة، ويبقى عند القاعدة بفراغ ملم ونصف لا يتركه يدور.", "A finger with a 56 mm knuckle and a 54 mm base. A ring 55.5 mm around passes the knuckle with a light push and sits at the base with a millimetre and a half of play — not enough to let it spin."), state: { knuckle: 56, base: 54, ring: 55.5 } },
    { id: "even", station: "fit", origin: "book", ref: L3(2), title: tx("ورشة 2 · إصبع مستقيم", "Workshop 2 · straight finger"), says: tx("المقاس مقاس القاعدة", "the size is the base size"),
      note: tx("إصبع مفصله لا يزيد على قاعدته إلا ملماً (53 و52). الخاتم بمحيط 52.5 ملم يعبر ويستقر دون فراغ يُذكر.", "A finger whose knuckle is only a millimetre bigger than its base (53 and 52). A ring 52.5 mm around passes and sits with hardly any play."), state: { knuckle: 53, base: 52, ring: 52.5 } },
    { id: "balanced", station: "head", origin: "book", ref: L3(2), title: tx("ورشة 1 · واجهة خفيفة منخفضة", "Workshop 1 · light, low top"), says: tx("متوازنة مع أسفل الحلقة", "balanced with the bottom of the band"),
      note: tx("واجهة وزنها غرامان ترتفع 4 ملم فوق الإصبع، وأسفل الحلقة 2.5 غرام. الثقلان متقاربان، فتبقى الواجهة فوق الإصبع.", "A top weighing two grams stands 4 mm above the finger, and the bottom of the band weighs 2.5 g. The two weights are close, so the top stays above the finger."), state: { head: 2, headH: 4, shank: 2.5, base: 54 } },
    { id: "counter", station: "head", origin: "book", ref: L3(2), title: tx("ورشة 2 · واجهة كبيرة وأسفل مسمَّك", "Workshop 2 · big top, thickened bottom"), says: tx("أسفل الحلقة يوازنها", "the bottom of the band balances it"),
      note: tx("واجهة وزنها 6 غرامات على ارتفاع 5 ملم تحتاج ما يوازنها: يُسمَّك أسفل الحلقة إلى 6 غرامات، وتُخفَّض الواجهة ما أمكن.", "A top weighing 6 g at a height of 5 mm needs something to balance it: the bottom of the band is thickened to 6 g, and the top is set as low as possible."), state: { head: 6, headH: 5, shank: 6, base: 54 } },
  ],
  guide: {
    models: [
      tx("الخاتم يعبر المفصل إذا لم يكن أضيق منه بأكثر من ملم واحد من المحيط، وهو ما يعطيه الجلد تحت الضغط.", "The ring passes the knuckle if it is no more than one millimetre of circumference smaller — that is what the skin gives under pressure."),
      tx("لماذا ملمتران وأربعة عند القاعدة: المقاس الياباني الواحد نحو ملم من المحيط. خاتم أوسع بمقاسين يدور، وأوسع بأربعة يسقط عند نفض اليد.", "Why two and four millimetres at the base: one Japanese size is about a millimetre of circumference. A ring two sizes too large spins; four sizes too large, it falls off when the hand is shaken."),
      tx("لماذا مرة ونصف وثلاث مرات للواجهة: حتى مرة ونصف يكفي احتكاك الحلقة بالإصبع ليمسكها، وفوق ثلاث لا يمسكها إلا خاتم محكم يضايق صاحبه.", "Why one and a half and three times for the top: up to one and a half, the band's friction on the finger is enough to hold it; above three, only a tight ring that bothers its wearer will hold it."),
      tx("عند قاعدة الإصبع: فراغ حتى ملمترين يُبقيه مستقراً، وفوق ذلك يدور.", "At the base of the finger: up to two millimetres of play keeps it sitting; beyond that it spins."),
      tx("ثقل الواجهة يُقارن بثقل أسفل الحلقة، وكل منهما مضروب في بُعده عن محور الإصبع.", "The weight of the top is compared with the weight of the band's bottom, each multiplied by its distance from the finger's axis."),
    ],
    notModeled: [
      tx("قياسات الإصبع نفسها: تُؤخذ من صاحب الخاتم.", "The finger measurements themselves: taken from the wearer."),
      tx("انتفاخ الإصبع وانكماشه مع الحر والبرد وساعات اليوم: يُقاس الإصبع أكثر من مرة.", "The finger swelling and shrinking with heat, cold and the time of day: measure the finger more than once."),
      tx("عرض الحلقة وشكل باطنها: الحلقة العريضة تُلبس أضيق من الرفيعة بالمقاس نفسه. وأثر الأصابع المجاورة في إسناد الواجهة.", "The band's width and the shape of its inside: a wide band is worn tighter than a narrow one of the same size. And how neighbouring fingers support the top."),
    ],
    sources: [tx("الفكرتان من «صياغة القرار»، الفصل الثاني.", "Both ideas come from “The Craft of Decision”, chapter 2.")],
  },
};
