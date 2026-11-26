---
description: Make content trail behind scroll velocity and catch up, regardless of input method.
---

# Make content lean behind the scroll

Use `surface` when the effect should follow scrolling itself, not the device that
produced it.

## Goal

A page whose content lags slightly in the direction of travel, then settles when
scrolling stops.

## Steps

1. Choose the element that should lean.

   ```html
   <main id="stage">...</main>
   ```

2. Create a `surface` bend with a lag in seconds.

   ```ts
   import { createBend } from "elastixbend";

   const bend = createBend(document.querySelector<HTMLElement>("#stage")!, {
     preset: "surface",
     lagFactor: 0.04,
   });
   ```

3. Keep the instance for the lifetime of the view, then destroy it.

   ```ts
   bend.destroy();
   ```

## Result

The target is `-velocity × lagFactor`, clamped to `max`. A `lagFactor` of `0.04`
reads as roughly 40 ms of lag. After 240 ms without a scroll event, the spring
returns the band to zero.

Because the preset reads scroll position, wheel, touch, keyboard, scrollbar, and
programmatic scroll all produce the same lean.

## Caveat

A scroll jump larger than the internal anchor threshold is treated as
navigation, so clicking an in-page anchor does not fling the content. There is
also no edge pull in this preset. If you want resistance at the document edges,
use [`edge`](/how-to/rubber-band-at-the-edge).

## Next

- [Tune the weight and curve](/how-to/tune-the-feel)
- [Read how the target is chosen](/guide/how-it-works)
- [Use the React binding](/how-to/react-without-re-renders)
