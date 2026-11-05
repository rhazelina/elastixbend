import { createGeometry } from "./geometry";
import { isSettled, stepSpring } from "./kernels/spring";
import { clampToEdge, pullLimit as computePullLimit } from "./kernels/resistance";
import { resolveOptions, type ResolvedOptions } from "./options";
import { createEdgePreset } from "./presets/edge";
import { createSurfacePreset } from "./presets/surface";
import type { Edge, PresetHost, PresetModule } from "./presets/types";
import { createCssVarRenderer, createTransformRenderer, type Renderer } from "./renderers/index";
import { schedule, unschedule } from "./scheduler";
import { isScrollLocked } from "./scrollLock";
import { hasScrollableAncestor } from "./scrollTree";
import type { BendInstance, BendOptions, BendState, Phase } from "./types";

type Mode = "idle" | "pull" | "spring";

/** The public snapshot is typed readonly; the engine needs to write it. */
type MutableState = { -readonly [K in keyof BendState]: BendState[K] };

export function createBend(element: HTMLElement, options: BendOptions = {}): BendInstance {
  const resolved = resolveOptions(options);
  const state: MutableState = { pull: 0, velocity: 0, phase: "idle" };

  const listeners = new Set<(state: BendState) => void>();
  let destroyed = false;
  let paused = false;

  const reduced = resolved.respectReducedMotion && prefersReducedMotion();

  if (reduced) {
    // Inert, but the same shape, so consumer code does not need to branch.
    return {
      state,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      settle() {},
      pause() {},
      resume() {},
      destroy() {
        listeners.clear();
      },
    };
  }

  const geometry = createGeometry();

  if (resolved.render === "transform") {
    warnContractViolations(element, resolved);
  }

  const axis = resolved.axis;
  const renderer: Renderer =
    resolved.render === "transform"
      ? createTransformRenderer(element, axis)
      : createCssVarRenderer(element);

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
    clampPull(value: number, edge: Edge) {
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
      if (paused) return true;
      if (isScrollLocked()) return true;
      if (origin instanceof Element && resolved.ignore?.(origin) === true) return true;
      return false;
    },
    isNested(origin: EventTarget | null, targetAxis, delta) {
      return hasScrollableAncestor(origin, targetAxis, delta);
    },
  };

  const preset: PresetModule =
    resolved.preset === "surface" ? createSurfacePreset(host) : createEdgePreset(host);

  function tick(dt: number): boolean {
    if (destroyed || paused) return false;

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

  const instance: BendInstance = {
    state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    settle() {
      if (mode === "idle") return;
      host.release(velocity);
    },
    pause() {
      paused = true;
      unschedule(tick);
      host.snapToRest();
    },
    resume() {
      paused = false;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unschedule(tick);
      preset.destroy();
      geometry.destroy();
      renderer.destroy();
      listeners.clear();
      pull = 0;
      velocity = 0;
      mode = "idle";
      phase = "idle";
      state.pull = 0;
      state.velocity = 0;
      state.phase = "idle";
    },
  };

  return instance;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
