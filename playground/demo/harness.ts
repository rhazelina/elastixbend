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
