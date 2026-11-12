import type { ComponentChildren, VNode } from "preact";
import type { BookId, ChapterRef } from "./books";

export type IconName =
  | "prong" | "scale" | "hollow" | "engrave" | "heat" | "enamel" | "wear" | "size" | "tongue"
  | "tool" | "pendant" | "finger" | "stack" | "steps" | "argument" | "atlas";

export interface ToolMeta {
  id: string;
  code: string; // م1 … م15
  title: string;
  book: BookId;
  refs: ChapterRef[];
  icon: IconName;
  summary: string;
  /** Extra words a reader may search for. */
  keywords?: string;
  status: "ready" | "planned";
  load?: () => Promise<{ default: ToolComponent }>;
}

export interface Station { id: string; label: string }

export interface CaseChip {
  id: string;
  title: string;
  kind: "check" | "explore";
  origin: "book" | "world";
  state: "idle" | "pass" | "fail" | "shown";
  /** Its values are in the tool right now; pressing it again restores what was there before. */
  active: boolean;
  bookSays: string;
  result?: string;
  refLabel: string;
  quote: string;
  note?: string;
  onRun: () => void;
}

export interface FieldGuide {
  models: string[];
  notModeled: string[];
  sources: string[];
}

export interface ToolSlots {
  title: string;
  stations: Station[];
  station: string;
  onStation: (id: string) => void;
  drawing: VNode;
  /** The answer, shown first everywhere (and in the phone sheet's peek). */
  result: ComponentChildren;
  /** The one control worth having without opening the sheet. */
  primary: ComponentChildren;
  controls: ComponentChildren;
  bookline: { ref: ChapterRef; quote: string }; // quote: the station's idea in plain words
  cases: CaseChip[];
  /** Back to the chapter's case, clearing any applied book case. */
  onReset: () => void;
  guide: FieldGuide;
  status: { grid?: string; material?: string; unit?: string };
}

export type Layout = (slots: ToolSlots) => VNode;
export type ToolComponent = (p: { Layout: Layout }) => VNode;
