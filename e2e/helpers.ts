import type { Page } from "@playwright/test";

/**
 * The playground HTML contains `#pull` before its module executes. Waiting for
 * that element alone lets a gesture land before `createBend` installs listeners.
 * The demo sets `data-bend-ready` after mount, so that is the signal to wait for.
 */
export async function open(page: Page, path: string): Promise<void> {
  // Headless browsers can throttle requestAnimationFrame on a page that is not
  // frontmost. Bring it forward before any gesture that animates.
  await page.bringToFront();
  await page.goto(path);
  await page.waitForFunction(() => document.body.dataset.bendReady === "1");
}
