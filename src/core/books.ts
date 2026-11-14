import { tx } from "./i18n";
// The three books and their chapters, as titled in the November 2026 edit.
// Chapter headings no longer carry numbers, so the lab shows the title and
// keeps the order number only as a short reference (ف10).

export type BookId = "impact" | "limits" | "decision";

export interface Book {
  id: BookId;
  short: string; // ك1, ك2, ك3
  title: string;
  chapters: string[]; // index 0 = chapter 1
}

export const BOOKS: Record<BookId, Book> = {
  impact: {
    id: "impact",
    short: tx("ك1", "B1"),
    title: tx("بنية الأثر", "Architecture of Impact"),
    chapters: [
      tx("قبل أن تقول: جميلة", "Before You Say: Beautiful"),
      tx("القطعة أكثر من مجموع عناصرها", "A Piece Is More Than the Sum of Its Parts"),
      tx("من أين تبدأ العين، وإلى أين تذهب؟", "Where Does the Eye Start, and Where Does It Go?"),
      tx("الكتلة والفراغ وتوزيع القوة", "Mass, Void and the Distribution of Force"),
      tx("المادة التي تراها العين قبل أن تلمسها اليد", "The Material the Eye Sees Before the Hand Touches It"),
      tx("حين يدخل الجسد في التكوين", "When the Body Enters the Composition"),
      tx("الصورة تصنع حضوراً آخر للقطعة", "The Photograph Gives the Piece Another Presence"),
      tx("تمييز الشعور عن الحكم", "Telling Feeling from Judgment"),
      tx("كيف تكتسب القطعة شخصية؟", "How Does a Piece Gain Character?"),
      tx("المعنى الذي لا يصنعه الشكل وحده", "The Meaning That Form Alone Cannot Make"),
      tx("بعد الامتلاك: الهدية والذاكرة والهوية", "After Ownership: Gift, Memory and Identity"),
      tx("من الذوق إلى الحجة", "From Taste to Argument"),
      tx("ماذا يقول الجمهور فعلاً؟", "What Does the Audience Actually Say?"),
      tx("السؤال النقدي: لماذا حدث الأثر؟", "The Critical Question: Why Did the Effect Happen?"),
      tx("خريطة التحول", "The Map of Transformation"),
      tx("حدود القرار: متى ينقلب الأثر؟", "Limits of the Decision: When Does the Effect Flip?"),
      tx("من التجربة المطلوبة إلى البنية", "From the Intended Experience to Structure"),
      tx("تجربة واحدة، أشكال متعددة", "One Experience, Many Forms"),
    ],
  },
  limits: {
    id: "limits",
    short: tx("ك2", "B2"),
    title: tx("حدود المادة", "The Limits of Material"),
    chapters: [
      tx("الثقب الأول", "The First Hole"),
      tx("الرقم في باطن الخاتم", "The Number Inside the Ring"),
      tx("بياض يدوم وبياض يزول", "A White That Lasts and a White That Fades"),
      tx("الثقل الذي لا يرى", "The Weight You Cannot See"),
      tx("ما تتركه النار", "What the Fire Leaves Behind"),
      tx("ما تأخذه الأداة", "What the Tool Takes Away"),
      tx("الحلقة في الحلقة", "A Link Within a Link"),
      tx("صلابة لا تمنع الكسر", "Hardness Does Not Prevent Breaking"),
      tx("ما يصنع في المختبر", "What Is Made in the Laboratory"),
      tx("بين الضوء والقبضة", "Between Light and Grip"),
      tx("ما ليس حجراً ولا معدناً", "Neither Stone nor Metal"),
      tx("عائلة على جسد واحد", "A Family on One Body"),
      tx("ما يكتبه الزمن على السطح", "What Time Writes on the Surface"),
    ],
  },
  decision: {
    id: "decision",
    short: tx("ك3", "B3"),
    title: tx("صياغة القرار", "The Craft of Decision"),
    chapters: [
      tx("ما يسبق ملف التصميم الرقمي", "What Comes Before the Design File"),
      tx("الجسد بوصفه بيئة تشغيل", "The Body as an Operating Environment"),
      tx("ما يجب حمايته وما يمكن تغييره", "What Must Be Protected and What May Change"),
      tx("ترجمة الشروط إلى هندسة", "Translating Conditions into Geometry"),
      tx("الذهب وحالة المادة في القرار", "Gold and the State of the Material in the Decision"),
      tx("مجال الأداة والوصول إليها", "The Tool's Reach and Access"),
      tx("الحركة والوصل والتجميع في التصميم", "Movement, Joining and Assembly in Design"),
      tx("التفاصيل داخل البنية", "Details Inside the Structure"),
      tx("اختبار التعارض بين المطالب", "Testing Conflicts Between Demands"),
      tx("ثمن البدائل", "The Price of Alternatives"),
      tx("تسليم القرار ونقله", "Handing Over the Decision"),
      tx("مسارات التصنيع داخل القطعة", "Manufacturing Routes Inside the Piece"),
      tx("أثر القطع والوصل والتجميع", "The Effect of Cutting, Joining and Assembly"),
      tx("تحولات السطح في التصنيع", "Surface Changes in Manufacturing"),
      tx("حدود تحمل القرار", "How Much the Decision Can Bear"),
      tx("معرفة القطعة عند مغادرتها المصنع", "What Is Known About the Piece When It Leaves the Factory"),
      tx("ما تكشفه حياة القطعة", "What the Life of the Piece Reveals"),
      tx("عودة الدليل إلى النموذج", "Returning the Evidence to the Model"),
      tx("القرار عبر حياة القطعة", "The Decision Across the Life of the Piece"),
    ],
  },
};

export const BOOK_ORDER: BookId[] = ["limits", "decision", "impact"];

export interface ChapterRef {
  book: BookId;
  chapter: number; // 1-based
  where?: string; // e.g. "ملحق الورشة", "حالة على طاولة العمل"
}

export function chapterTitle(ref: ChapterRef): string {
  return BOOKS[ref.book].chapters[ref.chapter - 1] ?? "";
}

/** "ك2 · ف10 · بين الضوء والقبضة" */
export function refLabel(ref: ChapterRef, withTitle = true): string {
  const b = BOOKS[ref.book];
  const parts = [b.title, tx(`الفصل ${ref.chapter}`, `Chapter ${ref.chapter}`)];
  if (withTitle) parts.push(chapterTitle(ref));
  if (ref.where) parts.push(ref.where);
  return parts.join(" · ");
}
