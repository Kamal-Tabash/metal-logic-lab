import { useEffect, useRef } from "preact/hooks";
import { Sheet } from "./sheet";

interface Props {
  draw: (s: Sheet) => void;
  /** Plain-language description of what the drawing currently shows. */
  label: string;
  deps: unknown[];
  tag?: string;
}

/** A drawing panel that redraws on resize, device-pixel-ratio change and state change. */
export function CadCanvas({ draw, label, deps, tag }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    let raf = 0;
    const paint = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const s = Sheet.prepare(cv);
        if (s) drawRef.current(s);
      });
    };
    const ro = new ResizeObserver(paint);
    ro.observe(cv);
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mq.addEventListener?.("change", paint);
    document.fonts?.ready.then(paint).catch(() => {});
    paint();
    return () => { ro.disconnect(); mq.removeEventListener?.("change", paint); cancelAnimationFrame(raf); };
  }, []);

  // Redraw after every render: a station switch reuses this canvas with a new
  // draw function, so the drawing must not depend on `deps` alone.
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const s = Sheet.prepare(cv);
    if (s) draw(s);
  });
  void deps;

  return (
    <div class="board">
      <canvas ref={ref} role="img" aria-label={label} />
      {tag && <span class="board-tag" aria-hidden="true">{tag}</span>}
    </div>
  );
}
