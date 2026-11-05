/**
 * One-off probe for the claim in DECISIONS.md D11: the composited-layer API is
 * not observable in headless Chromium.
 *
 * Kept in the repo so the "unverified" note about layer size is reproducible
 * rather than a hand-wave.
 */
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const cdp = await page.context().newCDPSession(page);

await cdp.send("DOM.enable");
await cdp.send("LayerTree.enable");

let events = 0;
cdp.on("LayerTree.layerTreeDidChange", () => {
  events += 1;
});

await page.goto("http://127.0.0.1:4173/edge.html?bare=1");
await page.waitForTimeout(500);

await page.mouse.move(640, 400);
for (let step = 0; step < 10; step += 1) {
  await page.mouse.wheel(0, step % 2 === 0 ? -200 : 200);
  await page.waitForTimeout(30);
}
await page.waitForTimeout(600);

const transform = await page.evaluate(() => {
  const stage = document.querySelector("#stage");
  return stage ? getComputedStyle(stage).transform : null;
});

console.log(JSON.stringify({ layerTreeEvents: events, stageTransform: transform }, null, 2));
console.log(
  events === 0
    ? "layer tree is not observable here; layer size stays a manual DevTools check"
    : "layer tree reported changes; expect a layer",
);

await browser.close();
