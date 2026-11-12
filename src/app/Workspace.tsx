import { RIGHTS, tx } from "../core/i18n";
import { LangButton } from "./LangButton";
import { useEffect, useRef, useState } from "preact/hooks";
import { BOOKS, chapterTitle, refLabel } from "../core/books";
import type { ToolMeta, ToolSlots } from "../core/tool";
import { Icon, Mark } from "../core/ui/icons";
import { Guide } from "./Guide";
import { ToolList } from "./ToolList";

export const EDITION = tx("الطبعة الأولى 2026", "First edition 2026");
export const DOMAIN = "logicofmetal.com";

function isTyping(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
}

export function useToast(): [string | null, (m: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number>();
  return [msg, (m) => { setMsg(m); clearTimeout(timer.current); timer.current = window.setTimeout(() => setMsg(null), 2200); }];
}

export async function copyLink(toast: (m: string) => void) {
  const url = location.href;
  try {
    await navigator.clipboard.writeText(url);
    toast(tx("نُسخ رابط الأداة", "Tool link copied"));
  } catch {
    toast(tx(`انسخ الرابط: ${url}`, `Copy the link: ${url}`));
  }
}

export function Workspace({ meta, slots }: { meta: ToolMeta; slots: ToolSlots }) {
  const [drawer, setDrawer] = useState(false);
  const [sheet, setSheet] = useState<"peek" | "open">("peek");
  // every panel folds, so the drawing can be seen alone on any screen
  const [railOn, setRailOn] = useState(true);
  const [propsOn, setPropsOn] = useState(true);
  const [focus, setFocus] = useState(false); // the drawing alone: rail, properties and the idea line all folded
  const railShown = railOn && !focus, propsShown = propsOn && !focus;
  const toggleRail = () => { if (focus) { setFocus(false); setRailOn(true); setPropsOn(false); } else setRailOn((v) => !v); };
  const toggleProps = () => { if (focus) { setFocus(false); setPropsOn(true); setRailOn(false); } else setPropsOn((v) => !v); };
  const toggleFocus = () => { if (focus) { setFocus(false); setRailOn(true); setPropsOn(true); } else { setFocus(true); setSheet("peek"); } };
  const [guide, setGuide] = useState(false);
  const [lineOpen, setLineOpen] = useState(false);
  const [toast, showToast] = useToast();
  const sheetRef = useRef<HTMLElement>(null);
  const drag = useRef<{ y: number; moved: boolean } | null>(null);

  const primaryRef = slots.bookline.ref;
  const book = BOOKS[meta.book];

  // keyboard: 1–n stations, / search, ? guide, Esc closes
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") { setDrawer(false); setSheet("peek"); if (focus) toggleFocus(); return; }
      if (isTyping(e.target) || guide) return;
      if (e.key === "?") { e.preventDefault(); setGuide(true); return; }
      if (e.key === "f" || e.key === "F" || e.key === "ب") { e.preventDefault(); toggleFocus(); return; }
      if (e.key === "/") {
        e.preventDefault();
        const wide = window.matchMedia("(min-width: 600px)").matches && !window.matchMedia("(max-height: 520px) and (orientation: landscape)").matches;
        if (!wide) setDrawer(true);
        setTimeout(() => document.getElementById("rail-search")?.focus(), 30);
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= slots.stations.length) slots.onStation(slots.stations[n - 1].id);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [slots.stations, slots.onStation, guide, focus]);

  // keep the page's bottom padding equal to the sheet's peek height (phone/tablet)
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const peek = el.querySelector(".props-peek") as HTMLElement | null;
      const h = peek ? peek.getBoundingClientRect().height + 28 : 0;
      document.documentElement.style.setProperty("--peek-h", `${Math.round(h)}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onHandleDown = (e: PointerEvent) => { drag.current = { y: e.clientY, moved: false }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); };
  const onHandleMove = (e: PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > 28) { d.moved = true; setSheet(dy < 0 ? "open" : "peek"); drag.current = { y: e.clientY, moved: true }; }
  };
  const openProps = () => { if (focus) { setFocus(false); setRailOn(false); } setPropsOn(true); };
  const onHandleUp = () => { const d = drag.current; drag.current = null; if (!propsShown) { openProps(); return; } if (d && !d.moved) setSheet((s) => (s === "open" ? "peek" : "open")); };

  const checks = slots.cases.filter((c) => c.kind === "check");
  const passed = checks.filter((c) => c.state === "pass").length;
  const tried = checks.filter((c) => c.state === "pass" || c.state === "fail").length;

  return (
    <div class={`ws${drawer ? " has-drawer" : ""}${sheet === "open" ? " sheet-open" : ""}${railShown ? "" : " rail-closed"}${propsShown ? "" : " props-closed"}${focus ? " is-focus-view" : ""}`}>
      <header class="top">
        <button type="button" class="icon-btn only-compact" aria-label={tx("الأدوات والفصول", "Tools and chapters")} aria-expanded={drawer} aria-controls="rail" onClick={() => setDrawer(true)}>
          <Icon name="menu" />
        </button>
        <a class="brand" href="#home" aria-label={tx("مختبر منطق المعدن: الصفحة الأولى", "METAL LOGIC LAB: home page")}>
          <Mark />
          <span class="brand-name">{tx("منطق المعدن", "METAL LOGIC LAB")}</span>
          <span class="brand-sub only-wide">{tx("المختبر التفاعلي", "Interactive tools")}</span>
        </a>
        <nav class="crumbs only-wide" aria-label={tx("المسار", "Breadcrumb")}>
          <span>{book.title}</span>
          <span aria-hidden="true">{tx("‹", "›")}</span>
          <span>{tx(`ف${primaryRef.chapter} · ${chapterTitle(primaryRef)}`, `Ch. ${primaryRef.chapter} · ${chapterTitle(primaryRef)}`)}</span>
          <span aria-hidden="true">{tx("‹", "›")}</span>
          <span class="crumb-here" aria-current="page">{slots.title}</span>
        </nav>
        <div class="top-actions">
          <button type="button" class="btn-ghost" onClick={() => setGuide(true)} aria-haspopup="dialog" aria-label={tx("شرح الأداة", "About this tool")}>
            <Icon name="help" size={18} /><span class="only-wide" aria-hidden="true">{tx("شرح الأداة", "About this tool")}</span>
          </button>
          <button type="button" class="btn-ghost" onClick={() => copyLink(showToast)} aria-label={tx("نسخ رابط هذه الأداة", "Copy this tool's link")}>
            <Icon name="link" size={18} /><span class="only-wide" aria-hidden="true">{tx("نسخ الرابط", "Copy link")}</span>
          </button>
          <LangButton where="lang-top" />
        </div>
      </header>

      <div class="body">
        <aside id="rail" class="rail" aria-label={tx("الأدوات", "Tools")}>
          <div class="rail-drawer-head only-compact">
            <span>{tx("الأدوات والفصول", "Tools and chapters")}</span>
            <button type="button" class="icon-btn" aria-label={tx("إغلاق القائمة", "Close the menu")} onClick={() => setDrawer(false)}><Icon name="close" /></button>
          </div>
          <ToolList activeId={meta.id} searchId="rail-search" />
        </aside>
        {drawer && <div class="scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}

        <main class="main" id="main">
          <div class="toolbar">
            <h1 class="tool-title">{slots.title}</h1>
            <p class="tool-sub only-wide">{meta.summary}</p>
            <div class="stations" role="tablist" aria-label={tx("محطات الأداة", "Tool tabs")}>
              {slots.stations.map((s, i) => (
                <button type="button" role="tab" id={`st-${s.id}`} aria-selected={s.id === slots.station} aria-controls="drawing" onClick={() => slots.onStation(s.id)}>
                  <span class="num st-key" aria-hidden="true">{i + 1}</span>{s.label}
                </button>
              ))}
            </div>
            <div class="view-btns" role="group" aria-label={tx("إظهار القوائم وطيّها", "Show and fold the panels")}>
              <button type="button" class="view-btn only-rail-fold" aria-pressed={railShown} aria-controls="rail" aria-label={railShown ? tx("طيّ قائمة الأدوات", "Fold the tool list") : tx("إظهار قائمة الأدوات", "Show the tool list")} title={tx("قائمة الأدوات", "Tool list")} onClick={toggleRail}>
                <Icon name="railside" size={18} /><span class="only-wide" aria-hidden="true">{tx("الأدوات", "Tools")}</span>
              </button>
              <button type="button" class="view-btn" aria-pressed={propsShown} aria-controls="props" aria-label={propsShown ? tx("طيّ الخصائص", "Fold the properties") : tx("إظهار الخصائص", "Show the properties")} title={tx("الخصائص", "Properties")} onClick={toggleProps}>
                <Icon name="panel" size={18} /><span aria-hidden="true">{tx("الخصائص", "Properties")}</span>
              </button>
              <button type="button" class="view-btn view-focus" aria-pressed={focus} aria-label={focus ? tx("إظهار القوائم", "Show the panels") : tx("الرسم وحده", "Drawing only")} title={tx("الرسم وحده (F)", "Drawing only (F)")} onClick={toggleFocus}>
                <Icon name="focus" size={18} /><span aria-hidden="true">{focus ? tx("إظهار القوائم", "Show the panels") : tx("الرسم وحده", "Drawing only")}</span>
              </button>
            </div>
          </div>

          <div class="drawing" id="drawing" role="tabpanel" aria-labelledby={`st-${slots.station}`}>{slots.drawing}</div>

          <section class={`bookline${lineOpen ? " is-open" : ""}`} aria-label={tx("الفكرة والأمثلة الجاهزة", "The idea and ready examples")}>
            <div class="bookline-quote">
              <span class="chip chip-ref">{refLabel(slots.bookline.ref)}</span>
              <p>{slots.bookline.quote}</p>
              <button type="button" class="link-btn only-landscape" aria-expanded={lineOpen} onClick={() => setLineOpen((v) => !v)}>
                {lineOpen ? tx("أقل", "Less") : tx("أمثلة جاهزة", "Ready examples")}
              </button>
            </div>
            <h2 class="cases-title">{tx("أمثلة جاهزة", "Ready examples")} <span>{tx("اضغط مثالاً لتطبيق أرقامه", "press an example to apply its numbers")}</span></h2>
            <ul class="cases" aria-label={tx("أمثلة جاهزة", "Ready examples")}>
              {slots.cases.map((c) => (
                <li><button type="button" class={`case case-${c.active ? c.state : "idle"}${c.active ? " is-active" : ""}${c.origin === "world" ? " case-world" : ""}`} onClick={c.onRun} aria-pressed={c.active}
                  aria-label={`${c.title}. ${c.bookSays}.${c.active && c.result ? tx(` الحساب: ${c.result}.`, ` Result: ${c.result}.`) : ""}${c.active ? tx(" مطبّق الآن: اضغط للرجوع إلى أرقامك.", " Applied now: press to return to your numbers.") : tx(" اضغط لتطبيقها.", " Press to apply.")}`}>
                  <span class="case-mark" aria-hidden="true">{!c.active ? "○" : c.state === "pass" ? "✓" : c.state === "fail" ? "✗" : c.state === "shown" ? "≈" : "○"}</span>
                  <span class="case-text">
                    <span class="case-title">{c.title}</span>
                    <span class="case-line">
                      {c.active && c.result ? <>{tx("الحساب:", "Result:")} <span class="num-inline">{c.result}</span></> : c.bookSays}
                    </span>
                    {c.active && <span class="case-active">{tx("مطبّق الآن · اضغط للرجوع إلى أرقامك", "Applied now · press to return to your numbers")}</span>}
                  </span>
                </button></li>
              ))}
            </ul>
            <div class="bookline-foot">
              <CaseQuote slots={slots} />
              <button type="button" class="btn-line" onClick={slots.onReset}>{tx("إعادة القيم الأولى", "Reset to starting values")}</button>
            </div>
          </section>
        </main>

        <aside id="props" ref={sheetRef} class="props" aria-label={tx("الخصائص والنتيجة", "Properties and result")}>
          <button type="button" class="sheet-handle only-sheet" aria-expanded={sheet === "open"} aria-controls="props-more"
            aria-label={!propsShown ? tx("إظهار الخصائص", "Show the properties") : sheet === "open" ? tx("طي الخصائص", "Fold the properties") : tx("كل الخصائص", "All properties")}
            onPointerDown={onHandleDown} onPointerMove={onHandleMove} onPointerUp={onHandleUp}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!propsShown) openProps(); else setSheet((s) => (s === "open" ? "peek" : "open")); } }}>
            <span class="grip" aria-hidden="true" />
            {!propsShown && <span class="grip-label">{tx("الخصائص", "Properties")}</span>}
          </button>
          <div class="props-peek">
            {slots.result}
            <div class="props-primary">{slots.primary}</div>
          </div>
          <div class="props-more" id="props-more">
            {slots.controls}
            <button type="button" class="btn-line" onClick={() => setGuide(true)}><Icon name="help" size={16} />{tx("ما تحسبه هذه الأداة وما لا تحسبه", "What this tool calculates, and what it does not")}</button>
          </div>
          <button type="button" class="sheet-more only-sheet" onClick={() => setSheet((s) => (s === "open" ? "peek" : "open"))} aria-controls="props-more" aria-expanded={sheet === "open"}>
            {sheet === "open" ? tx("طي الخصائص", "Fold the properties") : tx("كل الخصائص", "All properties")}
          </button>
        </aside>
      </div>

      <footer class="status">
        {slots.status.unit !== "" && <span>{tx("الوحدة", "Unit")} <span class="num">{slots.status.unit ?? "mm"}</span></span>}
        {slots.status.grid && <span>{tx("الشبكة", "Grid")} <span class="num">{slots.status.grid}</span></span>}
        {slots.status.material && <span>{slots.status.material}</span>}
        <span>{tx("الأمثلة", "Examples")} <span class={`num ${tried && passed === tried ? "tone-ok" : ""}`}>{passed}/{checks.length}</span></span>
        <span class="status-end">{RIGHTS}</span>
        <span class="num">{DOMAIN}/{meta.book}#{meta.id}</span>
      </footer>

      <Guide open={guide} onClose={() => setGuide(false)} title={slots.title} guide={slots.guide} />
      <div class="toast" role="status" aria-live="polite">{toast}</div>
    </div>
  );
}

/** The quote of the last case run, so the reader sees the book's own words next to the engine's number. */
function CaseQuote({ slots }: { slots: ToolSlots }) {
  const last = slots.cases.find((c) => c.active);
  if (!last) return <p class="case-hint">{tx("جرّب تغيير الأرقام بنفسك. وإذا أردت الرجوع إلى تصميم صحيح، اضغط أحد الأمثلة. واضغطه مرة ثانية لتعود إلى أرقامك.", "Try changing the numbers yourself. To get back to a sound design, press one of the examples — and press it again to return to your own numbers.")}</p>;
  return (
    <figure class={`case-quote${last.origin === "world" ? " case-quote-world" : ""}`}>
      {last.note && <blockquote>{last.note}</blockquote>}
      <figcaption><span class="chip chip-ref">{last.refLabel}</span> {last.bookSays} — {tx("الحساب:", "Result:")} <span class="num-inline">{last.result}</span></figcaption>
    </figure>
  );
}
