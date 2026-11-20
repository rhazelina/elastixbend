# Getting started

`elastixbend` adds an elastic offset to an element while the page keeps
scrolling natively. It is not a scroll library: it never owns scroll position,
never smooths it, and never replaces the scrollbar.

## Install

```bash
npm install elastixbend
```

The package is ESM-only and has zero runtime dependencies. React is an optional
peer, needed only if you import `elastixbend/react`.

```ts
import { createBend } from "elastixbend";
```

There is no stylesheet to import. The library writes inline styles and restores
them on `destroy()`.

## Your first bend

```ts
import { createBend } from "elastixbend";

const stage = document.querySelector<HTMLElement>("#stage");

if (stage) {
  const bend = createBend(stage, { preset: "edge" });

  // When the component unmounts or the page is torn down:
  bend.destroy();
}
```

Call it in the browser, after the element exists. Importing the module is
SSR-safe; calling `createBend` during server rendering is not, because it reads
`window` and `document`.

::: tip Choose the moving element deliberately
The target is the element that moves. Wrapping your page content in a `<div>`
and bending that wrapper keeps `position: fixed` children out of the containing
block. See [Renderers](/reference/renderers).
:::

The instance does nothing until the first gesture. Creating it does not start a
`requestAnimationFrame` loop.

## Presets at a glance

| Preset | Input | Behaviour |
|---|---|---|
| `edge` (default) | Wheel and touch at the document edge | Content pulls outward, then springs back after `releaseDelay` of quiet |
| `surface` | Any scroll source | Content trails behind scroll velocity by `lagFactor` seconds |

```ts
createBend(el, { preset: "surface", lagFactor: 0.04 });
```

Read [Edge preset](/guide/edge) and [Surface preset](/guide/surface) for the full
behaviour of each.

## React

```tsx
import { Bend } from "elastixbend/react";

export function Page() {
  return (
    <Bend preset="edge" className="stage">
      <Content />
    </Bend>
  );
}
```

`<Bend>` renders a wrapper `<div>`, creates the instance on mount, and destroys
it on unmount. Options are read once; remount with a `key` if they need to
change. See [React](/guide/react).

## Reduced motion

If the user prefers reduced motion, the effect is inert rather than slower:
no listeners are installed, `subscribe` never fires, and the DOM is untouched.
That is the default. Opt out only if you have a reason:

```ts
createBend(el, { respectReducedMotion: false });
```

## Next steps

- [How it works](/guide/how-it-works) — the eight invariants and the state machine.
- [Tuning](/guide/tuning) — resistance, curve, spring, and limits.
- [Options reference](/reference/options) — every option, type, and default.
