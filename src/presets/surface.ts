import { MAX_SURFACE_VELOCITY, SURFACE_HOLD, clamp } from "../constants";
import { createVelocityTracker, smooth } from "../input";
import type { PresetHost, PresetModule } from "./types";

/**
 * `lean`: the content trails behind scroll velocity and catches up, so the page
 * reads as a surface with mass.
 *
 * It never calls `preventDefault` and never writes scroll position, which keeps
 * the smooth-scroll decision in the consumer's hands. Keyboard, scrollbar, and
 * programmatic scrolling all produce the same lean as a gesture.
 */
export function createSurfacePreset(host: PresetHost): PresetModule {
  const lag = host.options.lagFactor;
  const tracker = createVelocityTracker();

  let velocity = 0;
  let target = 0;
  let lastScrollAt = 0;
  let primed = false;

  // `surface` has no edge to clamp against, so it needs no limit watcher.

  function onScroll(): void {
    const now = performance.now();
    const raw = tracker.push(host.geometry.offset, now);

    if (!primed) {
      primed = true;
      lastScrollAt = now;
      return;
    }
    lastScrollAt = now;

    // Anchor jumps and scrollbar drags are navigation, not gestures. Leaning on
    // those reads as a glitch, so the lean is dropped instead.
    if (Math.abs(raw) > MAX_SURFACE_VELOCITY) {
      velocity = 0;
      target = 0;
      host.springTo(0);
      host.requestFrame();
      return;
    }

    velocity = smooth(velocity, raw);
    target = clamp(-velocity * lag, -host.pullLimit(), host.pullLimit());
    host.springTo(target);
    host.requestFrame();
  }

  window.addEventListener("scroll", onScroll, { passive: true });

  return {
    frame(dt) {
      void dt;
      const engaged = performance.now() - lastScrollAt < SURFACE_HOLD;
      if (!engaged && target === 0) return false;

      if (!engaged) {
        velocity = smooth(velocity, 0, 0.16);
        target = clamp(-velocity * lag, -host.pullLimit(), host.pullLimit());
        if (Math.abs(target) < 0.05) target = 0;
        host.springTo(target);
      }
      return true;
    },
    isEngaged() {
      return performance.now() - lastScrollAt < SURFACE_HOLD;
    },
    destroy() {
      window.removeEventListener("scroll", onScroll);
    },
  };
}
