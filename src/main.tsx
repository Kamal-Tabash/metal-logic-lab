import { render } from "preact";
import "@fontsource/noto-kufi-arabic/arabic-500.css";
import "@fontsource/noto-kufi-arabic/arabic-700.css";
import "@fontsource/noto-naskh-arabic/arabic-400.css";
import "@fontsource/noto-naskh-arabic/arabic-600.css";
import "@fontsource/noto-naskh-arabic/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "./styles.css";
import { App } from "./app/App";
import { BRAND, EN, hashLang, withLang } from "./core/i18n";

document.documentElement.lang = EN ? "en" : "ar";
document.documentElement.dir = EN ? "ltr" : "rtl";
document.title = BRAND;
// an English page keeps "en/" in its address, so a copied link opens in English for whoever receives it
try { if (EN && !hashLang(location.hash)) history.replaceState(null, "", `#${withLang(location.hash)}`); } catch { /* the viewer forbids changing the address */ }

render(<App />, document.getElementById("app")!);
