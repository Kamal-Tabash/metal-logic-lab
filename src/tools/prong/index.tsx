import { tx } from "../../core/i18n";
import { useMemo, useState } from "preact/hooks";
import { CadCanvas } from "../../core/cad/CadCanvas";
import { refLabel } from "../../core/books";
import { runCase } from "../../core/cases";
import { CUTS, PRONG_HEIGHT, SEAT_ALLOYS, STONES, UNDER_MIN, defaultCut, seatAlloy } from "../../core/data";
import type { CaseChip, Layout, Station, ToolSlots } from "../../core/tool";
import { Group, Range, Result, Segmented } from "../../core/ui/controls";
import { CASES } from "./cases";
import { drawLength, drawLosses, drawSeat, drawStoneLoad } from "./draw";
import { depthLimit, diameterForAlloy, lengthRatios, prongHeight, losses, prongCheck, remaining, seatChecks, stone, underStoneOk } from "./model";
import { DEFAULT_STATE, LIMITS, type ProngState, type ProngStation } from "./state";

const STATIONS: Station[] = [
  { id: "seat", label: tx("عمق المقعد", "Seat depth") },
  { id: "length", label: tx("السماكة والطول", "Thickness & length") },
  { id: "stone", label: tx("وزن الحجر", "Stone weight") },
  { id: "losses", label: tx("ما يضيع في التصنيع", "Lost in making") },
];

// Each station's idea in plain words (the book's own sentences stay in the cases' data, checked against the book).
const QUOTES: Record<ProngStation, { ref: ToolSlots["bookline"]["ref"]; quote: string }> = {
  seat: {
    ref: { book: "limits", chapter: 10 },
    quote: tx("المقعد هو الحزّ الذي يُقطع في المخلب ليجلس فيه الحجر. كلما زاد عمقه ضعف المخلب. في عيار 21 لا يزيد عمقه على ربع قطر المخلب.", "The seat is the notch cut into the prong for the stone to sit in. The deeper it goes, the weaker the prong. In 21k it goes no deeper than a quarter of the prong's diameter."),
  },
  length: {
    ref: { book: "limits", chapter: 1 },
    quote: tx("المخلب الأثخن أقوى بكثير: زيادة صغيرة في القطر ترفع مقاومته للثني كثيراً. والمخلب الأطول أضعف من القصير.", "A thicker prong is far stronger: a small increase in diameter raises its bending resistance a great deal. And a longer prong is weaker than a short one."),
  },
  stone: {
    ref: { book: "limits", chapter: 10 },
    quote: tx("الحجر الأكبر أثقل بكثير مما يوحي به قطره: إذا تضاعف القطر صار الوزن ثمانية أضعاف، فيحتاج مخلباً أقوى.", "A bigger stone is far heavier than its diameter suggests: double the diameter and the weight becomes eight times, so it needs a stronger prong."),
  },
  losses: {
    ref: { book: "limits", chapter: 10 },
    quote: tx("ما يصل إلى الحجر أنحف مما رُسم في الملف: التنظيف والصقل يأخذان من المخلب، ثم يأخذ المقعد.", "What reaches the stone is thinner than what was drawn in the file: cleaning and polishing take from the prong, and then the seat takes more."),
  },
};

const GUIDE = {
  models: [
    tx("المخلب عمود مستدير مثبت من قاعدته، والحجر يدفعه عند المقعد. نحسب كم يحتمل قبل أن ينثني ولا يعود.", "The prong is a round post fixed at its base, and the stone pushes on it at the seat. We work out how much it takes before it bends and does not come back."),
    tx("قوة المخلب ضد الثني تكبر بسرعة مع سماكته: إذا زادت السماكة 10٪ زادت القوة نحو الثلث. وتقلّ كلما طال المخلب. كل المقارنات بالنسب، لا بأرقام مطلقة.", "A prong's strength against bending grows fast with its thickness: 10% more thickness gives about a third more strength. It falls as the prong gets longer. All comparisons are ratios, not absolute figures."),
    tx("المقعد يُقطع على شكل الحجر نفسه: رف تحت الحزام، وجدار عنده، وسقف فوقه. والرسم الصغير يُظهر مقطع المخلب عند المقعد وما بقي منه.", "The seat is cut to the shape of the stone itself: a ledge under the girdle, a wall at it, and a roof above it. The small drawing shows the prong's section at the seat and what is left of it."),
    tx("الحدود تتبع السبيكة. في عيار 21 و22: المقعد لا يتعدى ربع السماكة، وعند الثلث ينهار المخلب. وفي عيار 18 و14 والبلاتين، على المقاسات العالمية: المقعد حتى نصف السماكة، وفي المخلب المشترك ربع لكل مقعد.", "The limits follow the alloy. In 21k and 22k: the seat goes no deeper than a quarter of the thickness, and at a third the prong collapses. In 18k, 14k and platinum, by international sizes: the seat goes up to half the thickness, and in a shared prong a quarter per seat."),
    tx("السماكة المناسبة للمخلب تتبع الحجر. في عيار 21 و22 أرقام ورشتي: 0.52 ملم لأحجار 1.10، ونحو 1 ملم لحجر 4 ملم، و1.25 إلى 1.3 لماسة 6.5. وفي السبائك الأقسى المقاسات العالمية: 1.0 إلى 1.3 لماسة القيراط، و1.2 فأكثر لحجر القيراطين. ولا مخلب أنحف من 0.45 ملم. والمخلب الأثخن من اللازم بكثير تنبيه لا خطأ.", "The right prong thickness follows the stone. In 21k and 22k, my workshop's figures: 0.52 mm for 1.10 mm stones, about 1 mm for a 4 mm stone, and 1.25 to 1.3 for a 6.5 mm diamond. In harder alloys, international sizes: 1.0 to 1.3 for a one-carat diamond, and 1.2 or more for a two-carat stone. No prong is thinner than 0.45 mm."),
    tx("طول المخلب قبل التثبيت: المعتاد أطول من الحجر بالربع (حجر 0.8 ملم ومخلب 1 ملم). الأحمر حين يقصر عن أن يُثنى فوق الحجر.", "Prong length before setting: usually a quarter taller than the stone (a 0.8 mm stone and a 1 mm prong). Red when it is too short to bend over the stone."),
    tx("المعدن تحت الحجر 0.5 ملم حداً أدنى: هو حدّي في عيار 21، وأعمل به في غيره.", "Metal under the stone, 0.5 mm minimum: that is my limit in 21k, and I work to it in other alloys too."),
    tx("وزن الحجر يُحسب من قطره وشكل قطعه ومادته، بالمعادلات المعتمدة في تجارة الأحجار.", "The stone's weight is worked out from its diameter, cut and material, with the formulas used in the gem trade."),
  ],
  notModeled: [
    tx("الحمل بالأرقام المطلقة (بالنيوتن): يحتاج حد الخضوع الدقيق للسبيكة من موردها.", "The load in absolute figures (in newtons): that needs the alloy's exact yield strength from its supplier."),
    tx("ليونة قاعدة المخلب بعد حرارة اللحام، وتعب المعدن مع تكرار الثني.", "Softening of the prong's base after soldering heat, and metal fatigue from repeated bending."),
    tx("الشكل الدقيق للحزّ، وانحناء رأس المخلب بعد التثبيت (المرسوم تقريبي).", "The exact shape of the notch, and the curve of the prong tip after setting (what is drawn is approximate)."),
    tx("السماكة المطلوبة لحجر جديد خارج المقاسات المعروفة: تُجرَّب على نموذج أول.", "The thickness needed for a new stone outside the known sizes: try it on a first prototype."),
  ],
  sources: [
    tx("أمثلة الورشة أرقامها من «حدود المادة»، والفصل مذكور على كل مثال.", "The workshop examples take their figures from “The Limits of Material”; the chapter is named on each example."),
    tx("الأمثلة العالمية مبنية على مقاسات منشورة في مراجع الصياغة.", "The international examples are built on sizes published in goldsmithing references."),
    tx("كل مثال في «عمق المقعد» تصميم صحيح، ويعيد كل الأرقام إلى الصواب.", "Every example in “Seat depth” is a sound design, and brings all the numbers back to what is right."),
    tx("كثافة المويسانيت والزمرد من المراجع الجمولوجية.", "The densities of moissanite and emerald come from gemmological references."),
  ],
};


const f2 = (v: number) => v.toFixed(2);
const pct = (v: number) => tx(`${Math.round(v * 100)}٪`, `${Math.round(v * 100)}%`);

export default function ProngLab({ Layout }: { Layout: Layout }) {
  const [st, setSt] = useState<ProngState>(DEFAULT_STATE);
  const [station, setStation] = useState<ProngStation>("seat");
  const [results, setResults] = useState<Record<string, { value: string; pass?: boolean }>>({});
  // the book case whose values are in the tool now, and what the tool held before it
  const [active, setActive] = useState<{ id: string; before: ProngState } | null>(null);
  // moving any control takes the tool off the case: the case stays verified, no longer applied
  const set = (patch: Partial<ProngState>) => { setActive(null); setSt((s) => ({ ...s, ...patch })); };
  const reset = () => { setActive(null); setSt(DEFAULT_STATE); };

  const stoneOpts = STONES.map((s) => ({ value: s.id, label: s.name }));
  const cutOpts = CUTS.map((c) => ({ value: c.id, label: c.name }));

  const cases: CaseChip[] = useMemo(
    () =>
      CASES.filter((c) => c.station === station).map((c) => {
        const r = results[c.id];
        return {
          id: c.id, title: c.title, kind: c.kind, origin: c.origin ?? "book", bookSays: c.bookSays, quote: c.quote, note: c.note,
          refLabel: c.ref ? refLabel(c.ref) : tx("مقاسات عالمية", "International sizes"),
          result: r?.value,
          state: !r ? "idle" : c.kind === "explore" ? "shown" : r.pass ? "pass" : "fail",
          active: active?.id === c.id,
          onRun: () => {
            if (active?.id === c.id) {
              // pressed again: take the case's values out
              setSt(active.before);
              setActive(null);
              return;
            }
            const before = active ? active.before : st;
            const { state, result } = runCase(c, before);
            setSt(state);
            setActive({ id: c.id, before });
            setResults((m) => ({ ...m, [c.id]: result }));
          },
        };
      }),
    [station, results, st, active],
  );

  let drawing, result, primary, controls, label: string, grid = "0.1 · 0.5 mm";

  if (station === "seat") {
    const rem = remaining(st.h, st.cuts);
    const checks = seatChecks(st);
    const worst = checks[0].level;
    const pc = prongCheck(st.d, st.stoneD, st.alloy, st.stoneId, st.cut);
    const sw = stone(st.stoneD, st.stoneId, st.cut);
    const ht = prongHeight(st.d, st.stoneD, st.stoneId, st.cut, st.tipR);
    const lim = depthLimit(st.alloy, st.cuts);
    const alloy = seatAlloy(st.alloy);
    const hmm = st.h * st.d;
    const okUnder = underStoneOk(st.under);
    label = tx(`مسقط جانبي لمخلب قطره ${f2(st.d)} ملم يمسك حجراً قطره ${f2(st.stoneD)} ملم بمقعد عمقه ${hmm.toFixed(3)} ملم، أي ${f2(st.h)} من القطر؛ يبقى ${pct(rem.I)} من قوة المخلب عند المقعد.`, `Side view of a prong ${f2(st.d)} mm across holding a stone ${f2(st.stoneD)} mm across, with a seat ${hmm.toFixed(3)} mm deep, which is ${f2(st.h)} of the diameter; ${pct(rem.I)} of the prong's strength is left at the seat.`);
    drawing = <CadCanvas draw={(s) => drawSeat(s, st)} deps={[st]} label={label} />;
    result = (
      <Result
        label={tx("ما بقي من قوة المخلب عند المقعد", "Prong strength left at the seat")}
        value={pct(rem.I)}
        fraction={rem.I}
        tone={worst === "fail" ? "warn" : "gold"}
        readings={[
          { label: tx("مقاومة الانحناء", "Bending resistance"), value: pct(rem.S) },
          { label: tx("المعدن الباقي في المقطع", "Metal left in the section"), value: pct(rem.A) },
          { label: tx("السماكة الباقية", "Thickness left"), value: pct(rem.core) },
          { label: tx("القوة ضد الميل الجانبي", "Strength against leaning sideways"), value: pct(rem.Iside) },
        ]}
        checks={checks}
      />
    );
    primary = (
      <Range
        id="seat-h" label={tx("عمق المقعد", "Seat depth")} hint={tx("المقعد هو الحزّ الذي يجلس فيه الحجر. حرّكه: كلما زاد عمقه ضعف المخلب.", "The seat is the notch the stone sits in. Move it: the deeper it goes, the weaker the prong.")} value={st.h} min={LIMITS.h[0]} max={LIMITS.h[1]} step={0.005}
        display={tx(`${hmm.toFixed(2)} mm · ${pct(st.h)} من القطر`, `${hmm.toFixed(2)} mm · ${pct(st.h)} of diameter`)} onInput={(h) => set({ h })}
        marks={lim.collapse !== undefined
          ? [{ at: lim.limit, label: tx("الربع", "¼"), tone: "gold" }, { at: lim.collapse, label: tx("الثلث", "⅓"), tone: "warn" }]
          : [{ at: lim.limit, label: lim.limit === 0.5 ? tx("النصف", "½") : tx("الربع", "¼"), tone: "warn" }]}
      />
    );
    controls = (
      <>
        <Group title={tx("المخلب", "The prong")}>
          <Segmented label={tx("السبيكة", "Alloy")} value={st.alloy} options={SEAT_ALLOYS.map((a) => ({ value: a.id, label: a.name }))} onChange={(alloy) => set({ alloy })}
            hint={tx("السبيكة اللينة (عيار 21 و22) تحتاج مخلباً أثخن ومقعداً أقل عمقاً من القاسية.", "A soft alloy (21k and 22k) needs a thicker prong and a shallower seat than a hard one.")} />
          <Range id="seat-d" label={tx("سماكة المخلب (قطره)", "Prong thickness (its diameter)")} value={st.d} min={LIMITS.d[0]} max={LIMITS.d[1]} step={0.01} display={`${f2(st.d)} mm`} onInput={(d) => set({ d })}
            hint={tx(`حرّكه ليصير المخلب أنحف أو أثخن. المناسب لحجر ${f2(st.stoneD)} ملم في ${alloy.name}: نحو ${f2(pc.ref)} ملم${pc.covered ? "" : " (حجر خارج المقاسات المعروفة: يُجرَّب على نموذج أول)"}.`, `Move it to make the prong thinner or thicker. What suits a ${f2(st.stoneD)} mm stone in ${alloy.name}: about ${f2(pc.ref)} mm${pc.covered ? "" : " (a stone outside the known sizes: try it on a first prototype)"}.`)} />
          <Range id="seat-tip" label={tx("طول المخلب مقارنةً بارتفاع الحجر", "Prong length compared with stone height")} value={st.tipR} min={LIMITS.tipR[0]} max={LIMITS.tipR[1]} step={0.01}
            display={`× ${st.tipR.toFixed(2)} · ${f2(ht.prong)} mm`} onInput={(tipR) => set({ tipR })}
            marks={[{ at: PRONG_HEIGHT.usual, label: "1.25", tone: "gold" }, { at: Math.min(Math.max(ht.need / ht.stoneH, LIMITS.tipR[0]), LIMITS.tipR[1]), label: tx("أدنى", "min"), tone: "warn" }]}
            hint={tx(`حرّكه ليقصر المخلب أو يطول. الحجر هنا ارتفاعه ${f2(ht.stoneH)} ملم، والمعتاد مخلب أطول منه بالربع: نحو ${f2(ht.stoneH * PRONG_HEIGHT.usual)} ملم. الزائد فوق الحجر يُثنى عليه ليمسكه.`, `Move it to shorten or lengthen the prong. The stone here is ${f2(ht.stoneH)} mm tall, and the usual prong is a quarter taller: about ${f2(ht.stoneH * PRONG_HEIGHT.usual)} mm. The extra above the stone is bent over it to hold it.`)} />
          <Segmented label={tx("نوع المخلب", "Prong type")} value={st.cuts} onChange={(cuts) => set({ cuts })}
            options={[{ value: 1, label: tx("يمسك حجراً واحداً", "Holds one stone") }, { value: 2, label: tx("مشترك بين حجرين", "Shared between two stones") }]}
            hint={tx("المخلب المشترك يُقطع فيه مقعدان، واحد لكل حجر، فيضعف أكثر.", "A shared prong has two seats cut into it, one for each stone, so it is weakened more.")} />
        </Group>
        <Group title={tx("الحجر والقاعدة تحته", "The stone and the base under it")}>
          <Range id="seat-D" label={tx("قطر الحجر", "Stone diameter")} value={st.stoneD} min={LIMITS.stoneD[0]} max={LIMITS.stoneD[1]} step={0.05} display={`${f2(st.stoneD)} mm`} onInput={(stoneD) => set({ stoneD })}
            hint={tx("كبّر الحجر أو صغّره. الحجر الأكبر أثقل، فيحتاج مخلباً أثخن.", "Make the stone bigger or smaller. A bigger stone is heavier, so it needs a thicker prong.")} />
          <Segmented label={tx("مادة الحجر", "Stone material")} value={st.stoneId} options={stoneOpts} onChange={(stoneId) => set({ stoneId, cut: defaultCut(stoneId) })} />
          <Segmented label={tx("شكل القطع", "Cut")} value={st.cut} options={cutOpts} onChange={(cut) => set({ cut })} hint={tx("يغيّر شكل الحجر في الرسم، ووزنه، وزاوية المقعد.", "Changes the stone's shape in the drawing, its weight, and the angle of the seat.")} />
          <p class="ctl-hint">{tx("يزن الحجر", "The stone weighs")} <span class="num-inline">{f2(sw.ct)} ct · {f2(sw.g)} g</span>{pc.weight > 1.01 || pc.weight < 0.99
            ? tx(`، أي ${f2(pc.weight)} مرة ماسة مستديرة بالعرض نفسه، فالمخلب المناسب له نحو ${f2(pc.ref)} ملم.`, ` — ${f2(pc.weight)} times a round diamond of the same width, so the prong that suits it is about ${f2(pc.ref)} mm.`)
            : "."}</p>
          <Range id="seat-u" label={tx("سماكة المعدن تحت الحجر", "Metal thickness under the stone")} value={st.under} min={LIMITS.under[0]} max={LIMITS.under[1]} step={0.05}
            display={`${f2(st.under)} mm`} onInput={(under) => set({ under })}
            marks={[{ at: UNDER_MIN, label: "0.5", tone: "gold" }]}
            hint={tx(`القاعدة التي يجلس فوقها الحجر. ${okUnder ? `تكفي: لا تقل عن ${UNDER_MIN} ملم.` : `رقيقة: أقل من ${UNDER_MIN} ملم.`}`, `The base the stone sits on. ${okUnder ? `Enough: no less than ${UNDER_MIN} mm.` : `Thin: less than ${UNDER_MIN} mm.`}`)} />
        </Group>
      </>
    );
  } else if (station === "length") {
    const r = lengthRatios(st.dA, st.LA, st.dB, st.LB);
    const fa = diameterForAlloy(st.hvA, st.hvB);
    label = tx(`مخلبان: أ بقطر ${f2(st.dA)} وطول ${f2(st.LA)} ملم، وب بقطر ${f2(st.dB)} وطول ${f2(st.LB)} ملم؛ يحتمل ب ${f2(r.tip)} مرة ما يحتمله أ قبل الميل الدائم.`, `Two prongs: A, ${f2(st.dA)} across and ${f2(st.LA)} mm long, and B, ${f2(st.dB)} across and ${f2(st.LB)} mm long; B takes ${f2(r.tip)} times what A takes before it bends for good.`);
    drawing = <CadCanvas draw={(s) => drawLength(s, st)} deps={[st]} label={label} />;
    result = (
      <Result label={tx("كم مرة يحتمل المخلب ب ما يحتمله أ قبل أن ينثني", "How many times prong B takes what A takes before bending")} value={`× ${f2(r.tip)}`}
        readings={[{ label: tx("أثر السماكة وحدها", "Effect of thickness alone"), value: `× ${f2(r.mp)}` }, { label: tx("كم تُزاد سماكة السبيكة اللينة لتساوي القاسية", "How much thicker the soft alloy must be to match the hard one"), value: `× ${f2(fa)}`, tone: "gold" }]} />
    );
    primary = <Range id="len-dB" label={tx("سماكة المخلب ب", "Thickness of prong B")} hint={tx("زد السماكة قليلاً وانظر كم تزيد القوة.", "Add a little thickness and see how much the strength grows.")} value={st.dB} min={LIMITS.dAB[0]} max={LIMITS.dAB[1]} step={0.01} display={`${f2(st.dB)} mm`} onInput={(dB) => set({ dB })} />;
    controls = (
      <>
        <Group title={tx("المخلب أ: نقارن به", "Prong A: the one we compare with")}>
          <Range id="len-dA" label={tx("سماكة المخلب أ", "Thickness of prong A")} value={st.dA} min={LIMITS.dAB[0]} max={LIMITS.dAB[1]} step={0.01} display={`${f2(st.dA)} mm`} onInput={(dA) => set({ dA })} />
          <Range id="len-LA" label={tx("طوله من القاعدة إلى الحجر", "Its length from base to stone")} value={st.LA} min={LIMITS.LAB[0]} max={LIMITS.LAB[1]} step={0.05} display={`${f2(st.LA)} mm`} onInput={(LA) => set({ LA })}
            hint={tx("المخلب الأطول ينثني بقوة أقل.", "A longer prong bends under less force.")} />
        </Group>
        <Group title={tx("المخلب ب: الذي نجرّبه", "Prong B: the one we are trying")}>
          <Range id="len-LB" label={tx("طوله من القاعدة إلى الحجر", "Its length from base to stone")} value={st.LB} min={LIMITS.LAB[0]} max={LIMITS.LAB[1]} step={0.05} display={`${f2(st.LB)} mm`} onInput={(LB) => set({ LB })} />
        </Group>
        <Group title={tx("مقارنة سبيكتين", "Comparing two alloys")}>
          <Range id="len-hvA" label={tx("صلادة السبيكة القاسية", "Hardness of the hard alloy")} value={st.hvA} min={LIMITS.hv[0]} max={LIMITS.hv[1]} step={5} display={`${st.hvA} HV`} onInput={(hvA) => set({ hvA })} />
          <Range id="len-hvB" label={tx("صلادة السبيكة اللينة", "Hardness of the soft alloy")} value={st.hvB} min={LIMITS.hv[0]} max={LIMITS.hv[1]} step={5} display={`${st.hvB} HV`} onInput={(hvB) => set({ hvB })}
            hint={tx("حرّك الصلادتين لترى كم يُزاد المخلب في السبيكة اللينة. الصلادة مؤشر تقريبي، والرقم الدقيق من مورد السبيكة.", "Move the two hardness values to see how much the prong must grow in the soft alloy. Hardness is a rough guide; the exact figure comes from the alloy's supplier.")} />
        </Group>
      </>
    );
  } else if (station === "stone") {
    const A = stone(st.sDA, st.sMA, st.sCA), B = stone(st.sDB, st.sMB, st.sCB);
    const w = (g: number) => (g < 0.1 ? g.toFixed(3) : f2(g));
    const dTop = B.depth - A.depth;
    label = tx(`حجران: المرجع ${f2(st.sDA)} ملم يزن ${w(A.g)} غرام، والجديد ${f2(st.sDB)} ملم يزن ${w(B.g)} غرام، أي ${f2(B.g / A.g)} مرة.`, `Two stones: the reference, ${f2(st.sDA)} mm, weighs ${w(A.g)} g, and the new one, ${f2(st.sDB)} mm, weighs ${w(B.g)} g — ${f2(B.g / A.g)} times as much.`);
    drawing = <CadCanvas draw={(s) => drawStoneLoad(s, st)} deps={[st]} label={label} />;
    result = (
      <Result label={tx("وزن الحجر الجديد", "Weight of the new stone")} value={`${w(B.g)} g`}
        readings={[
          { label: tx("بالقيراط", "In carats"), value: `${w(B.ct)} ct` },
          { label: tx("كم مرة يزن الحجر المرجع", "How many times the reference stone it weighs"), value: `× ${B.g / A.g < 0.1 ? (B.g / A.g).toFixed(3) : f2(B.g / A.g)}`, tone: "gold" },
          { label: tx("فرق الارتفاع عن المرجع", "Height difference from the reference"), value: `${dTop >= 0 ? "+" : ""}${f2(dTop)} mm` },
          { label: tx("وزن الحجر المرجع", "Weight of the reference stone"), value: `${w(A.g)} g · ${w(A.ct)} ct` },
        ]} />
    );
    primary = <Range id="st-DB" label={tx("قطر الحجر الجديد", "Diameter of the new stone")} hint={tx("كبّر الحجر وانظر كيف يقفز وزنه.", "Make the stone bigger and watch its weight jump.")} value={st.sDB} min={LIMITS.sD[0]} max={LIMITS.sD[1]} step={0.05} display={`${f2(st.sDB)} mm`} onInput={(sDB) => set({ sDB })} />;
    controls = (
      <>
        <Group title={tx("الحجر الجديد", "The new stone")}>
          <Segmented label={tx("المادة", "Material")} value={st.sMB} options={stoneOpts} onChange={(sMB) => set({ sMB, sCB: defaultCut(sMB) })} />
          <Segmented label={tx("شكل القطع", "Cut")} value={st.sCB} options={cutOpts} onChange={(sCB) => set({ sCB })} />
        </Group>
        <Group title={tx("الحجر المرجع: نقارن به", "The reference stone: the one we compare with")}>
          <Range id="st-DA" label={tx("قطر الحجر المرجع", "Diameter of the reference stone")} value={st.sDA} min={LIMITS.sD[0]} max={LIMITS.sD[1]} step={0.05} display={`${f2(st.sDA)} mm`} onInput={(sDA) => set({ sDA })} />
          <Segmented label={tx("المادة", "Material")} value={st.sMA} options={stoneOpts} onChange={(sMA) => set({ sMA, sCA: defaultCut(sMA) })} />
          <Segmented label={tx("شكل القطع", "Cut")} value={st.sCA} options={cutOpts} onChange={(sCA) => set({ sCA })} />
        </Group>
        <p class="note">{tx("قطر المخلب لا يُنقل من حجر إلى حجر بالتناسب، لأن الحمل يتبع الوزن والارتفاع معاً، فيُختبر بنموذج أول. لذلك لا تحسب هذه المحطة قطراً للمخلب.", "A prong's diameter does not carry over from one stone to another in proportion, because the load follows both weight and height; it is tested on a first prototype. That is why this tab does not calculate a prong diameter.")}</p>
      </>
    );
  } else {
    const r = losses(st.ld, st.ll, st.lg);
    label = tx(`مخلب قطره في الملف ${f2(st.ld)} ملم يصير ${f2(r.dEff)} ملم بعد التصنيع، وبمقعد عمقه ${r.grooveMm.toFixed(3)} ملم يبقى ${pct(r.I)} من قوة المخلب المرسوم في الملف.`, `A prong ${f2(st.ld)} mm across in the file becomes ${f2(r.dEff)} mm after making, and with a seat ${r.grooveMm.toFixed(3)} mm deep, ${pct(r.I)} of the strength of the prong drawn in the file is left.`);
    drawing = <CadCanvas draw={(s) => drawLosses(s, st)} deps={[st]} label={label} />;
    result = (
      <Result label={tx("ما يبقى من قوة المخلب المرسوم في الملف", "Strength left of the prong drawn in the file")} value={pct(r.I)} fraction={r.I} tone="gold"
        readings={[{ label: tx("السماكة بعد التصنيع", "Thickness after making"), value: `${f2(r.dEff)} mm` }, { label: tx("عمق المقعد", "Seat depth"), value: `${r.grooveMm.toFixed(3)} mm` }, { label: tx("القوة بعد التصنيع وقبل المقعد", "Strength after making, before the seat"), value: pct(r.Ibench) }]} />
    );
    primary = <Range id="ls-ll" label={tx("ما يضيع من السماكة في التنظيف والصقل", "Thickness lost in cleaning and polishing")} hint={tx("حرّكه: كل عُشر ملم يضيع يُضعف المخلب أكثر مما تتوقع.", "Move it: every tenth of a millimetre lost weakens the prong more than you would expect.")} value={st.ll} min={LIMITS.ll[0]} max={LIMITS.ll[1]} step={0.01} display={`${f2(st.ll)} mm`} onInput={(ll) => set({ ll })} />;
    controls = (
      <>
        <Group title={tx("المخلب في الملف والمقعد", "The prong in the file and the seat")}>
          <Range id="ls-ld" label={tx("سماكة المخلب في الملف", "Prong thickness in the file")} value={st.ld} min={LIMITS.ld[0]} max={LIMITS.ld[1]} step={0.01} display={`${f2(st.ld)} mm`} onInput={(ld) => set({ ld })} />
          <Range id="ls-lg" label={tx("عمق المقعد", "Seat depth")} value={st.lg} min={LIMITS.lg[0]} max={LIMITS.lg[1]} step={0.005} display={tx(`${pct(st.lg)} من القطر`, `${pct(st.lg)} of diameter`)} onInput={(lg) => set({ lg })}
            marks={[{ at: 0.25, label: tx("الربع", "¼"), tone: "gold" }, { at: 1 / 3, label: tx("الثلث", "⅓"), tone: "warn" }]} />
        </Group>
        <p class="note">{tx("الأخذ يتفاوت بين النسخ في الإنتاج الكمي، فيُقاس الباقي على نسخة أولى بعد التثبيت والصقل في الموضع الذي يمسك الحجر بالضبط.", "What is taken varies between copies in volume production, so what is left is measured on a first copy after setting and polishing, at the exact spot that holds the stone.")}</p>
      </>
    );
    grid = tx("مقياس واحد للمقاطع الثلاثة", "One scale for the three sections");
  }

  return Layout({
    title: tx("قوة المخلب", "Prong Strength"),
    stations: STATIONS,
    station,
    onStation: (id) => setStation(id as ProngStation),
    drawing,
    result,
    primary,
    controls,
    bookline: QUOTES[station],
    cases,
    onReset: reset,
    guide: GUIDE,
    status: { grid, material: station === "seat" ? seatAlloy(st.alloy).name : tx("عيار 21", "21k") },
  });
}
