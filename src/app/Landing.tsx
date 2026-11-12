import { BRAND, RIGHTS, tx } from "../core/i18n";
import { LangButton } from "./LangButton";
import { useEffect, useState } from "preact/hooks";
import { BOOKS, BOOK_ORDER, type BookId } from "../core/books";
import { TOOLS, toolById, toolsForChapter } from "../core/registry";
import { Icon, Mark } from "../core/ui/icons";
import { lastTool } from "./route";
import { matches } from "./ToolList";
import { DOMAIN, EDITION } from "./Workspace";

/** Where the single QR code in each book lands. Chapters first, so the reader reaches a tool in two taps. */
export function Landing({ focus }: { focus?: { book: BookId; chapter: number } }) {
  const [q, setQ] = useState("");
  const last = lastTool.get();
  const lastMeta = last ? toolById(last) : undefined;
  const ready = TOOLS.filter((t) => t.status === "ready").length;

  useEffect(() => {
    if (!focus) return;
    document.getElementById(`${focus.book}-${focus.chapter}`)?.scrollIntoView({ block: "center" });
  }, [focus?.book, focus?.chapter]);

  return (
    <div class="landing">
      <header class="top top-landing">
        <a class="brand" href="#home"><Mark /><span class="brand-name">{tx("منطق المعدن", "METAL LOGIC LAB")}</span><span class="brand-sub">{tx("المختبر التفاعلي", "Interactive tools for the trilogy")}</span></a>
        <LangButton />
      </header>

      <main class="landing-main" id="main">
        <section class="hero">
          <h1>{BRAND}</h1>
          <p>
            {tx("كل أداة هنا ترسم القطعة بمقياسها، وتحسب أمامك. غيّر الأرقام كما تشاء، وانظر متى تصير القطعة في خطر ولماذا.", "Every tool here draws the piece to scale and does the sums in front of you. Change the numbers as you like, and see when the piece is at risk — and why.")}
          </p>
          <div class="hero-row">
            {lastMeta && lastMeta.status === "ready" && (
              <a class="continue" href={`#${lastMeta.id}`}>
                <Icon name={lastMeta.icon} />
                <span><span class="continue-label">{tx("تابع من حيث توقفت", "Pick up where you left off")}</span><span class="continue-title">{lastMeta.title}</span></span>
                <Icon name="arrow" size={16} />
              </a>
            )}
            <label class="search search-hero" for="landing-search">
              <Icon name="search" size={18} />
              <span class="sr-only">{tx("ابحث عن أداة أو فصل", "Search for a tool or chapter")}</span>
              <input id="landing-search" type="search" placeholder={tx("ابحث: مخلب، مقاس، الفصل العاشر …", "Search: prong, size, chapter 10 …")} value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} />
            </label>
          </div>
        </section>

        <div class="tools" id="tools">
          {BOOK_ORDER.map((b) => {
            const list = TOOLS.filter((t) => t.book === b && matches(t, q));
            if (!list.length) return null;
            return (
              <section class="book" aria-labelledby={`tools-${b}`}>
                <h2 id={`tools-${b}`}>{BOOKS[b].title}</h2>
                <ul class="cards">
                  {list.map((t) => {
                    const ch = [...new Set(t.refs.filter((r) => r.book === t.book).map((r) => r.chapter))].sort((x, y) => x - y);
                    const inner = (
                      <>
                        <span class="card-head"><Icon name={t.icon} size={20} /><span class="card-title">{t.title}</span></span>
                        <span class="card-q">{t.summary}</span>
                        <span class="card-ref">{ch.length > 1 ? tx("الفصول", "Chapters") : tx("الفصل", "Chapter")} <span class="num">{ch.join(tx("، ", ", "))}</span></span>
                      </>
                    );
                    return (
                      <li>
                        {t.status === "ready"
                          ? <a class="tool-card" href={`#${t.id}`}>{inner}</a>
                          : <span class="tool-card is-planned" aria-disabled="true">{inner}<span class="rail-soon">{tx("قيد البناء", "in progress")}</span></span>}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          {q.trim() && !TOOLS.some((t) => matches(t, q)) && (
            <p class="no-results" role="status">{tx(`لا أداة تطابق «${q}». جرّب كلمة أخرى مثل: مخلب، سوار، مقاس، لحام.`, `No tool matches “${q}”. Try another word, such as: prong, bangle, size, solder.`)}</p>
          )}
        </div>

        <section class="how" aria-label={tx("كيف تستعمل الأداة", "How to use a tool")}>
          <div><h2>{tx("الفكرة", "The idea")}</h2><p>{tx("تحت كل رسم سطر يشرح الفكرة بكلام بسيط، مع موضعها في الكتاب.", "Under every drawing, a line explains the idea in plain words and says where it sits in the book.")}</p></div>
          <div><h2>{tx("أمثلة جاهزة", "Ready examples")}</h2><p>{tx("تصاميم صحيحة من الورشة ومن المقاسات العالمية. اضغط مثالاً لترجع إلى تصميم صحيح وتقارنه بما جرّبته.", "Sound designs from the workshop and from international sizes. Press one to return to a sound design and compare it with what you tried.")}</p></div>
          <div><h2>{tx("شرح الأداة", "About each tool")}</h2><p>{tx("كل أداة تقول ما تحسبه وما لا تحسبه، حتى لا يُفهم الرقم أكثر مما يعني.", "Every tool says what it calculates and what it does not, so no number is read as more than it means.")}</p></div>
        </section>

        <details class="by-chapter" open={!!focus || undefined}>
          <summary>{tx("تصفّح الأدوات حسب فصول الكتب", "Browse the tools by book chapter")}</summary>
          <div class="books">
            {BOOK_ORDER.map((b) => {
              const book = BOOKS[b];
              const rows = book.chapters.map((title, i) => ({ n: i + 1, title, tools: toolsForChapter(b, i + 1) })).filter((r) => r.tools.length);
              if (!rows.length) return null;
              return (
                <div class="book">
                  <h3 id={`book-${b}`}>{book.title}</h3>
                  <ol class="chapters">
                    {rows.map((r) => (
                      <li id={`${b}-${r.n}`} class={focus && focus.book === b && focus.chapter === r.n ? "is-focus" : ""}>
                        <span class="chapter-title">{tx("الفصل", "Chapter")} <span class="num">{r.n}</span> · {r.title}</span>
                        <span class="chapter-tools">
                          {r.tools.map((t) => t.status === "ready"
                            ? <a class="tool-chip" href={`#${t.id}`}><Icon name={t.icon} size={16} />{t.title}</a>
                            : <span class="tool-chip is-planned" aria-disabled="true"><Icon name={t.icon} size={16} />{t.title}<span class="sr-only">{tx(" — قيد البناء", " — in progress")}</span></span>)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </details>
      </main>

      <footer class="status status-landing">
        <span>{ready === TOOLS.length ? <><span class="num">{ready}</span> {tx("أداة جاهزة", "tools ready")}</> : <><span class="num">{ready}</span> {tx("من", "of")} <span class="num">{TOOLS.length}</span> {tx("أدوات جاهزة، والبقية قيد البناء", "tools ready, the rest in progress")}</>}</span>
        <span class="status-end">{RIGHTS}</span>
        <span>{EDITION}</span>
        <span class="num">{DOMAIN}</span>
      </footer>
    </div>
  );
}
