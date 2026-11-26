import { activeTaskCount } from "../../src/scheduler";

/**
 * Playground-only harness hooks.
 *
 * `?bare=1` hides the readout and controls so a measurement run sees the
 * library's own work and nothing else. The debug handle exposes the scheduler
 * so a measurement can prove the frame loop sleeps when the band is idle.
 */
export const bare = new URLSearchParams(location.search).has("bare");

if (bare) document.body.classList.add("bare");

(window as unknown as { __bendDebug?: unknown }).__bendDebug = {
  activeTaskCount,
};

/**
 * Set only after `createBend` has returned. The HTML contains the readout
 * before the module runs, so waiting for the element alone lets a fast test
 * send its first gesture into a page that has no listeners yet. This is most
 * visible on a cold WebKit page.
 */
export function markReady(): void {
  document.body.dataset.bendReady = "1";
}
