import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "phone-360", width: 360, height: 780, touch: true },
  { name: "phone-landscape", width: 844, height: 390, touch: true },
  { name: "tablet-768", width: 768, height: 1024, touch: true },
  { name: "laptop-1280", width: 1280, height: 800, touch: false },
  { name: "wide-1920", width: 1920, height: 1080, touch: false },
];

async function noHorizontalOverflow(page: Page) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw, "the page must not scroll sideways").toBeLessThanOrEqual(iw + 1);
}

async function canvasHasInk(page: Page) {
  const box = await page.locator(".board canvas").boundingBox();
  expect(box && box.width > 200 && box.height > 150, `drawing is visible (${box?.width}×${box?.height})`).toBeTruthy();
  const inked = await page.evaluate(() => {
    const c = document.querySelector(".board canvas") as HTMLCanvasElement;
    const ctx = c.getContext("2d")!;
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    // count bright line pixels (the sheet itself is near #16191e)
    let ink = 0;
    for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 330) ink++;
    return ink;
  });
  expect(inked, "the sheet carries a drawing").toBeGreaterThan(60);
}

for (const vp of VIEWPORTS) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch && vp.width < 1024 });

    test("landing lists the books and opens the prong lab", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "مختبر منطق المعدن" })).toBeVisible();
      await expect(page.getByRole("heading", { name: /حدود المادة/ })).toBeVisible();
      await noHorizontalOverflow(page);
      await page.locator('a.tool-card[href="#prong"]').first().click();
      await expect(page.locator(".tool-title")).toContainText("قوة المخلب");
      await canvasHasInk(page);
      await noHorizontalOverflow(page);
    });

    test("every station draws its own picture, and every fixed case is sound", async ({ page }) => {
      await page.goto("/#prong");
      const prints = new Set<string>();
      for (const name of ["عمق المقعد", "السماكة والطول", "وزن الحجر", "ما يضيع في التصنيع"]) {
        await page.getByRole("tab", { name: new RegExp(name) }).click();
        await page.waitForTimeout(120);
        await canvasHasInk(page);
        await noHorizontalOverflow(page);
        prints.add(await page.evaluate(() => (document.querySelector(".board canvas") as HTMLCanvasElement).toDataURL().slice(-400)));
      }
      expect(prints.size, "each station must redraw the sheet").toBe(4);
      await page.getByRole("tab", { name: /عمق المقعد/ }).click();
      if (vp.name === "phone-landscape") await page.getByRole("button", { name: "أمثلة جاهزة" }).click();
      // spoil the design, then every fixed case must bring it back with nothing red or yellow
      for (const title of ["ورشة 1", "ورشة 2", "ورشة 3", "عالمية 1", "عالمية 2", "عالمية 3", "عالمية 4"]) {
        const c = page.locator(".case", { hasText: title });
        await c.click();
        await expect(c).toHaveClass(/case-pass/);
        await expect(page.locator(".checks .check-fail, .checks .check-near")).toHaveCount(0);
        await expect(page.locator(".case-quote blockquote")).not.toBeEmpty();
        await c.click();
      }
    });

    test("the groove slider changes the answer and the verdict", async ({ page }) => {
      await page.goto("/#prong");
      const slider = page.locator("#seat-h");
      await expect(slider).toBeVisible();
      await slider.fill("0.4");
      await expect(page.locator(".result-big").first()).toHaveText("25٪");
      if (vp.width >= 1024 || vp.name === "phone-landscape") await expect(page.locator(".checks .check").first()).toContainText("ثلث القطر");
      await slider.fill("0.1");
      await expect(page.locator(".result-big").first()).toHaveText("83٪");
    });

    test("automated accessibility checks pass", async ({ page }) => {
      await page.goto("/");
      const a = await new AxeBuilder({ page }).analyze();
      expect(a.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
      await page.goto("/#prong");
      await canvasHasInk(page);
      const b = await new AxeBuilder({ page }).analyze();
      expect(b.violations.map((v) => `${v.id}: ${v.nodes.length} ${v.nodes[0]?.target}`)).toEqual([]);
    });
  });
}

test.describe("phone controls", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("drawer and bottom sheet open and close", async ({ page }) => {
    await page.goto("/#prong");
    await page.getByRole("button", { name: "الأدوات والفصول" }).click();
    await expect(page.locator("#rail")).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(page.locator("#rail")).not.toBeInViewport();
    await expect(page.locator("#seat-d")).toBeHidden();
    await page.getByRole("button", { name: "كل الخصائص" }).last().click();
    await expect(page.locator("#seat-d")).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test("a chapter link opens its tool", async ({ page }) => {
    await page.goto("/#limits-10");
    await expect(page.locator(".tool-title")).toContainText("قوة المخلب");
    await page.goto("/#decision-6");
    await expect(page.locator(".tool-title")).toContainText("وصول الأداة");
    // a chapter served by several tools opens the landing page on that chapter
    await page.goto("/#limits-7");
    await expect(page.locator("#limits-7")).toHaveClass(/is-focus/);
  });
});

test("text zoom to 200% keeps the page readable without sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#prong");
  await page.addStyleTag({ content: "html{font-size:200%}" });
  await page.waitForTimeout(150);
  await noHorizontalOverflow(page);
});

test.describe("cases can be taken back, and a thin prong fails", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("pressing an applied case again restores the values before it", async ({ page }) => {
    await page.goto("/#prong");
    await page.locator("#seat-h").fill("0.15");
    await expect(page.locator(".result-big").first()).toHaveText("72٪");
    const third = page.locator(".case", { hasText: "ورشة 1" });
    await third.click();
    await expect(third).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".result-big").first()).toHaveText("50٪");
    await third.click();
    await expect(third).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".result-big").first()).toHaveText("72٪");
    await expect(third).toHaveClass(/case-idle/); // taken back: it no longer looks applied
    await expect(third.locator(".case-mark")).toHaveText("○");
  });

  test("moving a control takes the tool off the case; reset brings the chapter back", async ({ page }) => {
    await page.goto("/#prong");
    const q = page.locator(".case", { hasText: "ورشة 2" });
    await q.click();
    await expect(q).toHaveAttribute("aria-pressed", "true");
    await page.locator("#seat-h").fill("0.1");
    await expect(q).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "إعادة القيم الأولى" }).click();
    await expect(page.locator(".result-big").first()).toHaveText("50٪");
  });

  test("a hair-thin prong with a quarter-deep groove does not pass", async ({ page }) => {
    await page.goto("/#prong");
    await page.locator("#seat-u").fill("0.6");
    await page.locator("#seat-d").fill("0.3");
    const first = page.locator(".checks .check").first();
    await expect(first).toHaveClass(/check-fail/);
    await expect(first).toContainText("أنحف من أصغر مخلب يُصنع");
    await page.locator("#seat-d").fill("0.6");
    await expect(first).toHaveClass(/check-fail/);
    await expect(first).toContainText("أنحف كثيراً من اللازم");
    await expect(page.locator(".result-big").first()).toHaveClass(/tone-warn/);
  });
});

test("the wide screen lists all four seat checks", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/#prong");
  await expect(page.locator(".checks .check:visible")).toHaveCount(4);
});

test.describe("the alloy decides the limits, and world cases bring the seat back", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("a 40% seat is red in 21 karat and sound in 18 karat", async ({ page }) => {
    await page.goto("/#prong");
    await page.locator("#seat-u").fill("0.6");
    await page.locator("#seat-h").fill("0.4");
    await expect(page.locator(".checks .check").first()).toHaveClass(/check-fail/);
    await page.getByRole("button", { name: "عيار 18", exact: true }).click();
    await expect(page.locator(".checks .check-fail")).toHaveCount(0);
    await expect(page.locator(".status")).toContainText("عيار 18");
  });

  test("every world case leaves nothing red, and taking it back restores the red", async ({ page }) => {
    await page.goto("/#prong");
    await page.locator("#seat-d").fill("0.3");
    await expect(page.locator(".checks .check-fail")).not.toHaveCount(0);
    for (const n of [1, 2, 3, 4]) {
      const c = page.locator(".case-world", { hasText: `عالمية ${n}` });
      await c.click();
      await expect(c).toHaveClass(/case-pass/);
      await expect(page.locator(".checks .check-fail")).toHaveCount(0);
      await expect(page.locator(".case-quote-world")).toBeVisible();
      await c.click();
      await expect(page.locator(".checks .check-fail")).not.toHaveCount(0);
    }
  });
});

test.describe("the stone and the prong height change the drawing and the verdict", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  const print = (page: Page) => page.evaluate(() => (document.querySelector(".board canvas") as HTMLCanvasElement).toDataURL().slice(-600));

  test("a heavier stone redraws the sheet and asks for a thicker prong", async ({ page }) => {
    await page.goto("/#prong");
    await page.locator("#seat-d").fill("1.3");
    await page.locator("#seat-u").fill("0.6");
    await expect(page.locator(".checks .check-fail")).toHaveCount(0);
    const before = await print(page);
    await page.getByRole("button", { name: "زركونيا مكعبة", exact: true }).first().click();
    await expect.poll(() => print(page)).not.toBe(before);
    await expect(page.locator(".checks .check", { hasText: "المناسب" })).toHaveClass(/check-(near|fail)/);
  });

  test("the prong height can be changed and is judged", async ({ page }) => {
    await page.goto("/#prong");
    await canvasHasInk(page);
    const before = await print(page);
    await page.locator("#seat-tip").fill("0.8");
    await expect.poll(() => print(page)).not.toBe(before);
    await expect(page.locator(".checks .check-fail", { hasText: "أقصر من أن يُثنى" })).toBeVisible();
    await page.locator("#seat-tip").fill("1.25");
    await expect(page.locator(".checks .check-fail", { hasText: "يُثنى" })).toHaveCount(0);
  });

  test("choosing emerald gives the step cut, and every cut redraws the stone", async ({ page }) => {
    await page.goto("/#prong");
    await canvasHasInk(page);
    const prints = new Set([await print(page)]);
    await page.getByRole("button", { name: "زمرد", exact: true }).first().click();
    await expect(page.getByRole("button", { name: "زمردي متدرّج" })).toHaveAttribute("aria-pressed", "true");
    for (const cut of ["أميرة (مربع)", "بيضاوي", "زمردي متدرّج"]) {
      await page.getByRole("button", { name: cut }).click();
      await page.waitForTimeout(120);
      prints.add(await print(page));
    }
    expect(prints.size).toBeGreaterThanOrEqual(4);
  });
});

test("the tool opens on a sound design, in plain words", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/#prong");
  await expect(page.locator(".checks .check")).toHaveCount(4);
  await expect(page.locator(".checks .check-fail, .checks .check-near")).toHaveCount(0);
  await expect(page.locator(".bookline-quote p")).toContainText("المقعد هو الحزّ");
});

test("the stone station draws each cut, and the lab never speaks about the book as a stranger", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/#prong");
  for (const t of ["عمق المقعد", "السماكة والطول", "وزن الحجر", "ما يضيع في التصنيع"]) {
    await page.getByRole("tab", { name: new RegExp(t) }).click();
    const text = await page.locator(".ws").innerText();
    expect(text).not.toMatch(/الكتاب يقرر|الكتاب:|المحرك|ورشة الكتاب|يحيله الكتاب/);
  }
  await page.getByRole("tab", { name: /وزن الحجر/ }).click();
  await canvasHasInk(page);
  const print = () => page.evaluate(() => (document.querySelector(".board canvas") as HTMLCanvasElement).toDataURL().slice(-600));
  const prints = new Set([await print()]);
  await page.getByRole("button", { name: "زمرد", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "زمردي متدرّج" }).first()).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(120); prints.add(await print());
  await page.getByRole("button", { name: "أميرة (مربع)" }).first().click();
  await page.waitForTimeout(120); prints.add(await print());
  expect(prints.size).toBe(3);
});

test.describe("links work even where the viewer refuses to follow them (file preview on a phone)", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("tapping a tool opens it with address changes blocked", async ({ page }) => {
    await page.addInitScript(() => {
      // what a locked-down viewer does: the address never changes and no hashchange is delivered
      window.addEventListener("hashchange", (e) => e.stopImmediatePropagation(), true);
      try { Object.defineProperty(Location.prototype, "hash", { get: () => "", set: () => {} }); } catch { /* keep going */ }
    });
    await page.goto("/");
    await page.locator('a.tool-card[href="#prong"]').first().tap();
    await expect(page.locator(".tool-title")).toContainText("قوة المخلب");
    await canvasHasInk(page);
    await page.locator("a.brand").tap();
    await expect(page.getByRole("heading", { name: "مختبر منطق المعدن" })).toBeVisible();
  });
});

for (const vp of VIEWPORTS) {
  test.describe(`panels fold · ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch && vp.width < 1024 });

    test("the drawing alone, then everything back", async ({ page }) => {
      await page.goto("/#prong");
      await canvasHasInk(page);
      const area = async () => { const b = (await page.locator(".board canvas").boundingBox())!; return b.width * b.height; };
      const visible = async () => page.evaluate(() => {
        const c = document.querySelector(".board canvas")!.getBoundingClientRect();
        const p = document.querySelector("#props")!.getBoundingClientRect();
        const top = Math.max(c.top, 0), bottom = Math.min(c.bottom, window.innerHeight, p.top > c.top && p.left < c.right && p.right > c.left ? p.top : Infinity);
        return Math.max(0, bottom - top) * c.width;
      });
      const before = await area(), seenBefore = await visible();
      await page.getByRole("button", { name: "الرسم وحده" }).click();
      await page.waitForTimeout(250);
      await expect(page.locator("#seat-h")).toBeHidden();
      await expect(page.locator(".bookline")).toBeHidden();
      if (vp.width >= 600 && vp.name !== "phone-landscape") await expect(page.locator("#rail")).toBeHidden();
      expect(await visible(), "more of the drawing is in view").toBeGreaterThan(seenBefore * 1.15);
      expect(await area()).toBeGreaterThanOrEqual(before * 0.99);
      await canvasHasInk(page);
      await noHorizontalOverflow(page);
      if (vp.width >= 1024) {
        // on a wide screen the whole sheet is in view, nothing cut off below
        const b = (await page.locator(".board").boundingBox())!;
        expect(b.y + b.height).toBeLessThanOrEqual(vp.height);
      }
      await page.getByRole("button", { name: "إظهار القوائم" }).click();
      await expect(page.locator(".bookline")).toBeVisible();
      await expect(page.locator(".result-big").first()).toBeVisible();
    });

    test("the properties fold and open on their own", async ({ page }) => {
      await page.goto("/#prong");
      await page.getByRole("button", { name: "طيّ الخصائص" }).click();
      await expect(page.locator(".result-big").first()).toBeHidden();
      await expect(page.locator(".bookline")).toBeVisible();
      await page.getByRole("button", { name: "إظهار الخصائص" }).first().click();
      await expect(page.locator(".result-big").first()).toBeVisible();
    });
  });
}

test("the tools list folds on a wide screen and the drawing takes its place", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/#prong");
  const w0 = (await page.locator(".board canvas").boundingBox())!.width;
  await page.getByRole("button", { name: "طيّ قائمة الأدوات" }).click();
  await expect(page.locator("#rail")).toBeHidden();
  await expect.poll(async () => (await page.locator(".board canvas").boundingBox())!.width).toBeGreaterThan(w0 + 150);
  await page.getByRole("button", { name: "إظهار قائمة الأدوات" }).click();
  await expect(page.locator("#rail")).toBeVisible();
});

test.describe("explanations sit behind a ? mark", () => {
  test("mouse: opens on press, closes when the mouse leaves", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/#prong");
    const box = page.locator("#seat-h-hint");
    await expect(box).toBeHidden();
    await expect(page.locator(".ctl-hint:visible")).toHaveCount(1); // only the stone's weight line stays as text
    await page.getByRole("button", { name: "شرح: عمق المقعد" }).click();
    await expect(box).toBeVisible();
    await expect(box).toContainText("الحزّ الذي يجلس فيه الحجر");
    await page.mouse.move(700, 400);
    await expect(box).toBeHidden();
    await page.getByRole("button", { name: "شرح: السبيكة" }).click();
    await expect(page.getByRole("tooltip").filter({ hasText: "السبيكة اللينة" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip").filter({ hasText: "السبيكة اللينة" })).toBeHidden();
  });

  test("touch: opens on a tap, closes on a tap elsewhere", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto("/#prong");
    const box = page.locator("#seat-h-hint");
    await expect(box).toBeHidden();
    await page.getByRole("button", { name: "شرح: عمق المقعد" }).tap();
    await expect(box).toBeVisible();
    await noHorizontalOverflow(page);
    await page.locator(".tool-title").tap();
    await expect(box).toBeHidden();
    await ctx.close();
  });
});

test("wide screen: the answer stays in view, the seat-depth slider scrolls with the rest", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/#prong");
  await expect(page.locator("#seat-h")).toBeInViewport();
  await page.locator("#props").evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(page.locator(".result-big").first()).toBeInViewport();
  await expect(page.locator("#seat-h")).not.toBeInViewport();
  await expect(page.locator("#seat-u")).toBeInViewport();
  await expect(page.locator(".cases-title")).toContainText("أمثلة جاهزة");
  expect(await page.locator(".ws").innerText()).not.toMatch(/اضغط حالة|الحالات/);
});

test.describe("the first page speaks to a reader who has not read the books", () => {
  test("one card per tool with its question; search finds what it promises and says when it finds nothing", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator("a.tool-card")).toHaveCount(15);
    await expect(page.locator('a.tool-card[href="#prong"]')).toContainText("هل يمسك المخلب الحجر؟");
    await expect(page.locator("a.tool-card").first()).toBeInViewport(); // a tool is on the first screen of a phone
    expect(await page.locator(".landing").innerText()).not.toMatch(/ك[123]\b|المختبر الموازي|والبقية قيد البناء/);
    const search = page.locator("#landing-search");
    for (const [q, id] of [["الفصل العاشر", "prong"], ["d/4", "prong"], ["ألماس", "prong"], ["مقاس", "size"], ["لحام", "heat"]] as const) {
      await search.fill(q);
      await expect(page.locator(`a.tool-card[href="#${id}"]`)).toBeVisible();
    }
    await search.fill("مخلب");
    await expect(page.locator('a.tool-card[href="#scale"]')).toHaveCount(0); // only the tools that match
    await search.fill("زعفران");
    await expect(page.locator("a.tool-card")).toHaveCount(0);
    await expect(page.locator(".no-results")).toBeVisible();
    await noHorizontalOverflow(page);
  });
});

test.describe("phone: the drawing stays in view while every control is used", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("with all properties open, the drawing is visible and follows a control that is not the first", async ({ page }) => {
    await page.goto("/#hollow");
    await canvasHasInk(page);
    await page.getByRole("button", { name: "كل الخصائص" }).last().click();
    const print = () => page.evaluate(() => { const u = (document.querySelector(".board canvas") as HTMLCanvasElement).toDataURL(); let h = 0; for (let i = 0; i < u.length; i++) h = (h * 31 + u.charCodeAt(i)) | 0; return h; });
    const seen = await page.evaluate(() => {
      const c = document.querySelector(".board canvas")!.getBoundingClientRect(), p = document.querySelector("#props")!.getBoundingClientRect();
      return { top: c.top, visible: Math.min(c.bottom, p.top) - Math.max(c.top, 0), height: c.height };
    });
    expect(seen.visible, "the whole drawing is above the sheet").toBeGreaterThan(seen.height * 0.95);
    expect(seen.height).toBeGreaterThan(280);
    const before = await print();
    const ds = page.locator("#hollow-ds");
    await ds.scrollIntoViewIfNeeded();
    await ds.fill("9");
    await expect.poll(print).not.toBe(before);
    await expect(page.locator(".board canvas")).toBeInViewport();
    await expect(page.getByRole("button", { name: /الخصائص/ }).first()).toBeVisible();
  });
});

