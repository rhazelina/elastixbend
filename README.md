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

That is the whole basic setup. `#stage` gets a `translate3d` while you pull past
the top or bottom of the page.

### `preset: "surface"`

Content trails behind scroll velocity instead of pulling at edges:

```ts
createBend(el, { preset: "surface", lagFactor: 0.04 });
```

Works for wheel, touch, keyboard, scrollbar, and programmatic scroll, because it
reads scroll position rather than input events.

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

Reading the pull per frame does not re-render:

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

There is deliberately no `useState(pull)`. A 60 Hz React re-render is the exact
cost this library exists to avoid.

---

## Reduced motion

`prefers-reduced-motion: reduce` makes the effect **inert**: no listeners, no
animation, state stays idle. Not a slower spring. No motion at all.

```ts
createBend(el, { respectReducedMotion: false }); // opt out
```

---

## Caveats

Read these before shipping.

1. **`transform` is the default and it takes over the property.** If your element
   already has a transform, use `render: "cssVar"`.
2. **`transform` creates a containing block.** A `position: fixed` child inside
   the target will move with the band. Check before wrapping a page shell.
3. **It is not a smooth-scroll library.** It does not and will not smooth scroll.
   If you want smooth scrolling, use one; this coexists with it by design, but
   does not replace it.
4. **No Lenis adapter.** See `DECISIONS.md` D2. `surface` behaves better next to
   a smooth-scroll library than `edge` does, because it reads position instead of
   wheel events.
5. **Options are immutable.** No `setOptions`. Destroy and recreate.
6. **`axis: "x"` is wired but no preset listens to horizontal input yet.** Use it
   with your own driver, or don't.
7. **Only wheel and touch drive `edge`.** Keyboard scrolling and scrollbar drags
   release the band rather than driving it. That is intended: they are not
   gestures you can rubber-band.
8. **No custom presets in `0.1.0`.** The host interface is typed but not exported.

---

## Measured

Measured on this machine (Linux, Node 26, Chromium headless via Playwright), not
claimed. Reproduce with `npm run size` and `npm run measure`.

### Bundle size

| Entry | Brotli + deps (size-limit) | Minified + gzip | Budget |
|---|---|---|---|
| `elastixbend` (core) | **3.2 kB** | 3.75 kB | 5 kB |
| `elastixbend/react` (binding only) | not applicable | **0.54 kB** | 1.5 kB |
| `elastixbend/react` (binding + core) | **3.64 kB** | 3.97 kB | 5 kB |

The React binding is reported two ways on purpose: on its own (0.54 kB, what it
adds to a page that already imported the core) and bundled with the core
(3.65 kB, what a React-only consumer actually ships). `size-limit` cannot express
the first case because the built entry shares a chunk with the core, so it is
measured by `npm run size:react` with the chunk marked external. `size-limit`'s
figure is brotli; the gzip column is `esbuild --bundle --minify` plus `gzip -9`.

### Runtime cost

24-event wheel burst, three runs, median reported. Baseline is the same page
with the library not instantiated (`?off=1`).

| Page | p50 frame | p95 frame | frames > 32 ms | layout | style recalc | script | loop settles |
|---|---|---|---|---|---|---|---|
| `edge` | 16.7 ms | 16.8 ms | 0 | 1 | 16 | 12 ms | 431 ms |
| `surface` | 16.7 ms | 16.7 ms | 0 | 0 | 0 | 1 ms | 0 ms |
| baseline | 16.7 ms | 16.7 ms | 0 | 0 | 0 | 1 ms | n/a |

"loop settles" is the time until the shared `requestAnimationFrame` task count
reaches zero after the gesture ends. `surface` reads 0 immediately because its
last frame already returned `false`.

**Style recalc on `edge` is the renderer writing `style.transform` and
`style.willChange`.** It is bounded by the number of frames that actually move,
not by input event count, and it does not show up as frame drops.

### Not measured

**Composited layer size.** CDP's `LayerTree.layerTreeDidChange` emits zero events
in headless Chromium, verified with a probe across page loads, gestures, and
layer tree enables. Rather than report a fabricated number, this stays a manual
DevTools → Layers panel check. `transform` on the target should promote one layer
sized to the target's border box; if your target is the whole page, that is a
full-viewport layer, which is the same cost a smooth-scroll library pays.

Frame timings in headless Chromium are noisy. They are indicative and are not
wired to a CI threshold, because a threshold there would flap. Only "loop settles" and
the size budgets are hard gates.

---

## API

Full contract in [`SPEC.md`](./SPEC.md). Rationale in
[`DECISIONS.md`](./DECISIONS.md). Release history in
[`CHANGELOG.md`](./CHANGELOG.md).

```ts
createBend(element, {
  preset: "edge" | "surface",
  axis: "x" | "y",
  resistance: number,
  max: { px: number, ratio: number },
  spring: { stiffness: number, damping: number, mass: number },
  render: "transform" | "cssVar",
  lagFactor: number,
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

Defaults: `resistance: 3`, `max: { px: 120, ratio: 0.18 }`,
`spring: { stiffness: 200, damping: 25, mass: 1 }`, `lagFactor: 0.04`,
`releaseDelay: 140`.

---

## Development

```bash
npm install
npm run dev        # playground at :5173 (index / edge / surface)
npm run typecheck
npm run test       # 74 unit tests, jsdom
npm run test:e2e   # Playwright, needs `npx playwright install chromium`
npm run build      # tsup → dist/ (ESM + .d.ts)
npm run size       # size-limit gate
npm run size:react # react binding alone vs with core, gzip
npm run measure    # frame/layout measurement, needs the dev server running
npm run verify     # typecheck + test + build + size + size:react
```

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
