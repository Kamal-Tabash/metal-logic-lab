// A book case is a sentence of the book turned into a test.
//
// kind "check":   the book states a number; the engine must reproduce it.
// kind "explore": the book asks the reader to compute something and gives no
//                 number; the engine computes it and shows the result without
//                 a pass/fail mark.

import type { ChapterRef } from "./books";

export interface CaseResult {
  value: string; // what the engine produced, ready to show
  pass?: boolean; // undefined for "explore"
}

export interface BookCase<S> {
  id: string;
  station: string;
  kind: "check" | "explore";
  /** "book": a sentence of the book. "world": published international practice, shown without names. */
  origin?: "book" | "world";
  ref?: ChapterRef; // required for book cases (the quote test checks it)
  title: string; // short label on the chip
  quote: string; // book: the book's words, verbatim; world: what the practice says, in our words
  /** Plain words: what this case is and why it is sound. Shown to the reader instead of the quote. */
  note?: string;
  bookSays: string; // the number or claim the engine is checked against
  state: Partial<S>; // what the case sets in the tool
  run(state: S): CaseResult;
}

export function runCase<S>(c: BookCase<S>, base: S): { state: S; result: CaseResult } {
  const state = { ...base, ...c.state };
  return { state, result: c.run(state) };
}

export const near = (v: number, target: number, tol: number) => Math.abs(v - target) <= tol;
export const within = (v: number, lo: number, hi: number) => v >= lo && v <= hi;
