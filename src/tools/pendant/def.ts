import { tx } from "../../core/i18n";
// م11 — the pendant under its own weight: where it hangs from, and the play in its hinge.
import { circlePts, type Pt } from "../../core/cad/sheet";
import { L2, L3, f1, f2, fail, mm, near, ok, pct, sortChecks, type ToolDef } from "../../core/kit";
import type { Check } from "../../core/ui/controls";

export interface PendantState {
  bail: number; drop: number; stone: number; stoneX: number; // hanging
  fwd: number; bailZ: number;                                  // tipping forward (side view)
  clear: number; hinge: number; made: "pin" | "print";         // hinge
}
const deg = (r: number) => (r * 180) / Math.PI;
/** The pendant turns until its centre of mass sits under the bail. Positive: the stone side drops. */
export function tilt(s: Pick<PendantState, "bail" | "drop" | "stone" | "stoneX">): number {
  const comX = s.stone * s.stoneX; // the plain body is centred; the stone's share pulls the centre toward it
  return deg(Math.atan2(comX - s.bail, s.drop));
}
/** How far a hinge of length `hinge` can rock when the pin is `clear` thinner than its tube. */
export const wobble = (clear: number, hinge: number) => deg(Math.atan2(clear, hinge));
/** Seen from the side: the pendant leans until its centre of mass, `fwd` in front of the plate, sits under the bail. Positive: the face tips down. */
export const pitch = (s: Pick<PendantState, "fwd" | "bailZ" | "drop">) => deg(Math.atan2(s.fwd - s.bailZ, s.drop));
export const PRINT_MIN = 0.25;

function hangChecks(s: PendantState): Check[] {
  const a = Math.abs(tilt(s));
  return [a <= 2 ? ok(tx(`التعليقة تتدلى مستقيمة (ميل ${f1(a)}°)`, `The pendant hangs straight (${f1(a)}° tilt)`)) : a <= 5 ? near(tx(`التعليقة تميل ${f1(a)}°: يلحظها من يدقق`, `The pendant tilts ${f1(a)}°: a careful eye will notice`)) : fail(tx(`التعليقة تميل ${f1(a)}° نحو الجهة الأثقل`, `The pendant tilts ${f1(a)}° toward the heavier side`))];
}
function pitchChecks(s: PendantState): Check[] {
  const a = pitch(s), m = Math.abs(a);
  return [m <= 2 ? ok(tx(`الواجهة تبقى قائمة (ميل ${f1(m)}°)`, `The face stays upright (${f1(m)}° tilt)`)) : m <= 5 ? near(tx(`الواجهة تميل ${f1(m)}° ${a > 0 ? "إلى الأمام" : "إلى الخلف"}`, `The face tilts ${f1(m)}° ${a > 0 ? "forward" : "backward"}`)) : fail(a > 0 ? tx(`الواجهة تنكفئ إلى الأمام ${f1(m)}°: تنظر إلى الأرض لا إلى الناظر`, `The face tips forward ${f1(m)}°: it looks at the ground, not at the viewer`) : tx(`الواجهة تميل إلى الخلف ${f1(m)}°: تنظر إلى الأعلى`, `The face tilts backward ${f1(m)}°: it looks upward`))];
}
function hingeChecks(s: PendantState): Check[] {
  const w = wobble(s.clear, s.hinge), list: Check[] = [];
  if (s.made === "print") list.push(s.clear < PRINT_MIN - 1e-9 ? fail(tx(`خلوص ${f2(s.clear)} ملم أقل من ${PRINT_MIN}: الجزآن يلتحمان في الطباعة`, `A clearance of ${f2(s.clear)} mm is less than ${PRINT_MIN}: the two parts fuse in printing`)) : ok(tx(`خلوص ${f2(s.clear)} ملم يكفي ليخرج الجزآن منفصلين من الطباعة`, `A clearance of ${f2(s.clear)} mm is enough for the two parts to print separately`)));
  else list.push(s.clear < 0.03 - 1e-9 ? fail(tx("لا خلوص يُذكر: المسمار لا يدخل أو لا يدور", "Hardly any clearance: the pin will not go in or will not turn")) : ok(tx(`خلوص ${f2(s.clear)} ملم يترك المسمار يدور`, `A clearance of ${f2(s.clear)} mm lets the pin turn`)));
  list.push(w > 6 ? fail(tx(`المفصل يتأرجح ${f1(w)}°: رخو من أول يوم`, `The hinge wobbles ${f1(w)}°: loose from day one`)) : w > 3 ? near(tx(`المفصل يتأرجح ${f1(w)}°، ويزيد مع التآكل`, `The hinge wobbles ${f1(w)}°, and more as it wears`)) : ok(tx(`المفصل يتأرجح ${f1(w)}° فقط`, `The hinge wobbles only ${f1(w)}°`)));
  return sortChecks(list);
}

export const DEF: ToolDef<PendantState> = {
  id: "pendant", title: tx("توازن التعليقة", "Pendant Balance"),
  defaults: { bail: 0, drop: 12, stone: 0.3, stoneX: 0, fwd: 0.3, bailZ: 0, clear: 0.1, hinge: 6, made: "pin" },
  stations: [
    {
      id: "hang", label: tx("موضع العروة", "Bail position"),
      idea: { ref: L3(7), text: tx("التعليقة لا تتدلى كما رُسمت، بل كما يقرر وزنها: تدور حتى يصير مركز ثقلها تحت العروة تماماً. حجر في جهة واحدة يسحبها نحوه إن لم تتحرك العروة معه.", "A pendant does not hang the way it was drawn, but the way its weight decides: it turns until its centre of gravity is exactly under the bail. A stone on one side pulls it that way unless the bail moves with it.") },
      primary: { kind: "range", key: "bail", label: tx("موضع العروة عن الوسط", "Bail offset from centre"), min: -10, max: 10, step: 0.1, fmt: (v) => `${v >= 0 ? "+" : "−"}${f1(Math.abs(v))} mm`, hint: tx("أين تُلحم العروة على الحافة العليا: في الوسط (صفر) أو مزاحة نحو اليمين أو اليسار. حرّكه حتى تستقيم التعليقة.", "Where the bail is soldered on the top edge: at the centre (zero) or shifted right or left. Move it until the pendant hangs straight.") },
      groups: [{ title: tx("الوزن", "The weight"), controls: [
        { kind: "range", key: "stoneX", label: tx("موضع الحجر عن الوسط", "Stone offset from centre"), min: -12, max: 12, step: 0.1, fmt: (v) => `${v >= 0 ? "+" : "−"}${f1(Math.abs(v))} mm`, hint: tx("أين يقع الحجر، أو أي جزء ثقيل، يميناً أو يساراً من وسط التعليقة.", "Where the stone, or any heavy part, sits to the right or left of the pendant's centre.") },
        { kind: "range", key: "stone", label: tx("نصيب الحجر من وزن التعليقة", "Stone's share of the pendant's weight"), min: 0, max: 0.8, step: 0.01, fmt: (v) => pct(v), hint: tx("أي جزء من وزن التعليقة كله في الحجر وما يحمله. الحجر الأثقل يسحب مركز الثقل نحوه أكثر.", "What share of the pendant's whole weight is in the stone and its setting. A heavier stone pulls the centre of gravity further toward itself.") },
        { kind: "range", key: "drop", label: tx("عمق مركز الثقل تحت العروة", "Depth of the centre of gravity below the bail"), min: 2, max: 40, step: 0.5, fmt: (v) => mm(v, 1), hint: tx("المسافة من العروة نزولاً إلى مركز ثقل التعليقة. التعليقة الطويلة تميل أقل بالإزاحة نفسها.", "The distance from the bail down to the pendant's centre of gravity. A long pendant tilts less for the same offset.") },
      ] }],
      result: (s) => ({ label: tx("ميل التعليقة", "Pendant tilt"), value: `${f1(Math.abs(tilt(s)))}°`, fraction: Math.min(Math.abs(tilt(s)) / 20, 1), tone: hangChecks(s)[0].level === "fail" ? "warn" : "gold",
        readings: [{ label: tx("مركز الثقل عن الوسط", "Centre of gravity from centre"), value: mm(s.stone * s.stoneX, 1) }, { label: tx("موضع العروة الذي يقيمها", "Bail position that straightens it"), value: mm(s.stone * s.stoneX, 1), tone: "gold" }], checks: hangChecks(s) }),
      draw: (sh, s) => {
        const v = sh.view({ x: 0, y: 0, w: sh.w, h: sh.h }), ink = sh.ink, lvl = hangChecks(s)[0].level, tone = lvl === "fail" ? ink.warn : ink.gold;
        const a = (-tilt(s) * Math.PI) / 180, H = Math.max(s.drop * 2, 16), W = 26, top = 0;
        // drawn in the pendant's own frame (bail at the origin), then turned by the tilt
        const rot = ([x, y]: Pt): Pt => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
        const P = (x: number, y: number): Pt => rot([x - s.bail, y]);
        v.fit({ x0: -W, y0: -H - 6, x1: W, y1: 9 }, 26); v.grid(); v.tag(tx("التعليقة من الأمام · ملم", "Pendant from the front · mm"));
        v.stroke([[0, 8], [0, 0]], { color: ink.muted, width: 1.4 }); v.centerline([0, 1], [0, -H - 4]);
        v.section([P(-13, top), P(13, top), P(13, top - H), P(-13, top - H)], { stroke: tone, hatch: lvl === "fail" ? "#7a3a2c" : ink.goldDim });
        const sr = 1.5 + 4 * Math.sqrt(s.stone), sc = P(Math.max(Math.min(s.stoneX, 12), -12), -s.drop);
        if (s.stone > 0.01) { v.fill(circlePts(sc[0], sc[1], sr), ink.sheet); v.stroke(circlePts(sc[0], sc[1], sr), { color: ink.stone, width: 1.5, close: true }); }
        const com = P(s.stone * s.stoneX, -s.drop);
        v.stroke(circlePts(com[0], com[1], 0.7), { color: ink.line, width: 1.5, close: true }); v.sheet.text(tx("مركز الثقل", "centre of gravity"), v.X(com[0]) + 8, v.Y(com[1]) + 14, { size: 11, color: ink.line, align: "left", halo: true });
        v.stroke(circlePts(0, 0.9, 0.9), { color: ink.gold, width: 1.6, close: true }); v.sheet.text(tx("العروة", "bail"), v.X(0) + 10, v.Y(1.5), { size: 11, color: ink.gold, align: "left", halo: true });
      },
      aria: (s) => tx(`تعليقة عروتها مزاحة ${f1(s.bail)} ملم وحجرها مزاح ${f1(s.stoneX)} ملم، تميل ${f1(Math.abs(tilt(s)))} درجة.`, `A pendant with its bail shifted ${f1(s.bail)} mm and its stone shifted ${f1(s.stoneX)} mm tilts ${f1(Math.abs(tilt(s)))} degrees.`),
    },
    {
      id: "pitch", label: tx("الانكفاء للأمام", "Tipping forward"),
      idea: { ref: L3(7), text: tx("الحجر البارز والمعدن المتراكم في الوجه يحملان الثقل إلى الأمام، خارج المستوى الذي تمر به العروة. فتدور التعليقة حول عروتها وتنكفئ على وجهها، مع أنها من الأمام تبدو مستقيمة.", "A raised stone and metal built up on the face carry the weight forward, out of the plane the bail passes through. So the pendant turns about its bail and tips onto its face — even though from the front it looks straight.") },
      primary: { kind: "range", key: "fwd", label: tx("بروز مركز الثقل إلى الأمام", "How far forward the centre of gravity sits"), min: 0, max: 8, step: 0.05, fmt: (v) => mm(v), hint: tx("كم يتقدم ثقل التعليقة أمام مستوى ظهرها: حجر عالٍ أو قفص عميق أو وجه سميك يزيده. حرّكه وانظر الواجهة تنكفئ.", "How far the pendant's weight sits in front of the plane of its back: a tall stone, a deep basket or a thick face increases it. Move it and watch the face tip over.") },
      groups: [{ title: tx("العروة", "The bail"), controls: [
        { kind: "range", key: "bailZ", label: tx("تقدّم العروة إلى الأمام", "How far forward the bail sits"), min: 0, max: 8, step: 0.05, fmt: (v) => mm(v), hint: tx("كم تتقدم نقطة تعليق العروة عن ظهر التعليقة. إذا صارت فوق مركز الثقل استقامت الواجهة.", "How far the bail's hanging point sits in front of the pendant's back. Once it is above the centre of gravity, the face straightens.") },
        { kind: "range", key: "drop", label: tx("عمق مركز الثقل تحت العروة", "Depth of the centre of gravity below the bail"), min: 2, max: 40, step: 0.5, fmt: (v) => mm(v, 1), hint: tx("المسافة من العروة نزولاً إلى مركز الثقل. التعليقة القصيرة تنكفئ أكثر بالبروز نفسه.", "The distance from the bail down to the centre of gravity. A short pendant tips more for the same projection.") },
      ] }],
      result: (s) => ({ label: tx("ميل الواجهة إلى الأمام", "Forward tilt of the face"), value: `${f1(Math.abs(pitch(s)))}°`, fraction: Math.min(Math.abs(pitch(s)) / 20, 1), tone: pitchChecks(s)[0].level === "fail" ? "warn" : "gold",
        readings: [{ label: tx("تقدّم العروة الذي يقيمها", "Bail position that straightens it"), value: mm(s.fwd), tone: "gold" }], checks: pitchChecks(s) }),
      draw: (sh, s) => {
        const v = sh.view({ x: 0, y: 0, w: sh.w, h: sh.h }), ink = sh.ink, lvl = pitchChecks(s)[0].level, tone = lvl === "fail" ? ink.warn : ink.gold;
        const a = (-pitch(s) * Math.PI) / 180, H = Math.max(s.drop * 2, 16), t = 2; // it turns until the centre of mass is under the bail
        const rot = ([x, y]: Pt): Pt => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
        const P = (x: number, y: number): Pt => rot([x - s.bailZ, y]); // x: forward from the back face; the bail at the origin
        v.fit({ x0: -H * 0.75, y0: -H - 6, x1: H * 0.75, y1: 9 }, 26); v.grid(); v.tag(tx("التعليقة من الجانب · ملم", "Pendant from the side · mm"));
        v.stroke([[0, 8], [0, 0]], { color: ink.muted, width: 1.4 }); v.centerline([0, 1], [0, -H - 4]);
        v.section([P(0, 0), P(t, 0), P(t, -H), P(0, -H)], { stroke: tone, hatch: lvl === "fail" ? "#7a3a2c" : ink.goldDim });
        const bulge = Math.max(s.fwd * 2 - t, 0.4), c = P(t, -s.drop), b = P(t + bulge, -s.drop), u = P(t, -s.drop + 3.5), d2 = P(t, -s.drop - 3.5);
        v.fill([u, b, d2], "rgba(143,168,200,0.2)"); v.stroke([u, b, d2], { color: ink.stone, width: 1.5, close: true });
        const com = P(s.fwd, -s.drop);
        v.stroke(circlePts(com[0], com[1], 0.7), { color: ink.line, width: 1.5, close: true }); v.sheet.text(tx("مركز الثقل", "centre of gravity"), v.X(com[0]) + 8, v.Y(com[1]) + 14, { size: 11, color: ink.line, align: "left", halo: true });
        v.stroke(circlePts(0, 0.9, 0.9), { color: ink.gold, width: 1.6, close: true });
        v.sheet.text(tx("الوجه ←", "face ←"), v.X(c[0]) + 30, v.Y(-H) + 14, { size: 11, color: ink.muted, align: "left", halo: true });
        v.sheet.text(tx("الصدر", "chest"), v.X(-H * 0.6), v.Y(-H / 2), { size: 11, color: ink.muted, halo: true });
      },
      aria: (s) => tx(`تعليقة من الجانب: ثقلها يتقدم ${f2(s.fwd)} ملم وعروتها تتقدم ${f2(s.bailZ)} ملم، فتميل واجهتها ${f1(Math.abs(pitch(s)))} درجة.`, `Pendant from the side: its weight sits ${f2(s.fwd)} mm forward and its bail ${f2(s.bailZ)} mm forward, so its face tilts ${f1(Math.abs(pitch(s)))} degrees.`),
    },
    {
      id: "hinge", label: tx("خلوص المفصل", "Hinge clearance"),
      idea: { ref: L2(7, tx("حالة على طاولة العمل", "A case on the bench")), text: tx("المسمار يحتاج فراغاً صغيراً في أنبوبه ليدور. هذا الفراغ نفسه يترك المفصل يتأرجح، وكلما قصر المفصل كبر تأرجحه، ثم يتسع مع التآكل.", "A pin needs a little room in its tube to turn. That same room lets the hinge wobble; the shorter the hinge, the bigger the wobble — and it widens with wear.") },
      primary: { kind: "range", key: "clear", label: tx("الخلوص بين المسمار والأنبوب", "Clearance between pin and tube"), min: 0.01, max: 0.8, step: 0.01, fmt: (v) => mm(v), hint: tx("الفرق بين قطر المسمار وقطر الثقب الذي يدور فيه. حرّكه وانظر كم يتأرجح المفصل.", "The difference between the pin's diameter and the hole it turns in. Move it and see how much the hinge wobbles."), marks: [{ at: 0.25, label: "0.25", tone: "gold" }] },
      groups: [{ title: tx("المفصل", "The hinge"), controls: [
        { kind: "range", key: "hinge", label: tx("طول المفصل", "Hinge length"), min: 1.5, max: 25, step: 0.1, fmt: (v) => mm(v, 1), hint: tx("طول الأنبوب الذي يمر فيه المسمار. المفصل الأطول يتأرجح أقل بالخلوص نفسه.", "Length of the tube the pin passes through. A longer hinge wobbles less for the same clearance.") },
        { kind: "seg", key: "made", label: tx("كيف يُصنع؟", "How is it made?"), options: [{ value: "pin", label: tx("يُركَّب بمسمار", "Assembled with a pin") }, { value: "print", label: tx("يُطبع قطعة واحدة", "Printed in one piece") }], hint: tx("الأجزاء المتحركة التي تُطبع معاً تحتاج خلوصاً لا يقل عن ربع ملم حتى لا تلتحم. المفصل المركَّب بمسمار يقبل خلوصاً أضيق.", "Moving parts printed together need a clearance of at least a quarter of a millimetre so they do not fuse. A hinge assembled with a pin accepts a tighter clearance.") },
      ] }],
      result: (s) => ({ label: tx("تأرجح المفصل", "Hinge wobble"), value: `${f1(wobble(s.clear, s.hinge))}°`, fraction: Math.min(wobble(s.clear, s.hinge) / 10, 1), tone: hingeChecks(s)[0].level === "fail" ? "warn" : "gold",
        readings: [{ label: tx("بعد أن يتسع الخلوص عُشر ملم بالتآكل", "After wear widens the clearance by a tenth of a millimetre"), value: `${f1(wobble(s.clear + 0.1, s.hinge))}°` }], checks: hingeChecks(s) }),
      draw: (sh, s) => {
        const v = sh.view({ x: 0, y: 0, w: sh.w, h: sh.h }), ink = sh.ink, lvl = hingeChecks(s)[0].level, tone = lvl === "fail" ? ink.warn : ink.gold;
        const L = s.hinge, k = 4, c = s.clear * k, r = 0.6; // clearance drawn four times larger
        v.fit({ x0: -L / 2 - 2.5, y0: -3.2, x1: L / 2 + 2.5, y1: 3.2 }, 26); v.grid(); v.tag(tx("مقطع في المفصل · الخلوص مكبّر أربع مرات", "Section through the hinge · clearance enlarged four times"));
        v.section([[-L / 2, r + c / 2], [L / 2, r + c / 2], [L / 2, r + c / 2 + 0.9], [-L / 2, r + c / 2 + 0.9]], { stroke: ink.gold, hatch: ink.goldDim });
        v.section([[-L / 2, -r - c / 2 - 0.9], [L / 2, -r - c / 2 - 0.9], [L / 2, -r - c / 2], [-L / 2, -r - c / 2]], { stroke: ink.gold, hatch: ink.goldDim });
        const a = Math.atan2(c, L), co = Math.cos(a), si = Math.sin(a), pin = (x: number, y: number): Pt => [x * co - y * si, x * si + y * co];
        v.fill([pin(-L / 2 - 1.5, -r), pin(L / 2 + 1.5, -r), pin(L / 2 + 1.5, r), pin(-L / 2 - 1.5, r)], lvl === "fail" ? "rgba(226,114,91,0.3)" : "rgba(212,215,220,0.2)");
        v.stroke([pin(-L / 2 - 1.5, -r), pin(L / 2 + 1.5, -r), pin(L / 2 + 1.5, r), pin(-L / 2 - 1.5, r)], { color: tone, width: 1.5, close: true });
        v.sheet.text(tx("المسمار", "pin"), v.X(0), v.Y(0), { size: 11.5, color: ink.line, halo: true }); v.sheet.text(tx("الأنبوب", "tube"), v.X(0), v.Y(r + c / 2 + 0.45), { size: 11, color: ink.gold, halo: true });
        v.dimH(-L / 2, L / 2, -r - c / 2 - 0.9, f1(L), { off: 22, color: ink.muted });
      },
      aria: (s) => tx(`مفصل طوله ${f1(s.hinge)} ملم بخلوص ${f2(s.clear)} ملم يتأرجح ${f1(wobble(s.clear, s.hinge))} درجة.`, `A hinge ${f1(s.hinge)} mm long with ${f2(s.clear)} mm of clearance wobbles ${f1(wobble(s.clear, s.hinge))} degrees.`),
    },
  ],
  examples: [
    { id: "centre", station: "hang", origin: "book", ref: L3(7), title: tx("ورشة 1 · حجر في الوسط وعروة في الوسط", "Workshop 1 · stone at centre, bail at centre"), says: tx("تتدلى مستقيمة", "hangs straight"),
      note: tx("تعليقة متناظرة: الحجر في وسطها والعروة فوقه. مركز الثقل تحت العروة تماماً، فتتدلى كما رُسمت.", "A symmetrical pendant: the stone at its centre and the bail above it. The centre of gravity is exactly under the bail, so it hangs as drawn."), state: { bail: 0, stoneX: 0, stone: 0.3, drop: 12 } },
    { id: "moved", station: "hang", origin: "book", ref: L3(7), title: tx("ورشة 2 · حجر جانبي وعروة تتبعه", "Workshop 2 · stone to one side, bail follows"), says: tx("العروة فوق مركز الثقل", "bail above the centre of gravity"),
      note: tx("حجر يحمل 40٪ من الوزن ومزاح 6 ملم عن الوسط يسحب مركز الثقل 2.4 ملم. تُنقل العروة إلى الموضع نفسه فتستقيم التعليقة.", "A stone carrying 40% of the weight, 6 mm off centre, pulls the centre of gravity 2.4 mm. Move the bail to the same spot and the pendant hangs straight."), state: { bail: 2.4, stoneX: 6, stone: 0.4, drop: 12 } },
    { id: "flat", station: "pitch", origin: "book", ref: L3(7), title: tx("ورشة 1 · صفيحة مسطحة", "Workshop 1 · flat plate"), says: tx("تبقى قائمة", "stays upright"),
      note: tx("تعليقة مسطحة ثقلها في مستوى ظهرها تقريباً (0.3 ملم)، وعروتها عند الظهر. لا شيء يسحبها إلى الأمام، فتبقى واجهتها قائمة.", "A flat pendant with its weight almost in the plane of its back (0.3 mm) and its bail at the back. Nothing pulls it forward, so its face stays upright."), state: { fwd: 0.3, bailZ: 0, drop: 12 } },
    { id: "forward", station: "pitch", origin: "book", ref: L3(7), title: tx("ورشة 2 · حجر بارز وعروة متقدمة", "Workshop 2 · raised stone, bail brought forward"), says: tx("العروة فوق مركز الثقل", "bail above the centre of gravity"),
      note: tx("حجر بارز يحمل مركز الثقل 2.5 ملم إلى الأمام. تُقدَّم العروة 2.5 ملم لتصير فوقه، فتستقيم الواجهة.", "A raised stone carries the centre of gravity 2.5 mm forward. Bring the bail 2.5 mm forward so it sits above it, and the face straightens."), state: { fwd: 2.5, bailZ: 2.5, drop: 12 } },
    { id: "pinned", station: "hinge", origin: "book", ref: L2(7, tx("حالة على طاولة العمل", "A case on the bench")), title: tx("ورشة 1 · مفصل طويل بمسمار محكم", "Workshop 1 · long hinge with a snug pin"), says: tx("خلوص عُشر ملم", "a tenth of a millimetre of clearance"),
      note: tx("مفصل طوله 6 ملم بمسمار خلوصه عُشر ملم. يدور بسهولة ويتأرجح أقل من درجة.", "A hinge 6 mm long with a pin at a tenth of a millimetre of clearance. It turns easily and wobbles less than a degree."), state: { clear: 0.1, hinge: 6, made: "pin" } },
    { id: "printed", station: "hinge", origin: "book", ref: L2(7), title: tx("ورشة 2 · مفصل مطبوع قطعة واحدة", "Workshop 2 · hinge printed in one piece"), says: tx("خلوص ربع ملم ومفصل أطول", "quarter-millimetre clearance, longer hinge"),
      note: tx("المفصل المطبوع يحتاج خلوص ربع ملم حتى لا يلتحم جزآه. يُطال المفصل إلى 10 ملم ليبقى تأرجحه صغيراً رغم الخلوص الواسع.", "A printed hinge needs a quarter of a millimetre of clearance so its two parts do not fuse. The hinge is lengthened to 10 mm to keep the wobble small despite the wide clearance."), state: { clear: 0.25, hinge: 10, made: "print" } },
  ],
  guide: {
    models: [
      tx("التعليقة تدور حتى يقع مركز ثقلها تحت العروة. زاوية ميلها تُحسب من بُعد مركز الثقل عن العروة أفقياً وعمقه تحتها.", "The pendant turns until its centre of gravity lies under the bail. Its tilt angle is worked out from how far the centre of gravity is from the bail horizontally and how deep it lies below it."),
      tx("الحساب نفسه يجري في اتجاهين: يميناً ويساراً (موضع العروة)، وأماماً وخلفاً (الانكفاء). التعليقة قد تستقيم في الأول وتنكفئ في الثاني.", "The same sum runs in two directions: right and left (bail position), and front and back (tipping). A pendant may hang straight in the first and tip in the second."),
      tx("جسم التعليقة يُعدّ متناظراً، والحجر يسحب مركز الثقل نحوه بقدر نصيبه من الوزن.", "The pendant's body is taken as symmetrical, and the stone pulls the centre of gravity toward itself in proportion to its share of the weight."),
      tx("لماذا درجتان وخمس: العين تقارن التعليقة بخط السلسلة العمودي، فلا تلحظ ميلاً تحت درجتين، وتراه عيباً فوق خمس.", "Why two degrees and five: the eye compares the pendant with the vertical line of the chain; it does not notice a tilt under two degrees, and sees one over five as a flaw."),
      tx("لماذا ثلاث درجات وست للمفصل: تحت ثلاث يبدو المفصل محكماً، وفوق ست يُحَس رخواً باليد ويُسمع.", "Why three degrees and six for the hinge: under three the hinge seems snug; over six it feels loose in the hand and can be heard."),
      tx("تأرجح المفصل = الخلوص ÷ طول المفصل (كزاوية). والأجزاء المتحركة المطبوعة معاً تحتاج خلوصاً لا يقل عن 0.25 ملم.", "Hinge wobble = clearance ÷ hinge length (as an angle). Moving parts printed together need a clearance of at least 0.25 mm."),
    ],
    notModeled: [
      tx("جسم غير متناظر، والسلسلة وشدّها، واحتكاك العروة.", "An asymmetrical body, the chain and its pull, and friction at the bail."),
      tx("شدّ السلسلة على العنق وحركة الجسد: التعليقة تتأرجح حول الوضع المحسوب.", "The pull of the chain on the neck and the movement of the body: the pendant swings around the calculated position."),
      tx("سرعة اتساع الخلوص بالتآكل: تُرى في أداة «مواضع التآكل».", "How fast the clearance widens with wear: see the “Wear Points” tool."),
    ],
    sources: [tx("موضع العروة وتوزيع الكتلة من «صياغة القرار»، الفصل السابع. وخلوص الطباعة 0.25 ملم والمفصل المتأرجح من «حدود المادة»، الفصل السابع وحالته.", "Bail position and mass distribution come from “The Craft of Decision”, chapter 7. The 0.25 mm printing clearance and the wobbling hinge come from “The Limits of Material”, chapter 7 and its case.")],
  },
};
