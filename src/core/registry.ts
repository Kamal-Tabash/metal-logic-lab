import { tx } from "./i18n";
import type { BookId, ChapterRef } from "./books";
import type { ToolMeta } from "./tool";

const r = (book: BookId, chapter: number, where?: string): ChapterRef => ({ book, chapter, where });

// The 15 engines of the map, in build order inside each book.
// title: two or three plain words; summary: the question the tool answers.
export const TOOLS: ToolMeta[] = [
  {
    id: "prong", code: tx("م2", "T2"), title: tx("قوة المخلب", "Prong Strength"), keywords: tx("d/4 d/3 ربع ثلث ماس ألماس حجر مقعد شوكة مخالب تثبيت", "d/4 d/3 quarter third diamond stone seat claw prong setting basket"), book: "limits", icon: "prong", status: "ready",
    refs: [r("limits", 10), r("limits", 1), r("limits", 2), r("limits", 9)],
    summary: tx("هل يمسك المخلب الحجر؟ جرّب سماكته وعمق المقعد وحجم الحجر.", "Will the prong hold the stone? Try its thickness, the seat depth and the stone size."),
    load: () => import("../tools/prong"),
  },
  { id: "hollow", code: tx("م3", "T3"), title: tx("جدار السوار المجوف", "Hollow Bangle Wall"), keywords: tx("سوار أساور مجوف مصمت نقش وزن", "bangle bracelet hollow solid engraving weight wall"), book: "limits", icon: "hollow", status: "ready", load: () => import("../tools/hollow"),
    refs: [r("limits", 4)], summary: tx("كم يخفّ السوار إذا جُوِّف، وكم يبقى من جداره تحت النقش؟", "How much lighter is a hollow bangle, and how much wall is left under the engraving?") },
  { id: "engrave", code: tx("م4", "T4"), title: tx("عمق النقش", "Engraving Depth"), keywords: tx("نقش حفر كتابة اسم صقل خاتم", "engraving engrave carve lettering name polish ring"), book: "limits", icon: "engrave", status: "ready", load: () => import("../tools/engrave"),
    refs: [r("limits", 6), r("limits", 13)], summary: tx("كم يبقى من المعدن تحت النقش، وكم يأخذ منه الصقل مع السنين؟", "How much metal is left under the engraving, and how much does polishing take over the years?") },
  { id: "scale", code: tx("م1", "T1"), title: tx("الوزن والعيار", "Weight & Karat"), keywords: tx("وزن عيار غرام سعر ذهب كثافة حجم", "weight karat gram price gold density volume"), book: "limits", icon: "scale", status: "ready", load: () => import("../tools/scale"),
    refs: [r("limits", 1), r("limits", 2), r("limits", 9)], summary: tx("كم تزن القطعة وكم ذهباً فيها إذا تغيّر الحجم أو العيار؟", "What does the piece weigh, and how much gold is in it, when the volume or karat changes?") },
  { id: "tongue", code: tx("م9", "T9"), title: tx("لسان القفل", "Clasp Tongue"), keywords: tx("قفل لسان نابض سلسلة", "clasp tongue spring chain box lock"), book: "limits", icon: "tongue", status: "ready", load: () => import("../tools/tongue"),
    refs: [r("limits", 1), r("limits", 7)], summary: tx("هل يبقى لسان القفل نابضاً، أم يتعب ويرتخي؟", "Will the clasp tongue stay springy, or tire and go slack?") },
  { id: "heat", code: tx("م5", "T5"), title: tx("ترتيب اللحام", "Soldering Order"), keywords: tx("لحام حرارة نار مينا فرن ذوبان", "solder soldering heat fire enamel kiln melting"), book: "limits", icon: "heat", status: "ready", load: () => import("../tools/heat"),
    refs: [r("limits", 5), r("limits", 11)], summary: tx("أي لحام يُعمل أولاً حتى لا يذوب ما قبله؟", "Which joint is soldered first so the earlier ones don't melt?") },
  { id: "wear", code: tx("م7", "T7"), title: tx("مواضع التآكل", "Wear Points"), keywords: tx("تآكل احتكاك طلاء سلسلة حلقة", "wear friction plating chain link rub"), book: "limits", icon: "wear", status: "ready", load: () => import("../tools/wear"),
    refs: [r("limits", 7), r("limits", 13), r("limits", 3)], summary: tx("أين تبلى القطعة أسرع، ولماذا؟", "Where does the piece wear fastest, and why?") },
  { id: "size", code: tx("م8", "T8"), title: tx("تعديل المقاس", "Ring Resizing"), keywords: tx("مقاس خاتم ياباني أمريكي أوروبي تكبير تصغير محيط", "size ring japanese american us european resize larger smaller circumference"), book: "limits", icon: "size", status: "ready", load: () => import("../tools/size"),
    refs: [r("limits", 12), r("limits", 5)], summary: tx("كم يمكن تكبير الخاتم أو تصغيره، ومن أين يُقص؟", "How far can a ring be sized up or down, and where is it cut?") },
  { id: "enamel", code: tx("م6", "T6"), title: tx("تشقق المينا", "Enamel Cracking"), keywords: tx("مينا تشقق تمدد زجاج", "enamel crack expansion glass"), book: "limits", icon: "enamel", status: "ready", load: () => import("../tools/enamel"),
    refs: [r("limits", 11)], summary: tx("متى تتشقق المينا على المعدن عند التبريد؟", "When does enamel crack on the metal as it cools?") },

  { id: "access", code: tx("م10", "T10"), title: tx("وصول الأداة", "Tool Access"), keywords: tx("أداة فريزة نقش مخلب وصول", "tool burr cutter engraving prong reach access"), book: "decision", icon: "tool", status: "ready", load: () => import("../tools/access"),
    refs: [r("decision", 6)], summary: tx("هل يصل رأس الأداة إلى المكان، أم يصطدم جسمها بالقطعة؟", "Does the tool tip reach the spot, or does its body hit the piece?") },
  { id: "stack", code: tx("م15", "T15"), title: tx("فرق التنفيذ", "Tolerance Stack-up"), keywords: tx("تفاوت دقة تركيب مفصل تعويض صقل", "tolerance accuracy fit hinge allowance polish stack"), book: "decision", icon: "stack", status: "ready", load: () => import("../tools/stack"),
    refs: [r("decision", 13), r("decision", 15)], summary: tx("كم تختلف القطعة المصنوعة عن مقاسات الملف؟", "How far does the finished piece drift from the file's dimensions?") },
  { id: "pendant", code: tx("م11", "T11"), title: tx("توازن التعليقة", "Pendant Balance"), keywords: tx("تعليقة قلادة عروة مفصل توازن", "pendant necklace bail hinge balance hang"), book: "decision", icon: "pendant", status: "ready", load: () => import("../tools/pendant"),
    refs: [r("decision", 7)], summary: tx("هل تتدلى التعليقة مستقيمة أم تميل؟", "Does the pendant hang straight, or tilt?") },
  { id: "finger", code: tx("م14", "T14"), title: tx("ثبات الخاتم", "Ring Stability"), keywords: tx("خاتم إصبع مفصل دوران واجهة", "ring finger knuckle spin top head"), book: "decision", icon: "finger", status: "ready", load: () => import("../tools/finger"),
    refs: [r("decision", 2)], summary: tx("هل يعبر الخاتم المفصل ويثبت دون أن يدور؟", "Will the ring pass the knuckle and sit without spinning?") },

  { id: "steps", code: tx("م12", "T12"), title: tx("مقارنة النسخ", "Comparing Versions"), keywords: tx("مقارنة نسخ تكوين وحدات إيقاع", "compare versions composition units rhythm"), book: "impact", icon: "steps", status: "ready", load: () => import("../tools/steps"),
    refs: [r("impact", 2), r("impact", 3), r("impact", 4), r("impact", 16)], summary: tx("ماذا يتغيّر في القطعة إذا غيّرنا شيئاً واحداً فقط؟", "What changes in the piece if we change one thing only?") },
  { id: "argument", code: tx("م13", "T13"), title: tx("بناء الحجة", "Building the Argument"), keywords: tx("حجة دعوى معيار نقد تقييم", "argument claim criterion critique evaluation"), book: "impact", icon: "argument", status: "ready", load: () => import("../tools/argument"),
    refs: [r("impact", 12), r("impact", 15), r("impact", 16)], summary: tx("كيف أشرح قراري في التصميم وأدافع عنه؟", "How do I explain my design decision and defend it?") },
];

export const toolById = (id: string) => TOOLS.find((t) => t.id === id);

/** Tools that cite a given chapter. */
export function toolsForChapter(book: BookId, chapter: number): ToolMeta[] {
  return TOOLS.filter((t) => t.refs.some((x) => x.book === book && x.chapter === chapter));
}
