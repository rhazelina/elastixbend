# elastixbend

Elastic scroll displacement that never touches scroll.

The page scrolls natively. A small offset follows your gestures at the document
edges, or trails behind scroll velocity, and springs back. The library never
calls `preventDefault`, never writes scroll position, and stops its animation
loop the moment nothing is moving.

```bash
npm install elastixbend
```

Zero runtime dependencies. React is an optional peer, only if you import
`elastixbend/react`.

Documentation: **https://elastixbend.vercel.app**

---

## Quickstart

```ts
import { createBend } from "elastixbend";

const bend = createBend(document.querySelector("#stage")!, {
  preset: "edge",
});

// later
bend.destroy();
```

That's the whole basic setup. `#stage` gets a `translate3d` while you pull past
the top or bottom of the page, or the left and right edges on `axis: "x"`.

### What "identical" means here

The displacement belongs to this library, not to your input device.

- Resistance applies to the **total gesture distance**. One 240 px wheel tick and
  twenty-four 10 px touch moves produce the same target.
- A spring chases that target on a fixed 1/240 s substep, so the motion you see
  comes from the integrator rather than event cadence or refresh rate.

A stiff trackpad, a stepped mouse wheel, and a finger on a phone all arrive at
the same place.

### `preset: "surface"`

Content trails behind scroll velocity instead of pulling at edges:

```ts
createBend(el, { preset: "surface", lagFactor: 0.04 });
```

Works for wheel, touch, keyboard, scrollbar, and programmatic scroll, because it
reads scroll position rather than input events.

### `preset: "drag"`

The element follows a pointer inside itself and springs back on release:

```ts
createBend(el, { preset: "drag" });
```

```css
.card {
  touch-action: none;
}
```

The CSS line is yours to write, and it is the only one this preset asks for. Without
it the browser takes the touch gesture for scrolling, `pointermove` stops arriving,
and the drag dies quietly on a phone while still working with a mouse. `debug`
reports the missing declaration at creation.

The library never sets `touch-action` and never calls `preventDefault`, so the
gesture is given up by your CSS on one small area, not by the package on the
whole page. Outside that element the page scrolls exactly as before.

### `axis: "x"`

All three presets follow the axis, geometry included:

```ts
createBend(el, { preset: "edge", axis: "x" });
```

The document has to scroll horizontally, since the limit comes from
`scrollWidth - clientWidth`. A wide element inside a scrolling `div` will not
drive the effect.

### Composing with your own transform

The default renderer takes over `style.transform` and turns the element into a
containing block (so `position: fixed` children move with it). If either is a
problem, use the CSS-variable renderer:

```ts
createBend(el, { render: "cssVar" });
```

```css
.stage {
  transform: translate3d(0, var(--bend-pull, 0px), 0);
}
```

### React

```tsx
import { Bend, useBendPhase, useBendRef } from "elastixbend/react";

function App() {
  return (
    <Bend preset="edge" className="stage">
      <Child />
    </Bend>
  );
}
```

Reading the pull per frame doesn't re-render:

```tsx
function Child() {
  const bend = useBendRef();   // mutable ref, updated every frame
  const phase = useBendPhase(); // re-renders only when phase changes

  useEffect(() => {
    const id = setInterval(() => console.log(bend.current.pull), 100);
    return () => clearInterval(id);
  }, [bend]);

  return <div data-phase={phase} />;
}
```

There's no `useState(pull)`. A 60 Hz React re-render is the exact cost this
library exists to avoid.

---

## Reduced motion

`prefers-reduced-motion: reduce` makes the effect inert. It installs no listeners
and nothing animates; state stays idle. A slower spring would still be motion.

The preference is watched, so changing it in the OS or browser takes effect on
the existing instance. Subscribers and `pause()` survive both directions. Going
inert tears down the preset, geometry, renderer, and frame loop, then restores
the target's styles.

```ts
createBend(el, { respectReducedMotion: false }); // opt out of the media query
```

---

## Caveats

Read these before shipping.

1. **`transform` is the default and it takes over the property.** If your element
   already has a transform, use `render: "cssVar"`.
2. **`transform` creates a containing block.** A `position: fixed` child inside
   the target will move with the band. Check before wrapping a page shell.
3. **It doesn't smooth scroll.** If you want that, run a smooth-scroll library
   next to it. `surface` is the preset that tolerates one.
4. **No Lenis adapter.** `surface` works next to a smooth-scroll library because
   it reads scroll position. `edge` reads wheel events, so the two will double up.
   See `DECISIONS.md` D2.
5. **Options are immutable.** No `setOptions`. Destroy and recreate.
6. **`axis: "x"` moves the whole preset onto the horizontal axis.** Geometry,
   `deltaX`, touch, and rendering all follow it; the page still has to scroll
   horizontally for the effect to have anywhere to go.
7. **Only wheel and touch drive `edge`.** Keyboard scrolling and scrollbar drags
   release the band rather than driving it. That's intended: they aren't gestures
   you can rubber-band.
8. **`drag` needs `touch-action: none` from your CSS.** It is the only preset
   that claims a gesture, and it can only do that because your stylesheet gives
   up scrolling on that one element. Nothing sets it for you.
9. **No custom presets.** The host interface is typed but not exported.

---

## Measured

Measured on this machine: Linux, Node 26, Chromium headless via Playwright.
Reproduce with `npm run size` and `npm run measure`.

### Bundle size

| Entry | Brotli + deps (size-limit) | Minified + gzip | Budget |
|---|---|---|---|
| `elastixbend` (core) | **4.06 kB** | 4.77 kB | 5 kB |
| `elastixbend/react` (binding only) | not applicable | **0.54 kB** | 1.5 kB |
| `elastixbend/react` (binding + core) | **4.52 kB** | 4.95 kB | 5 kB |

The React binding is reported two ways on purpose: on its own (0.54 kB, what it
adds to a page that already imported the core) and bundled with the core
(4.52 kB, what a React-only consumer actually ships). `size-limit` cannot express
the first case because the built entry shares a chunk with the core, so it is
measured by `npm run size:react` with the chunk marked external. `size-limit`'s
figure is brotli; the gzip column is `esbuild --bundle --minify` plus `gzip -9`.

### Runtime cost

24-event wheel burst, three runs, median reported. Baseline is the same page
with the library not instantiated (`?off=1`).

| Page | p50 frame | p95 frame | frames > 32 ms | layout | style recalc | script | loop settles |
|---|---|---|---|---|---|---|---|
| `edge` | 16.7 ms | 16.7 ms | 0 | 1 | 25 | 6 ms | 529 ms |
| `surface` | 16.7 ms | 16.8 ms | 0 | 0 | 0 | 1 ms | 0 ms |
| baseline | 16.7 ms | 16.8 ms | 0 | 0 | 0 | 1 ms | n/a |

"loop settles" is the time until the shared `requestAnimationFrame` task count
reaches zero after the gesture ends. `surface` reads 0 immediately because its
last frame already returned `false`.

**Style recalc on `edge` is the renderer writing `style.transform` and
`style.willChange`.** It is bounded by the number of frames that actually move,
not by input event count, and it does not show up as frame drops. Since `0.1.2`
the band moves on every frame of the chase rather than jumping once, so the
recalc count is higher (26 vs 16) while script time is unchanged. That's the
cost of the spring owning the motion, and it stays inside the same frame budget.

### Not measured

**Composited layer size.** CDP's `LayerTree.layerTreeDidChange` emits no events in
headless Chromium, so this stays a manual DevTools → Layers check. `transform` on
the target should promote one layer sized to the target's border box. If your
target is the whole page, that's a full-viewport layer, the same cost a
smooth-scroll library pays.

Headless frame timings are noisy, so they aren't wired to a CI threshold. Only
"loop settles" and the size budgets are hard gates.

---

## API

Full contract in [`SPEC.md`](./SPEC.md). Rationale in
[`DECISIONS.md`](./DECISIONS.md). Release history in
[`CHANGELOG.md`](./CHANGELOG.md).

```ts
createBend(element, {
  preset: "edge" | "surface" | "drag",
  axis: "x" | "y",
  resistance: number | { wheel: number, touch: number },
  curve: "linear" | "ease",
  max: { px: number, ratio: number },
  spring: { stiffness: number, damping: number, mass: number },
  render: "transform" | "cssVar",
  lagFactor: number,
  drag: "element",
  dragMaxRatio: number,
  ignore: (element: Element) => boolean,
  releaseDelay: number,
  respectReducedMotion: boolean,
  debug: boolean,
}): BendInstance
```

```ts
bend.state      // { pull, velocity, phase }; reused object, read the fields
bend.subscribe(fn)  // once per frame that changes the pull
bend.settle()   // spring back now
bend.pause()    // drop to rest and stop
bend.resume()
bend.destroy()  // idempotent; restores the styles it took over
```

Defaults: `resistance: { wheel: 5, touch: 3 }`, `curve: "linear"`,
`max: { px: 120, ratio: 0.18 }`,
`spring: { stiffness: 200, damping: 25, mass: 1 }`, `lagFactor: 0.04`,
`releaseDelay: 140`.

Resistance is a divisor, so a higher number means a heavier band. Wheel and touch
default apart because the two inputs cover very different distances per unit of
effort. Pass a number to use one value for both:

```ts
createBend(el, { resistance: 4 });                  // both classes
createBend(el, { resistance: { touch: 6 } });       // wheel keeps 5
```

---

## Development

```bash
npm install
npm run dev        # playground at :5173 (index / edge / surface)
npm run typecheck
npm run test       # unit tests, jsdom
npm run test:e2e   # Playwright; E2E_ALL_BROWSERS=1 adds Firefox and WebKit
npm run build      # tsup → dist/ (ESM + .d.ts)
npm run size       # size-limit gate
npm run size:react # react binding alone vs with core, gzip
npm run measure    # frame/layout measurement, needs the dev server running
npm --prefix docs install  # once, installs the docs site
npm run docs:dev   # documentation site (VitePress)
npm run docs:build # static docs in docs/.vitepress/dist
npm run verify     # typecheck + test + build + size + size:react
```

Chromium runs out of the box. Firefox and WebKit need Playwright's system
libraries (`npx playwright install --with-deps`), which is what CI installs.
Without them, WebKit cannot launch at all, so it is opt-in locally rather than a
silent skip.

Playground pages take query flags used by the measurement scripts:

- `?bare=1`: hide the readout and controls, so a measurement sees only the
  library
- `?off=1`: do not instantiate the library, for the baseline row

Test layout:

| Path | Covers |
|---|---|
| `test/spring.test.ts` | integrator stability, 60/144 Hz parity, mass, damping ratio |
| `test/resistance.test.ts` | resistance and clamp |
| `test/geometry.test.ts` | limit measurement, watcher re-entry regression |
| `test/input.test.ts` | wheel normalisation, velocity tracking |
| `test/scrollTree.test.ts` | nested scroller arbitration |
| `test/renderers.test.ts` | both renderers, style restoration, reduced motion |
| `test/core.test.ts` | full preset behaviour, lifecycle, reduced motion |
| `test/react.test.tsx` | stable instance, phase, ref-without-render |
| `e2e/bend.spec.ts` | real browser: edge/surface/touch/reduced motion |
| `e2e/contract.spec.ts` | **never cancels a gesture, never writes scroll** |

The `e2e/contract.spec.ts` file exists to keep constraints C1 and C2 honest. If
someone later adds a `preventDefault` or a `scrollTo`, those tests fail.

---

## License

BSD 3-Clause. See [`LICENSE`](./LICENSE).
