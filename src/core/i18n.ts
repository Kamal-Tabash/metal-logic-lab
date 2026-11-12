// Two languages, chosen once when the page opens. Every text in the lab is
// written as tx("عربي", "English"), so a tool's file reads the same in both and
// nothing is looked up by key. Switching language reloads the page.
export type Lang = "ar" | "en";

const KEY = "lom.lang";
const isLang = (v: unknown): v is Lang => v === "ar" || v === "en";

/** The language a hash asks for: "#en/prong" → en, "#ar" → ar, "#prong" → none. */
export function hashLang(hash: string): Lang | null {
  const m = /^#?(ar|en)(?:\/|$)/.exec(hash);
  return m ? (m[1] as Lang) : null;
}
/** The hash without its language part. */
export function stripLang(hash: string): string {
  return hash.replace(/^#/, "").replace(/^(ar|en)(?:\/|$)/, "");
}

function remembered(): Lang | null {
  try { const v = localStorage.getItem(KEY); if (isLang(v)) return v; } catch { /* storage unavailable */ }
  try { const v = sessionStorage.getItem(KEY); if (isLang(v)) return v; } catch { /* storage unavailable */ }
  try { const m = /(?:^|;)lom-lang=(ar|en)(?:;|$)/.exec(window.name); if (m) return m[1] as Lang; } catch { /* no window */ }
  return null;
}
function remember(l: Lang) {
  try { localStorage.setItem(KEY, l); } catch { /* storage unavailable */ }
  try { sessionStorage.setItem(KEY, l); } catch { /* storage unavailable */ }
  // survives a reload even where the viewer gives the page no storage
  try { window.name = `${window.name.replace(/;?lom-lang=(ar|en);?/g, "")};lom-lang=${l};`; } catch { /* no window */ }
}

function detect(): Lang {
  const forced = (globalThis as { __LOM_LANG__?: unknown }).__LOM_LANG__; // tests
  if (isLang(forced)) return forced;
  try { const h = hashLang(location.hash); if (h) { remember(h); return h; } } catch { /* no address */ }
  return remembered() ?? "ar";
}

export const LANG: Lang = detect();
export const EN = LANG === "en";
/** The text in the reader's language. */
export const tx = <T,>(ar: T, en: T): T => (EN ? en : ar);

/** A link target in the current language: Arabic addresses stay as they were ("#prong"), English ones carry "en/". */
export function withLang(hash: string, lang: Lang = LANG): string {
  const h = stripLang(hash);
  return lang === "en" ? (h && h !== "home" ? `en/${h}` : "en") : h;
}

/** Open the same page in the other language. */
export function switchLang(to: Lang) {
  remember(to);
  let h = "";
  try { h = location.hash; } catch { /* no address */ }
  const target = to === "en" ? withLang(h, "en") : `ar${stripLang(h) && stripLang(h) !== "home" ? `/${stripLang(h)}` : ""}`;
  try { location.hash = target; } catch { /* the viewer forbids changing the address */ }
  try { location.reload(); } catch { /* nothing more to do */ }
}

/** The lab's name: the Arabic one is the books' own; the English one is the author's choice. */
export const BRAND = tx("مختبر منطق المعدن", "METAL LOGIC LAB");
/** Who owns the lab and its texts. */
export const RIGHTS = tx("© كمال طبش 2026 · جميع الحقوق محفوظة", "© Kemal Tabash 2026 · All rights reserved");
