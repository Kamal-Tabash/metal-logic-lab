import { tx } from "../core/i18n";
import { useState } from "preact/hooks";
import { BOOKS, BOOK_ORDER, type BookId } from "../core/books";
import { TOOLS, toolsForChapter } from "../core/registry";
import type { ToolMeta } from "../core/tool";
import { Icon } from "../core/ui/icons";
import { LangButton } from "./LangButton";

/** Normalise Arabic for search: drop diacritics, unify alef and taa marbuta. */
/** Letters as a reader types them: no vowel marks, one form of alef, no "ال" in front of a word. */
export function norm(s: string): string {
  return s
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .replace(/(^|\s)ال(?=\S{2})/g, "$1");
}

const ORDINALS = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر", "الحادي عشر", "الثاني عشر", "الثالث عشر", "الرابع عشر", "الخامس عشر", "السادس عشر"];

export function matches(t: ToolMeta, q: string): boolean {
  if (!q.trim()) return true;
  const hay = norm([
    t.title, t.summary, t.keywords ?? "", BOOKS[t.book].title,
    ...t.refs.map((r) => tx(`الفصل ${r.chapter} ف${r.chapter} الفصل ${ORDINALS[r.chapter - 1] ?? ""} ${BOOKS[r.book].chapters[r.chapter - 1]}`, `chapter ${r.chapter} ch${r.chapter} ch.${r.chapter} ${BOOKS[r.book].chapters[r.chapter - 1]}`)),
  ].join(" "));
  return norm(q).split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

function ToolLink({ t, active, compact }: { t: ToolMeta; active: boolean; compact?: boolean }) {
  const body = (
    <>
      <Icon name={t.icon} />
      <span class="rail-name">{t.title}</span>
      {!compact && t.status !== "ready" && <span class="rail-soon">{tx("قيد البناء", "in progress")}</span>}
    </>
  );
  if (t.status !== "ready")
    return <span class="rail-item is-planned" title={tx(`${t.title} — قيد البناء`, `${t.title} — in progress`)} aria-disabled="true">{body}</span>;
  return (
    <a class={`rail-item${active ? " is-active" : ""}`} href={`#${t.id}`} aria-current={active ? "page" : undefined} title={t.title}>
      {body}
    </a>
  );
}

export function ToolList({ activeId, searchId }: { activeId?: string; searchId: string }) {
  const [tab, setTab] = useState<"tools" | "chapters">("tools");
  const [q, setQ] = useState("");
  const total = TOOLS.length, ready = TOOLS.filter((t) => t.status === "ready").length;

  return (
    <div class="rail-inner">
      <div class="rail-tabs" role="tablist" aria-label={tx("طريقة التصفح", "Browse by")}>
        <button type="button" role="tab" aria-selected={tab === "tools"} onClick={() => setTab("tools")}>{tx("الأدوات", "Tools")}</button>
        <button type="button" role="tab" aria-selected={tab === "chapters"} onClick={() => setTab("chapters")}>{tx("الفصول", "Chapters")}</button>
      </div>
      <label class="search" for={searchId}>
        <Icon name="search" size={16} />
        <span class="sr-only">{tx("ابحث عن أداة أو فصل", "Search for a tool or chapter")}</span>
        <input id={searchId} type="search" placeholder={tx("مخلب، ف10، d/4 …", "prong, ch10, d/4 …")} value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} />
      </label>

      {tab === "tools" &&
        BOOK_ORDER.map((b) => {
          const list = TOOLS.filter((t) => t.book === b && matches(t, q));
          if (!list.length) return null;
          return (
            <section class="rail-group" aria-label={BOOKS[b].title}>
              <h2 class="rail-group-title"><span>{BOOKS[b].title}</span><span class="num">{list.length}</span></h2>
              {list.map((t) => <ToolLink t={t} active={t.id === activeId} />)}
            </section>
          );
        })}

      {tab === "chapters" && BOOK_ORDER.map((b) => <ChapterGroup book={b} q={q} activeId={activeId} />)}

      {/* on a phone the top bar has no room for it, so the language button lives in the drawer */}
      <LangButton where="lang-rail" />
      <p class="rail-foot">
        {ready === total ? <><span class="num">{total}</span> {tx("أداة، ولكل واحدة رابط ثابت يفتحها مباشرة.", "tools, each with a fixed link that opens it directly.")}</> : <><span class="num">{ready}</span> {tx("من", "of")} <span class="num">{total}</span> {tx("أدوات جاهزة.", "tools ready.")}</>}
      </p>
    </div>
  );
}

function ChapterGroup({ book, q, activeId }: { book: BookId; q: string; activeId?: string }) {
  const rows = BOOKS[book].chapters
    .map((title, i) => ({ n: i + 1, title, tools: toolsForChapter(book, i + 1).filter((t) => matches(t, q) || norm(title).includes(norm(q))) }))
    .filter((r) => r.tools.length);
  if (!rows.length) return null;
  return (
    <section class="rail-group" aria-label={BOOKS[book].title}>
      <h2 class="rail-group-title"><span>{BOOKS[book].title}</span></h2>
      {rows.map((r) => (
        <div class="rail-chapter">
          <span class="rail-chapter-title">{tx("الفصل", "Chapter")} <span class="num">{r.n}</span> · {r.title}</span>
          {r.tools.map((t) => <ToolLink t={t} active={t.id === activeId} compact />)}
        </div>
      ))}
    </section>
  );
}
