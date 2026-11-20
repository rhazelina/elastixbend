# Edge preset

`preset: "edge"` (the default) pulls content outward when a wheel or touch
gesture reaches the start or end of the document, then springs it back.

```ts
createBend(el, {
  preset: "edge",
  releaseDelay: 140,
});
```

## Gesture mapping

| Gesture | Result |
|---|---|
| Outward at the start edge (top, or left on `axis: "x"`) | Positive pull — content moves down or right, revealing space |
| Outward at the end edge | Negative pull — content moves up or left |
| Inward, into the page | Normal scroll, no pull |
| Keyboard, scrollbar, programmatic scroll | Releases the band; it does not drive it |
| `pointerdown` while displaced | Snaps to rest immediately, so a click cannot land on a shifted target |
| Gesture over a nested scroller that still has room | Belongs to that ancestor, not to the preset |

The last two rules matter in practice. A modal with its own scroll area keeps
its gestures, and a button inside the band stays clickable.

## Axis

`axis: "x"` moves the same preset onto the horizontal axis:

```ts
createBend(el, { preset: "edge", axis: "x" });
```

Geometry, the edge clamp, and touch input all follow the configured axis. Wheel
input reads `deltaX`, and the document's horizontal scroll range is measured
instead of the vertical one.

## Release

After `releaseDelay` milliseconds without a wheel event, the preset releases and
springs to zero carrying the band's own velocity. Touch releases on `touchend`.

Lower values feel twitchy; higher values feel sticky. The default is `140`.

```ts
createBend(el, { preset: "edge", releaseDelay: 90 });
```

The band also releases when:

- the page scrolls off the edge by any means (keyboard, scrollbar, programmatic),
- a `pointerdown` lands,
- `settle()`, `pause()`, or `destroy()` is called.

## Ignoring gestures

`ignore` receives the event origin element and returns `true` to leave it alone.
Use it for nested widgets that should keep their own scrolling:

```ts
createBend(el, {
  preset: "edge",
  ignore: (origin) => origin.closest("[data-own-scroll]") !== null,
});
```

The callback applies to wheel and touch origins. Returning `true` means the
library does not start a gesture for that event.

## Caveats

- Only wheel and touch drive `edge`. Keyboard scrolling and scrollbar drags
  release the band rather than pulling it — they are not gestures you can
  rubber-band.
- `edge` reads wheel events. A smooth-scroll library that also consumes wheel
  input will double up with it. Use [`surface`](/guide/surface) instead when
  composing with one.
- The default renderer takes over `transform` and creates a containing block.
  See [Renderers](/reference/renderers) if that is a problem.
