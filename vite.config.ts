/// <reference types="vitest" />
import { defineConfig, type Plugin } from "vite";
import preact from "@preact/preset-vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Every browser that runs this app reads woff2; drop the woff fallbacks the
// font packages add, so the single-file build does not carry each font twice.
function woff2Only(): Plugin {
  return {
    name: "woff2-only",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith(".css")) return null;
      return code.replace(/,\s*url\([^)]*\.woff\)\s*format\(["']woff["']\)/g, "");
    },
  };
}

// Two outputs from one source:
//  - default ("dist/"): static multi-file build for the author's domain; each
//    tool is its own lazily loaded chunk. Must be served over http(s).
//  - offline ("dist-offline/"): one self-contained HTML file. Opens by
//    double-click from the computer (file://), and also works when hosted.
export default defineConfig(({ mode }) => {
  const single = mode === "offline" || mode === "preview";
  return {
    base: "./",
    plugins: [woff2Only(), preact(), ...(single ? [viteSingleFile()] : [])],
    build: {
      outDir: single ? "dist-offline" : "dist",
      assetsInlineLimit: single ? 100_000_000 : 4096,
      target: "es2020",
    },
    test: {
      include: ["src/**/*.test.ts"],
    },
  };
});
