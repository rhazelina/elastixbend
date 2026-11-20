# Tuning

Every option is read **once**, when the instance is created. There is no
`setOptions`. To change the feel, destroy the instance and create a new one —
that keeps the runtime free of reconciliation and makes the cost of a change
visible.

## Defaults

| Option | Default | Unit |
|---|---|---|
| `preset` | `"edge"` | |
| `axis` | `"y"` | |
| `resistance` | `{ wheel: 5, touch: 3 }` | divisor |
| `curve` | `"linear"` | |
| `max` | `{ px: 120, ratio: 0.18 }` | px / fraction of viewport |
| `spring` | `{ stiffness: 200, damping: 25, mass: 1 }` | s⁻², s⁻¹, — |
| `render` | `"transform"` | |
| `lagFactor` | `0.04` | seconds |
| `releaseDelay` | `140` | ms |
| `respectReducedMotion` | `true` | |
| `debug` | `false` | |

## Resistance

Resistance is a **divisor** applied to the cumulative gesture distance, so a
higher number means a heavier band.

```ts
createBend(el, { resistance: 4 });              // wheel and touch both 4
createBend(el, { resistance: { touch: 6 } });   // wheel keeps 5
```

Wheel and touch default apart (`5` and `3`) because one wheel notch and one
finger swipe cover very different distances per unit of effort. An object only
overrides the keys it names.

Switching input class mid-gesture starts a new gesture instead of reusing the
running sum.

## Curve

`curve: "linear"` divides by the resistance and stops there.

`curve: "ease"` divides, then saturates toward the pull limit:

```
limit × (1 − exp(−|d| / limit))
```

It starts with the same slope as `linear`, so short pulls feel unchanged, while
long gestures approach the limit instead of pinning it. Resistance still sets
the slope, so both curves stay tunable with the same number.

```ts
createBend(el, { curve: "ease" });
```

## Max pull

`max` is the smaller of the absolute pixel ceiling and the viewport ratio, so a
phone does not get a desktop-sized pull.

```ts
createBend(el, { max: { px: 160, ratio: 0.22 } });
```

| Option | Meaning |
|---|---|
| `px` | Hard ceiling in CSS pixels |
| `ratio` | Ceiling as a fraction of the viewport |

## Spring

```ts
createBend(el, {
  spring: { stiffness: 200, damping: 25, mass: 1 },
});
```

- **`stiffness`** — restoring force. Higher is snappier.
- **`damping`** — energy loss. Critical damping is
  `2 × sqrt(stiffness × mass)`.
- **`mass`** — inertia. Higher feels heavier.

The default ratio is `25 / (2 × sqrt(200)) ≈ 0.88`, so the band is slightly
underdamped and settles with a small overshoot. Use
[`dampingRatio`](/reference/utilities) to check a configuration:

```ts
import { dampingRatio } from "elastixbend";

dampingRatio({ stiffness: 200, damping: 25 }); // 0.884…
```

A ratio below `1` overshoots; at `1` it stops exactly; above `1` it feels
sluggish.

## Recipes

| Goal | Settings |
|---|---|
| Heavier band | `resistance: 8`, `spring: { stiffness: 160, damping: 28 }` |
| Lighter, quicker | `resistance: 3`, `spring: { stiffness: 320, damping: 30 }` |
| Long pulls that never pin | `curve: "ease"`, `max: { px: 200, ratio: 0.25 }` |
| More lag on `surface` | `lagFactor: 0.08` |
| No overshoot | `spring: { stiffness: 200, damping: 28.3, mass: 1 }` |

## Reduced motion

`respectReducedMotion: true` (default) makes the effect inert when the user
prefers reduced motion. Setting it to `false` opts out, and you should have a
specific reason.

## Debug

`debug: true` logs contract violations once — an element that already has a
transform, or a `position: fixed` descendant that will move with the band.

```ts
createBend(el, { debug: true });
```

It logs; it does not change behaviour.
