# Utilities

The core exports the pieces the presets are built from. They are useful for
tests, measurement, and custom drivers.

```ts
import {
  resolveOptions,
  dampingRatio,
  pullLimit,
  resist,
  resistEase,
  clampToEdge,
  normalizeWheel,
  createVelocityTracker,
  createGeometry,
  edgeAt,
  DEFAULT_MAX_PX,
  // …
} from "elastixbend";
```

## Options

### `resolveOptions(options?)`

```ts
function resolveOptions(options?: BendOptions): ResolvedOptions;
```

Applies defaults and returns a fully resolved object. `resistance` becomes
`{ wheel, touch }`, `max` and `spring` become required, and `preset`, `axis`,
`curve`, and `render` are filled in.

## Spring

### `dampingRatio(config)`

```ts
function dampingRatio(config: SpringConfig): number;
```

Returns `damping / (2 × sqrt(stiffness × mass))`. Below `1` overshoots, at `1`
is critical, above `1` is sluggish.

## Resistance and limits

### `resist(delta, resistance)`

```ts
function resist(delta: number, resistance: number): number;
```

Linear division: `delta / resistance`. A non-positive resistance returns the
delta unchanged.

### `resistEase(delta, resistance, limit)`

```ts
function resistEase(delta: number, resistance: number, limit: number): number;
```

Linear division followed by saturation toward `limit`:
`sign(d) × limit × (1 − exp(−|d / resistance| / limit))`. A non-positive limit
falls back to `resist`.

### `pullLimit(px, ratio, viewport)`

```ts
function pullLimit(px: number, ratio: number, viewport: number): number;
```

Returns `max(0, min(px, viewport × ratio))` — the effective ceiling for the
current viewport.

### `clampToEdge(value, limit, edge)`

```ts
function clampToEdge(value: number, limit: number, edge: "start" | "end"): number;
```

Direction-aware clamp. `"start"` keeps the value between `0` and `limit`;
`"end"` keeps it between `-limit` and `0`.

::: warning Changed in 0.2.0
The sides are `"start"` and `"end"`, not `"top"` and `"bottom"`, matching
`edgeAt`.
:::

## Input

### `normalizeWheel(event, axis, viewport)`

```ts
function normalizeWheel(
  event: WheelEvent,
  axis: "x" | "y",
  viewport: { width: number; height: number },
): number;
```

Reads `deltaX` or `deltaY` and normalises `deltaMode`: line mode multiplies by
`100 / 6`, page mode by the viewport dimension. Pixel mode passes through.

### `createVelocityTracker()`

```ts
interface VelocityTracker {
  push(value: number, now: number): number;
  velocity(): number;
  reset(): void;
}
```

Two-sample velocity over a **displacement**, not over the raw input delta. Feed
it the band position and it returns px/s that match what the eye saw.

## Geometry

### `createGeometry(axis?)`

```ts
function createGeometry(axis?: "x" | "y"): Geometry;
```

Measures the document's scroll range on one axis and watches for changes with
`ResizeObserver` and viewport resize. Exposes `offset`, `limit`, `refresh()`,
`watch(fn)`, and `destroy()`.

The axis is fixed at creation: a horizontal and a vertical page measure
different ranges, and one geometry cannot report both without a second layout
read per watcher.

### `edgeAt(offset, limit, tolerance?)`

```ts
function edgeAt(
  offset: number,
  limit: number,
  tolerance?: number, // default 1
): "start" | "end" | null;
```

Returns which document edge the offset sits on, with a one-pixel tolerance for
fractional offsets produced by display scaling and browser zoom.

## Constants

| Export | Value |
|---|---|
| `DEFAULT_RESISTANCE_WHEEL` | `5` |
| `DEFAULT_RESISTANCE_TOUCH` | `3` |
| `DEFAULT_MAX_PX` | `120` |
| `DEFAULT_MAX_RATIO` | `0.18` |
| `DEFAULT_RELEASE_DELAY` | `140` |
| `DEFAULT_LAG_FACTOR` | `0.04` |
| `DEFAULT_SPRING` | `{ stiffness: 200, damping: 25, mass: 1 }` |

Other internal constants — the 1/240 s substep, settle epsilons, the surface
hold, and the anchor-jump threshold — are not exported and not part of the
contract.

## Types

`Axis`, `BendInstance`, `BendOptions`, `BendState`, `Curve`, `MaxPull`, `Phase`,
`PresetName`, `RenderKind`, `Resistance`, `ResistanceConfig`, and `SpringConfig`
are exported as types. The preset host interface is not.
