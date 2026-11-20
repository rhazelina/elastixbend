import { edgeAt, type EdgeSide } from "../geometry";
import { createVelocityTracker, normalizeWheel } from "../input";
import { resist, resistEase } from "../kernels/resistance";
import type { PresetHost, PresetModule } from "./types";

/** A flick should not throw the band across the screen, whatever the device. */
const MAX_CARRY = 2400;

/** Which resistance and curve apply to the gesture currently driving the band. */
type InputClass = "wheel" | "touch";

/**
 * Pull at the start or end edge of the document along the instance's axis.
 *
 * Only wheel and touch are handled here. Native scroll keeps doing the actual
 * scrolling; we never write scroll position, so a smooth-scroll library on the
 * page can coexist with this without either side fighting the other.
 *
 * Two rules make the feel ours rather than the input's:
 *
 * 1. Resistance is applied to the **cumulative** gesture distance, not to each
 *    event. A 240 px gesture produces the same target whether the browser
 *    reported it as one wheel tick or twenty touch moves, at 60 Hz or 144 Hz.
 *    Wheel and touch can carry different resistance, so one notch and one
 *    finger travel can land on the same displacement.
 * 2. The band never jumps to that target. The spring chases it, so the
 *    displacement the eye sees is produced by our integrator, not by event
 *    timing. A coarse device and a precise one settle in the same place.
 */
export function createEdgePreset(host: PresetHost): PresetModule {
  const { releaseDelay } = host.options;
  const tracker = createVelocityTracker();

  let edge: EdgeSide | null = null;
  /** Cumulative gesture distance for this engage, in raw CSS pixels. */
  let gesture = 0;
  let active = false;
  let input: InputClass = "wheel";
  let timer: ReturnType<typeof setTimeout> | null = null;

  /** Where the band belongs for the gesture collected so far. */
  function target(): number {
    if (edge === null) return 0;
    const direction = edge === "start" ? 1 : -1;
    const resistance = host.options.resistance[input];
    const shaped =
      host.options.curve === "ease"
        ? resistEase(direction * gesture, resistance, host.pullLimit())
        : direction * resist(gesture, resistance);
    return host.clampPull(shaped, edge);
  }

  function pursue(): void {
    host.springTo(target());
    host.requestFrame();
  }

  const detachGeometry = host.geometry.watch(() => {
    // A resize can change the limit, so the target may now be out of range.
    if (active) pursue();
  });

  const atStart = () => edgeAt(host.geometry.offset, host.geometry.limit) === "start";
  const atEnd = () => edgeAt(host.geometry.offset, host.geometry.limit) === "end";

  function cancelTimer(): void {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  }

  function scheduleRelease(): void {
    cancelTimer();
    timer = setTimeout(() => {
      timer = null;
      if (active) release();
    }, releaseDelay);
  }

  function begin(nextEdge: EdgeSide, nextInput: InputClass): void {
    // A different input class mid-gesture is a new gesture: the two classes
    // have different resistance, so keeping the sum would make the band jump.
    if (edge !== nextEdge || input !== nextInput) {
      edge = nextEdge;
      input = nextInput;
      // Crossing from one edge to the other is a new gesture, not a continuation.
      gesture = 0;
      tracker.reset();
    }
    active = true;
    pursue();
  }

  function release(): void {
    cancelTimer();
    if (!active) return;

    active = false;
    gesture = 0;

    // The carry is the band's own velocity, in px/s, so a flick keeps travelling
    // the way the finger was pushing before the spring turns it around. Sample
    // the rendered pull once more, because the frame loop may already be idle.
    tracker.push(host.pull, performance.now());
    const carried = Math.max(-MAX_CARRY, Math.min(MAX_CARRY, tracker.velocity()));
    tracker.reset();

    host.release(carried);
  }

  function onWheel(event: WheelEvent): void {
    if (event.ctrlKey || host.isBlocked(event.target)) return;

    const delta = normalizeWheel(event, host.axis, host.viewport);
    if (delta === 0) return;
    if (host.isNested(event.target, host.axis, delta)) return;

    const inward = delta > 0;

    if (atStart() && !inward) {
      begin("start", "wheel");
      gesture += Math.abs(delta);
    } else if (atEnd() && inward) {
      begin("end", "wheel");
      gesture += Math.abs(delta);
    } else if (active) {
      release();
      return;
    } else {
      return;
    }
    pursue();
    scheduleRelease();
  }

  // Touch is read as a gesture delta: the finger moving down pulls the content
  // down, so the sign already matches the displacement. On the x axis the same
  // holds with `clientX`, and the sign still means "toward the end edge".
  const touchPoint = (touch: Touch): number => (host.axis === "y" ? touch.clientY : touch.clientX);

  let touchStart = 0;
  let touching = false;

  function onTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    if (event.touches.length !== 1 || !touch || host.isBlocked(event.target)) {
      touching = false;
      return;
    }
    touching = true;
    touchStart = touchPoint(touch);
    tracker.reset();
    cancelTimer();
  }

  function onTouchMove(event: TouchEvent): void {
    const touch = event.touches[0];
    if (!touching || !touch || event.touches.length !== 1) return;

    const point = touchPoint(touch);
    const delta = point - touchStart;
    touchStart = point;
    if (delta === 0) return;
    if (host.isNested(event.target, host.axis, delta)) return;

    if (atStart() && delta > 0) {
      begin("start", "touch");
      gesture += Math.abs(delta);
    } else if (atEnd() && delta < 0) {
      begin("end", "touch");
      gesture += Math.abs(delta);
    } else if (active) {
      release();
      return;
    } else {
      return;
    }
    pursue();
  }

  function onTouchEnd(): void {
    if (!touching) return;
    touching = false;
    if (active) release();
  }

  // A click while the band is stretched would land on a shifted target.
  function onPointerDown(): void {
    if (!active && host.pull === 0) return;
    cancelTimer();
    active = false;
    gesture = 0;
    tracker.reset();
    host.snapToRest();
  }

  // Keyboard, scrollbar, and programmatic scrolls can leave a stale pull.
  function onScroll(): void {
    if (!active) return;
    if (edgeAt(host.geometry.offset, host.geometry.limit) !== edge) {
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
      if (!active) return false;
      // Sample the displacement the band actually reached, so the release
      // carries real px/s of movement instead of wheel-event noise or the
      // target's speed.
      tracker.push(host.pull, performance.now());
      return false;
    },
    isEngaged() {
      return active;
    },
    destroy() {
      for (const [type, listener] of listeners) window.removeEventListener(type, listener);
      cancelTimer();
      detachGeometry();
    },
  };
}
