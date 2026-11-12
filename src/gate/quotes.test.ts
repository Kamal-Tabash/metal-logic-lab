// Gate check 2: every book case quotes the book word for word.
// The quote is looked up in the text of the book it cites; nothing is
// taken on trust from the tool that carries it.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BookCase } from "../core/cases";

const FILE = { impact: "b1.txt", limits: "b2.txt", decision: "b3.txt" } as const;

/** Letters and digits only: drops vowel marks, tatweel, punctuation and spacing differences. */
export function norm(s: string): string {
  return s
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

// The book texts are the author's and are not published with the source. Where
// they are present (the author's machine) every quotation is checked word for
// word; where they are absent these checks are skipped and say so.
const HAVE_BOOKS = Object.values(FILE).every((f) => existsSync(new URL(`../../reference/${f}`, import.meta.url)));
const read = (f: string) => (HAVE_BOOKS ? norm(readFileSync(new URL(`../../reference/${f}`, import.meta.url), "utf8")) : "");
const books = Object.fromEntries(
  Object.entries(FILE).map(([k, f]) => [k, read(f)]),
) as Record<keyof typeof FILE, string>;

const modules = import.meta.glob<{ CASES: BookCase<unknown>[] }>("../tools/*/cases.ts", { eager: true });

describe("book quotes match the book text", () => {
  for (const [path, mod] of Object.entries(modules)) {
    const tool = path.split("/").slice(-2)[0];
    for (const c of mod.CASES.filter((c) => c.origin !== "world")) {
      it.skipIf(!HAVE_BOOKS)(`${tool} / ${c.id}`, () => {
        expect(c.ref, "a book case names its chapter").toBeDefined();
        // a quote may join separate cells of a workshop table with " — "
        expect(c.quote.length, "a book case carries the book's sentence").toBeGreaterThan(20);
        for (const part of c.quote.split(" — ")) {
          expect(books[c.ref!.book].includes(norm(part)), `not found in ${FILE[c.ref!.book]}: «${part}»`).toBe(true);
        }
      });
    }
  }
});
