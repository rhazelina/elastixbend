# elastixbend: specification

Version: `0.1.0`. This document is the contract. Anything not written here is not
promised, including internals, file layout, and the exact numbers behind the
defaults.

## 1. What it is

A scroll **displacement** effect. While the page scrolls normally, the target
element is moved by a small elastic offset and springs back.

It is not a scroll library. It does not own scroll position, does not smooth
scroll, and does not replace a native scrollbar.

## 2. Hard constraints

These are invariants, not defaults. Code that breaks one is a bug.

| # | Constraint |
|---|---|
| C1 | Never call `preventDefault` on `wheel`, `touchstart`, `touchmove`, `touchend`, or `pointerdown`. Every listener the library installs for input is registered `{ passive: true }`. |
| C2 | Never write scroll position. No `scrollTo`, `scrollBy`, `scrollIntoView`, `scrollTop`, or `scrollLeft` assignment. |
| C3 | Never set `touch-action` or `overscroll-behavior` to suppress native behaviour. |
| C4 | Never assume it is the only scroll effect on the page. A smooth-scroll library may run alongside it. |
| C5 | Zero runtime dependencies. React is an optional peer, only for the `elastixbend/react` subpath. |
| C6 | No layout read inside a frame tick. Layout is measured on resize, never polled. |
| C7 | The animation loop must stop. When nothing is animating, no `requestAnimationFrame` is pending. |
| C8 | `prefers-reduced-motion: reduce` makes the effect **inert**, not slower. |

## 3. Entry points

```
elastixbend          → core, framework-agnostic
elastixbend/react    → optional React binding
```

Both are ESM with `.d.ts`. There is no CommonJS build.

## 4. Public API

### 4.1 `createBend(element, options?)`

```ts
function createBend(element: HTMLElement, options?: BendOptions): BendInstance;
```

Creates an instance bound to `element`. Safe to call more than once on different
elements. Calling it on the same element twice is allowed but the two instances
will fight over `style.transform`; nothing detects that for you.

The instance does not touch the DOM until the first gesture.

### 4.2 `BendOptions`

```ts
interface BendOptions {
  preset?: "edge" | "surface";        // default "edge"
  axis?: "x" | "y";                   // default "y"
  resistance?: number;                // default 3
  max?: { px?: number; ratio?: number };  // default { px: 120, ratio: 0.18 }
  spring?: { stiffness?: number; damping?: number; mass?: number };
  render?: "transform" | "cssVar";    // default "transform"
  lagFactor?: number;                 // default 0.04, `surface` only
  ignore?: (element: Element) => boolean;
  releaseDelay?: number;              // default 140 ms, `edge` only
  respectReducedMotion?: boolean;     // default true
  debug?: boolean;                    // default false
}
```

Options are read **once**, at creation. There is no `setOptions`. Changing the
feel at runtime means destroying the instance and creating a new one. This is
deliberate: it keeps the runtime free of reconciliation and makes the cost of a
change visible.

`max` is the smaller of `px` and `ratio × viewport`, so a phone does not get a
desktop-sized pull.

### 4.3 `BendState`

```ts
interface BendState {
  readonly pull: number;      // CSS pixels; positive = down/right
  readonly velocity: number;  // px per second
  readonly phase: "idle" | "pulling" | "settling";
}
```

The object is **reused**. Read its fields; do not store the object and expect
fresh values. `instance.state` always returns the same reference.

### 4.4 `BendInstance`

```ts
interface BendInstance {
  readonly state: BendState;
  subscribe(listener: (state: BendState) => void): () => void;
  settle(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
```

- `subscribe` fires **once per animation frame that changes the pull**, not once
  per input event. It is for per-frame consumers.
- `settle()` starts the spring back immediately, carrying current velocity.
- `pause()` drops the pull to rest and stops the loop. `resume()` re-arms.
- `destroy()` removes listeners, restores `style.transform` and
  `style.willChange` to what they were at creation, and resets state to idle.
  Idempotent.

### 4.5 Re-exports

For building custom presets and for testing:

```ts
resolveOptions, dampingRatio, pullLimit, resist, clampToEdge,
normalizeWheel, createVelocityTracker, createGeometry, edgeAt,
DEFAULT_* constants, and all public types.
```

The preset host interface (`PresetHost`, `PresetModule`) is internal. It is
typed but not exported, so a custom preset is not supported in `0.1.0`.

## 5. Presets

A preset is a configuration of one kernel, not a separate code path. Both share
the same scheduler, spring integrator, clamp, and renderer.

### 5.1 `edge`

Displacement at the document edges, driven by wheel and touch.

- At the **top** edge, a wheel/touch gesture directed further up produces a
  **positive** pull (content moves down, revealing space).
- At the **bottom** edge, a gesture directed further down produces a **negative**
  pull.
- Any gesture pointing **into** the page scrolls normally and produces no pull.
- After `releaseDelay` of quiet, the preset releases and springs to zero.
- A `pointerdown` while displaced snaps to rest immediately, so a click cannot
  land on a shifted target.
- If the page scrolls off the edge by any means (keyboard, scrollbar,
  programmatic), the pull releases.
- A gesture over a nested scrollable ancestor that still has room in that
  direction belongs to that ancestor, not to the preset.

### 5.2 `surface`

Displacement driven by scroll velocity, independent of input method.

- `pull` targets `-velocity × lagFactor`, clamped to `max`.
- Positive scroll velocity (content moving up) leans the content **negative**.
- Stops leaning after `SURFACE_HOLD` of no scroll, then returns to zero.
- A velocity above the anchor-jump threshold is treated as navigation, not a
  gesture, and produces no lean. (Threshold is internal.)
- Works for wheel, touch, keyboard, scrollbar, and programmatic scroll alike,
  because it reads position, not events.

## 6. Renderers

### 6.1 `transform` (default)

Writes `translate3d(...)` on the target and sets `will-change: transform` while
moving.

Documented consequences, both real and both surfaced by `debug`:

1. It takes over `transform`. Any other transform on that element is replaced
   while the effect runs and restored when it stops.
2. A transformed element becomes a containing block. Any `position: fixed`
   descendant moves with the band instead of staying pinned.

Use `cssVar` if either is unacceptable.

### 6.2 `cssVar`

Writes `--bend-pull: <px>` on the target and nothing else. The consumer opts in:

```css
.stage {
  transform: translate3d(0, var(--bend-pull, 0px), 0);
}
```

Composes with any transform the page already applies. Preserves a
consumer-provided `--bend-pull` across `destroy()`.

## 7. React binding

```tsx
import { Bend, useBend, useBendPhase, useBendRef } from "elastixbend/react";
```

- `<Bend>` creates the instance on mount and destroys it on unmount. Options are
  read once; changing them does not remount (remount with `key` if you need to).
- `useBend()` returns the instance, or `null` outside a `<Bend>`.
- `useBendPhase()` re-renders **only** when `phase` changes.
- `useBendRef()` returns a mutable ref updated every frame, and **never**
  re-renders.

The binding never exposes the pull through `useState`. Reading the pull is a
per-frame concern and belongs in a ref or a rAF callback.

## 8. State machine

```
        gesture at edge / scroll velocity
idle ─────────────────────────────────────▶ pull
  ▲                                          │
  │                                          │ release / quiet period
  │        settled                           ▼
  └──────────────────────────────────── spring ◀── settle()
```

- `idle`: no work scheduled. The rAF loop is not running.
- `pull`: a preset is writing displacement each frame.
- `spring`: the integrator is moving toward a target.

The loop is scheduled on demand and unscheduled the frame it goes idle (C7).

## 9. Reduced motion

With `prefers-reduced-motion: reduce` and `respectReducedMotion: true` (default),
`createBend` returns an inert instance with the same shape: state stays idle,
`subscribe` never fires, and no listener is installed. The DOM is not touched.

Setting `respectReducedMotion: false` opts out.

## 10. Non-goals for `0.1.0`

Not implemented, not planned for this version:

- Smooth scrolling / scroll hijacking, in any form.
- A Lenis adapter or any scroll-library compatibility layer.
- `drag` preset (rubber-band on pointer drag). `surface` ships `lean` only.
- Horizontal (`axis: "x"`) presets. The axis option exists and is honoured by
  the renderer and clamp, but neither shipped preset listens to horizontal input.
- Custom presets from outside the package.
- SSE/SSR rendering of the effect. Importing is SSR-safe; the effect does nothing
  until `createBend` is called in a browser.
- CommonJS.
- IE or pre-2020 browser support.

## 11. Measured, not claimed

Bundle size and frame cost are measured, not asserted, and the measurement
scripts live in `measure/`. See `README.md` for the numbers from the last run and
`DECISIONS.md` for how they were taken.
