# Instance & state

## `createBend`

```ts
function createBend(element: HTMLElement, options?: BendOptions): BendInstance;
```

Creates an instance bound to `element`. Safe to call on different elements. Two
instances on the same element are allowed but will fight over `style.transform`;
nothing detects that for you.

The instance does not touch the DOM until the first gesture.

## `BendState`

```ts
interface BendState {
  readonly pull: number;      // CSS pixels; positive = down/right
  readonly velocity: number;  // px per second
  readonly phase: "idle" | "pulling" | "settling";
}
```

The object is **reused**. Read its fields; do not store the object and expect
fresh values. `instance.state` always returns the same reference.

## `BendInstance`

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

| Member | Behaviour |
|---|---|
| `state` | Live snapshot, mutated in place |
| `subscribe(fn)` | Fires once per animation frame that changes the pull, not once per input event. Returns an unsubscribe function |
| `settle()` | Starts the spring back immediately, carrying current velocity |
| `pause()` | Drops the pull to rest and stops the loop |
| `resume()` | Re-arms the instance after `pause()` |
| `destroy()` | Removes listeners, restores `style.transform` and `style.willChange`, resets state to idle. Idempotent |

`subscribe` is for per-frame consumers. If you need React state, use
`useBendPhase` or `useBendRef` instead of subscribing to the pull.

## State machine

```
        gesture at edge / scroll velocity
idle ─────────────────────────────────────▶ pulling
  ▲                                          │
  │                                          │ release / quiet period
  │        settled                           ▼
  └──────────────────────────────────── settling ◀── settle()
```

- **`idle`** — no work scheduled; no `requestAnimationFrame` pending.
- **`pulling`** — a preset writes displacement each frame.
- **`settling`** — the integrator moves toward a target.

The loop is scheduled on demand and unscheduled the frame it goes idle.

## Reduced motion

With `prefers-reduced-motion: reduce` and `respectReducedMotion: true`, the
instance is inert: state stays `idle`, no listener is installed, and the DOM is
untouched. The shape is unchanged, so calling code does not need a branch.

The preference is reactive. When it changes, the instance tears down or starts
the effect on its own. Existing subscriptions and the paused flag survive, so a
React binding does not need to remount when the user changes an OS setting.

## Re-exports

The core also exports the pieces used to build the presets:
`resolveOptions`, `dampingRatio`, `pullLimit`, `resist`, `resistEase`,
`clampToEdge`, `normalizeWheel`, `createVelocityTracker`, `createGeometry`,
`edgeAt`, the `DEFAULT_*` constants, and all public types. See
[Utilities](/reference/utilities).

The preset host interface (`PresetHost`, `PresetModule`) is typed but not
exported, so custom presets from outside the package are not supported.
