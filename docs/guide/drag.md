# Drag preset

`preset: "drag"` makes an element follow a pointer inside itself and spring back
on release. Mouse, touch, and pen all take the same path: the preset listens to
`pointerdown`, `pointermove`, and `pointerup` on the target.

```ts
createBend(el, { preset: "drag" });
```

```css
.card {
  touch-action: none;
}
```

That CSS line is not optional. It is also the only line this preset asks you to
write yourself. See "Why the CSS is yours" below.

## What it does

- Displacement follows the pointer **1:1**. Two hundred pixels of travel is two
  hundred pixels of band.
- The band is clamped to a fraction of the target's own size (`dragMaxRatio`,
  default `0.22`), so a short strip cannot be pulled a page's worth.
- On release the spring takes over, carrying the band's own velocity, so a flick
  keeps travelling before it turns around.
- A drag that starts on a link, button, input, or `contenteditable` is ignored,
  because that pointer belongs to a click.
- A right-click on the mouse does not start a drag.

The pointer is captured during the gesture, so moving outside the element does
not drop it. Capture is not cancellation: it keeps the gesture rather than
taking it from the page.

## Why the CSS is yours

Everything else in this library is built around one rule: never take a gesture
from the page. Two constraints make that explicit.

| Constraint | What it forbids |
|---|---|
| C1 | Calling `preventDefault` on input events |
| C3 | Setting `touch-action` or `overscroll-behavior` to suppress native behaviour |

A drag needs one of those two to work at all on a touchscreen; there is no third
option. So the choice moves to your CSS, where you can give up scrolling on one
small area instead of the whole page. The library reads the declaration and
never writes it.

With `debug: true`, a missing or wrong `touch-action` is reported at creation:

```
[elastixbend] `preset: "drag"` needs `touch-action: none` on the target, set by
your CSS. The library does not set it, because that would take the gesture away
from the page. Current value: auto.
```

## What you lose

While a finger is on the target, the page does not scroll under it. That is the
trade, and it is scoped to the element. Outside the element the page scrolls
exactly as before, and nothing else on the page changes.

If you want a rubber band that never claims a gesture at all, use `edge` or
`surface` instead. Neither of them needs any CSS.

## Options

| Option | Default | Notes |
|---|---|---|
| `dragMaxRatio` | `0.22` | Ceiling as a fraction of the target's height (or width on `axis: "x"`) |
| `max` | `{ px: 120, ratio: 0.18 }` | Still applies; the smaller ceiling wins |
| `spring` | `{ stiffness: 200, damping: 25, mass: 1 }` | The release feel |

## Caveats

- A drag is not a scroll. `drag` reads pointer deltas rather than document
  position, so it works on elements that never scroll.
- The host element becomes a containing block if you use the `transform`
  renderer, the same as the other presets. See `render: "cssVar"`.
- Nested drag targets are not reconciled. Two instances on nested elements will
  both react to the same pointer.