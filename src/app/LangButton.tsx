import { EN, switchLang } from "../core/i18n";

/** Opens the same page in the other language. The label is the language it leads to, in that language. */
export function LangButton({ where = "" }: { where?: string }) {
  return EN
    ? <button type="button" class={`btn-ghost lang-btn ${where}`} lang="ar" onClick={() => switchLang("ar")} aria-label="العربية: اعرض المختبر بالعربية">العربية</button>
    : <button type="button" class={`btn-ghost lang-btn ${where}`} lang="en" onClick={() => switchLang("en")} aria-label="English: show the lab in English">English</button>;
}
