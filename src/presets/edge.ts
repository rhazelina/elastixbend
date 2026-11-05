import { edgeAt } from "../geometry";
import { createVelocityTracker, normalizeWheel } from "../input";
import { resist } from "../kernels/resistance";
import type { Edge, PresetHost, PresetModule } from "./types";

/** A flick should not throw the band across the screen, whatever the device. */
const MAX_CARRY = 2400;

/**
 * Pull at the top or bottom of the document.
 *
 * Only wheel and touch are handled here. Native scroll keeps doing the actual
 * scrolling; we never write scroll position, so a smooth-scroll library on the
 * page can coexist with this without either side fighting the other.
 */
export function createEdgePreset(host: PresetHost): PresetModule {
  const { resistance, releaseDelay } = host.options;
  const tracker = createVelocityTracker();

  let edge: Edge | null = null;
  let queued = 0;
  let active = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const detachGeometry = host.geometry.watch(() => {
    // A resize can change the limit, so an active pull may now be out of range.
    if (active && edge !== null) host.setPull(host.clampPull(host.pull, edge));
  });

  const atTop = () => edgeAt(host.geometry.offset, host.geometry.limit) === "start";
  const atBottom = () => edgeAt(host.geometry.offset, host.geometry.limit) === "end";

  function scheduleRelease(): void {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (active) release();
    }, releaseDelay);
  }

  function begin(nextEdge: Edge): void {
    if (edge !== nextEdge) {
      edge = nextEdge;
      // Crossing from one edge to the other is a new gesture, not a continuation.
      tracker.reset();
    }
    active = true;
    host.requestFrame();
  }

  function release(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (!active) return;

    active = false;
    queued = 0;

    // The carry is the band's own velocity, in px/s, so a flick keeps travelling
    // the way the finger was pushing before the spring turns it around.
    host.release(Math.max(-MAX_CARRY, Math.min(MAX_CARRY, tracker.velocity())));
    tracker.reset();
  }

  function onWheel(event: WheelEvent): void {
    if (event.ctrlKey || host.isBlocked(event.target)) return;

    const delta = normalizeWheel(event, host.axis, host.viewport);
    if (delta === 0) return;
    if (host.isNested(event.target, host.axis, delta)) return;

    const inward = delta > 0;

    if (atTop() && !inward) {
      begin("top");
      queued += Math.abs(delta);
    } else if (atBottom() && inward) {
      begin("bottom");
      queued += Math.abs(delta);
    } else if (active) {
      release();
      return;
    } else {
      return;
    }
    scheduleRelease();
  }

  // Touch is read as a gesture delta: the finger moving down pulls the content
  // down, so the sign already matches the displacement.
  let touchY = 0;
  let touching = false;

  function onTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    if (event.touches.length !== 1 || !touch || host.isBlocked(event.target)) {
      touching = false;
      return;
    }
    touching = true;
    touchY = touch.clientY;
    tracker.reset();
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function onTouchMove(event: TouchEvent): void {
    const touch = event.touches[0];
    if (!touching || !touch || event.touches.length !== 1) return;

    const delta = touch.clientY - touchY;
    touchY = touch.clientY;
    if (delta === 0) return;
    if (host.isNested(event.target, host.axis, delta)) return;

    if (atTop() && delta > 0) {
      begin("top");
      queued += Math.abs(delta);
    } else if (atBottom() && delta < 0) {
      begin("bottom");
      queued += Math.abs(delta);
    } else if (active) {
      release();
    }
  }

  function onTouchEnd(): void {
    if (!touching) return;
    touching = false;
    if (active) release();
  }

  // A click while the band is stretched would land on a shifted target.
  function onPointerDown(): void {
    if (host.pull === 0) return;
    host.snapToRest();
  }

  // Keyboard, scrollbar, and programmatic scrolls can leave a stale pull.
  function onScroll(): void {
    if (!active) return;
    if (edgeAt(host.geometry.offset, host.geometry.limit) !== (edge === "top" ? "start" : "end")) {
      release();
    }
  }

  const listeners: Array<[string, EventListener]> = [
    ["wheel", onWheel as EventListener],
    ["touchstart", onTouchStart as EventListener],
    ["touchmove", onTouchMove as EventListener],
    ["touchend", onTouchEnd as EventListener],
    ["touchcancel", onTouchEnd as EventListener],
    ["pointerdown", onPointerDown as EventListener],
    ["scroll", onScroll as EventListener],
  ];

  for (const [type, listener] of listeners) {
    window.addEventListener(type, listener, { passive: true });
  }

  return {
    frame() {
      if (!active || edge === null || queued === 0) return false;
      const direction = edge === "top" ? 1 : -1;
      const next = host.clampPull(host.pull + direction * resist(queued, resistance), edge);
      queued = 0;
      host.setPull(next);

      // Sample the displacement the band reached, so `release` carries real
      // px/s of content movement instead of wheel-event noise.
      tracker.push(next, performance.now());
      return true;
    },
    isEngaged() {
      return active;
    },
    destroy() {
      for (const [type, listener] of listeners) window.removeEventListener(type, listener);
      if (timer !== null) clearTimeout(timer);
      detachGeometry();
    },
  };
}
