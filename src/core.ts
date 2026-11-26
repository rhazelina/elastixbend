import { createGeometry } from "./geometry";
import { isSettled, stepSpring } from "./kernels/spring";
import { clampToEdge, pullLimit as computePullLimit } from "./kernels/resistance";
import { resolveOptions, type ResolvedOptions } from "./options";
import { createDragPreset } from "./presets/drag";
import { createEdgePreset } from "./presets/edge";
import { createSurfacePreset } from "./presets/surface";
import type { EdgeSide } from "./geometry";
import type { PresetHost, PresetModule } from "./presets/types";
import { createCssVarRenderer, createTransformRenderer, type Renderer } from "./renderers/index";
import { schedule, unschedule } from "./scheduler";
import { isScrollLocked } from "./scrollLock";
import { hasScrollableAncestor } from "./scrollTree";
import type { BendInstance, BendOptions, BendState, Phase } from "./types";

type Mode = "idle" | "pull" | "spring";

/** The public snapshot is typed readonly; the engine needs to write it. */
type MutableState = { -readonly [K in keyof BendState]: BendState[K] };

type Listener = (state: BendState) => void;

/** The parts of an active engine the public instance delegates to. */
interface Engine {
  settle(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}

/**
 * `createBend` keeps one shape for the whole life of the instance, even when
 * the media query flips. Subscribers and the snapshot object belong to the
 * public instance, so they survive an engine swap; only the engine's listeners,
 * scheduler task, preset, geometry, and renderer come and go.
 */
export function createBend(element: HTMLElement, options: BendOptions = {}): BendInstance {
  const resolved = resolveOptions(options);
  const state: MutableState = { pull: 0, velocity: 0, phase: "idle" };
  const listeners = new Set<Listener>();

  let destroyed = false;
  let paused = false;
  let engine: Engine | null = null;

  const query = resolved.respectReducedMotion ? reducedMotionQuery() : null;

  const notify = (): void => {
    for (const listener of listeners) listener(state);
  };

  function sync(): void {
    if (destroyed) return;

    const inert = query !== null && query.matches;
    if (inert && engine) {
      // Tearing down the engine restores the target's styles and clears the
      // scheduler. It does not clear `listeners`, which belong to the caller.
      engine.destroy();
      engine = null;
      notify();
      return;
    }

    if (!inert && !engine) {
      engine = createEngine(element, resolved, state, listeners, () => paused);
      return;
    }
  }

  const onPreferenceChange = (): void => sync();
  query?.addEventListener?.("change", onPreferenceChange);
  sync();

  return {
    state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    settle() {
      engine?.settle();
    },
    pause() {
      paused = true;
      engine?.pause();
    },
    resume() {
      paused = false;
      engine?.resume();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      query?.removeEventListener?.("change", onPreferenceChange);
      engine?.destroy();
      engine = null;
      listeners.clear();
    },
  };
}

/** Builds the running effect. Nothing here knows about reduced motion. */
function createEngine(
  element: HTMLElement,
  resolved: ResolvedOptions,
  state: MutableState,
  listeners: Set<Listener>,
  isPaused: () => boolean,
): Engine {
  const axis = resolved.axis;
  const geometry = createGeometry(axis);

  if (resolved.render === "transform") {
    warnContractViolations(element, resolved);
  }
  if (resolved.preset === "drag" && resolved.debug) {
    warnMissingTouchAction(element);
  }

  const renderer: Renderer =
    resolved.render === "transform"
      ? createTransformRenderer(element, axis)
      : createCssVarRenderer(element);

  let destroyed = false;
  let mode: Mode = "idle";
  let springTarget = 0;
  let pull = 0;
  let velocity = 0;
  let phase: Phase = "idle";

  const merge = (): BendState => {
    state.pull = pull;
    state.velocity = velocity;
    state.phase = phase;
    return state;
  };

  const notify = (): void => {
    const snapshot = merge();
    for (const listener of listeners) listener(snapshot);
  };

  const limitForViewport = (): number =>
    computePullLimit(
      resolved.max.px,
      resolved.max.ratio,
      axis === "y" ? window.innerHeight : window.innerWidth,
    );

  const host: PresetHost = {
    options: resolved,
    axis,
    geometry,
    get viewport() {
      return { width: window.innerWidth, height: window.innerHeight };
    },
    get pull() {
      return pull;
    },
    pullLimit: limitForViewport,
    clampPull(value: number, edge: EdgeSide) {
      return clampToEdge(value, limitForViewport(), edge);
    },
    setPull(value: number) {
      pull = value;
      velocity = 0;
      mode = "pull";
      phase = "pulling";
    },
    release(carried: number) {
      velocity = carried;
      springTarget = 0;
      mode = "spring";
      phase = "settling";
      host.requestFrame();
    },
    springTo(target: number) {
      springTarget = target;
      mode = "spring";
      phase = "settling";
    },
    snapToRest() {
      if (pull === 0 && velocity === 0) return;
      pull = 0;
      velocity = 0;
      mode = "idle";
      phase = "idle";
      renderer.write(0, false);
      notify();
    },
    requestFrame() {
      schedule(tick);
    },
    isBlocked(origin: EventTarget | null) {
      if (isPaused()) return true;
      if (isScrollLocked()) return true;
      if (origin instanceof Element && resolved.ignore?.(origin) === true) return true;
      return false;
    },
    isNested(origin: EventTarget | null, targetAxis, delta) {
      return hasScrollableAncestor(origin, targetAxis, delta);
    },
  };

  const preset: PresetModule = createPreset(resolved.preset);

  function createPreset(name: ResolvedOptions["preset"]): PresetModule {
    if (name === "surface") return createSurfacePreset(host);
    if (name === "drag") return createDragPreset(host, element);
    return createEdgePreset(host);
  }

  function tick(dt: number): boolean {
    if (destroyed || isPaused()) return false;

    // The preset drives the machine: it may call `setPull` (mode "pull") or
    // `release`/`springTo` (mode "spring") from inside this frame.
    preset.frame(dt);

    if (mode === "spring") {
      const spring = { pull, velocity };
      stepSpring(spring, springTarget, resolved.spring, dt);
      pull = spring.pull;
      velocity = spring.velocity;

      if (isSettled(spring, springTarget)) {
        pull = springTarget;
        velocity = 0;

        // Only a zero target means rest. A non-zero target is a sustained lean
        // (`surface`) or a pin that a preset still owns: stopping the loop here
        // would strand the content at that offset, because the preset only gets
        // to retire the lean from inside a frame.
        if (springTarget === 0) {
          mode = "idle";
          phase = "idle";
          renderer.write(0, false);
          notify();
          return false;
        }
      }
    }

    if (mode === "idle") {
      phase = "idle";
      renderer.write(0, false);
      return false;
    }

    // `surface` holds a lean for the length of the gesture, so an engaged preset
    // is still "pulling" even though the spring is chasing a moving target.
    phase = mode === "pull" || preset.isEngaged() ? "pulling" : "settling";
    renderer.write(pull, mode === "pull" || preset.isEngaged());
    notify();
    return true;
  }

  return {
    settle() {
      if (mode === "idle") return;
      host.release(velocity);
    },
    pause() {
      unschedule(tick);
      host.snapToRest();
    },
    resume() {},
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unschedule(tick);
      preset.destroy();
      geometry.destroy();
      renderer.destroy();
      pull = 0;
      velocity = 0;
      mode = "idle";
      phase = "idle";
      state.pull = 0;
      state.velocity = 0;
      state.phase = "idle";
    },
  };
}

function reducedMotionQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  return window.matchMedia("(prefers-reduced-motion: reduce)");
}

/**
 * `drag` follows a pointer, and on touch hardware the browser claims that
 * gesture for scrolling unless the element says otherwise. The library may not
 * set `touch-action` itself (C3), so the one thing it can do is say so loudly
 * instead of leaving the consumer with an effect that works with a mouse and
 * dies on a phone.
 */
function warnMissingTouchAction(element: HTMLElement): void {
  const value = getComputedStyle(element).touchAction;
  if (value === "none" || value === "pan-x" || value === "pan-y") return;
  console.warn(
    "[elastixbend] `preset: \"drag\"` needs `touch-action: none` on the target, set by your CSS. " +
      "The library does not set it, because that would take the gesture away from the page. " +
      `Current value: ${value}.`,
  );
}

/**
 * Two documented consequences of rendering with `transform` on the target:
 * it takes over the property, and it turns the target into a containing block
 * so `position: fixed` descendants move with it. Both are silent failures, so
 * they are surfaced once when `debug` is on.
 */
function warnContractViolations(element: HTMLElement, options: ResolvedOptions): void {
  if (!options.debug) return;

  const computed = getComputedStyle(element).transform;
  if (computed !== "none") {
    console.warn(
      "[elastixbend] The target already has a transform. The `transform` renderer takes it over; " +
        'use `render: "cssVar"` to compose with CSS instead.',
    );
  }

  const candidates = element.querySelectorAll<HTMLElement>("*");
  const scan = Math.min(candidates.length, 600);
  for (let index = 0; index < scan; index += 1) {
    const node = candidates[index];
    if (!node) continue;
    if (getComputedStyle(node).position === "fixed") {
      console.warn(
        "[elastixbend] A `position: fixed` descendant was found inside the target. " +
          "A transformed ancestor becomes its containing block, so it will move with the band.",
      );
      return;
    }
  }
}
