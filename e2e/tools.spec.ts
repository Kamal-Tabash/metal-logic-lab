// The browser gate for every tool marked ready: on a phone and on a laptop,
// each station draws its own picture, nothing scrolls sideways, the tool opens
// on a sound design, every ready example is sound and can be taken back, the
// panels fold, the explanations open, and the automated accessibility check is clean.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { TOOLS } from "../src/core/registry";

const READY = TOOLS.filter((t) => t.status === "ready" && t.id !== "prong");
const SIZES = [
  { name: "phone", width: 390, height: 844, touch: true },
  { name: "laptop", width: 1280, height: 800, touch: false },
];

// a fingerprint of the whole sheet, not of one corner of it
const print = (page: Page) => page.evaluate(() => {
  const u = (document.querySelector(".board canvas") as HTMLCanvasElement).toDataURL();
  let h = 0; for (let i = 0; i < u.length; i++) h = (h * 31 + u.charCodeAt(i)) | 0;
  return `${u.length}:${h}`;
});
async function ink(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const c = document.querySelector(".board canvas") as HTMLCanvasElement | null;
    if (!c || !c.width) return 0;
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 330) n++;
    return n;
  })).toBeGreaterThan(60);
}
const noSideScroll = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

for (const tool of READY) for (const vp of SIZES) {
  test.describe(`${tool.id} · ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch });

    test("opens sound, every station draws, every example is sound and can be taken back", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      await page.goto(`/#${tool.id}`);
      await expect(page.locator(".tool-title")).toContainText(tool.title);
      await ink(page);
      const tabs = page.locator(".stations [role=tab]");
      const n = await tabs.count();
      const prints = new Set<string>();
      for (let i = 0; i < n; i++) {
        await tabs.nth(i).click();
        await ink(page);
        await noSideScroll(page);
        await expect(page.locator(".checks .check-fail, .checks .check-near"), "opens on a sound design").toHaveCount(0);
        prints.add(await print(page));
        const examples = page.locator(".case");
        const k = await examples.count();
        expect(k).toBeGreaterThanOrEqual(2);
        const before = await page.locator(".result-big").first().innerText();
        for (let j = 0; j < k; j++) {
          const c = examples.nth(j);
          await c.click();
          await expect(c).toHaveClass(/case-pass/);
          await expect(page.locator(".checks .check-fail, .checks .check-near")).toHaveCount(0);
          await expect(page.locator(".case-quote blockquote")).not.toBeEmpty();
          await c.click();
          await expect(c).toHaveClass(/case-idle/);
          await expect(page.locator(".result-big").first()).toHaveText(before);
        }
      }
      expect(prints.size, "each station has its own drawing").toBe(n);
      expect(errors).toEqual([]);
    });

    test("the first slider changes the answer and the drawing; panels fold; explanations open", async ({ page }) => {
      await page.goto(`/#${tool.id}`);
      await ink(page);
      const slider = page.locator(".props-primary input[type=range]");
      const before = await print(page);
      if (await slider.count()) {
        const [min, max, cur] = await slider.evaluate((el: HTMLInputElement) => [Number(el.min), Number(el.max), Number(el.value)]);
        await slider.fill(String(cur - min > max - cur ? min : max));
      } else {
        await page.locator('.props-primary .seg button[aria-pressed="false"]').first().click(); // a choice instead of a slider
      }
      await expect.poll(() => print(page)).not.toBe(before);
      await noSideScroll(page);
      await page.getByRole("button", { name: /^شرح:/ }).first().click();
      await expect(page.getByRole("tooltip").first()).toBeVisible();
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "الرسم وحده" }).click();
      await expect(page.locator(".bookline")).toBeHidden();
      await ink(page);
      await page.getByRole("button", { name: "إظهار القوائم" }).click();
      await expect(page.locator(".result-big").first()).toBeVisible();
    });

    test("automated accessibility check is clean", async ({ page }) => {
      await page.goto(`/#${tool.id}`);
      await ink(page);
      const r = await new AxeBuilder({ page }).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} ${v.nodes[0]?.target}`)).toEqual([]);
    });
  });
}
