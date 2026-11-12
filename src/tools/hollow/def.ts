import { tx } from "../../core/i18n";
// م3 — the hollow bangle: how much lighter, and how thin the wall gets.
import type { Sheet } from "../../core/cad/sheet";
import { circlePts } from "../../core/cad/sheet";
import { ENGRAVE, METAL_OPTS, metalById } from "../../core/data";
import { L2, f1, f2, fail, mm, near, ok, pct, sortChecks, type ToolDef } from "../../core/kit";
import type { Check } from "../../core/ui/controls";

export interface HollowState {
  Di: number; ds: number; wall: number; metal: string; engrave: "none" | "hand" | "machine";
  target: number; // station B: the weight asked for, g
}

/** Volume of a round-section bangle (a torus), mm³; `wall` ≥ radius means solid. */
export function bangleVolume(Di: number, ds: number, wall: number): number {
  const R = (Di + ds) / 2, r = ds / 2, ri = Math.max(r - wall, 0);
  return 2 * Math.PI ** 2 * R * (r * r - ri * ri);
}
export const bangleWeight = (Di: number, ds: number, wall: number, metal: string) => (bangleVolume(Di, ds, wall) / 1000) * metalById(metal).density;
/** The wall that gives a wanted weight; the full radius when the weight is enough for a solid bangle. */
export function wallForWeight(Di: number, ds: number, grams: number, metal: string): number {
  const R = (Di + ds) / 2, r = ds / 2;
  const k = ((grams / metalById(metal).density) * 1000) / (2 * Math.PI ** 2 * R);
  return k >= r * r ? r : r - Math.sqrt(r * r - k);
}

export function wallChecks(wall: number, ds: number, engrave: HollowState["engrave"]): Check[] {
  const solid = wall >= ds / 2 - 1e-9;
  const list: Check[] = [];
  if (solid) list.push(ok(tx("السوار مصمت: لا جدار رقيق فيه", "The bangle is solid: it has no thin wall")));
  else if (engrave === "hand") list.push(wall < ENGRAVE.handMin - 1e-9 ? fail(tx(`الجدار ${f2(wall)} ملم أرق من أدنى ما يُنقش باليد (${ENGRAVE.handMin}): الأداة تثقبه`, `A ${f2(wall)} mm wall is thinner than the least that can be hand-engraved (${ENGRAVE.handMin}): the tool pierces it`))
    : wall < ENGRAVE.handGood - 1e-9 ? near(tx(`الجدار ${f2(wall)} ملم يُنقش باليد بحذر، والأفضل ${ENGRAVE.handGood}`, `A ${f2(wall)} mm wall can be hand-engraved with care; ${ENGRAVE.handGood} is better`))
    : ok(tx(`الجدار ${f2(wall)} ملم يكفي للنقش باليد`, `A ${f2(wall)} mm wall is enough for hand engraving`)));
  else if (engrave === "machine") list.push(wall < ENGRAVE.machineMin - 1e-9 ? fail(tx(`الجدار ${f2(wall)} ملم أرق مما تحتاجه آلة النقش (${ENGRAVE.machineMin})`, `A ${f2(wall)} mm wall is thinner than an engraving machine needs (${ENGRAVE.machineMin})`)) : ok(tx(`الجدار ${f2(wall)} ملم يكفي لآلة النقش`, `A ${f2(wall)} mm wall is enough for an engraving machine`)));
  else list.push(wall < 0.2 - 1e-9 ? fail(tx(`الجدار ${f2(wall)} ملم أرق من أن يُصنع ويُلحم`, `A ${f2(wall)} mm wall is too thin to make and solder`)) : wall < 0.3 - 1e-9 ? near(tx(`الجدار ${f2(wall)} ملم رقيق: ينبعج بضغطة إصبع`, `A ${f2(wall)} mm wall is thin: it dents under a fingertip`)) : ok(tx(`الجدار ${f2(wall)} ملم يحتمل اللبس بلا نقش`, `A ${f2(wall)} mm wall stands up to wear without engraving`)));
  return sortChecks(list);
}

const ENGRAVE_OPTS = [{ value: "none", label: tx("بلا نقش", "No engraving") }, { value: "hand", label: tx("نقش باليد", "Hand engraving") }, { value: "machine", label: tx("نقش بالآلة", "Machine engraving") }];

function draw(s: Sheet, st: HollowState, wall: number) {
  const wide = s.w >= 420 && s.w / s.h >= 1.15;
  const a = wide ? { x: 0, y: 0, w: Math.round(s.w * 0.5), h: s.h } : { x: 0, y: 0, w: s.w, h: Math.round(s.h * 0.52) };
  const b = wide ? { x: a.w, y: 0, w: s.w - a.w, h: s.h } : { x: 0, y: a.h, w: s.w, h: s.h - a.h };
  const ink = s.ink;
  const level = wallChecks(wall, st.ds, st.engrave)[0].level;
  const tone = level === "fail" ? ink.warn : ink.gold;

  // the section of the tube, large
  const v = s.view(a); const r = st.ds / 2, ri = Math.max(r - wall, 0);
  v.fit({ x0: -r - 0.6, y0: -r - 0.8, x1: r + 0.6, y1: r + 0.8 }, 26); v.grid(); v.tag(tx("مقطع في السوار · ملم", "Section through the bangle · mm"));
  v.section(circlePts(0, 0, r), { stroke: tone, hatch: level === "fail" ? "#7a3a2c" : ink.goldDim });
  if (ri > 0.01) { v.fill(circlePts(0, 0, ri), ink.sheet); v.stroke(circlePts(0, 0, ri), { color: tone, width: 1.4, close: true }); }
  v.dimH(-r, r, -r, `Ø ${f2(st.ds)}`, { off: 20, color: ink.line });
  if (ri > 0.01) v.dimH(ri, r, 0, f2(wall), { off: -14, color: tone });
  else v.sheet.text(tx("مصمت", "solid"), v.X(0), v.Y(0), { size: 13, color: ink.line, halo: true });

  // the bangle from above
  const w = s.view(b); const Ro = st.Di / 2 + st.ds;
  w.fit({ x0: -Ro - 4, y0: -Ro - 6, x1: Ro + 4, y1: Ro + 6 }, 22); w.tag(tx("السوار من الأعلى · ملم", "Bangle from above · mm"));
  w.section(circlePts(0, 0, Ro), { stroke: ink.gold, hatch: ink.goldDim });
  w.fill(circlePts(0, 0, st.Di / 2), ink.sheet); w.stroke(circlePts(0, 0, st.Di / 2), { color: ink.gold, width: 1.4, close: true });
  w.centerline([-Ro - 2, 0], [Ro + 2, 0]); w.centerline([0, -Ro - 2], [0, Ro + 2]);
  w.dimH(-st.Di / 2, st.Di / 2, 0, `Ø ${f1(st.Di)}`, { off: -16, color: ink.line });
}

const shared = {
  Di: { kind: "range" as const, key: "Di" as const, label: tx("القطر الداخلي للسوار", "Inner diameter of the bangle"), min: 50, max: 75, step: 0.5, fmt: (v: number) => mm(v, 1), hint: tx("فتحة السوار التي تدخل منها اليد. السوار الأوسع أطول محيطاً، فيزن أكثر.", "The opening the hand goes through. A wider bangle is longer around, so it weighs more.") },
  ds: { kind: "range" as const, key: "ds" as const, label: tx("قطر المقطع (غلظ السوار)", "Section diameter (how thick the bangle is)"), min: 2, max: 10, step: 0.1, fmt: (v: number) => mm(v, 1), hint: tx("غلظ السلك أو الأنبوب الذي يُصنع منه السوار. الوزن يكبر مع مربعه في السوار المصمت.", "Thickness of the wire or tube the bangle is made from. In a solid bangle the weight grows with its square.") },
  metal: { kind: "seg" as const, key: "metal" as const, label: tx("العيار", "Karat"), options: METAL_OPTS, hint: tx("العيار الأعلى أثقل بالحجم نفسه: عيار 22 يزن نحو مرة وسُبع ما يزنه عيار 18.", "A higher karat is heavier for the same volume: 22k weighs about one and a seventh times what 18k does.") },
  engrave: { kind: "seg" as const, key: "engrave" as const, label: tx("هل يُنقش؟", "Will it be engraved?"), options: ENGRAVE_OPTS, hint: tx("أداة النقش تضغط على المعدن وهي تقطعه. الجدار الرقيق ينبعج تحتها أو يُثقب، والآلة تحتاج جداراً أسمك من اليد.", "The graver presses on the metal as it cuts. A thin wall dents or is pierced under it, and a machine needs a thicker wall than the hand.") },
};

export const DEF: ToolDef<HollowState> = {
  id: "hollow", title: tx("جدار السوار المجوف", "Hollow Bangle Wall"),
  defaults: { Di: 60, ds: 6, wall: 0.5, metal: "k21", engrave: "machine", target: 31 },
  material: (s) => metalById(s.metal).name,
  stations: [
    {
      id: "weight", label: tx("مصمت أم مجوف", "Solid or hollow"),
      idea: { ref: L2(4), text: tx("السوار المجوف يبدو كالمصمت ويزن جزءاً صغيراً منه. لكن خفّته تأتي من رقّة جداره، والجدار الرقيق لا يحتمل النقش.", "A hollow bangle looks like a solid one and weighs a fraction of it. But its lightness comes from a thin wall, and a thin wall cannot take engraving.") },
      primary: { kind: "range", key: "wall", label: tx("سماكة الجدار", "Wall thickness"), min: 0.15, max: 5, step: 0.01, fmt: (v, s) => (v >= s.ds / 2 ? tx("مصمت", "solid") : mm(v)), hint: tx("حرّكه ليرقّ جدار الأنبوب أو يسمك. عند أقصاه يصير السوار مصمتاً.", "Move it to thin or thicken the tube's wall. At its maximum the bangle becomes solid."), marks: [{ at: 0.5, label: "0.5", tone: "gold" }] },
      groups: [{ title: tx("السوار", "The bangle"), controls: [shared.Di, shared.ds, shared.metal, shared.engrave] }],
      result: (s) => {
        const wHollow = bangleWeight(s.Di, s.ds, s.wall, s.metal), wSolid = bangleWeight(s.Di, s.ds, s.ds, s.metal);
        return {
          label: tx("وزن السوار", "Bangle weight"), value: `${f1(wHollow)} g`, fraction: wHollow / wSolid,
          tone: wallChecks(s.wall, s.ds, s.engrave)[0].level === "fail" ? "warn" : "gold",
          readings: [{ label: tx("لو كان مصمتاً", "If it were solid"), value: `${f1(wSolid)} g` }, { label: tx("نسبته من المصمت", "As a share of solid"), value: pct(wHollow / wSolid), tone: "gold" }, { label: tx("حجم المعدن", "Metal volume"), value: `${f2(bangleVolume(s.Di, s.ds, s.wall) / 1000)} cm³` }],
          checks: wallChecks(s.wall, s.ds, s.engrave),
        };
      },
      draw: (sh, s) => draw(sh, s, Math.min(s.wall, s.ds / 2)),
      aria: (s) => tx(`مقطع سوار قطره الداخلي ${f1(s.Di)} ملم وغلظه ${f1(s.ds)} ملم بجدار ${f2(Math.min(s.wall, s.ds / 2))} ملم، يزن ${f1(bangleWeight(s.Di, s.ds, s.wall, s.metal))} غراماً.`, `Section of a bangle with a ${f1(s.Di)} mm inner diameter, ${f1(s.ds)} mm thick, with a ${f2(Math.min(s.wall, s.ds / 2))} mm wall, weighing ${f1(bangleWeight(s.Di, s.ds, s.wall, s.metal))} g.`),
      grid: "1 · 5 mm",
    },
    {
      id: "wall", label: tx("جدار للوزن المطلوب", "Wall for a target weight"),
      idea: { ref: L2(4, tx("حالة على طاولة العمل", "A case on the bench")), text: tx("إذا طُلب سوار بغلظ معيّن ووزن محدود، فالوزن هو الذي يحدد سماكة الجدار. وقد يخرج الجدار أرق من أن يُنقش، فلا يجتمع الطلبان.", "When a bangle is ordered at a given thickness and a limited weight, the weight decides the wall. The wall may come out too thin to engrave — and then the two demands cannot both be met.") },
      primary: { kind: "range", key: "target", label: tx("الوزن المطلوب", "Target weight"), min: 5, max: 120, step: 0.5, fmt: (v) => `${f1(v)} g`, hint: tx("حرّكه إلى الوزن الذي يريده الزبون، وانظر أي جدار يخرج منه.", "Move it to the weight the customer wants and see what wall comes out.") },
      groups: [{ title: tx("السوار", "The bangle"), controls: [shared.Di, shared.ds, shared.metal, shared.engrave] }],
      result: (s) => {
        const t = wallForWeight(s.Di, s.ds, s.target, s.metal), solid = t >= s.ds / 2 - 1e-9;
        const wSolid = bangleWeight(s.Di, s.ds, s.ds, s.metal);
        return {
          label: tx("سماكة الجدار التي يسمح بها الوزن", "Wall thickness the weight allows"), value: solid ? tx("مصمت", "solid") : mm(t), fraction: Math.min(t / (s.ds / 2), 1),
          tone: wallChecks(t, s.ds, s.engrave)[0].level === "fail" ? "warn" : "gold",
          readings: [{ label: tx("وزن المصمت بهذا الغلظ", "Solid weight at this thickness"), value: `${f1(wSolid)} g` }, { label: tx("الوزن المطلوب من المصمت", "Target weight as a share of solid"), value: pct(Math.min(s.target / wSolid, 1)) }],
          checks: wallChecks(t, s.ds, s.engrave),
        };
      },
      draw: (sh, s) => draw(sh, s, wallForWeight(s.Di, s.ds, s.target, s.metal)),
      aria: (s) => tx(`سوار وزنه المطلوب ${f1(s.target)} غراماً بغلظ ${f1(s.ds)} ملم يخرج جداره ${f2(wallForWeight(s.Di, s.ds, s.target, s.metal))} ملم.`, `A bangle with a target weight of ${f1(s.target)} g at ${f1(s.ds)} mm thick comes out with a ${f2(wallForWeight(s.Di, s.ds, s.target, s.metal))} mm wall.`),
      grid: "1 · 5 mm",
    },
  ],
  examples: [
    { id: "solid5", station: "weight", origin: "book", ref: L2(4), title: tx("ورشة 1 · مصمت بغلظ 5 ملم", "Workshop 1 · solid, 5 mm thick"), says: tx("نحو 68 غراماً", "about 68 grams"),
      note: tx("سوار مصمت قطره الداخلي 60 ملم وغلظه 5 ملم في عيار 21. لا جدار فيه، فيُنقش كما يشاء الصائغ، لكنه ثقيل وغالٍ.", "A solid bangle with a 60 mm inner diameter, 5 mm thick, in 21k. It has no wall, so the goldsmith can engrave it freely — but it is heavy and costly."),
      state: { Di: 60, ds: 5, wall: 5, metal: "k21", engrave: "hand" },
      expect: (s) => { const w = bangleWeight(s.Di, s.ds, s.wall, s.metal); return { value: tx(`${f1(w)} غ`, `${f1(w)} g`), pass: Math.abs(w - 68) < 1.5 }; } },
    { id: "hollow6", station: "weight", origin: "book", ref: L2(4, tx("حالة على طاولة العمل", "A case on the bench")), title: tx("ورشة 2 · مجوف بجدار نصف ملم", "Workshop 2 · hollow with a half-millimetre wall"), says: tx("نحو 30 غراماً", "about 30 grams"),
      note: tx("سوار مجوف بغلظ 6 ملم وجدار 0.5 ملم في عيار 21. يزن أقل من ثلث المصمت، وجداره يكفي لآلة النقش.", "A hollow bangle 6 mm thick with a 0.5 mm wall in 21k. It weighs less than a third of the solid one, and its wall is enough for an engraving machine."),
      state: { Di: 60, ds: 6, wall: 0.5, metal: "k21", engrave: "machine" },
      expect: (s) => { const w = bangleWeight(s.Di, s.ds, s.wall, s.metal); return { value: tx(`${f1(w)} غ`, `${f1(w)} g`), pass: Math.abs(w - 30) < 2 }; } },
    { id: "plain15", station: "weight", origin: "book", ref: L2(4), title: tx("ورشة 3 · مجوف خفيف بلا نقش", "Workshop 3 · light hollow, no engraving"), says: tx("نحو 15 غراماً", "about 15 grams"),
      note: tx("سوار مجوف بغلظ 5 ملم وجدار 0.3 ملم في عيار 21. خفيف جداً، ويصلح أملس فقط: جداره أرق من أن يُنقش.", "A hollow bangle 5 mm thick with a 0.3 mm wall in 21k. Very light, and good only plain: its wall is too thin to engrave."),
      state: { Di: 60, ds: 5, wall: 0.3, metal: "k21", engrave: "none" },
      expect: (s) => { const w = bangleWeight(s.Di, s.ds, s.wall, s.metal); return { value: tx(`${f1(w)} غ`, `${f1(w)} g`), pass: Math.abs(w - 15.4) < 1 }; } },
    { id: "w30", station: "wall", origin: "book", ref: L2(4, tx("حالة على طاولة العمل", "A case on the bench")), title: tx("ورشة 1 · ثلاثون غراماً بغلظ 6 ملم", "Workshop 1 · thirty grams at 6 mm thick"), says: tx("جدار نحو 0.5 ملم", "wall about 0.5 mm"),
      note: tx("حين يُرفع الوزن المسموح إلى نحو 30 غراماً يخرج الجدار نصف ملم، وهو ما تحتاجه آلة النقش.", "When the allowed weight is raised to about 30 grams, the wall comes out at half a millimetre — what an engraving machine needs."),
      state: { Di: 60, ds: 6, target: 30.5, metal: "k21", engrave: "machine" },
      expect: (s) => { const t = wallForWeight(s.Di, s.ds, s.target, s.metal); return { value: mm(t), pass: Math.abs(t - 0.5) < 0.02 }; } },
    { id: "w20", station: "wall", origin: "book", ref: L2(4, tx("حالة على طاولة العمل", "A case on the bench")), title: tx("ورشة 2 · عشرون غراماً بغلظ 5 ملم", "Workshop 2 · twenty grams at 5 mm thick"), says: tx("جدار نحو 0.4 ملم", "wall about 0.4 mm"),
      note: tx("إذا بقي الوزن 20 غراماً وصغر الغلظ إلى 5 ملم سمك الجدار إلى نحو 0.4 ملم. يصلح أملس، وللنقش باليد يحتاج حذراً.", "If the weight stays at 20 grams and the thickness drops to 5 mm, the wall thickens to about 0.4 mm. Good plain; for hand engraving it needs care."),
      state: { Di: 60, ds: 5, target: 20, metal: "k21", engrave: "none" },
      expect: (s) => { const t = wallForWeight(s.Di, s.ds, s.target, s.metal); return { value: mm(t), pass: Math.abs(t - 0.4) < 0.03 }; } },
  ],
  guide: {
    models: [
      tx("السوار حلقة مستديرة المقطع، وحجمها يُحسب هندسياً من القطر الداخلي وغلظ المقطع وسماكة الجدار.", "The bangle is a ring with a round section; its volume is worked out geometrically from the inner diameter, the section thickness and the wall thickness."),
      tx("الوزن = الحجم × كثافة العيار: 17.8 لعيار 22، ونحو 17 لعيار 21، و15.5 لعيار 18، و11.2 لعيار 9.", "Weight = volume × karat density: 17.8 for 22k, about 17 for 21k, 15.5 for 18k, and 11.2 for 9k."),
      tx("حدود النقش من ورشتي في عيار 21: لا يُنقش باليد جدار أرق من 0.35 ملم والأفضل 0.5، وآلة النقش تحتاج 0.5 ملم.", "Engraving limits from my workshop in 21k: a wall thinner than 0.35 mm is not hand-engraved, and 0.5 is better; an engraving machine needs 0.5 mm."),
      tx("السوار الأملس: جدار أرق من 0.3 ملم ينبعج بضغطة إصبع، وأرق من 0.2 لا يحتمل اللحام والتشطيب.", "A plain bangle: a wall thinner than 0.3 mm dents under a fingertip, and thinner than 0.2 does not survive soldering and finishing."),
    ],
    notModeled: [
      tx("المقاطع غير المستديرة (البيضاوي والمسطح)، ووزن اللحام والقفل.", "Sections that are not round (oval and flat), and the weight of solder and clasp."),
      tx("مقدار الضغط الذي ينبعج عنده الجدار: يتبع غلظ السوار والسبيكة، ويُجرَّب على نموذج.", "The pressure at which the wall dents: it depends on the bangle's thickness and the alloy, and is tried on a prototype."),
      tx("كثافة عيار 14 (نحو 13) من المراجع العامة.", "The density of 14k (about 13) comes from general references."),
    ],
    sources: [tx("الأوزان وحدود النقش من «حدود المادة»، الفصل الرابع وحالته، والفصل الثاني للكثافات.", "The weights and engraving limits come from “The Limits of Material”, chapter 4 and its case, and chapter 2 for densities.")],
  },
};
