# Options

```ts
createBend(element, options?: BendOptions): BendInstance;
```

All options are optional. They are read **once** at creation; there is no
`setOptions`. Destroy and recreate to change the feel.

## Top-level

| Option | Type | Default | Notes |
|---|---|---|---|
| `preset` | `"edge" \| "surface" \| "drag"` | `"edge"` | What drives the displacement |
| `axis` | `"x" \| "y"` | `"y"` | Axis for geometry, input, and rendering |
| `resistance` | `number \| { wheel?, touch? }` | `{ wheel: 5, touch: 3 }` | Divisor on cumulative gesture distance |
| `curve` | `"linear" \| "ease"` | `"linear"` | Shape applied after resistance |
| `max` | `{ px?, ratio? }` | `{ px: 120, ratio: 0.18 }` | Pull ceiling |
| `spring` | `{ stiffness?, damping?, mass? }` | `{ stiffness: 200, damping: 25, mass: 1 }` | Integrator configuration |
| `render` | `"transform" \| "cssVar"` | `"transform"` | How displacement reaches the DOM |
| `lagFactor` | `number` | `0.04` | `surface` only; seconds of lag |
| `drag` | `"element"` | `"element"` | `drag` only; what the pointer is bound to |
| `dragMaxRatio` | `number` | `0.22` | `drag` only; ceiling as a fraction of the target's size |
| `ignore` | `(element: Element) => boolean` | — | Leave matching gesture origins alone |
| `releaseDelay` | `number` | `140` | `edge` only; ms of quiet before release |
| `respectReducedMotion` | `boolean` | `true` | Make the effect inert under reduced motion |
| `debug` | `boolean` | `false` | Log contract violations once |

## `resistance`

A plain number applies to every input class. The object form tunes wheel and
touch apart; a key that is not named keeps its default.

```ts
createBend(el, { resistance: 4 });                 // both classes
createBend(el, { resistance: { touch: 6 } });      // wheel keeps 5
createBend(el, { resistance: { wheel: 8, touch: 4 } });
```

Resistance is a divisor, so a higher number means a heavier band. It applies to
the cumulative gesture distance, never to a single event. Switching input class
mid-gesture starts a new gesture rather than reusing the running sum.

## `curve`

| Value | Formula |
|---|---|
| `"linear"` | `d / resistance` |
| `"ease"` | `limit × (1 − exp(−|d / resistance| / limit))`, with the sign preserved |

`ease` starts with the same slope as `linear` and saturates toward the pull
limit, so long gestures keep moving the band a little instead of pinning it.

## `max`

The effective ceiling is `min(px, ratio × viewport)`, so a phone does not get a
desktop-sized pull.

| Key | Type | Default | Meaning |
|---|---|---|---|
| `px` | `number` | `120` | Absolute ceiling in CSS pixels |
| `ratio` | `number` | `0.18` | Ceiling as a fraction of the viewport |

## `spring`

| Key | Type | Default | Meaning |
|---|---|---|---|
| `stiffness` | `number` | `200` | Restoring force, in s⁻² |
| `damping` | `number` | `25` | Energy loss, in s⁻¹ |
| `mass` | `number` | `1` | Inertia |

Critical damping is `2 × sqrt(stiffness × mass)`. The default ratio is about
`0.88`, so the band overshoots slightly before settling.

## `lagFactor`

`surface` only. The target is `-velocity × lagFactor`, so the value is the
number of seconds the band behaves as if it were behind the scroll. Larger is
heavier.

## `ignore`

Receives the wheel or touch origin and returns `true` to leave that gesture
alone. Use it for nested scrollers or widgets that should keep their own input.

```ts
createBend(el, {
  ignore: (origin) => origin.closest("[data-own-scroll]") !== null,
});
```

## `releaseDelay`

`edge` only. Milliseconds of wheel quiet before the band releases and springs
back. Touch releases on `touchend` regardless.

## `respectReducedMotion`

When `true` and the user prefers reduced motion, `createBend` returns an inert
instance: state stays `idle`, `subscribe` never fires, no listener is installed,
and the DOM is untouched.

## `debug`

Logs contract violations once: an element that already has a transform, or a
`position: fixed` descendant that will move with the band. It does not change
behaviour.

## Full type

```ts
interface BendOptions {
  preset?: "edge" | "surface";
  axis?: "x" | "y";
  resistance?: number | { wheel?: number; touch?: number };
  curve?: "linear" | "ease";
  max?: { px?: number; ratio?: number };
  spring?: { stiffness?: number; damping?: number; mass?: number };
  render?: "transform" | "cssVar";
  lagFactor?: number;
  ignore?: (element: Element) => boolean;
  releaseDelay?: number;
  respectReducedMotion?: boolean;
  debug?: boolean;
}
```
