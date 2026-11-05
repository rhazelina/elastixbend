import { expect, test } from "@playwright/test";

const readPull = async (page: import("@playwright/test").Page): Promise<number> => {
  const text = await page.locator("#pull").innerText();
  return Number.parseFloat(text);
};

const readPhase = async (page: import("@playwright/test").Page): Promise<string> =>
  page.locator("#phase").innerText();

test.describe("edge preset", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/edge.html");
    await page.waitForFunction(() => document.querySelector("#pull") !== null);
  });

  test("pulls past the top and springs back", async ({ page }) => {
    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, -600);

    await expect.poll(() => readPull(page)).toBeGreaterThan(4);
    const peak = await readPull(page);
    expect(peak).toBeLessThan(130);

    await expect.poll(() => readPhase(page), { timeout: 3000 }).toBe("idle");
    await expect.poll(() => readPull(page)).toBe(0);
  });

  test("does nothing when scrolling away from the edge", async ({ page }) => {
    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(200);

    expect(await readPull(page)).toBe(0);
    expect(await readPhase(page)).toBe("idle");
  });

  test("pulls upward at the bottom of the document", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(100);

    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, 600);

    await expect.poll(() => readPull(page)).toBeLessThan(-4);
  });

  test("a click drops the band immediately", async ({ page }) => {
    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, -600);
    await expect.poll(() => readPull(page)).toBeGreaterThan(4);

    await page.mouse.down();
    await expect.poll(() => readPull(page)).toBe(0);
    await page.mouse.up();
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("stays inert", async ({ page }) => {
    await page.goto("/edge.html");
    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(300);

    expect(await readPull(page)).toBe(0);
    expect(await readPhase(page)).toBe("idle");
  });
});

test.describe("surface preset", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/surface.html");
    await page.waitForFunction(() => document.querySelector("#pull") !== null);
  });

  test("leans against the scroll direction and returns to rest", async ({ page }) => {
    await page.mouse.move(400, 400);
    for (let index = 0; index < 6; index += 1) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(40);
    }

    await expect.poll(() => readPull(page)).toBeLessThan(-0.4);
    await expect.poll(() => readPull(page), { timeout: 4000 }).toBe(0);
    await expect.poll(() => readPhase(page)).toBe("idle");
  });
});

test.describe("touch drag", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 780 } });

  test("edge pulls with a finger drag", async ({ page, context }) => {
    await page.goto("/edge.html");
    const cdp = await context.newCDPSession(page);

    const drag = async (fromY: number, toY: number): Promise<void> => {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: 195, y: fromY }],
      });
      const steps = 6;
      for (let step = 1; step <= steps; step += 1) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: 195, y: fromY + ((toY - fromY) * step) / steps }],
        });
      }
    };

    await drag(200, 360);
    await expect.poll(() => readPull(page)).toBeGreaterThan(2);

    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => readPhase(page), { timeout: 3000 }).toBe("idle");
  });
});
