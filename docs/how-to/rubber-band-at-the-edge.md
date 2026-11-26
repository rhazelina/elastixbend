---
description: Add a rubber-band pull at the top and bottom of a page without taking over scrolling.
---

# Add a rubber band at the page edges

Use `edge` when you want the familiar pull past the start or end of a document,
with native scrolling left completely alone.

## Goal

A page that scrolls normally, but resists when the wheel or a finger pushes past
the last pixel.

## Steps

1. Install the package.

   ```bash
   npm install elastixbend
   ```

2. Wrap the content you want to move in an element.

   ```html
   <main id="stage">
     <p>Top of the page</p>
     <!-- content -->
   </main>
   ```

3. Create the bend on that element.

   ```ts
   import { createBend } from "elastixbend";

   const bend = createBend(document.querySelector<HTMLElement>("#stage")!, {
     preset: "edge",
   });
   ```

4. Destroy it when the view goes away.

   ```ts
   bend.destroy();
   ```

## Result

`#stage` receives a `translate3d` while you pull past either edge. The pull grows
with the whole gesture rather than with each event, a spring chases the target
on a fixed substep, and the band springs back when the gesture stops.

The page keeps its own scroll position. Every input listener is passive, and
nothing calls `preventDefault`.

## Caveat

Only wheel and touch drive `edge`. Keyboard scrolling, scrollbar drags, and
programmatic scrolling release the band instead of pulling it. If you need those
inputs to produce displacement too, use
[`surface`](/how-to/lean-behind-scroll).

## Next

- [Tune the weight and curve](/how-to/tune-the-feel)
- [Use a horizontal axis](/how-to/horizontal-scroll)
- [Open the edge playground](https://elastixbend.vercel.app/) or run `npm run dev` locally
