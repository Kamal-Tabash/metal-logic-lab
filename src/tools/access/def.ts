import { tx as tr } from "../../core/i18n";
// م10 — tool access: the tip reaches, but does the body of the tool pass?
import type { Pt } from "../../core/cad/sheet";
import { L3, f1, f2, fail, mm, near, ok, type ToolDef } from "../../core/kit";
import type { Check } from "../../core/ui/controls";

export interface AccessState {
  gap: number; depth: number; tilt: number; tip: number; body: number; tipLen: number; // between two prongs
  wall: number; angle: number; dist: number;                                          // engraving near a shoulder
}
const rad = (d: number) => (d * Math.PI) / 180;

/**
 * A tool reaching the bottom centre of a slot `gap` wide and `depth` deep,
 * leaning `tilt` degrees. Its tip is `tip` wide for `tipLen`, then the body is
 * `body` wide. Returns the smallest room left between the tool and a wall (negative: it hits).
 */
export function slotClearance(s: Pick<AccessState, "gap" | "depth" | "tilt" | "tip" | "body" | "tipLen">): { room: number; tipOnly: number } {
  const c = Math.cos(rad(s.tilt)), sn = Math.sin(rad(s.tilt));
  const at = (dist: number, w: number) => s.gap / 2 - (dist * sn + w / 2 / c); // room at a distance along the tool
  const top = s.depth / c; // where the tool crosses the level of the prong tops
  const tipOnly = Math.min(at(0, s.tip), at(Math.min(top, s.tipLen), s.tip));
  const room = top > s.tipLen ? Math.min(tipOnly, at(s.tipLen, s.body), at(top, s.body)) : tipOnly;
  return { room, tipOnly };
}
/** The closest a tool held at `angle` to the surface can cut to a wall `wall` high before its body meets the wall's top edge. */
export const runOut = (wall: number, angle: number) => wall / Math.tan(rad(angle));

function slotChecks(s: AccessState): Check[] {
  const { room, tipOnly } = slotClearance(s);
  return [room >= 0.1 ? ok(tr(`الأداة تدخل وتعمل: يبقى بينها وبين المخلب ${f2(room)} ملم`, `The tool goes in and works: ${f2(room)} mm is left between it and the prong`))
    : room >= 0 ? near(tr(`الأداة تدخل بلا فراغ يُذكر (${f2(room)} ملم): تخدش المخلب المجاور`, `The tool goes in with almost no room (${f2(room)} mm): it will scratch the neighbouring prong`))
    : tipOnly >= 0 ? fail(tr("من هذه الجهة يصل رأس الأداة ويصطدم جسمها بالمخلب المجاور: غيّر الميل أو أطل الرأس أو ادخل من جهة أخرى", "From this side the tip reaches but the tool's body hits the neighbouring prong: change the tilt, use a longer tip, or come in from another side"))
    : fail(tr("من هذه الجهة لا يدخل رأس الأداة بين المخلبين بهذا الميل", "From this side the tip does not fit between the two prongs at this tilt"))];
}
function wallChecks(s: AccessState): Check[] {
  const need = runOut(s.wall, s.angle), room = s.dist - need;
  return [room >= 0.3 ? ok(tr(`الأداة تبلغ آخر الحرف: يبقى ${f1(room)} ملم قبل أن يلمس جسمها الكتف`, `The tool reaches the last letter: ${f1(room)} mm is left before its body touches the shoulder`))
    : room >= 0 ? near(tr("الأداة تبلغ آخر الحرف بصعوبة: جسمها يكاد يلمس الكتف", "The tool barely reaches the last letter: its body almost touches the shoulder"))
    : fail(tr(`جسم الأداة يصطدم بالكتف قبل آخر الحرف بـ ${f1(-room)} ملم`, `The tool's body hits the shoulder ${f1(-room)} mm before the last letter`))];
}

export const DEF: ToolDef<AccessState> = {
  id: "access", title: tr("وصول الأداة", "Tool Access"),
  defaults: { gap: 3, depth: 2.5, tilt: 10, tip: 0.8, body: 2.35, tipLen: 6, wall: 1.5, angle: 25, dist: 5 },
  stations: [
    {
      id: "slot", label: tr("بين مخلبين", "Between two prongs"),
      idea: { ref: L3(6), text: tr("الرسم يُري المكان فارغاً، والأداة لها رأس وجسم ويد تمسكها. قد يصل الرأس إلى موضع العمل ويصطدم الجسم بالمخلب المجاور، فلا يُصنع ما رُسم.", "The drawing shows empty space, but a tool has a tip, a body and a hand holding it. The tip may reach the working spot while the body hits the neighbouring prong — and what was drawn cannot be made.") },
      primary: { kind: "range", key: "tilt", label: tr("ميل الأداة", "Tool tilt"), min: 0, max: 60, step: 1, fmt: (v) => `${Math.round(v)}°`, hint: tr("زاوية ميل الأداة عن العمودي. حرّكه كما تميل يد الصائغ، وانظر متى يصطدم جسم الأداة بالمخلب.", "How far the tool leans from vertical. Move it the way a goldsmith's hand tilts, and watch for the moment the tool's body hits the prong.") },
      groups: [
        { title: tr("المكان", "The space"), controls: [
          { kind: "range", key: "gap", label: tr("المسافة بين المخلبين", "Gap between the two prongs"), min: 0.6, max: 8, step: 0.05, fmt: (v) => mm(v), hint: tr("الفتحة التي تدخل منها الأداة بين مخلبين متجاورين.", "The opening the tool enters through, between two neighbouring prongs.") },
          { kind: "range", key: "depth", label: tr("عمق موضع العمل تحت رؤوس المخالب", "Depth of the working spot below the prong tips"), min: 0.3, max: 8, step: 0.05, fmt: (v) => mm(v), hint: tr("كم ينزل الموضع الذي يجب أن تبلغه الأداة تحت رؤوس المخالب. الأعمق أصعب.", "How far below the prong tips the tool has to reach. Deeper is harder.") },
        ] },
        { title: tr("الأداة", "The tool"), controls: [
          { kind: "range", key: "tip", label: tr("قطر رأس الأداة", "Tip diameter"), min: 0.2, max: 3, step: 0.05, fmt: (v) => mm(v), hint: tr("قطر الجزء الذي يقطع، كرأس المثقاب أو الفريزة.", "Diameter of the cutting part, such as the head of a drill or burr.") },
          { kind: "range", key: "tipLen", label: tr("طول الرأس قبل أن يبدأ الجسم", "Tip length before the body starts"), min: 0.5, max: 15, step: 0.1, fmt: (v) => mm(v, 1), hint: tr("طول الجزء الرفيع من الأداة. بعده يبدأ الجسم الأغلظ.", "Length of the slim part of the tool. The thicker body starts after it.") },
          { kind: "range", key: "body", label: tr("قطر جسم الأداة", "Tool body diameter"), min: 1, max: 4, step: 0.05, fmt: (v) => mm(v), hint: tr("قطر ساق الأداة. ساق الفريزة المعتادة في يد الصائغ 2.35 ملم.", "Diameter of the tool's shank. The usual burr shank at the bench is 2.35 mm."), marks: [{ at: 2.35, label: "2.35", tone: "gold" }] },
        ] },
      ],
      result: (s) => { const { room } = slotClearance(s); return { label: tr("الفراغ بين الأداة والمخلب", "Room between tool and prong"), value: mm(room), fraction: Math.max(Math.min(room / (s.gap / 2), 1), 0), tone: room < 0 ? "warn" : "gold", checks: slotChecks(s) }; },
      draw: (sh, s) => {
        const v = sh.view({ x: 0, y: 0, w: sh.w, h: sh.h }), ink = sh.ink, lvl = slotChecks(s)[0].level, tone = lvl === "fail" ? ink.warn : ink.line;
        const g = s.gap / 2, pw = 1.2, len = Math.max(s.depth * 1.6 + 3, s.tipLen + 3);
        v.fit({ x0: -g - pw - 2.5, y0: -1.2, x1: g + pw + 2.5 + len * Math.sin(rad(s.tilt)), y1: len * Math.cos(rad(s.tilt)) + 0.5 }, 26); v.grid(); v.tag(tr("من الجانب · ملم", "Side view · mm"));
        v.section([[-g - pw - 1.5, -1], [g + pw + 1.5, -1], [g + pw + 1.5, 0], [-g - pw - 1.5, 0]], { stroke: ink.muted, hatch: ink.gridMajor, width: 1 });
        for (const k of [-1, 1]) v.section([[k * g, 0], [k * (g + pw), 0], [k * (g + pw), s.depth], [k * g, s.depth]], { stroke: ink.gold, hatch: ink.goldDim });
        const c = Math.cos(rad(s.tilt)), sn = Math.sin(rad(s.tilt));
        const pt = (d: number, off: number): Pt => [d * sn + off * c, d * c - off * sn];
        const a = s.tip / 2, b = s.body / 2, tl = Math.min(s.tipLen, len);
        v.fill([pt(0, -a), pt(tl, -a), pt(tl, -b), pt(len, -b), pt(len, b), pt(tl, b), pt(tl, a), pt(0, a)], lvl === "fail" ? "rgba(226,114,91,0.28)" : "rgba(212,215,220,0.14)");
        v.stroke([pt(0, -a), pt(tl, -a), pt(tl, -b), pt(len, -b), pt(len, b), pt(tl, b), pt(tl, a), pt(0, a)], { color: tone, width: 1.5, close: true });
        v.centerline(pt(-0.3, 0), pt(len + 0.3, 0));
        v.dimH(-g, g, s.depth, f2(s.gap), { off: -14, color: ink.muted });
        v.sheet.text(tr("موضع العمل", "working spot"), v.X(0), v.Y(0) + 13, { size: 11, color: ink.gold, halo: true });
      },
      aria: (s) => tr(`أداة مائلة ${Math.round(s.tilt)} درجة تدخل بين مخلبين بينهما ${f2(s.gap)} ملم إلى عمق ${f2(s.depth)} ملم، والفراغ الباقي ${f2(slotClearance(s).room)} ملم.`, `A tool tilted ${Math.round(s.tilt)} degrees enters between two prongs ${f2(s.gap)} mm apart to a depth of ${f2(s.depth)} mm, with ${f2(slotClearance(s).room)} mm of room left.`),
    },
    {
      id: "shoulder", label: tr("نقش قرب كتف", "Engraving near a shoulder"),
      idea: { ref: L3(6), text: tr("أداة النقش تُمسك مائلة على السطح، ويدها خلفها. إذا كُتب الاسم ملاصقاً لكتف مرتفع اصطدمت اليد بالكتف قبل أن يبلغ رأس الأداة آخر الحرف.", "A graver is held at a slant to the surface, with the hand behind it. If a name is written right up against a raised shoulder, the hand hits the shoulder before the tip reaches the last letter.") },
      primary: { kind: "range", key: "dist", label: tr("بُعد آخر حرف عن الكتف", "Distance from last letter to shoulder"), min: 0.3, max: 15, step: 0.1, fmt: (v) => mm(v, 1), hint: tr("المسافة بين نهاية الكتابة والكتف المرتفع بجانبها. حرّكه لتقرّب الكتابة من الكتف.", "The distance between the end of the lettering and the raised shoulder beside it. Move it to bring the lettering closer to the shoulder.") },
      groups: [{ title: tr("الكتف والأداة", "Shoulder and tool"), controls: [
        { kind: "range", key: "wall", label: tr("ارتفاع الكتف", "Shoulder height"), min: 0.2, max: 6, step: 0.05, fmt: (v) => mm(v), hint: tr("كم يرتفع الكتف فوق السطح المنقوش. الكتف الأعلى يطلب مسافة أبعد.", "How far the shoulder rises above the engraved surface. A higher shoulder needs more distance.") },
        { kind: "range", key: "angle", label: tr("ميل أداة النقش على السطح", "Graver angle to the surface"), min: 8, max: 70, step: 1, fmt: (v) => `${Math.round(v)}°`, hint: tr("الزاوية بين الأداة والسطح. اليد تنقش بميل قليل، ورفع الأداة يقرّبها من الكتف لكنه يصعّب القطع.", "The angle between the tool and the surface. The hand engraves at a low angle; raising the tool brings it closer to the shoulder but makes cutting harder.") },
      ] }],
      result: (s) => ({ label: tr("أقرب ما تبلغه الأداة من الكتف", "Closest the tool gets to the shoulder"), value: mm(runOut(s.wall, s.angle), 1), tone: wallChecks(s)[0].level === "fail" ? "warn" : "gold",
        readings: [{ label: tr("الفراغ الباقي", "Room left"), value: mm(s.dist - runOut(s.wall, s.angle), 1) }], checks: wallChecks(s) }),
      draw: (sh, s) => {
        const v = sh.view({ x: 0, y: 0, w: sh.w, h: sh.h }), ink = sh.ink, lvl = wallChecks(s)[0].level, tone = lvl === "fail" ? ink.warn : ink.line;
        const need = runOut(s.wall, s.angle), len = Math.max(s.wall / Math.sin(rad(s.angle)) + 4, 8);
        const tx = Math.max(s.dist, need * (lvl === "fail" ? 1 : 0)); // the tool stops where its body meets the shoulder
        const stop = lvl === "fail" ? need : s.dist;
        v.fit({ x0: -3, y0: -1.2, x1: Math.max(stop, tx) + len * Math.cos(rad(s.angle)) * 0 + 16, y1: Math.max(s.wall, len * Math.sin(rad(s.angle))) + 1 }, 26); v.grid(); v.tag(tr("من الجانب · ملم", "Side view · mm"));
        v.section([[-2.5, -1], [16, -1], [16, 0], [0, 0], [0, s.wall], [-2.5, s.wall]], { stroke: ink.gold, hatch: ink.goldDim });
        const c = Math.cos(rad(s.angle)), sn = Math.sin(rad(s.angle));
        // the tool lies toward the shoulder side: tip at `stop`, handle rising back over the shoulder
        v.stroke([[stop, 0], [stop - len * c, len * sn]], { color: tone, width: 4 });
        v.stroke([[s.dist, -0.25], [s.dist + 6, -0.25]], { color: ink.stone, width: 2 });
        v.sheet.text(tr("الكتابة", "lettering"), v.X(s.dist + 3), v.Y(-0.25) + 13, { size: 11, color: ink.stone, halo: true });
        v.dimH(0, s.dist, 0, f1(s.dist), { off: 26, color: ink.muted });
        v.dimV(0, s.wall, -2.5, f2(s.wall), { off: -14, color: ink.muted });
        if (lvl === "fail") v.sheet.text(tr("هنا تقف الأداة", "the tool stops here"), v.X(stop), v.Y(0) - 12, { size: 11, color: ink.warn, halo: true });
      },
      aria: (s) => tr(`كتابة تبعد ${f1(s.dist)} ملم عن كتف ارتفاعه ${f2(s.wall)} ملم، وأداة النقش مائلة ${Math.round(s.angle)} درجة تبلغ ${f1(runOut(s.wall, s.angle))} ملم منه.`, `Lettering ${f1(s.dist)} mm from a shoulder ${f2(s.wall)} mm high; a graver tilted ${Math.round(s.angle)} degrees gets to within ${f1(runOut(s.wall, s.angle))} mm of it.`),
    },
  ],
  examples: [
    { id: "open", station: "slot", origin: "book", ref: L3(6), title: tr("ورشة 1 · رأس بأربعة مخالب متباعدة", "Workshop 1 · head with four well-spaced prongs"), says: tr("الأداة تدخل قائمة", "The tool goes in upright"),
      note: tr("مخلبان بينهما 3 ملم، والموضع على عمق 2.5 ملم. فريزة رأسها 0.8 ملم تدخل شبه قائمة ويبقى حولها فراغ.", "Two prongs 3 mm apart, with the working spot 2.5 mm down. A burr with a 0.8 mm tip goes in almost upright with room around it."), state: { gap: 3, depth: 2.5, tilt: 10, tip: 0.8, body: 2.35, tipLen: 6 } },
    { id: "long", station: "slot", origin: "book", ref: L3(6), title: tr("ورشة 2 · فتحة ضيقة برأس طويل رفيع", "Workshop 2 · narrow gap, long slim tip"), says: tr("الجسم يبقى خارج الفتحة", "The body stays outside the gap"),
      note: tr("فتحة 1.6 ملم بعمق 3 ملم. الحل رأس رفيع (0.6 ملم) أطول من العمق، فيبقى جسم الأداة الغليظ فوق رؤوس المخالب ولا يصطدم.", "A 1.6 mm gap, 3 mm deep. The answer is a slim tip (0.6 mm) longer than the depth, so the tool's thick body stays above the prong tips and never hits."), state: { gap: 1.6, depth: 3, tilt: 5, tip: 0.6, body: 2.35, tipLen: 5 } },
    { id: "far", station: "shoulder", origin: "book", ref: L3(6), title: tr("ورشة 1 · اسم بعيد عن الكتف", "Workshop 1 · a name well away from the shoulder"), says: tr("خمسة ملمترات تكفي", "Five millimetres is enough"),
      note: tr("كتف ارتفاعه 1.5 ملم، وأداة النقش مائلة 25 درجة. الكتابة تنتهي على 5 ملم منه، فتبلغ الأداة آخر حرف دون أن تلمس الكتف.", "A shoulder 1.5 mm high and a graver tilted 25 degrees. The lettering ends 5 mm away, so the tool reaches the last letter without touching the shoulder."), state: { wall: 1.5, angle: 25, dist: 5 } },
    { id: "low", station: "shoulder", origin: "book", ref: L3(6), title: tr("ورشة 2 · كتف منخفض", "Workshop 2 · low shoulder"), says: tr("الكتابة تقترب", "The lettering moves closer"),
      note: tr("إذا خُفض الكتف إلى نصف ملم أمكن أن تقترب الكتابة منه إلى ملمترين بالميل نفسه.", "Lower the shoulder to half a millimetre and the lettering can come within two millimetres of it at the same tilt."), state: { wall: 0.5, angle: 25, dist: 2 } },
  ],
  guide: {
    models: [
      tr("الأداة ساق لها رأس رفيع بطول معيّن ثم جسم أغلظ. تُحسب المسافة بينها وبين المخلب عند رؤوس المخالب وعند بداية الجسم.", "The tool is a shank with a slim tip of a given length, then a thicker body. The distance between it and the prong is worked out at the prong tips and where the body starts."),
      tr("الأخضر حين يبقى عُشر ملم على الأقل بين الأداة والمخلب، والأحمر حين يصطدم الرأس أو الجسم.", "Green when at least a tenth of a millimetre is left between tool and prong; red when the tip or the body hits."),
      tr("قرب الكتف: أقرب موضع تبلغه أداة مائلة = ارتفاع الكتف ÷ ظل زاوية ميلها.", "Near a shoulder: the closest spot a tilted tool can reach = shoulder height ÷ tangent of its angle."),
    ],
    notModeled: [
      tr("الرسم جهة دخول واحدة. اليد الماهرة قد تجد جهة أخرى بين مخلبين آخرين، فجرّب كل جهة بأرقامها.", "The drawing shows one direction of entry. A skilled hand may find another between two other prongs, so try each direction with its own numbers."),
      tr("مراحل العمل الثلاث (قبل المقعد، وأثناء تشكيل المخلب، وبعد التثبيت) تُجرَّب بتغيير الأرقام لكل مرحلة.", "The three stages of work (before the seat, while shaping the prong, and after setting) are tried by changing the numbers for each stage."),
      tr("لماذا عُشر ملم بين الأداة والمخلب: أقل منه تخدش الأداة المخلب مع اهتزاز اليد. ولماذا ثلاثة أعشار قرب الكتف: ليبقى لليد مجال تنهي به الحرف.", "Why a tenth of a millimetre between tool and prong: with less, the tool scratches the prong as the hand trembles. Why three tenths near the shoulder: so the hand has room to finish the letter."),
    ],
    sources: [tr("الفكرة من «صياغة القرار»، الفصل السادس. وقطر ساق الفريزة 2.35 ملم مقاس معتاد في أدوات الصاغة.", "The idea comes from “The Craft of Decision”, chapter 6. The 2.35 mm burr shank is a standard size in goldsmiths' tools.")],
  },
};
