import type { Axis } from "./types";

/**
 * Firefox reports wheel deltas in lines and some devices in pages. Without
 * normalisation the same gesture feels different per browser.
 */
const LINE_HEIGHT = 100 / 6;

export function normalizeWheel(
  event: WheelEvent,
  axis: Axis,
  viewport: { width: number; height: number },
): number {
  const raw = axis === "x" ? event.deltaX : event.deltaY;
  if (raw === 0) return 0;

  if (event.deltaMode === 1) return raw * LINE_HEIGHT;
  if (event.deltaMode === 2) return raw * (axis === "x" ? viewport.width : viewport.height);
  return raw;
}

export interface VelocityTracker {
  /** Feed a displacement sample; returns px/s across the last two samples. */
  push(value: number, now: number): number;
  /** Last computed velocity, in px/s. */
  velocity(): number;
  reset(): void;
}

/**
 * Two-sample velocity over the *displacement*, not the input delta.
 *
 * Sampling the raw wheel delta measures how fast the user spun the wheel, which
 * grows with event frequency and says nothing about how fast the band is
 * actually moving. Feeding the band position instead gives a carry that matches
 * what the eye just saw.
 */
export function createVelocityTracker(): VelocityTracker {
  let lastValue = 0;
  let lastTime = 0;
  let lastVelocity = 0;
  let primed = false;

  return {
    push(value, now) {
      if (!primed) {
        primed = true;
        lastValue = value;
        lastTime = now;
        return 0;
      }
      const dt = now - lastTime;
      if (dt <= 0) {
        lastValue = value;
        return lastVelocity;
      }
      lastVelocity = ((value - lastValue) / dt) * 1000;
      lastValue = value;
      lastTime = now;
      return lastVelocity;
    },
    velocity() {
      return lastVelocity;
    },
    reset() {
      primed = false;
      lastValue = 0;
      lastTime = 0;
      lastVelocity = 0;
    },
  };
}

/** Exponential moving average, used to keep the surface lean from jittering. */
export function smooth(previous: number, next: number, factor = 0.28): number {
  return previous + (next - previous) * factor;
}
