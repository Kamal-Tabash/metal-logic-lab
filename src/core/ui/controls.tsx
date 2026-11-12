import { EN, tx } from "../i18n";
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

const AR = /[\u0600-\u06FF]/; // a value with Arabic words reads right to left

/**
 * The explanation of a control, behind a "?" mark. It opens on a press (or
 * when the mouse rests on the mark) and closes when the mouse leaves, on a
 * press anywhere else, or with Esc.
 */
export function Hint({ id, about, text }: { id: string; about: string; text: string }) {
  const [open, setOpen] = useState<false | "hover" | "press">(false); // a press after hovering keeps it open, a second press closes it
  const wrap = useRef<HTMLSpanElement>(null);
  const touch = useRef(false);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <span class="hint" ref={wrap}
      // a finger has no "leaving": on touch the box closes on a tap elsewhere, never on synthetic mouse events
      onPointerDown={(e) => { touch.current = (e as PointerEvent).pointerType !== "mouse"; }}
      onMouseEnter={() => { if (!touch.current) setOpen((v) => v || "hover"); }}
      onMouseLeave={() => { if (!touch.current) setOpen(false); }}>
      <button type="button" class="hint-btn" aria-label={tx(`شرح: ${about}`, `Explain: ${about}`)} aria-expanded={!!open} aria-controls={id}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => (v === "press" ? false : "press")); }} onBlur={() => { if (!touch.current) setOpen(false); }}>{tx("؟", "?")}</button>
      <span id={id} class="hint-box" role="tooltip" hidden={!open}>{text}</span>
    </span>
  );
}

interface RangeProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onInput: (v: number) => void;
  marks?: { at: number; label: string; tone?: "gold" | "warn" }[];
  hint?: string;
}

/** A slider whose value is always written out in the drawing's units. */
export function Range({ id, label, value, min, max, step, display, onInput, marks, hint }: RangeProps) {
  return (
    <div class="ctl">
      <div class="ctl-head">
        <span class="ctl-name"><label for={id}>{label}</label>{hint && <Hint id={`${id}-hint`} about={label} text={hint} />}</span>
        <output for={id} class="num ctl-val" dir={AR.test(display) ? "rtl" : undefined}>{display}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={display}
        onInput={(e) => onInput(Number((e.currentTarget as HTMLInputElement).value))}
      />
      {marks && (
        <div class="ctl-marks" aria-hidden="true">
          {marks.map((m) => (
            <span class={`num tone-${m.tone ?? "muted"}`} style={{ [EN ? "left" : "right"]: `calc(8px + ${(m.at - min) / (max - min)} * (100% - 16px))` }}>
              {m.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface SegProps<T extends string | number> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  hint?: string;
}

export function Segmented<T extends string | number>({ label, value, options, onChange, hint }: SegProps<T>) {
  return (
    <div class="ctl">
      <span class="ctl-head"><span class="ctl-name"><span>{label}</span>{hint && <Hint id={`seg-${slug(label)}-hint`} about={label} text={hint} />}</span></span>
      <div class="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

let seq = 0;
const ids = new Map<string, string>();
const slug = (s: string) => ids.get(s) ?? (ids.set(s, `s${++seq}`), ids.get(s)!);

export function Group({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <section class="group">
      <h2 class="group-title">{title}</h2>
      {children}
    </section>
  );
}

export interface Reading { label: string; value: string; tone?: "gold" | "warn" | "ok" }

/** The answer first: one large figure, a bar, then secondary readings. */
export interface Check { text: string; level: "ok" | "near" | "fail" }

export function Result({ label, value, fraction, tone = "gold", readings, verdict, checks }: {
  label: string;
  value: string;
  fraction?: number;
  tone?: "gold" | "warn";
  readings?: Reading[];
  verdict?: { text: string; tone: "gold" | "warn" | "ok" };
  checks?: Check[];
}) {
  return (
    <div class="result">
      <div class="result-main">
        <span>{label}</span>
        <span class={`num result-big tone-${tone}`} dir={AR.test(value) ? "rtl" : undefined}>{value}</span>
      </div>
      {fraction !== undefined && (
        <div class="bar" aria-hidden="true"><div class={`bar-fill tone-bg-${tone}`} style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }} /></div>
      )}
      {readings && (
        <dl class="readings">
          {readings.map((r) => (
            <div>
              <dt>{r.label}</dt>
              <dd class={`num tone-${r.tone ?? "line"}`} dir={AR.test(r.value) ? "rtl" : undefined}>{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {verdict && <p class={`verdict verdict-${verdict.tone}`} role="status">{verdict.text}</p>}
      {checks && (
        <div role="status"><ul class="checks" aria-label={tx("الفحوص", "Checks")}>
          {checks.map((c) => (
            <li class={`check check-${c.level}`}>
              <span class="check-mark" aria-hidden="true">{c.level === "ok" ? "✓" : c.level === "near" ? "!" : "✗"}</span>
              <span>{c.text}</span>
            </li>
          ))}
        </ul></div>
      )}
    </div>
  );
}
