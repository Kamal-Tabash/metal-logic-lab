import { tx } from "../../core/i18n";
// م7 — wear: the same lost metal, spread over a surface or gathered in one contact point; and the life of a plating.
import { circlePts } from "../../core/cad/sheet";
import { METAL_OPTS, metalById } from "../../core/data";
import { L2, f1, f2, fail, mm, near, ok, pct, span, years, type ToolDef } from "../../core/kit";
import type { Check } from "../../core/ui/controls";

export interface WearState {
  mg: number; metal: string; area: number;       // spread over a surface
  wire: number; spot: number; share: number; years: number; // gathered at a contact
  layer: number;                                    // plating, microns
}

/** Thickness lost in a year when `mg` of metal leaves evenly from `area` mm², in microns. */
export const spreadPerYear = (mg: number, metal: string, area: number) => (mg / metalById(metal).density / area) * 1000;
/** Depth worn in a year at a contact spot that takes `share` of the loss, in mm. */
export const spotPerYear = (mg: number, metal: string, spot: number, share: number) => (mg * share) / metalById(metal).density / spot;
export const leftOfWire = (s: WearState) => Math.max(s.wire - spotPerYear(s.mg, s.metal, s.spot, s.share) * s.years, 0);

function linkChecks(s: WearState): Check[] {
  const left = leftOfWire(s), r = left / s.wire;
  return [r < 0.5 ? fail(left <= 0 ? tx(`الحلقة تنقطع قبل ${years(s.years)}`, `The link breaks before ${years(s.years)}`) : tx(`بعد ${years(s.years)} يبقى ${pct(r)} من غلظ الحلقة: تنفتح أو تنقطع`, `After ${years(s.years)}, ${pct(r)} of the link's thickness is left: it opens or breaks`))
    : r < 0.75 ? near(tx(`بعد ${years(s.years)} يبقى ${pct(r)} من غلظ الحلقة: تُفحص وتُستبدل`, `After ${years(s.years)}, ${pct(r)} of the link's thickness is left: inspect and replace it`))
    : ok(tx(`بعد ${years(s.years)} يبقى ${pct(r)} من غلظ الحلقة`, `After ${years(s.years)}, ${pct(r)} of the link's thickness is left`))];
}
function plateChecks(s: WearState): Check[] {
  return [s.layer < 0.175 - 1e-9 ? fail(tx(`طبقة ${f2(s.layer)} ميكرون أرق من أدنى ما يُسمى طلاءً ذهبياً (0.175)`, `A ${f2(s.layer)} micron layer is thinner than the least that may be called gold plating (0.175)`))
    : s.layer < 2.5 - 1e-9 ? near(tx(`طبقة ${f2(s.layer)} ميكرون طلاء خفيف: يزول من مواضع الاحتكاك سريعاً`, `A ${f2(s.layer)} micron layer is light plating: it goes quickly from rubbing spots`))
    : ok(tx(`طبقة ${f2(s.layer)} ميكرون طلاء ثقيل`, `A ${f2(s.layer)} micron layer is heavy plating`))];
}

const mgCtl = { kind: "range" as const, key: "mg" as const, label: tx("وزن ما تفقده القطعة في السنة", "Weight the piece loses per year"), min: 1, max: 40, step: 0.5, fmt: (v: number) => `${f1(v)} mg`, marks: [{ at: 6, label: tx("خاتم زواج", "wedding band"), tone: "gold" as const }], hint: tx("وزن المعدن الذي يذهب بالاحتكاك في سنة، بالملغرام. خاتم زواج من عيار 18 وُزن كل أسبوع سنةً كاملة ففقد نحو 6 ملغرامات.", "Weight of metal lost to rubbing in a year, in milligrams. An 18k wedding band weighed every week for a whole year lost about 6 milligrams.") };
const metalCtl = { kind: "seg" as const, key: "metal" as const, label: tx("العيار", "Karat"), options: METAL_OPTS, hint: tx("العيار الأعلى أنعم، فيتآكل أسرع بالضغط نفسه والحركة نفسها.", "A higher karat is softer, so it wears faster under the same pressure and movement.") };

export const DEF: ToolDef<WearState> = {
  id: "wear", title: tx("مواضع التآكل", "Wear Points"),
  defaults: { mg: 6, metal: "k18", area: 350, wire: 1.2, spot: 1.5, share: 0.02, years: 10, layer: 2.5 },
  material: (s) => metalById(s.metal).name,
  stations: [
    {
      id: "spread", label: tx("موزّع على السطح", "Spread over the surface"),
      idea: { ref: L2(7), text: tx("ما يضيع من المعدن بالاحتكاك قليل جداً. إذا توزع على سطح واسع لم تنقص السماكة إلا جزءاً من ألف من الملم في السنة، وعاشت القطعة أجيالاً.", "Very little metal is lost to rubbing. Spread over a wide surface, the thickness drops only a thousandth of a millimetre a year, and the piece lasts for generations.") },
      primary: mgCtl,
      groups: [{ title: tx("القطعة", "The piece"), controls: [
        { kind: "range", key: "area", label: tx("مساحة السطح الذي يحتك", "Area of the rubbing surface"), min: 20, max: 1500, step: 5, fmt: (v) => `${Math.round(v)} mm²`, hint: tx("مساحة السطح الذي يتوزع عليه التآكل. خاتم زواج عرضه 4 ملم مساحة وجهه الخارجي والباطن نحو 350 ملم مربع.", "Area of the surface the wear is spread over. A wedding band 4 mm wide has about 350 square millimetres of outer face and inside.") },
        metalCtl,
      ] }],
      result: (s) => { const um = spreadPerYear(s.mg, s.metal, s.area); return {
        label: tx("ما تنقصه السماكة في السنة", "Thickness lost per year"), value: `${um.toFixed(2)} µm`,
        readings: [{ label: tx("المدة حتى ينقص عُشر ملم", "Time until a tenth of a millimetre is lost"), value: span(100 / um), tone: "gold" }, { label: tx("حجم ما يضيع في السنة", "Volume lost per year"), value: `${(s.mg / metalById(s.metal).density).toFixed(2)} mm³` }] }; },
      draw: (sh, s) => {
        const v = sh.view({ x: 0, y: 0, w: sh.w, h: sh.h }), ink = sh.ink, um = spreadPerYear(s.mg, s.metal, s.area), yrs = 50;
        const lost = Math.min((um * yrs) / 1000, 0.9);
        v.fit({ x0: -3, y0: -0.5, x1: 3, y1: 1.6 }, 30); v.grid(); v.tag(tx("مقطع في سطح القطعة · بعد خمسين سنة", "Section through the surface · after fifty years"));
        v.section([[-2.5, 0], [2.5, 0], [2.5, 1.2 - lost], [-2.5, 1.2 - lost]], { stroke: ink.gold, hatch: ink.goldDim });
        v.stroke([[-2.5, 1.2], [2.5, 1.2]], { color: ink.muted, width: 1, dash: [4, 4] });
        v.dimV(1.2 - lost, 1.2, 2.5, `${(um * yrs).toFixed(0)} µm`, { off: 18, color: ink.line });
        v.sheet.text(tx("السطح يوم صُنعت", "surface when made"), v.X(-2.4), v.Y(1.2) - 10, { size: 11, color: ink.muted, align: "right", halo: true }); v.sheet.text(tx("معدن القطعة", "metal of the piece"), v.X(0), v.Y((1.2 - lost) / 2), { size: 12, color: ink.gold, halo: true });
      },
      aria: (s) => tx(`تآكل ${f1(s.mg)} ملغرام في السنة موزعاً على ${Math.round(s.area)} ملم مربع ينقص السماكة ${spreadPerYear(s.mg, s.metal, s.area).toFixed(2)} ميكرون في السنة.`, `Wear of ${f1(s.mg)} mg a year spread over ${Math.round(s.area)} mm² takes ${spreadPerYear(s.mg, s.metal, s.area).toFixed(2)} microns off the thickness each year.`),
    },
    {
      id: "spot", label: tx("مركّز في نقطة", "Concentrated at a point"),
      idea: { ref: L2(7, tx("حالة على طاولة العمل", "A case on the bench")), text: tx("الأمر يتغير كلياً حين يجتمع التآكل في موضع صغير. حلقة السلسلة تلمس جارتها في نقطة، والحمل كله يمر منها، فتُحفر الحلقة هناك وحدها.", "Everything changes when the wear gathers in a small spot. A chain link touches its neighbour at a point, and the whole load passes through it — so the link is worn through there alone.") },
      primary: { kind: "range", key: "spot", label: tx("مساحة نقطة التماس", "Contact point area"), min: 0.05, max: 6, step: 0.05, fmt: (v) => `${f2(v)} mm²`, hint: tx("المساحة التي تلمس بها الحلقة جارتها. حرّكه: كلما صغرت نقطة التماس حُفرت أسرع. الحلقة الأغلظ والتماس الأعرض يوسعانها.", "The area where the link touches its neighbour. Move it: the smaller the contact point, the faster it is worn through. A thicker link and a wider contact enlarge it.") },
      groups: [{ title: tx("الحلقة", "The link"), controls: [
        { kind: "range", key: "wire", label: tx("غلظ سلك الحلقة", "Link wire thickness"), min: 0.3, max: 3, step: 0.05, fmt: (v) => mm(v), hint: tx("قطر السلك الذي صُنعت منه الحلقة. هو رصيدها أمام التآكل.", "Diameter of the wire the link is made from. It is its reserve against wear.") },
        { kind: "range", key: "share", label: tx("نصيب هذه النقطة من التآكل", "This point's share of the wear"), min: 0.005, max: 0.5, step: 0.005, fmt: (v) => pct(v), hint: tx("أي جزء من كل ما تفقده القطعة يذهب من هذه النقطة وحدها. حلقة التعليقة تحمل وزن التعليقة كله، فنصيبها كبير.", "What share of everything the piece loses goes from this point alone. The pendant's jump ring carries the pendant's whole weight, so its share is large.") },
        { kind: "range", key: "years", label: tx("سنوات اللبس", "Years of wear"), min: 1, max: 60, step: 1, fmt: (v) => years(v), hint: tx("كم سنة ستُلبس القطعة. حرّكه لترى الحلقة بعد هذه المدة.", "How many years the piece will be worn. Move it to see the link after that time.") },
        mgCtl, metalCtl,
      ] }],
      result: (s) => { const per = spotPerYear(s.mg, s.metal, s.spot, s.share), left = leftOfWire(s); return {
        label: tx("ما يبقى من غلظ الحلقة", "Link thickness left"), value: mm(left), fraction: left / s.wire, tone: linkChecks(s)[0].level === "fail" ? "warn" : "gold",
        readings: [{ label: tx("عمق الحفر في السنة", "Depth worn per year"), value: per >= 1 ? mm(per, 1) : `${(per * 1000).toFixed(0)} µm` }, { label: tx("كم مرة أسرع من السطح الموزّع", "How many times faster than the spread surface"), value: `× ${Math.round((per * 1000) / spreadPerYear(s.mg, s.metal, s.area))}`, tone: "gold" }, { label: tx("المدة حتى يذهب نصف الغلظ", "Time until half the thickness is gone"), value: span(s.wire / 2 / per) }],
        checks: linkChecks(s) }; },
      draw: (sh, s) => {
        const v = sh.view({ x: 0, y: 0, w: sh.w, h: sh.h }), ink = sh.ink, r = s.wire / 2, left = leftOfWire(s), lvl = linkChecks(s)[0].level;
        const tone = lvl === "fail" ? ink.warn : ink.gold, cut = s.wire - left;
        v.fit({ x0: -r * 3.2, y0: -r * 2.2, x1: r * 3.2, y1: r * 2.6 }, 30); v.grid(); v.tag(tx("مقطع في حلقة السلسلة · ملم", "Section through the chain link · mm"));
        const pts = circlePts(0, 0, r, 90).filter(([, y]) => y <= r - cut + 1e-9);
        if (pts.length > 2) v.section(pts, { stroke: tone, hatch: lvl === "fail" ? "#7a3a2c" : ink.goldDim });
        v.stroke(circlePts(0, 0, r), { color: ink.muted, width: 1, dash: [3, 3], close: true });
        v.stroke(circlePts(0, r * 2 - cut, r), { color: ink.line, width: 1.2, close: true });
        v.sheet.text(tx("الحلقة المجاورة", "neighbouring link"), v.X(r * 1.3), v.Y(r * 2 - cut), { size: 11, color: ink.muted, align: "left" });
        v.dimV(-r, r - cut, -r, f2(left), { off: -18, color: tone });
      },
      aria: (s) => tx(`حلقة غلظها ${f2(s.wire)} ملم تتآكل في نقطة تماس مساحتها ${f2(s.spot)} ملم مربع، فيبقى منها ${f2(leftOfWire(s))} ملم بعد ${years(s.years)}.`, `A link ${f2(s.wire)} mm thick wears at a contact point of ${f2(s.spot)} mm², leaving ${f2(leftOfWire(s))} mm after ${years(s.years)}.`),
    },
    {
      id: "plate", label: tx("عمر الطلاء", "Life of plating"),
      idea: { ref: L2(3), text: tx("الطلاء طبقة رقيقة جداً فوق معدن آخر. ما لا يُحس في الذهب المصمت يأكل الطلاء كله: طبقة أرق من الميكرون تزول من مواضع الاحتكاك في شهور.", "Plating is a very thin layer over another metal. What goes unnoticed in solid gold eats the plating whole: a layer under a micron goes from rubbing spots within months.") },
      primary: { kind: "range", key: "layer", label: tx("سماكة طبقة الطلاء", "Plating thickness"), min: 0.05, max: 6, step: 0.025, fmt: (v) => `${f2(v)} µm`, hint: tx("سماكة الطلاء بالميكرون. حرّكه وانظر كم يعيش في موضع يحتك.", "Thickness of the plating in microns. Move it and see how long it lasts at a rubbing spot."), marks: [{ at: 0.175, label: "0.175", tone: "warn" }, { at: 2.5, label: "2.5", tone: "gold" }] },
      groups: [{ title: tx("الاحتكاك", "Rubbing"), controls: [mgCtl, { kind: "range", key: "area", label: tx("مساحة السطح الذي يحتك", "Area of the rubbing surface"), min: 20, max: 1500, step: 5, fmt: (v) => `${Math.round(v)} mm²`, hint: tx("مساحة السطح الذي يتوزع عليه التآكل.", "Area of the surface the wear is spread over.") }, metalCtl] }],
      result: (s) => { const um = spreadPerYear(s.mg, s.metal, s.area), yrs = s.layer / um; return {
        label: tx("عمر الطلاء في موضع يحتك", "Life of the plating at a rubbing spot"), value: span(yrs), fraction: Math.min(s.layer / 6, 1), tone: plateChecks(s)[0].level === "fail" ? "warn" : "gold",
        readings: [{ label: tx("ما يذهب من السطح في السنة", "Lost from the surface per year"), value: `${um.toFixed(2)} µm` }, { label: tx("الطلاء مقارنةً بشعرة (70 ميكرون)", "Plating compared with a hair (70 microns)"), value: `1 / ${Math.round(70 / s.layer)}` }],
        checks: plateChecks(s) }; },
      draw: (sh, s) => {
        const v = sh.view({ x: 0, y: 0, w: sh.w, h: sh.h }), ink = sh.ink, lvl = plateChecks(s)[0].level, tone = lvl === "fail" ? ink.warn : ink.gold;
        v.fitXY({ x0: 0, y0: -3, x1: 10, y1: 7 }, [30, 30, 30, 30]); v.tag(tx("طبقة الطلاء · ميكرون", "Plating layer · microns"));
        v.section([[0, -3], [10, -3], [10, 0], [0, 0]], { stroke: ink.muted, hatch: ink.gridMajor, width: 1 });
        v.section([[0, 0], [10, 0], [10, s.layer], [0, s.layer]], { stroke: tone, hatch: lvl === "fail" ? "#7a3a2c" : ink.goldDim });
        for (const [y, t, c] of [[0.175, "0.175", ink.warn], [2.5, "2.5", ink.gold]] as const) { v.stroke([[0, y], [10, y]], { color: c, width: 1, dash: [3, 3] }); v.sheet.text(t, v.X(0) + 4, v.Y(y) - 8, { mono: true, size: 10, color: c, align: "left", halo: true }); }
        v.sheet.text(tx("المعدن الأساسي", "base metal"), v.X(5), v.Y(-1.5), { size: 12, color: ink.muted, halo: true });
        v.sheet.text(tx("الطلاء", "plating"), v.X(5), v.Y(s.layer) - 12, { size: 12, color: tone, halo: true });
      },
      aria: (s) => tx(`طلاء سماكته ${f2(s.layer)} ميكرون يعيش ${span(s.layer / spreadPerYear(s.mg, s.metal, s.area))} في موضع يحتك.`, `Plating ${f2(s.layer)} microns thick lasts ${span(s.layer / spreadPerYear(s.mg, s.metal, s.area))} at a rubbing spot.`),
    },
  ],
  examples: [
    { id: "ring", station: "spread", origin: "book", ref: L2(7), title: tx("ورشة 1 · خاتم الزواج الموزون", "Workshop 1 · the weighed wedding band"), says: tx("نحو جزء من ألف من الملم في السنة", "about a thousandth of a millimetre a year"),
      quote: "فلو توزعت على سطح الخاتم كله لما نقصت سماكته في السنة إلا جزءاً من ألف من الملم أو أكثر قليلاً، ولعاش الخاتم أجيالاً",
      note: tx("خاتم زواج من عيار 18 فقد 6 ملغرامات في سنة. موزعةً على سطحه كله تنقص السماكة نحو ميكرون واحد في السنة.", "An 18k wedding band lost 6 milligrams in a year. Spread over its whole surface, that takes about one micron off the thickness each year."), state: { mg: 6, metal: "k18", area: 350 },
      expect: (s) => { const u = spreadPerYear(s.mg, s.metal, s.area); return { value: tx(`${u.toFixed(2)} ميكرون`, `${u.toFixed(2)} microns`), pass: u > 0.9 && u < 1.5 }; } },
    { id: "bangle", station: "spread", origin: "book", ref: L2(2), title: tx("ورشة 2 · سوار عريض من عيار 21", "Workshop 2 · wide 21k bangle"), says: tx("أقل من ميكرون في السنة", "less than a micron a year"),
      note: tx("سوار عريض سطحه واسع (1200 ملم مربع) من عيار 21 يفقد 12 ملغراماً في السنة بين أساور متجاورة. السماكة لا تكاد تتغير.", "A wide 21k bangle with a large surface (1200 mm²) loses 12 milligrams a year among neighbouring bangles. The thickness hardly changes."), state: { mg: 12, metal: "k21", area: 1200 },
      expect: (s) => { const u = spreadPerYear(s.mg, s.metal, s.area); return { value: tx(`${u.toFixed(2)} ميكرون`, `${u.toFixed(2)} microns`), pass: u < 1 }; } },
    { id: "thick", station: "spot", origin: "book", ref: L2(7, tx("حالة على طاولة العمل", "A case on the bench")), title: tx("ورشة 1 · حلقة تعليقة غليظة", "Workshop 1 · thick pendant jump ring"), says: tx("تماس عريض ومقطع أكبر", "wide contact, larger section"),
      note: tx("حلقة التعليقة تُصنع من سلك 1.5 ملم بتماس عريض (2 ملم مربع). بعد عشر سنين يبقى معظم غلظها.", "The pendant's jump ring is made from 1.5 mm wire with a wide contact (2 mm²). After ten years most of its thickness is left."), state: { wire: 1.5, spot: 2, share: 0.02, years: 10, mg: 6, metal: "k18" } },
    { id: "k21link", station: "spot", origin: "book", ref: L2(7), title: tx("ورشة 2 · سلسلة من عيار 21", "Workshop 2 · 21k chain"), says: tx("مقطع أكبر عند مواضع التماس", "larger section at the contact points"),
      note: tx("عيار 21 يتآكل أسرع، فتُعطى حلقاته مقطعاً أكبر (2 ملم) ونقاط تماس أعرض (3 ملم مربع) لتعيش ما تعيشه سلسلة عيار 18.", "21k wears faster, so its links get a larger section (2 mm) and wider contact points (3 mm²) to last as long as an 18k chain."), state: { wire: 2, spot: 3, share: 0.02, years: 15, mg: 8, metal: "k21" } },
    { id: "heavy", station: "plate", origin: "world", title: tx("عالمية 1 · طلاء ثقيل 2.5 ميكرون", "International 1 · heavy plating, 2.5 microns"), says: tx("الحد الأدنى للطلاء الثقيل", "the minimum for heavy plating"),
      note: tx("في إرشادات تجارة الحلي يبدأ الطلاء الثقيل، والفضة المذهّبة، من 2.5 ميكرون. يعيش سنتين أو أكثر في موضع يحتك.", "In jewellery trade guidelines, heavy plating — and vermeil — starts at 2.5 microns. It lasts two years or more at a rubbing spot."), state: { layer: 2.5, mg: 6, metal: "k18", area: 350 } },
    { id: "thicker", station: "plate", origin: "world", title: tx("عالمية 2 · طلاء 5 ميكرون", "International 2 · 5 micron plating"), says: tx("ضعف الحد الأدنى", "twice the minimum"),
      note: tx("طبقة 5 ميكرون، ضعف حد الطلاء الثقيل، تعيش ضعف المدة في الموضع نفسه.", "A 5 micron layer, twice the heavy-plating limit, lasts twice as long at the same spot."), state: { layer: 5, mg: 6, metal: "k18", area: 350 } },
  ],
  guide: {
    models: [
      tx("ما تنقصه السماكة = حجم المعدن المفقود ÷ المساحة التي ذهب منها. الكتلة نفسها على مساحة أصغر تحفر أعمق.", "Thickness lost = volume of metal lost ÷ the area it went from. The same mass over a smaller area digs deeper."),
      tx("في نقطة التماس: عمق الحفر في السنة = نصيب النقطة من المفقود ÷ مساحتها.", "At the contact point: depth worn per year = the point's share of the loss ÷ its area."),
      tx("عمر الطلاء = سماكته ÷ ما يذهب من السطح في السنة.", "Life of plating = its thickness ÷ what is lost from the surface per year."),
      tx("لماذا الربع والنصف: حين يذهب ربع غلظ الحلقة يكون قد ذهب نحو خُمس مقطعها فتُفحص وتُستبدل، وحين يذهب نصفه يبقى نصف المقطع فتنفتح تحت شدّة واحدة.", "Why a quarter and a half: when a quarter of the link's thickness is gone, about a fifth of its section is gone, so it is inspected and replaced; when half is gone, half the section is left and it opens under a single tug."),
    ],
    notModeled: [
      tx("ما تفقده قطعتك فعلاً: يتبع العيار والصلادة وعادات اللبس، ورقم 6 ملغرامات قياس على خاتم واحد.", "What your piece actually loses: it depends on karat, hardness and wearing habits; the 6 milligram figure is a measurement on one ring."),
      tx("نصيب كل نقطة تماس من التآكل ومساحتها: يضعهما القارئ تقديراً، فالنتيجة للمقارنة لا للتنبؤ بعمر دقيق.", "Each contact point's share of the wear and its area: the reader sets them as estimates, so the result is for comparison, not for predicting an exact life."),
      tx("سبيكة الحلقة المقابلة وصلادتها: التماس بين معدنين مختلفين يأكل الألين منهما.", "The alloy and hardness of the facing link: contact between two different metals eats the softer one."),
    ],
    sources: [tx("قياس الخاتم وفكرة التماس من «حدود المادة»، الفصل السابع وحالته. وحدّا الطلاء 0.175 و2.5 ميكرون من الفصل الثالث، نقلاً عن إرشادات تجارة الحلي الأمريكية.", "The ring measurement and the contact idea come from “The Limits of Material”, chapter 7 and its case. The plating limits of 0.175 and 2.5 microns come from chapter 3, citing the US jewellery trade guidelines.")],
  },
};
