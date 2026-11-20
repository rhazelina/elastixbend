# Renderers

The renderer decides how the computed pull reaches the DOM. The physics is
identical in both.

| | `transform` (default) | `cssVar` |
|---|---|---|
| Writes | `translate3d(...)` and `will-change` | `--bend-pull: <px>` |
| Composes with an existing transform | No — it replaces it | Yes |
| Creates a containing block | Yes | No |
| Needs CSS from you | No | Yes |
| Restores on `destroy()` | Yes | Yes, including a consumer value |

## `transform`

```ts
createBend(el, { render: "transform" });
```

Writes `translate3d(0, <pull>px, 0)` on the Y axis (`<pull>px, 0, 0` on X) and
sets `will-change: transform` while moving.

Two consequences are real, and `debug: true` surfaces both:

1. **It takes over `transform`.** Any other transform on the element is replaced
   while the effect runs and restored when it stops.
2. **A transformed element becomes a containing block.** Any `position: fixed`
   descendant moves with the band instead of staying pinned to the viewport.

If either is unacceptable, use `cssVar`.

## `cssVar`

```ts
createBend(el, { render: "cssVar" });
```

```css
.stage {
  transform: translate3d(0, var(--bend-pull, 0px), 0);
}
```

The renderer writes only `--bend-pull` on the target. You decide where it
applies, so it composes with any transform the page already uses and does not
create a containing block.

A `--bend-pull` value you set yourself is preserved across `destroy()`.

## Choosing

Use `transform` when the target is a dedicated wrapper and nothing else
transforms it. Use `cssVar` when:

- the target already has a transform,
- a fixed-position child must stay pinned,
- or the pull needs to feed more than one property.

## Reduced motion

Neither renderer runs when the effect is inert under reduced motion. The DOM is
not touched at all, so `cssVar` consumers fall back to their `var()` default.
