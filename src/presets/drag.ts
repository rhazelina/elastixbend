import { createVelocityTracker, smooth } from "../input";
import type { PresetHost, PresetModule } from "./types";

/** Small enough to feel attached to the pointer, large enough to smooth jitter. */
const DRAG_SMOOTHING = 0.45;
const MAX_CARRY = 2400;

/** Elements that own a click gesture, so a drag starting on them is not ours. */
const INTERACTIVE = "a, button, input, select, textarea, label, [contenteditable]";

/**
 * Pull that follows a pointer inside the target.
 *
 * The library never cancels the pointer gesture (C1) and never writes
 * `touch-action` (C3), so the consumer declares `touch-action: none` on the
 * target. Without it the browser takes the gesture for scrolling, `pointermove`
 * stops arriving, and the interaction dies quietly. `debug` reports the missing
 * declaration at creation.
 *
 * Displacement follows the pointer at 1:1. Resistance exists to make scroll
 * deltas comparable across devices; a pointer does not need that, and dividing
 * here would make the band lag behind the finger.
 */
export function createDragPreset(host: PresetHost, element: HTMLElement): PresetModule {
  const tracker = createVelocityTracker();

  let active = false;
  let pointerId: number | null = null;
  let originX = 0;
  let originY = 0;
  let target = 0;

  /** Ceiling for this drag: a fraction of the target's own size, so a short
   *  strip does not get a page-sized pull. */
  function limit(): number {
    const size = host.axis === "y" ? element.clientHeight : element.clientWidth;
    return Math.max(0, Math.min(host.pullLimit(), size * host.options.dragMaxRatio));
  }

  function clampToLimit(value: number): number {
    const ceiling = limit();
    return Math.max(-ceiling, Math.min(ceiling, value));
  }

  function onPointerDown(event: PointerEvent): void {
    if (pointerId !== null) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (host.isBlocked(event.target)) return;
    if (event.target instanceof Element && event.target.closest(INTERACTIVE) !== null) return;

    active = true;
    pointerId = event.pointerId;
    originX = event.clientX;
    originY = event.clientY;
    target = 0;
    tracker.reset();
    tracker.push(host.pull, performance.now());

    // Capture keeps the gesture alive when the pointer leaves the element. It
    // does not cancel anything, so the scroll contract is untouched.
    try {
      element.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic pointers have no capture target. The gesture still works.
    }
    host.requestFrame();
  }

  function onPointerMove(event: PointerEvent): void {
    if (!active || event.pointerId !== pointerId) return;

    const raw = host.axis === "y" ? event.clientY - originY : event.clientX - originX;
    target = clampToLimit(raw);
    host.requestFrame();
  }

  function endDrag(): void {
    if (!active) return;
    active = false;

    if (pointerId !== null) {
      try {
        element.releasePointerCapture?.(pointerId);
      } catch {
        // Capture may already be gone after a cancel or a synthetic pointer.
      }
      pointerId = null;
    }

    // The carry is the band's own velocity, so a flick keeps travelling before
    // the spring turns it around.
    const carried = Math.max(-MAX_CARRY, Math.min(MAX_CARRY, tracker.velocity()));
    tracker.reset();
    target = 0;
    host.release(carried);
  }

  element.addEventListener("pointerdown", onPointerDown, { passive: true });
  element.addEventListener("pointermove", onPointerMove, { passive: true });
  element.addEventListener("pointerup", endDrag, { passive: true });
  element.addEventListener("pointercancel", endDrag, { passive: true });

  return {
    frame() {
      if (!active) return false;

      // Smoothing runs per frame rather than per event, so a burst of pointer
      // moves cannot outpace the spring.
      const next = smooth(host.pull, target, DRAG_SMOOTHING);
      const reached = Math.abs(next - target) < 0.05;
      host.setPull(reached ? target : next);
      tracker.push(host.pull, performance.now());
      return true;
    },
    isEngaged() {
      return active;
    },
    destroy() {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", endDrag);
      element.removeEventListener("pointercancel", endDrag);
      if (pointerId !== null) {
        try {
          element.releasePointerCapture?.(pointerId);
        } catch {
          // Same as above: losing capture must not block cleanup.
        }
        pointerId = null;
      }
    },
  };
}