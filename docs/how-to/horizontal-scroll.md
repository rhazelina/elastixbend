---
description: Apply elastixbend to a horizontally scrolling document with axis x.
---

# Use a horizontal axis

Every preset follows `axis`. The default is `"y"`, so a horizontal page needs the
option set explicitly.

## Goal

A rubber-band pull at the left and right edges of a document that scrolls
sideways.

## Steps

1. Make the document itself wider than the viewport.

   ```html
   <main class="rail" id="stage">
     <section>First panel</section>
     <section>Second panel</section>
     <section>Last panel</section>
   </main>
   ```

   ```css
   .rail {
     display: flex;
     width: max-content;
   }
   ```

2. Pass the axis when creating the instance.

   ```ts
   import { createBend } from "elastixbend";

   const bend = createBend(document.querySelector<HTMLElement>("#stage")!, {
     preset: "edge",
     axis: "x",
   });
   ```

3. On a desktop mouse with a vertical wheel, hold `Shift` while scrolling, use a
   trackpad's horizontal gesture, or drag the bottom scrollbar.

## Result

Geometry measures `scrollWidth - clientWidth` and reads `scrollX`. Wheel input
uses `deltaX`, touch uses `clientX`, and the renderer writes
`translate3d(<pull>px, 0, 0)`. The edge sides are called `start` and `end`, so a
horizontal pull is not named after an edge it does not have.

## Caveat

A wide element inside a vertically scrolling `div` will not drive the effect.
The scroll range has to belong to the document, because that is what geometry
measures. Putting a scroll view inside another scroll view on the same axis is
also a poor interface regardless of this library.

## Next

- [Work with nested scrollers](/guide/how-it-works)
- [Tune the weight and curve](/how-to/tune-the-feel)
