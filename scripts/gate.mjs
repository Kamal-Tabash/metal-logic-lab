// One command before any hand-over. Runs every automated check in order and
// stops at the first failure. Checks 6-8 (looking at the drawing, opening the
// build as a reader does, the trial report) are done by hand and listed at the end.
import { spawnSync } from "node:child_process";

const steps = [
  ["الأنواع", "npx", ["tsc", "--noEmit"]],
  ["الحساب، اقتباسات الكتاب، الأطراف العشوائية", "npx", ["vitest", "run"]],
  ["البناء للنشر", "npx", ["vite", "build"]],
  ["البناء لملف واحد", "npx", ["vite", "build", "--mode", "offline"]],
  ["المتصفح: خمسة مقاسات، التراجع، الوصول", "npx", ["playwright", "test"]],
];
const t0 = Date.now();
for (const [name, cmd, args] of steps) {
  const t = Date.now();
  const r = spawnSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
  const secs = ((Date.now() - t) / 1000).toFixed(1);
  if (r.status !== 0) {
    console.log(`✗ ${name} (${secs}s)\n`);
    console.log((r.stdout + r.stderr).split("\n").slice(-60).join("\n"));
    console.log(`\nالبوابة مغلقة: فشل «${name}».`);
    process.exit(1);
  }
  const tail = (r.stdout.match(/Tests\s+.*|\d+ passed.*/g) ?? []).pop() ?? "";
  console.log(`✓ ${name} (${secs}s) ${tail.trim()}`);
}
console.log(`\nالفحوص الآلية نجحت في ${((Date.now() - t0) / 1000).toFixed(0)} ثانية.`);
console.log("يبقى باليد: 6 معاينة الرسم بالعين، 7 فتحه كما يفتحه القارئ، 8 تقرير التجربة.");
