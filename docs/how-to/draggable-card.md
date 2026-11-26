---
description: Build a card that follows a pointer and springs back, while keeping the scroll contract intact.
---

# Make a card follow a pointer

Use `drag` for an element that begins and ends a gesture inside its own bounds.
This is the only preset that holds a gesture, and it does so through CSS you
write, not through library-side cancellation.

## Goal

A card that follows a mouse, finger, or pen 1:1 and springs back on release.

## Steps

1. Give the element a CSS declaration that hands the touch gesture to you.

   ```css
   .card {
     touch-action: none;
   }
   ```

   Without this line the browser claims a touch drag for scrolling, the pointer
   events stop arriving, and the drag works on desktop but dies on a phone. With
   `debug: true`, a missing declaration is reported at creation.

2. Create the bend on the card.

   ```html
   <div class="card" id="card">Drag me</div>
   ```

   ```ts
   import { createBend } from "elastixbend";

   const bend = createBend(document.querySelector<HTMLElement>("#card")!, {
     preset: "drag",
   });
   ```

3. Set a ceiling based on the card's own size when the default feels too small.

   ```ts
   createBend(card, { preset: "drag", dragMaxRatio: 0.3 });
   ```

## Result

The card follows the pointer 1:1, clamped to `dragMaxRatio × card size` and the
usual `max`. On release, the spring takes over with the band's own velocity, so a
flick keeps travelling before it turns around.

The library never calls `preventDefault` and never writes `touch-action`. The
gesture is given up by your stylesheet on one small element, not by the package
on the whole page.

## Caveat

While a finger is on the card, the page does not scroll under it. Everywhere
else, scrolling is unchanged. Pointers that start on a link, button, input, or
`contenteditable` are ignored, and so is a right click.

## Next

- [Read why the CSS is yours](/guide/drag)
- [Keep native scrolling with `edge`](/how-to/rubber-band-at-the-edge)
