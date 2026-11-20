# How it works

## Displacement, not scrolling

The document scrolls exactly as it would without the library. On top of that,
one element receives a small offset — a `translate3d` in the default renderer —
while a gesture is active or a spring is settling.

The offset is always bounded. It cannot accumulate into a second scroll
position, and it cannot move the page under the pointer.

## The eight invariants

These are not defaults you can tune. Code that breaks one is a bug, and the
end-to-end suite (`e2e/contract.spec.ts`) exists to keep the first two honest.

| # | Constraint |
|---|---|
| C1 | Never call `preventDefault` on `wheel`, `touchstart`, `touchmove`, `touchend`, or `pointerdown`. Every input listener is registered `{ passive: true }`. |
| C2 | Never write scroll position. No `scrollTo`, `scrollBy`, `scrollIntoView`, `scrollTop`, or `scrollLeft` assignment. |
| C3 | Never set `touch-action` or `overscroll-behavior` to suppress native behaviour. |
| C4 | Never assume it is the only scroll effect on the page. A smooth-scroll library may run alongside it. |
| C5 | Zero runtime dependencies. React is an optional peer, only for `elastixbend/react`. |
| C6 | No layout read inside a frame tick. Layout is measured on resize, never polled. |
| C7 | The animation loop must stop. When nothing animates, no `requestAnimationFrame` is pending. |
| C8 | `prefers-reduced-motion: reduce` makes the effect inert, not slower. |

## Why the feel is input-independent

Two decisions do most of the work:

1. **Resistance applies to the cumulative gesture distance**, never to a single
   event. One 240 px wheel tick and twenty-four 10 px touch moves produce the
   same target.
2. **The spring integrates on a fixed 1/240 s substep.** The rendered motion
   comes from the integrator, not from event cadence or refresh rate, so a
   144 Hz display and a 60 Hz display settle identically.

Layout is read when the instance is created and re-measured on resize through
observers. No frame tick measures the document.

## State machine

```
        gesture at edge / scroll velocity
idle ─────────────────────────────────────▶ pull
  ▲                                          │
  │                                          │ release / quiet period
  │        settled                           ▼
  └──────────────────────────────────── spring ◀── settle()
```

- **`idle`** — no work scheduled. The rAF loop is not running.
- **`pulling`** — a preset writes displacement each frame.
- **`settling`** — the integrator moves toward a target, usually zero.

The loop is scheduled on demand and unscheduled the frame it goes idle (C7).
`bend.state.phase` exposes the current state.

## Reduced motion

With `prefers-reduced-motion: reduce` and `respectReducedMotion: true` (the
default), `createBend` returns an inert instance with the same shape: state
stays `idle`, `subscribe` never fires, no listener is installed, and the DOM is
not touched.

A slower spring would still be motion, so the effect is disabled rather than
damped.

## What it deliberately does not do

- Smooth scrolling or scroll hijacking, in any form.
- A Lenis adapter or any scroll-library compatibility layer.
- A `drag` preset (rubber band on pointer drag), because it needs
  `preventDefault`.
- Custom presets from outside the package.
- Server rendering of the effect. Importing is SSR-safe; the effect starts only
  when `createBend` runs in a browser.
- CommonJS, IE, or pre-2020 browsers.
