import { expect, test } from "@playwright/test";

test.describe("scroll contract", () => {
  test("never cancels a scroll gesture", async ({ page }) => {
    await page.goto("/edge.html");

    // Any `preventDefault` on wheel/touch/pointer shows up here. A passive
    // listener cannot cancel, so this also proves the listeners are passive.
    await page.evaluate(() => {
      const w = window as unknown as { __cancelled: string[] };
      w.__cancelled = [];
      for (const type of ["wheel", "touchmove", "touchstart", "pointermove"]) {
        document.addEventListener(
          type,
          (event) => {
            if (event.defaultPrevented) w.__cancelled.push(type);
          },
          { passive: true, capture: true },
        );
      }
    });

    await page.mouse.move(400, 400);
    // Hammer both directions so every preset branch is exercised.
    for (let index = 0; index < 10; index += 1) {
      await page.mouse.wheel(0, index % 2 === 0 ? -400 : 400);
      await page.waitForTimeout(30);
    }

    const cancelled = await page.evaluate(
      () => (window as unknown as { __cancelled: string[] }).__cancelled,
    );
    expect(cancelled).toEqual([]);
  });

  test("drag never cancels the pointer gesture", async ({ page }) => {
    await page.goto("/drag.html");

    // `drag` is the one preset that follows a pointer. It is still not allowed
    // to cancel anything: capture keeps the gesture alive, cancellation would
    // take it from the page.
    await page.evaluate(() => {
      const w = window as unknown as { __cancelled: string[] };
      w.__cancelled = [];
      for (const type of ["pointerdown", "pointermove", "pointerup", "touchstart", "touchmove"]) {
        document.addEventListener(
          type,
          (event) => {
            if (event.defaultPrevented) w.__cancelled.push(type);
          },
          { passive: true, capture: true },
        );
      }
    });

    const card = page.locator("#stage");
    const box = await card.boundingBox();
    if (!box) throw new Error("drag card has no box");

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 90, { steps: 8 });
    await page.mouse.up();

    const cancelled = await page.evaluate(
      () => (window as unknown as { __cancelled: string[] }).__cancelled,
    );
    expect(cancelled).toEqual([]);
  });

  test("drag leaves the element's touch-action to the page", async ({ page }) => {
    await page.goto("/drag.html");

    // The library must not write inline `touch-action`; the page's stylesheet
    // owns that declaration.
    const inline = await page.evaluate(
      () => document.querySelector<HTMLElement>("#stage")?.style.touchAction ?? "",
    );
    expect(inline).toBe("");
  });

  test("leaves scroll position under native control", async ({ page }) => {
    await page.goto("/edge.html");

    // Scrolling down from the top is the browser's job and must keep working.
    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, 400);

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test("does not write scroll position while pulling", async ({ page }) => {
    await page.goto("/edge.html");

    await page.evaluate(() => {
      const scope = window as unknown as {
        __writes: number;
        scrollTo: (...args: unknown[]) => unknown;
        scrollBy: (...args: unknown[]) => unknown;
        scroll: (...args: unknown[]) => unknown;
      };
      scope.__writes = 0;

      // Only a library that owned scrolling would need any of these.
      for (const method of ["scrollTo", "scrollBy", "scroll"] as const) {
        const original = scope[method];
        scope[method] = (...args: unknown[]) => {
          scope.__writes += 1;
          return original.apply(window, args);
        };
      }
    });

    await page.mouse.move(400, 400);
    for (let index = 0; index < 6; index += 1) {
      await page.mouse.wheel(0, -300);
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(500);

    const writes = await page.evaluate(
      () => (window as unknown as { __writes: number }).__writes,
    );
    expect(writes).toBe(0);
  });
});
