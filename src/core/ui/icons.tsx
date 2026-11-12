import type { IconName } from "../tool";

// One drawn icon per tool, in the drafting line weight of the sheets.
const PATHS: Record<IconName | "menu" | "link" | "help" | "close" | "search" | "arrow" | "handle" | "book" | "panel" | "railside" | "focus", string> = {
  prong: "M7 18V5a3 3 0 0 1 6 0v4l-2 1.5 2 1.5v6M3 18h14",
  scale: "M10 3v14M4 6h12M4 6l-2 6h4zM16 6l-2 6h4zM7 17h6",
  hollow: "M10 3a7 7 0 1 0 0 14a7 7 0 1 0 0-14M10 5.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9",
  engrave: "M2 6h16M2 15h16M7 6l3 4 3-4",
  heat: "M6 2v16M6 5h5M6 9h7M6 13h4M6 17h8",
  enamel: "M3 13h14v3H3zM5 13c0-3 2-5 5-5s5 2 5 5M8 8l2 2 2-2",
  wear: "M2 10a5 3.5 0 1 0 10 0a5 3.5 0 1 0-10 0M8 10a5 3.5 0 1 0 10 0a5 3.5 0 1 0-10 0",
  size: "M5 8a5 5 0 1 0 10 0a5 5 0 1 0-10 0M3 17h14M5 15v2M8 16v1M11 15v2M14 16v1",
  tongue: "M3 15h4l10-5M3 12v6",
  tool: "M4 17V8M9 17V8M16 3l-6 7",
  pendant: "M8 4a2 2 0 1 0 4 0a2 2 0 1 0-4 0M10 6l-4 6a4 4 0 0 0 8 0z",
  finger: "M7 2v16M13 2v16M5 10a5 2 0 1 0 10 0a5 2 0 1 0-10 0",
  stack: "M2 10h6M12 10h6M8 7v6M12 7v6M10 3v2M10 15v2",
  steps: "M2 7h3v6H2zM6.5 6h3v8h-3zM11 5h3v10h-3zM15.5 4h3v12h-3z",
  argument: "M4 4h12M4 8h9M4 12h12M4 16h7",
  atlas: "M3 4h5l2 2h7v10H3z",
  menu: "M3 5h14M3 10h14M3 15h14",
  link: "M8 12l4-4M7 9l-2 2a2.8 2.8 0 0 0 4 4l2-2M13 11l2-2a2.8 2.8 0 0 0-4-4L9 7",
  help: "M10 2a8 8 0 1 0 0 16a8 8 0 1 0 0-16M7.6 7.4a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.8v.5M10 14.6v.1",
  close: "M5 5l10 10M15 5L5 15",
  search: "M8.5 3a5.5 5.5 0 1 0 0 11a5.5 5.5 0 1 0 0-11M12.5 12.5L17 17",
  arrow: "M12 4l-6 6 6 6",
  handle: "M6 10h8",
  book: "M3 4h5a2 2 0 0 1 2 2v10a2 2 0 0 0-2-2H3zM17 4h-5a2 2 0 0 0-2 2v10a2 2 0 0 1 2-2h5z",
  panel: "M3 4h14v12H3zM8 4v12",
  railside: "M3 4h14v12H3zM13 4v12",
  focus: "M4 8V4h4M12 4h4v4M16 12v4h-4M8 16H4v-4",
};

export function Icon({ name, size = 20, class: cls }: { name: keyof typeof PATHS; size?: number; class?: string }) {
  return (
    <svg class={cls} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}

/** The lab's mark: a ring seen from above, with a stone and two prongs. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r="11" fill="none" stroke="var(--gold)" stroke-width="2" />
      <path d="M14 3v6M14 19v6" stroke="var(--gold)" stroke-width="2" />
      <circle cx="14" cy="14" r="3" fill="var(--gold)" />
    </svg>
  );
}
