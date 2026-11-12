import { tx } from "../../core/i18n";
// م5 — the order of heat: each later fire must stay below what the earlier ones can take.
import type { Sheet } from "../../core/cad/sheet";
import { L2, fail, near, ok, sortChecks, type ToolDef } from "../../core/kit";
import type { Check } from "../../core/ui/controls";

export interface HeatState { metal: string; s1: number; s2: number; enamel: number; under: number }

// Where each alloy begins to melt, °C. Sterling and fine silver are the book's
// figures; the gold alloys are usual values and move with the recipe, so the
// exact number comes from the alloy's supplier.
export const MELT: Record<string, { name: string; start: number }> = {
  k22: { name: tx("عيار 22", "22k"), start: 965 }, k21: { name: tx("عيار 21", "21k"), start: 940 }, k18: { name: tx("عيار 18 الأصفر", "18k yellow"), start: 855 },
  k14: { name: tx("عيار 14", "14k"), start: 830 }, s925: { name: tx("فضة إسترلينية", "Sterling silver"), start: 800 }, s999: { name: tx("فضة خالصة", "Fine silver"), start: 960 },
};
export const MARGIN = 20; // the solder finishes melting at least 20° below where the piece begins to
// Between one solder and the next, published sets of hard, medium and easy solders are about 15° apart.
export const STEP = 15;
const deg = (v: number) => `${Math.round(v)} °C`;
const METALS = Object.entries(MELT).map(([value, m]) => ({ value, label: m.name }));

function solderChecks(s: HeatState): Check[] {
  const m = MELT[s.metal].start;
  return sortChecks([
    s.s1 > m - MARGIN ? fail(tx(`اللحام الأول (${deg(s.s1)}) قريب جداً من بدء ذوبان القطعة (${deg(m)}): تذوب معه`, `The first solder (${deg(s.s1)}) is too close to where the piece starts to melt (${deg(m)}): the piece melts with it`)) : ok(tx(`اللحام الأول يسيل قبل ذوبان القطعة بـ ${Math.round(m - s.s1)} درجة`, `The first solder flows ${Math.round(m - s.s1)} degrees before the piece melts`)),
    s.s2 > s.s1 - STEP ? fail(tx(`اللحام الثاني (${deg(s.s2)}) يحتاج حرارة تُسيل اللحام الأول (${deg(s.s1)}): تنفك الوصلة الأولى`, `The second solder (${deg(s.s2)}) needs heat that makes the first solder flow (${deg(s.s1)}): the first joint comes apart`)) : ok(tx(`اللحام الثاني يسيل قبل الأول بـ ${Math.round(s.s1 - s.s2)} درجة`, `The second solder flows ${Math.round(s.s1 - s.s2)} degrees before the first`)),
  ]);
}
function enamelChecks(s: HeatState): Check[] {
  const m = MELT[s.metal].start;
  return sortChecks([
    s.enamel >= m ? fail(tx(`حرارة المينا (${deg(s.enamel)}) تبلغ بدء ذوبان القطعة (${deg(m)})`, `The enamel temperature (${deg(s.enamel)}) reaches the point where the piece starts to melt (${deg(m)})`)) : s.enamel > m - MARGIN ? near(tx(`المينا تُحرق على ${Math.round(m - s.enamel)} درجة فقط من ذوبان القطعة`, `The enamel is fired only ${Math.round(m - s.enamel)} degrees from the piece melting`)) : ok(tx(`المينا تُحرق تحت ذوبان القطعة بـ ${Math.round(m - s.enamel)} درجة`, `The enamel is fired ${Math.round(m - s.enamel)} degrees below the piece's melting`)),
    s.under < s.enamel + MARGIN ? fail(tx(`اللحام تحت المينا (${deg(s.under)}) يسيل في فرن المينا (${deg(s.enamel)})`, `The solder under the enamel (${deg(s.under)}) flows in the enamel kiln (${deg(s.enamel)})`)) : s.under > m - MARGIN ? fail(tx(`اللحام تحت المينا (${deg(s.under)}) قريب جداً من ذوبان القطعة`, `The solder under the enamel (${deg(s.under)}) is too close to the piece's melting`)) : ok(tx(`اللحام تحت المينا يحتمل فرنها: يسيل فوقها بـ ${Math.round(s.under - s.enamel)} درجة`, `The solder under the enamel survives the kiln: it flows ${Math.round(s.under - s.enamel)} degrees above it`)),
  ]);
}

function ladder(sh: Sheet, rows: { t: number; label: string; tone: "line" | "gold" | "warn" | "muted" }[]) {
  const v = sh.view({ x: 0, y: 0, w: sh.w, h: sh.h }), ink = sh.ink, lo = 500, hi = 1020;
  v.fitXY({ x0: 0, y0: lo, x1: 10, y1: hi }, [28, 20, 20, 24]); v.tag(tx("سلّم الحرارة · درجة مئوية", "Temperature ladder · °C"));
  for (let t = 500; t <= 1000; t += 100) { sh.rule(v.X(1.2), v.Y(t), v.X(9.6), v.Y(t), ink.grid); sh.text(String(t), v.X(1.1), v.Y(t), { mono: true, size: 10, align: "right" }); }
  v.section([[1.3, lo], [2.1, lo], [2.1, hi], [1.3, hi]], { stroke: ink.muted, hatch: ink.gridMajor, width: 1 });
  rows.forEach((r, i) => {
    const c = ink[r.tone], t = Math.min(Math.max(r.t, lo), hi);
    v.stroke([[1.3, t], [3 + i * 0.25, t]], { color: c, width: 2.2 });
    sh.text(`${Math.round(r.t)}°  ${r.label}`, v.X(3.2 + i * 0.25), v.Y(t) - 9, { size: 11.5, color: c, align: "left", halo: true });
  });
}

const metalCtl = { kind: "seg" as const, key: "metal" as const, label: tx("معدن القطعة", "Metal of the piece"), options: METALS, hint: tx("كل سبيكة تبدأ بالذوبان عند حرارة. هي السقف الذي لا تبلغه أي نار بعد صنع القطعة.", "Every alloy starts to melt at some temperature. That is the ceiling no fire may reach once the piece is made.") };

export const DEF: ToolDef<HeatState> = {
  id: "heat", title: tx("ترتيب اللحام", "Soldering Order"),
  defaults: { metal: "k18", s1: 800, s2: 775, enamel: 790, under: 820 },
  material: (s) => MELT[s.metal].name,
  stations: [
    {
      id: "solder", label: tx("لحام بعد لحام", "Solder after solder"),
      idea: { ref: L2(5), text: tx("كل نار تمر على القطعة كلها. اللحام الأول يجب أن يسيل قبل أن تبدأ القطعة بالذوبان، واللحام الثاني قبل الأول، وإلا انفكت الوصلة التي سبقته.", "Every fire heats the whole piece. The first solder must flow before the piece starts to melt, and the second before the first — otherwise the earlier joint comes apart.") },
      primary: { kind: "range", key: "s2", label: tx("حرارة اللحام الثاني", "Second solder temperature"), min: 550, max: 980, step: 5, fmt: deg, hint: tx("الحرارة التي يسيل عندها اللحام الثاني. حرّكه نحو حرارة الأول وانظر متى تنفك الوصلة الأولى.", "The temperature at which the second solder flows. Move it toward the first and see when the first joint comes apart.") },
      groups: [{ title: tx("القطعة واللحام الأول", "The piece and the first solder"), controls: [metalCtl,
        { kind: "range", key: "s1", label: tx("حرارة اللحام الأول", "First solder temperature"), min: 550, max: 980, step: 5, fmt: deg, hint: tx("الحرارة التي يكتمل عندها ذوبان اللحام الأول. يجب أن تقل عن بدء ذوبان القطعة بعشرين درجة على الأقل.", "The temperature at which the first solder is fully molten. It must be at least twenty degrees below where the piece starts to melt.") }] }],
      result: (s) => ({ label: tx("المسافة بين اللحامين", "Gap between the two solders"), value: `${Math.round(s.s1 - s.s2)}°`, tone: solderChecks(s)[0].level === "fail" ? "warn" : "gold",
        readings: [{ label: tx("بدء ذوبان القطعة", "Piece starts to melt"), value: deg(MELT[s.metal].start) }, { label: tx("المسافة بين اللحام الأول والقطعة", "Gap between first solder and piece"), value: `${Math.round(MELT[s.metal].start - s.s1)}°` }], checks: solderChecks(s) }),
      draw: (sh, s) => { const c = solderChecks(s); ladder(sh, [{ t: MELT[s.metal].start, label: tx("تبدأ القطعة بالذوبان", "the piece starts to melt"), tone: "line" }, { t: s.s1, label: tx("اللحام الأول", "first solder"), tone: c.some((x) => x.level === "fail" && x.text.includes(tx("الأول (", "first solder ("))) ? "warn" : "gold" }, { t: s.s2, label: tx("اللحام الثاني", "second solder"), tone: s.s2 > s.s1 - STEP ? "warn" : "gold" }]); },
      aria: (s) => tx(`سلّم حرارة: القطعة تبدأ بالذوبان عند ${deg(MELT[s.metal].start)}، واللحام الأول عند ${deg(s.s1)}، والثاني عند ${deg(s.s2)}.`, `Temperature ladder: the piece starts to melt at ${deg(MELT[s.metal].start)}, the first solder at ${deg(s.s1)}, the second at ${deg(s.s2)}.`),
    },
    {
      id: "enamel", label: tx("مينا فوق لحام", "Enamel over solder"),
      idea: { ref: L2(11), text: tx("المينا زجاج يُحرق في الفرن بعد أن تُلحم القطعة. اللحام الذي تحتها يجب أن يحتمل حرارة الفرن، وما يُضاف بعدها لا يُلحم بالنار.", "Enamel is glass fired in the kiln after the piece is soldered. The solder under it must survive the kiln's heat, and whatever is added afterwards is not joined with fire.") },
      primary: { kind: "range", key: "enamel", label: tx("حرارة حرق المينا", "Enamel firing temperature"), min: 540, max: 900, step: 5, fmt: deg, hint: tx("حرارة الفرن التي تنصهر عندها المينا. المنخفضة نحو 570، والمتوسطة نحو 790، والعالية نحو 870.", "The kiln temperature at which the enamel fuses. Low-firing is about 570, medium about 790, high about 870."), marks: [{ at: 570, label: "570" }, { at: 790, label: "790" }, { at: 870, label: "870" }] },
      groups: [{ title: tx("القطعة واللحام تحت المينا", "The piece and the solder under the enamel"), controls: [metalCtl,
        { kind: "range", key: "under", label: tx("حرارة اللحام تحت المينا", "Temperature of the solder under the enamel"), min: 550, max: 980, step: 5, fmt: deg, hint: tx("الحرارة التي يسيل عندها اللحام الذي صُنعت به القطعة قبل المينا. يجب أن تعلو حرارة الفرن وتبقى تحت ذوبان القطعة.", "The temperature at which the solder used before enamelling flows. It must be above the kiln temperature and stay below the piece's melting.") }] }],
      result: (s) => ({ label: tx("المسافة بين المينا وذوبان القطعة", "Gap between enamel and piece melting"), value: `${Math.round(MELT[s.metal].start - s.enamel)}°`, tone: enamelChecks(s)[0].level === "fail" ? "warn" : "gold",
        readings: [{ label: tx("بدء ذوبان القطعة", "Piece starts to melt"), value: deg(MELT[s.metal].start) }, { label: tx("اللحام فوق حرارة الفرن بـ", "Solder above kiln temperature by"), value: `${Math.round(s.under - s.enamel)}°` }], checks: enamelChecks(s) }),
      draw: (sh, s) => ladder(sh, [{ t: MELT[s.metal].start, label: tx("تبدأ القطعة بالذوبان", "the piece starts to melt"), tone: "line" }, { t: s.under, label: tx("اللحام تحت المينا", "solder under the enamel"), tone: s.under < s.enamel + MARGIN || s.under > MELT[s.metal].start - MARGIN ? "warn" : "gold" }, { t: s.enamel, label: tx("فرن المينا", "enamel kiln"), tone: s.enamel >= MELT[s.metal].start ? "warn" : "gold" }]),
      aria: (s) => tx(`سلّم حرارة: القطعة تبدأ بالذوبان عند ${deg(MELT[s.metal].start)}، واللحام تحت المينا عند ${deg(s.under)}، وفرن المينا عند ${deg(s.enamel)}.`, `Temperature ladder: the piece starts to melt at ${deg(MELT[s.metal].start)}, the solder under the enamel at ${deg(s.under)}, the enamel kiln at ${deg(s.enamel)}.`),
    },
  ],
  examples: [
    { id: "two18", station: "solder", origin: "book", ref: L2(5), title: tx("ورشة 1 · لحامان على عيار 18", "Workshop 1 · two solders on 18k"), says: tx("قاسٍ ثم متوسط", "hard, then medium"),
      quote: "يكتمل ذوبانه دون بدء ذوبان القطعة بعشرين درجة على الأقل",
      note: tx("على عيار 18 الأصفر: لحام قاسٍ يسيل عند نحو 800 درجة للوصلة الأولى، ثم لحام متوسط عند نحو 775 للثانية. كل واحد تحت الذي قبله بمسافة آمنة.", "On 18k yellow: a hard solder flowing at about 800 degrees for the first joint, then a medium solder at about 775 for the second. Each sits a safe distance below the one before."), state: { metal: "k18", s1: 800, s2: 775 } },
    { id: "two21", station: "solder", origin: "book", ref: L2(5), title: tx("ورشة 2 · لحامان على عيار 21", "Workshop 2 · two solders on 21k"), says: tx("مسافة أوسع", "a wider gap"),
      note: tx("عيار 21 يبدأ ذوبانه أعلى، فيتسع السلّم: لحام أول عند 880 درجة وثانٍ عند 800.", "21k starts to melt higher, so the ladder opens up: a first solder at 880 degrees and a second at 800."), state: { metal: "k21", s1: 880, s2: 800 } },
    { id: "en18", station: "enamel", origin: "book", ref: L2(11), title: tx("ورشة 1 · مينا متوسطة على عيار 18", "Workshop 1 · medium enamel on 18k"), says: tx("تُحرق عند 790", "fired at 790"),
      quote: "والذهب من عيار 18 الذي تتساوى فيه الفضة والنحاس تُحرق عليه المينا عند نحو 815 درجة أو أقل",
      note: tx("مينا متوسطة تُحرق عند 790 درجة على عيار 18، فوق لحام يسيل عند 820. اللحام يحتمل الفرن، والقطعة تبقى تحت ذوبانها.", "A medium enamel fired at 790 degrees on 18k, over a solder that flows at 820. The solder survives the kiln, and the piece stays below its melting."), state: { metal: "k18", enamel: 790, under: 820 } },
    { id: "enLow", station: "enamel", origin: "book", ref: L2(11), title: tx("ورشة 2 · مينا منخفضة على فضة إسترلينية", "Workshop 2 · low-firing enamel on sterling silver"), says: tx("تُحرق عند 570", "fired at 570"),
      note: tx("الفضة الإسترلينية يبدأ ذوبانها نحو 800 درجة. مينا منخفضة تُحرق عند 570 تترك مسافة واسعة، فوق لحام يسيل عند 700.", "Sterling silver starts to melt at about 800 degrees. A low-firing enamel at 570 leaves a wide gap, over a solder that flows at 700."), state: { metal: "s925", enamel: 570, under: 700 } },
  ],
  guide: {
    models: [
      tx("كل عملية بالنار تُسخّن القطعة كلها، فكل ما صُنع قبلها يجب أن يحتمل حرارتها.", "Every operation with fire heats the whole piece, so everything made before it must survive its heat."),
      tx("اللحام يكتمل ذوبانه قبل أن تبدأ القطعة بالذوبان بعشرين درجة على الأقل: هذا هامش ميزان الحرارة ويد الصائغ على اللهب.", "The solder is fully molten at least twenty degrees before the piece starts to melt: that is the margin for the thermometer and the goldsmith's hand on the flame."),
      tx("بين لحام ولحام 15 درجة على الأقل، وهي المسافة التي تُصنع بها أطقم اللحام القاسي والمتوسط والسهل، حتى لا تسيل الوصلة الأولى عند عمل الثانية.", "At least 15 degrees between one solder and the next — the spacing hard, medium and easy solder sets are made with — so the first joint does not flow while the second is made."),
      tx("حرق المينا: المنخفضة نحو 570 درجة، والمتوسطة نحو 790، والعالية نحو 870. وعلى عيار 18 تُحرق عند 815 أو أقل، وعلى الإسترلينية بين 760 و790.", "Enamel firing: low about 570 degrees, medium about 790, high about 870. On 18k it is fired at 815 or below, and on sterling between 760 and 790."),
    ],
    notModeled: [
      tx("تركيب سبيكتك بالضبط: عيار 18 الأصفر المعتاد يبدأ ذوبانه نحو 855 درجة، والزنك يخفض هذه الحرارة. رقم سبيكتك من موردها.", "The exact make-up of your alloy: the usual 18k yellow starts to melt at about 855 degrees, and zinc lowers that. Get your alloy's figure from its supplier."),
      tx("الوصل بالليزر أو بالقوس النبضي الذي يسخّن موضعاً صغيراً فقط، وهو طريق ما يُضاف بعد المينا.", "Joining by laser or pulse-arc welding, which heats only a small spot — the way to add anything after enamelling."),
      tx("أثر النار على حالة المعدن: التلدين وفقدان القساوة.", "What fire does to the state of the metal: annealing and loss of hardness."),
    ],
    sources: [tx("قاعدة العشرين درجة وحرارات المينا من «حدود المادة»، الفصلين الخامس والحادي عشر.", "The twenty-degree rule and the enamel temperatures come from “The Limits of Material”, chapters 5 and 11.")],
  },
};
