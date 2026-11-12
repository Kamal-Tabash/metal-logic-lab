import { useEffect, useState } from "preact/hooks";
import type { BookId } from "../core/books";
import { BOOKS } from "../core/books";
import { toolById, toolsForChapter } from "../core/registry";
import { LANG, hashLang, stripLang, withLang } from "../core/i18n";

// Hash routes, plain names only (they survive QR codes, bookmarks and the
// review host):  #prong  → a tool;  #limits-10 → chapter 10 of a book;  "" → landing.
export type Route =
  | { view: "landing"; focus?: { book: BookId; chapter: number } }
  | { view: "tool"; id: string };

export function parse(hash: string): Route {
  const h = stripLang(hash); // "#en/prong" and "#prong" are the same page
  if (!h || h === "home") return { view: "landing" };
  const tool = toolById(h);
  if (tool && tool.status === "ready") return { view: "tool", id: tool.id };
  const m = /^(impact|limits|decision)-(\d{1,2})$/.exec(h);
  if (m) {
    const book = m[1] as BookId, chapter = Number(m[2]);
    if (chapter >= 1 && chapter <= BOOKS[book].chapters.length) {
      const ready = toolsForChapter(book, chapter).filter((t) => t.status === "ready");
      if (ready.length === 1) return { view: "tool", id: ready[0].id };
      return { view: "landing", focus: { book, chapter } };
    }
  }
  return { view: "landing" };
}

// The route lives here, not in the address bar. Some viewers (the file preview
// on iPhone, in-app browsers of chat apps) show the page but refuse to follow
// links, so a tap on "#prong" would do nothing. Every in-page link is therefore
// handled here; the address is updated when the viewer allows it, for
// bookmarks and the back button.
let current: Route = parse(location.hash);
const listeners = new Set<(r: Route) => void>();

function show(hash: string) {
  current = parse(hash);
  listeners.forEach((f) => f(current));
  try { window.scrollTo(0, 0); } catch { /* not scrollable here */ }
}

export function go(hash: string) {
  const h = withLang(hash); // English addresses carry "en/", Arabic ones stay as they were
  try { if (location.hash !== `#${h}`) location.hash = h; } catch { /* the viewer forbids changing the address */ }
  show(h);
}

let wired = false;
function wire() {
  if (wired) return;
  wired = true;
  window.addEventListener("hashchange", () => {
    // an address in the other language (a shared link, a typed one) reopens the page in it
    const asked = hashLang(location.hash);
    if (asked && asked !== LANG) { try { location.reload(); } catch { /* stay as we are */ } return; }
    show(location.hash);
  }); // back / forward, typed address
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.("a[href^='#']") as HTMLAnchorElement | null;
    if (!a) return;
    e.preventDefault();
    go(a.getAttribute("href")!);
  });
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(current);
  useEffect(() => {
    wire();
    listeners.add(setRoute);
    return () => { listeners.delete(setRoute); };
  }, []);
  return route;
}

const LAST = "lom.lastTool";
export const lastTool = {
  get(): string | null { try { return localStorage.getItem(LAST); } catch { return null; } },
  set(id: string) { try { localStorage.setItem(LAST, id); } catch { /* storage unavailable */ } },
};
