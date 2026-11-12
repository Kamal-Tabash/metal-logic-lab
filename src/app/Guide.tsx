import { RIGHTS, tx } from "../core/i18n";
import { useEffect, useRef } from "preact/hooks";
import type { FieldGuide } from "../core/tool";
import { Icon } from "../core/ui/icons";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  guide?: FieldGuide;
}

/** The field guide: what the model represents, what it leaves out, and the shortcuts. */
export function Guide({ open, onClose, title, guide }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { try { d.showModal(); } catch { d.setAttribute("open", ""); } }
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} class="guide" aria-labelledby="guide-title" onClose={onClose} onCancel={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div class="guide-body">
        <header class="guide-head">
          <h2 id="guide-title">{tx("شرح الأداة", "About this tool")} · {title}</h2>
          <button type="button" class="icon-btn" aria-label={tx("إغلاق الدليل", "Close the guide")} onClick={onClose}><Icon name="close" /></button>
        </header>
        {guide && (
          <>
            <section>
              <h3>{tx("ما تحسبه الأداة", "What the tool calculates")}</h3>
              <ul>{guide.models.map((m) => <li>{m}</li>)}</ul>
            </section>
            <section>
              <h3>{tx("ما لا تحسبه", "What it does not calculate")}</h3>
              <ul>{guide.notModeled.map((m) => <li>{m}</li>)}</ul>
            </section>
            <section>
              <h3>{tx("المصادر", "Sources")}</h3>
              <ul>{guide.sources.map((m) => <li>{m}</li>)}</ul>
            </section>
          </>
        )}
        <section>
          <h3>{tx("اختصارات لوحة المفاتيح", "Keyboard shortcuts")}</h3>
          <dl class="keys">
            <div><dt><kbd>1</kbd>–<kbd>4</kbd></dt><dd>{tx("الانتقال بين المحطات", "Switch between tabs")}</dd></div>
            <div><dt><kbd>/</kbd></dt><dd>{tx("البحث عن أداة أو فصل", "Search for a tool or chapter")}</dd></div>
            <div><dt><kbd>?</kbd></dt><dd>{tx("فتح هذا الدليل", "Open this guide")}</dd></div>
            <div><dt><kbd>Esc</kbd></dt><dd>{tx("إغلاق القوائم واللوح السفلي", "Close the menus and the bottom sheet")}</dd></div>
          </dl>
        </section>
        <p class="rights">{RIGHTS}</p>
      </div>
    </dialog>
  );
}
