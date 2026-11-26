import { expect, test } from "@playwright/test";

/**
 * Regression for a cold-start race seen on WebKit in CI. The playground HTML
 * contains `#pull` before its module runs, so waiting for the element alone can
 * send the first wheel into a page with no listeners. Delaying the module makes
 * that window deterministic. The readiness flag must close it.
 */
test("the first gesture waits for the playground to mount", async ({ page }) => {
  await page.route("**/*", async (route) => {
    if (route.request().url().includes("demo/edge.ts")) {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    await route.continue();
  });

  // Commit returns before deferred modules run, which is the racy window.
  await page.goto("/edge.html", { waitUntil: "commit" });
  await page.waitForFunction(() => document.body.dataset.bendReady === "1");

  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, -600);

  await expect
    .poll(async () => Number.parseFloat(await page.locator("#pull").innerText()))
    .toBeGreaterThan(4);
});
