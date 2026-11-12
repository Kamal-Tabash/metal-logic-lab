import { EN, tx } from "../../core/i18n";
// م13 — building an argument: five moves, and what goes missing when one is skipped.
import type { Sheet } from "../../core/cad/sheet";
import { L1, fail, near, ok, sortChecks, type ToolDef } from "../../core/kit";
import type { Check } from "../../core/ui/controls";

type YN = "yes" | "no";
export interface ArgumentState { claim: YN; seen: YN; bridge: YN; standard: YN; limit: YN; sample: "trinity" | "blank" }

export const MOVES: { key: keyof Omit<ArgumentState, "sample">; name: string; trinity: string; blank: string; missing: string; level: "fail" | "near" }[] = [
  { key: "claim", name: tx("الدعوى", "Claim"), trinity: tx("الخاتم يحقق وحدة مرنة.", "The ring achieves a flexible unity."), blank: tx("ماذا أدّعي بالضبط؟", "What exactly am I claiming?"), missing: tx("بلا دعوى محددة يبقى الكلام مدحاً عاماً لا يُختبر", "Without a specific claim the words stay general praise that cannot be tested"), level: "fail" },
  { key: "seen", name: tx("الشواهد", "Evidence"), trinity: tx("ثلاث حلقات متقاربة في العرض، متداخلة ومتحركة، بثلاثة ألوان من الذهب.", "Three bands of similar width, interlocked and moving, in three colours of gold."), blank: tx("ماذا أرى في القطعة نفسها؟", "What do I see in the piece itself?"), missing: tx("دعوى بلا شواهد: لا يستطيع القارئ أن يعود منها إلى القطعة", "A claim without evidence: the reader cannot find their way back from it to the piece"), level: "fail" },
  { key: "bridge", name: tx("الجسر", "Bridge"), trinity: tx("التكرار يحفظ القرابة بين الحلقات، والحركة تسمح بتغيّر القيادة.", "Repetition keeps the bands related, and movement lets the lead change."), blank: tx("لماذا يدعم ما أراه ما أدّعيه؟", "Why does what I see support what I claim?"), missing: tx("قفزة من الملاحظة إلى النتيجة: لا جسر يشرح لماذا تدعم الشواهد الدعوى", "A leap from observation to conclusion: no bridge explains why the evidence supports the claim"), level: "fail" },
  { key: "standard", name: tx("المعيار", "Criterion"), trinity: tx("وحدة واضحة من غير مركز جامد. وهو معيار هذه الحجة، لا معيار كل خاتم.", "A clear unity without a rigid centre. It is the criterion of this argument, not of every ring."), blank: tx("بأي معيار أحكم، وهل أعلنته؟", "By what criterion do I judge, and have I stated it?"), missing: tx("المعيار غير معلن: القارئ لا يعرف بماذا يسائل النتيجة", "The criterion is not stated: the reader does not know what to hold the conclusion against"), level: "fail" },
  { key: "limit", name: tx("الحد والبديل", "Limit & alternative"), trinity: tx("لا تثبت استقبال الناس للخاتم، وتقبل الاعتراض: قد تكون الحركة سبب قراءة أقل استقراراً.", "It does not prove how people receive the ring, and it accepts an objection: the movement may make the reading less stable."), blank: tx("ما الذي لا تثبته حجتي، وما الاعتراض الممكن؟", "What does my argument not prove, and what objection is possible?"), missing: tx("بلا حد ولا بديل تدّعي الحجة أكثر مما تثبت", "Without a limit or an alternative the argument claims more than it proves"), level: "near" },
];
const present = (s: ArgumentState) => MOVES.filter((m) => s[m.key] === "yes").length;
function checks(s: ArgumentState): Check[] {
  return sortChecks(MOVES.map((m) => (s[m.key] === "yes" ? ok(tx(`${m.name}: حاضرة`, `${m.name}: present`)) : m.level === "fail" ? fail(m.missing) : near(m.missing))));
}

/** Text wrapped to a width, one line per row, aligned to the side where reading starts. */
function wrapped(sh: Sheet, text: string, edge: number, top: number, width: number, color: string, size = 12) {
  const align = EN ? "left" as const : "right" as const, right = edge;
  const words = text.split(" "); let line = "", y = top;
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (sh.measure(t, { size }) > width && line) { sh.text(line, right, y, { size, color, align }); line = w; y += size + 6; } else line = t;
  }
  if (line) sh.text(line, right, y, { size, color, align });
}

function draw(sh: Sheet, s: ArgumentState) {
  const ink = sh.ink, pad = 12, n = MOVES.length, gap = 8;
  const h = (sh.h - pad * 2 - gap * (n - 1)) / n, x = pad, w = sh.w - pad * 2, nameW = EN ? Math.min(170, w * 0.36) : Math.min(120, w * 0.3);
  MOVES.forEach((m, i) => {
    const y = pad + i * (h + gap), on = s[m.key] === "yes", c = on ? ink.gold : m.level === "fail" ? ink.warn : ink.muted;
    sh.ctx.save(); sh.ctx.strokeStyle = c; sh.ctx.lineWidth = on ? 1.5 : 1.2; sh.ctx.setLineDash(on ? [] : [5, 4]); sh.ctx.strokeRect(x, y, w, h);
    if (on) { sh.ctx.fillStyle = "rgba(214,162,74,0.07)"; sh.ctx.fillRect(x, y, w, h); }
    sh.ctx.restore();
    // the move's name sits where reading starts; its sentence follows it
    sh.text(`${i + 1} · ${m.name}`, EN ? x + 10 : x + w - 10, y + h / 2, { size: sh.w < 420 && EN ? 12 : 13.5, color: c, align: EN ? "left" : "right", weight: 600 });
    if (on || s.sample === "blank") wrapped(sh, s.sample === "trinity" ? m.trinity : m.blank, EN ? x + nameW + 6 : x + w - nameW - 6, y + Math.max(h / 2 - 9, 12), w - nameW - 70, on ? ink.line : ink.muted, sh.w < 420 ? 11 : 12);
    if (!on) sh.text(tx("ناقصة", "Missing"), EN ? x + w - 12 : x + 12, y + h / 2, { size: 12, color: c, align: EN ? "right" : "left" });
    if (i < n - 1) { sh.rule(x + w / 2, y + h, x + w / 2, y + h + gap, on && s[MOVES[i + 1].key] === "yes" ? ink.gold : ink.warn); }
  });
}

const seg = (key: keyof Omit<ArgumentState, "sample">, label: string, hint: string) => ({ kind: "seg" as const, key, label, options: [{ value: "yes", label: tx("مكتوبة", "Written") }, { value: "no", label: tx("ناقصة", "Missing") }], hint });

export const DEF: ToolDef<ArgumentState> = {
  id: "argument", title: tx("بناء الحجة", "Building the Argument"), unit: "",
  defaults: { claim: "yes", seen: "yes", bridge: "yes", standard: "yes", limit: "yes", sample: "trinity" },
  stations: [{
    id: "moves", label: tx("الحركات الخمس", "The five moves"),
    idea: { ref: L1(12), text: tx("القول إن القطعة «ناجحة» مدح، لا حجة. الحجة خمس خطوات ظاهرة: دعوى محددة، وشواهد من القطعة، وجسر بينهما، ومعيار معلن، وحد تقف عنده. اجعل واحدة «ناقصة» وانظر ما يسقط. هذه الأداة لا تكتب حجتك: تُريك هيكلها وما يحدث حين ينقص.", "Saying a piece “works” is praise, not an argument. An argument is five visible steps: a specific claim, evidence from the piece, a bridge between them, a stated criterion, and a limit where it stops. Set one to “Missing” and see what falls. This tool does not write your argument: it shows you its skeleton and what happens when part is missing.") },
    primary: seg("bridge", tx("الجسر (الحركة الثالثة)", "Bridge (the third move)"), tx("الجسر يشرح لماذا تدعم الشواهد الدعوى. اجعله «ناقصاً» وانظر كيف تقفز الحجة من الملاحظة إلى النتيجة.", "The bridge explains why the evidence supports the claim. Set it to “Missing” and watch the argument leap from observation to conclusion.")),
    groups: [
      { title: tx("باقي الحركات", "The other moves"), controls: [
        seg("claim", tx("الدعوى", "Claim"), tx("قول محدد يمكن اختباره، لا وصف عام مثل «جميل» أو «ناجح».", "A specific statement that can be tested, not a general word like “beautiful” or “successful”.")),
        seg("seen", tx("الشواهد", "Evidence"), tx("ما هو حاضر في القطعة نفسها ويستطيع القارئ أن يراه: مقاسات، علاقات، مواد.", "What is present in the piece itself and the reader can see: dimensions, relationships, materials.")),
        seg("standard", tx("المعيار", "Criterion"), tx("ما أحكم به. إعلانه يجعل القارئ قادراً على مساءلة النتيجة على أساسه.", "What I judge by. Stating it lets the reader question the conclusion on that basis.")),
        seg("limit", tx("الحد والبديل", "Limit & alternative"), tx("ما لا تثبته الحجة، والاعتراض الممكن عليها. الحجة التي تعلن حدها أضيق وأقوى.", "What the argument does not prove, and the objection that could be raised. An argument that states its limit is narrower and stronger.")),
      ] },
      { title: tx("ما يُعرض في المربعات", "What the boxes show"), controls: [
        { kind: "seg", key: "sample", label: tx("المثال", "Example"), options: [{ value: "trinity", label: tx("خاتم الحلقات الثلاث", "The three-band ring") }, { value: "blank", label: tx("أسئلة لحجتك", "Questions for your argument") }], hint: tx("اعرض المثال المعبأ من الكتاب، أو الأسئلة الخمسة التي تجيب عنها لتبني حجتك عن قطعتك.", "Show the worked example from the book, or the five questions you answer to build an argument about your own piece.") },
      ] },
    ],
    result: (s) => ({ label: tx("الخطوات الحاضرة من الخمس", "Steps present out of five"), value: `${present(s)} / 5`, fraction: present(s) / 5, tone: checks(s)[0].level === "fail" ? "warn" : "gold", checks: checks(s) }),
    draw,
    aria: (s) => tx(`بنية حجة من خمس حركات، الحاضر منها ${present(s)}: ${MOVES.map((m) => `${m.name} ${s[m.key] === "yes" ? "مكتوبة" : "ناقصة"}`).join("، ")}.`, `An argument structure of five moves, ${present(s)} present: ${MOVES.map((m) => `${m.name} ${s[m.key] === "yes" ? "written" : "missing"}`).join(", ")}.`),
  }],
  examples: [
    { id: "trinity", station: "moves", origin: "book", ref: L1(12), title: tx("مثال 1 · خاتم الحلقات الثلاث", "Example 1 · the three-band ring"), says: tx("الحركات الخمس كلها", "All five moves"),
      quote: "فالدعوى هي الوحدة المرنة، وشواهدها الحلقات المتقاربة في العرض والمتداخلة، والجسر أن التكرار يحفظ القرابة بينما تسمح الحركة بتغير القيادة، والمعيار هو الوحدة من غير مركز جامد",
      note: tx("حجة كاملة عن خاتم من ثلاث حلقات متداخلة: دعواها الوحدة المرنة، وشواهدها من الخاتم نفسه، وجسرها ومعيارها وحدّها كلها معلنة.", "A complete argument about a ring of three interlocked bands: its claim is flexible unity, its evidence comes from the ring itself, and its bridge, criterion and limit are all stated."),
      state: { claim: "yes", seen: "yes", bridge: "yes", standard: "yes", limit: "yes", sample: "trinity" } },
    { id: "blank", station: "moves", origin: "book", ref: L1(12), title: tx("مثال 2 · أسئلة لحجتك", "Example 2 · questions for your argument"), says: tx("خمسة أسئلة تجيب عنها", "Five questions to answer"),
      note: tx("الهيكل نفسه فارغاً: في كل مربع السؤال الذي تجيب عنه لتكتب حجة عن قطعتك أنت، بالترتيب نفسه.", "The same skeleton, empty: each box holds the question you answer to write an argument about your own piece, in the same order."),
      state: { claim: "yes", seen: "yes", bridge: "yes", standard: "yes", limit: "yes", sample: "blank" } },
  ],
  guide: {
    models: [
      tx("الحجة خمس حركات: دعوى محددة، وشواهد حاضرة في القطعة، وجسر يربطهما، ومعيار معلن، وحد وبديل.", "An argument is five moves: a specific claim, evidence present in the piece, a bridge linking them, a stated criterion, and a limit with an alternative."),
      tx("غياب أي من الأربع الأولى يُسقط الحجة (أحمر)، وغياب الحد يتركها تدّعي أكثر مما تثبت (أصفر).", "Missing any of the first four brings the argument down (red); a missing limit leaves it claiming more than it proves (yellow)."),
    ],
    notModeled: [
      tx("الأداة تفحص حضور الحركات لا صحة ما كُتب فيها: حجة كاملة البنية قد تكون شواهدها ضعيفة.", "The tool checks that the moves are present, not that what is written in them is right: an argument with a complete structure may still have weak evidence."),
      tx("خريطة التحول (العلاقة المستهدفة، والقيمة المحفوظة، وأوضاع اللقاء، وإشارة الانقلاب) لم تُبنَ هنا بعد.", "The Map of Transformation (target relationship, preserved value, modes of encounter, and the flip signal) has not been built here yet."),
    ],
    sources: [tx("الحركات الخمس ومثال خاتم الحلقات الثلاث من «بنية الأثر»، الفصل الثاني عشر.", "The five moves and the three-band ring example come from “Architecture of Impact”, chapter 12.")],
  },
};
