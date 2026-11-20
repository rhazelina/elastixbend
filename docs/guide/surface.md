# Surface preset

`preset: "surface"` makes content lean behind scroll velocity and catch up. It
reads scroll position, not input events, so wheel, touch, keyboard, scrollbar,
and programmatic scroll all produce the same result.

```ts
createBend(el, {
  preset: "surface",
  lagFactor: 0.04,
});
```

## The target

```
pull = clamp(-velocity × lagFactor, -max, +max)
```

- `velocity` is scroll velocity in px/s.
- Positive velocity (content moving up the page) leans the content **negative**,
  so it trails behind the direction of travel.
- `lagFactor` is the number of seconds of lag. `0.04` means the band behaves as
  if it were 40 ms behind the scroll.

After 240 ms without a scroll event the preset stops leaning and the spring
returns the band to zero.

A velocity above the anchor-jump threshold is treated as navigation rather than
a gesture and produces no lean, so clicking an in-page anchor does not fling the
content.

## Tuning `lagFactor`

| Value | Feel |
|---|---|
| `0.01` – `0.02` | Barely visible; a hint of weight |
| `0.04` | Default; noticeable but calm |
| `0.08` – `0.12` | Heavy, editorial, easy to overdo |

The pull is still clamped by `max`, so a fast flick cannot exceed the pull limit
no matter how large `lagFactor` is.

## Composing with a smooth-scroll library

`surface` is the preset that tolerates a smooth-scroll library, because it reads
scroll position rather than wheel events. If the smooth-scroll library updates
position on a rAF loop, `surface` simply follows it.

`edge` is the opposite: it reads wheel events, so a library that also consumes
them will double up. See [DECISIONS.md D2](https://github.com/rhazelina/elastixbend/blob/main/DECISIONS.md).

## Caveats

- There is no edge pull in this preset. It leans wherever the scroll is.
- The hold and jump thresholds are internal and not configurable. They are
  behaviour, not feel.
- On a page that does not scroll, `surface` has nothing to read and stays idle.
