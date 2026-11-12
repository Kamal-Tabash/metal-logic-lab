// The English lab as a reader meets it: every page reads left to right, no
// Arabic is left on it apart from the button that leads back to Arabic, the
// examples are sound, and the language button takes the same page across.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { TOOLS } from "../src/core/registry";

const READY = TOOLS.filter((t) => t.status === "ready");
const SIZES = [
  { name: "phone", width: 390, height: 844, touch: true },
  { name: "laptop", width: 1280, height: 800, touch: false },
];
/** Arabic left on the page, ignoring the button that switches to Arabic. */
const arabicLeft = (page: Page) => page.evaluate(() => {
  const AR = /[؀-ۿ]/;
  const found: string[] = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if ((n.parentElement as Element).closest(".lang-btn, script, style, noscript")) continue;
    if (AR.test(n.textContent ?? "")) found.push((n.textContent ?? "").trim().slice(0, 60));
  }
  for (const el of Array.from(document.querySelectorAll("[aria-label],[title],[placeholder],[alt]"))) {
    if (el.closest(".lang-btn")) continue;
    for (const a of ["aria-label", "title", "placeholder", "alt"]) { const v = el.getAttribute(a); if (v && AR.test(v)) found.push(`${a}=${v.slice(0, 60)}`); }
  }
  if (AR.test(document.title)) found.push(`title=${document.title}`);
  return found;
});
/** The language button: in the top bar where there is room, in the tools drawer on a phone. */
async function pressLang(page: Page) {
  await expect(page.locator(".tool-title, .hero h1").first()).toBeVisible(); // the page is up, not still loading
  const top = page.locator(".lang-btn:visible").first();
  if (!(await top.count())) await page.locator(".top .icon-btn").first().click();
  await page.locator(".lang-btn:visible").first().click();
}
const noSideScroll = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

for (const vp of SIZES) {
  test.describe(`English · ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch });

    test("the landing page is METAL LOGIC LAB, left to right, with fifteen tools", async ({ page }) => {
      await page.goto("/#en");
      await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.locator(".hero h1")).toHaveText("METAL LOGIC LAB");
      await expect(page).toHaveTitle("METAL LOGIC LAB");
      await expect(page.locator("a.tool-card")).toHaveCount(15);
      await expect(page.locator("footer")).toContainText("©");
      expect(await arabicLeft(page)).toEqual([]);
      await noSideScroll(page);
      await page.locator("#landing-search").fill("solder");
      await expect(page.locator("a.tool-card")).not.toHaveCount(15);
      await expect(page.locator("a.tool-card").first()).toBeVisible();
      await page.locator("#landing-search").fill("zzzz");
      await expect(page.locator(".no-results")).toBeVisible();
      expect(await arabicLeft(page)).toEqual([]);
      await page.locator("#landing-search").fill("");
      await page.locator("details.by-chapter summary").click();
      expect(await arabicLeft(page)).toEqual([]);
      const axe = await new AxeBuilder({ page }).analyze();
      expect(axe.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    });

    for (const tool of READY) {
      test(`${tool.id}: every tab, example and explanation is in English`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(String(e)));
        await page.goto(`/#en/${tool.id}`);
        await expect(page.locator(".tool-title")).toBeVisible();
        expect(await arabicLeft(page)).toEqual([]);
        const tabs = page.locator(".stations [role=tab]");
        const n = await tabs.count();
        for (let i = 0; i < n; i++) {
          await tabs.nth(i).click();
          expect(await arabicLeft(page), `tab ${i + 1}`).toEqual([]);
          const cases = page.locator(".cases .case");
          const k = await cases.count();
          for (let j = 0; j < k; j++) {
            await cases.nth(j).click();
            await expect(cases.nth(j)).toHaveAttribute("aria-pressed", "true");
            await expect(cases.nth(j)).not.toHaveClass(/case-fail/);
            expect(await arabicLeft(page), `tab ${i + 1}, example ${j + 1}`).toEqual([]);
            await cases.nth(j).click();
          }
          await noSideScroll(page);
        }
        await page.keyboard.press("Escape");
        await page.locator("button[aria-haspopup=dialog]").first().click();
        await expect(page.locator(".guide")).toBeVisible();
        expect(await arabicLeft(page), "guide").toEqual([]);
        expect(errors).toEqual([]);
      });
    }

    test("the language button takes the same tool across, and back", async ({ page }) => {
      await page.goto("/#engrave");
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await pressLang(page);
      await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
      await expect(page).toHaveURL(/#en\/engrave$/);
      await expect(page.locator(".tool-title")).toContainText("Engraving Depth");
      // links inside the English lab stay English
      await page.locator("a.brand, .crumbs a").first().click();
      await expect(page).toHaveURL(/#en$/);
      await page.locator("a.tool-card").first().click();
      await expect(page).toHaveURL(/#en\/[a-z]+$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await pressLang(page);
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(page.locator(".tool-title")).toBeVisible();
      // and a plain address opens in the language last chosen
      await page.goto("/#home");
      await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    });
  });
}

test("a first visit with no language asked opens in Arabic", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator(".hero h1")).toHaveText("مختبر منطق المعدن");
  await expect(page.locator(".lang-btn")).toHaveText("English");
});
