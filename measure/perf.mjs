import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const SAMPLES = 3;

/**
 * Performance gate. Records only what this environment can actually observe.
 *
 * Measured: frame timing while a scroll burst is running, layout and style
 * recalc counts across the burst, main-thread script time, and whether the
 * shared frame loop is at rest once the band settles.
 *
 * Not measured: composited layer size. `LayerTree.layerTreeDidChange` emits
 * nothing in headless Chromium, so that stays a manual DevTools Layers-panel
 * check. It is recorded as unverified rather than reported as a pass.
 *
 * Caveat recorded on purpose: headless frame timing is noisy, so the numbers
 * are indicative, not a CI threshold. Only `restVerified` is asserted.
 */
async function main() {
  const browser = await chromium.launch();
  const results = [];

  for (const url of ["edge", "surface", "edge?off=1"]) {
    const runs = [];
    for (let sample = 0; sample < SAMPLES; sample += 1) {
      runs.push(await measureOnce(browser, url));
    }
    results.push({ target: url, runs, summary: summarize(runs) });
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

async function measureOnce(browser, url) {
  const path = url.includes("?") ? url : `${url}?bare=1`;
  const query = path.includes("bare") ? path : `${path}&bare=1`;

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");

  await page.goto(`${BASE}/${query}`);
  await page.waitForTimeout(600);

  const before = await metrics(cdp);

  const timing = await page.evaluate(async () => {
    const deltas = [];
    let last = performance.now();
    let running = true;

    // The burst runs inside the measurement window, so the frames counted are
    // the frames the band actually competes for.
    const burst = (async () => {
      const target = document.querySelector("#stage") ?? document.body;
      for (let index = 0; index < 24; index += 1) {
        target.dispatchEvent(
          new WheelEvent("wheel", {
            deltaY: index < 12 ? -140 : 140,
            bubbles: true,
            cancelable: true,
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 16));
      }
      running = false;
    })();

    await new Promise((resolve) => {
      const tick = (now) => {
        deltas.push(now - last);
        last = now;
        if (!running || deltas.length >= 150) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await burst;

    const sorted = deltas.slice().sort((a, b) => a - b);
    const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
    const r = (value) => Number(value.toFixed(2));
    return {
      frames: sorted.length,
      medianMs: r(at(0.5)),
      p95Ms: r(at(0.95)),
      worstMs: r(sorted[sorted.length - 1]),
      over32ms: sorted.filter((value) => value > 32).length,
    };
  });

  const after = await metrics(cdp);

  const idle = await page.evaluate(async () => {
    const debug = window.__bendDebug;
    if (!debug) return null;

    // "Sleeps when idle" means it reaches zero, not that it is zero the instant
    // the gesture ends, so poll with a deadline instead of sampling at random.
    const started = performance.now();
    let settleMs = null;
    while (performance.now() - started < 3000) {
      if (debug.activeTaskCount() === 0) {
        settleMs = Math.round(performance.now() - started);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    const samples = [];
    for (let index = 0; index < 4; index += 1) {
      samples.push(debug.activeTaskCount());
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return { settleMs, samples };
  });

  await page.close();

  return {
    frameTiming: timing,
    layoutCount: after.LayoutCount - before.LayoutCount,
    recalcStyleCount: after.RecalcStyleCount - before.RecalcStyleCount,
    scriptMs: Math.round((after.ScriptDuration - before.ScriptDuration) * 1000),
    settleMs: idle ? idle.settleMs : null,
    idleTaskCounts: idle ? idle.samples : null,
    restVerified: idle ? idle.samples.every((value) => value === 0) : null,
  };
}

function summarize(runs) {
  const median = (values) => {
    const sorted = values.slice().sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };
  return {
    medianOfRuns: {
      p50Ms: median(runs.map((run) => run.frameTiming.medianMs)),
      p95Ms: median(runs.map((run) => run.frameTiming.p95Ms)),
      over32ms: median(runs.map((run) => run.frameTiming.over32ms)),
    },
    layoutCount: median(runs.map((run) => run.layoutCount)),
    recalcStyleCount: median(runs.map((run) => run.recalcStyleCount)),
    scriptMs: median(runs.map((run) => run.scriptMs)),
    settleMs: median(runs.map((run) => run.settleMs ?? 0)),
    restVerified: runs.every((run) => run.restVerified !== false),
  };
}

async function metrics(cdp) {
  const { metrics } = await cdp.send("Performance.getMetrics");
  return Object.fromEntries(metrics.map((metric) => [metric.name, metric.value]));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
