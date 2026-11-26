import { expect, test } from "@playwright/test";
import { open } from "./helpers";

const readPull = async (page: import("@playwright/test").Page): Promise<number> => {
  const text = await page.locator("#pull").innerText();
  return Number.parseFloat(text);
};

const readPhase = async (page: import("@playwright/test").Page): Promise<string> =>
  page.locator("#phase").innerText();

test.describe("edge preset", () => {
  test.beforeEach(async ({ page }) => {
    await open(page, "/edge.html");
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

test.describe("edge preset on the x axis", () => {
  test.beforeEach(async ({ page }) => {
    await open(page, "/edge-x.html");
    await page.waitForFunction(() => document.querySelector("#pull") !== null);
  });

  test("pulls sideways past the left edge", async ({ page }) => {
    await page.mouse.move(400, 300);
    await page.evaluate(() => {
      window.dispatchEvent(
        new WheelEvent("wheel", { deltaX: -600, bubbles: true, cancelable: true }),
      );
    });

    await expect.poll(() => readPull(page)).toBeGreaterThan(4);
    await expect.poll(() => readPhase(page), { timeout: 3000 }).toBe("idle");
    await expect.poll(() => readPull(page)).toBe(0);
  });

  test("does nothing when scrolling right from the start", async ({ page }) => {
    await page.mouse.move(400, 300);
    await page.evaluate(() => {
      window.dispatchEvent(
        new WheelEvent("wheel", { deltaX: 600, bubbles: true, cancelable: true }),
      );
    });
    await page.waitForTimeout(200);

    expect(await readPull(page)).toBe(0);
  });

  test("never writes the horizontal scroll position", async ({ page }) => {
    await page.evaluate(() => {
      window.dispatchEvent(
        new WheelEvent("wheel", { deltaX: -600, bubbles: true, cancelable: true }),
      );
    });
    await page.waitForTimeout(160);

    expect(await page.evaluate(() => window.scrollX)).toBe(0);
  });
});

test.describe("drag preset", () => {
  test.beforeEach(async ({ page }) => {
    await open(page, "/drag.html");
    await page.waitForFunction(() => document.querySelector("#pull") !== null);
  });

  test("follows the pointer and springs back", async ({ page }) => {
    const card = page.locator("#stage");
    const box = await card.boundingBox();
    if (!box) throw new Error("drag card has no box");

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 60, { steps: 6 });

    await expect.poll(() => readPull(page)).toBeGreaterThan(20);

    await page.mouse.up();
    await expect.poll(() => readPhase(page), { timeout: 3000 }).toBe("idle");
    await expect.poll(() => readPull(page)).toBe(0);
  });

  test("does not scroll the page while dragging", async ({ page }) => {
    const card = page.locator("#stage");
    const box = await card.boundingBox();
    if (!box) throw new Error("drag card has no box");

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 80, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(120);

    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("stays inert", async ({ page }) => {
    await open(page, "/edge.html");
    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(300);

    expect(await readPull(page)).toBe(0);
    expect(await readPhase(page)).toBe("idle");
  });
});

test.describe("reactive reduced motion", () => {
  test("picks up a preference change without recreating the instance", async ({ page }) => {
    await open(page, "/edge.html");
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(200);
    expect(await readPull(page)).toBe(0);

    await page.emulateMedia({ reducedMotion: "no-preference" });
    // The media-query callback installs a new engine asynchronously. Give it a
    // beat before sending input so the wheel is not lost in the swap.
    await page.waitForTimeout(120);
    await page.mouse.wheel(0, -600);
    await expect.poll(() => readPull(page)).toBeGreaterThan(4);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => readPull(page)).toBe(0);
    await expect.poll(() => readPhase(page)).toBe("idle");
  });
});

test.describe("surface preset", () => {
  test.beforeEach(async ({ page }) => {
    await open(page, "/surface.html");
    await page.waitForFunction(() => document.querySelector("#pull") !== null);
  });

  test("leans against the scroll direction and returns to rest", async ({ page }) => {
    await page.mouse.move(400, 400);
    for (let index = 0; index < 6; index += 1) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(40);
    }

    await expect.poll(() => readPull(page)).toBeLessThan(-0.4);
    // The integrator caps dt at 64 ms. On a slow headless frame clock the
    // spring needs more wall time to converge than a 60 Hz browser does.
    await expect
      .poll(async () => Math.abs(await readPull(page)), { timeout: 8000 })
      .toBeLessThan(1);
    await expect.poll(() => readPhase(page)).toBe("idle");
  });
});

test.describe("touch drag", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 780 } });

  test("edge pulls with a finger drag", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "uses CDP to dispatch touch points");
    await open(page, "/edge.html");
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
