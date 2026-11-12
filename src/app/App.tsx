import { BRAND, tx } from "../core/i18n";
import { useEffect, useState } from "preact/hooks";
import { toolById } from "../core/registry";
import type { ToolComponent, ToolSlots } from "../core/tool";
import { Landing } from "./Landing";
import { lastTool, useRoute } from "./route";
import { Workspace } from "./Workspace";

export function App() {
  const route = useRoute();
  if (route.view === "tool") return <ToolHost id={route.id} />;
  return <Landing focus={route.focus} />;
}

/** Loads a tool's chunk only when it is opened. */
function ToolHost({ id }: { id: string }) {
  const meta = toolById(id)!;
  const [Comp, setComp] = useState<ToolComponent | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setComp(null); setFailed(false);
    lastTool.set(id);
    document.title = `${meta.title} · ${BRAND}`;
    meta.load?.().then((m) => live && setComp(() => m.default)).catch(() => live && setFailed(true));
    return () => { live = false; document.title = BRAND; };
  }, [id]);

  if (failed) return <div class="loading" role="alert">{tx("تعذّر تحميل الأداة. تحقق من الاتصال ثم أعد تحميل الصفحة.", "The tool could not be loaded. Check your connection, then reload the page.")}</div>;
  if (!Comp) return <div class="loading" aria-busy="true">{tx("يُحمَّل", "Loading")} {meta.title}…</div>;
  return <Comp Layout={(slots: ToolSlots) => <Workspace meta={meta} slots={slots} />} />;
}
