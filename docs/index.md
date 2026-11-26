---
layout: home

hero:
  name: elastixbend
  text: Elastic scroll displacement
  tagline: The page scrolls natively. A small spring-driven offset follows a gesture at an edge, trails behind scroll velocity, or tracks a pointer, then springs back.
  actions:
    - theme: brand
      text: Start with a how-to
      link: /how-to/rubber-band-at-the-edge
    - theme: alt
      text: API reference
      link: /reference/options

features:
  - title: Never hijacks scroll
    details: No preventDefault, no scroll writes, no touch-action tricks. Every input listener is passive, so trackpads, wheels, keyboards, scrollbars, and screen readers keep working.
  - title: Same feel on every device
    details: Resistance applies to the cumulative gesture distance, and a fixed 1/240 s substep drives the spring. One coarse wheel tick and twenty fine touch moves settle in the same place.
  - title: Zero runtime dependencies
    details: 4.02 kB brotli for the core. React is an optional peer, imported only through elastixbend/react.
  - title: Stops when nothing moves
    details: The requestAnimationFrame loop is scheduled on demand and unscheduled the frame it goes idle. No idle ticker, no polling.
---

## Thirty seconds to the first pull

```bash
npm install elastixbend
```

```ts
import { createBend } from "elastixbend";

const bend = createBend(document.querySelector("#stage")!, {
  preset: "edge",
});

// later
bend.destroy();
```

That is the whole setup. `#stage` gets a `translate3d` while you pull past the
top or bottom of the page, and returns to rest when you stop.

## Three presets, one kernel

All three presets share the scheduler, spring integrator, clamp, and renderer.
They differ only in what drives the target.

Start with the [how-to guides](/how-to/rubber-band-at-the-edge) when you want one
concrete result. Read [how it works](/guide/how-it-works) when you want the rule
behind the result.

## Compose with your own transform

The default renderer owns `style.transform`. If the element already has one, or
if a `position: fixed` descendant must stay pinned, switch to the CSS variable
renderer:

```ts
createBend(el, { render: "cssVar" });
```

```css
.stage {
  transform: translate3d(0, var(--bend-pull, 0px), 0);
}
```

Read [Renderers](/reference/renderers) before choosing.

## The contract is public

The full behaviour is written down in
[SPEC.md](https://github.com/rhazelina/elastixbend/blob/main/SPEC.md), and the
reasons behind the design are in
[DECISIONS.md](https://github.com/rhazelina/elastixbend/blob/main/DECISIONS.md).
If this site and the spec ever disagree, the spec wins.
