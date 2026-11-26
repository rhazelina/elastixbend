---
pageClass: how-to
description: Tune resistance, curve, spring, and limits for wheel and touch separately.
---

# Tune the weight and curve

Resistance, curve, spring, and limits are the four dials that change feel without
changing behaviour.

## Goal

A band that is heavier on a wheel than on a finger, and that never pins against
its ceiling on a long drag.

## Steps

1. Set resistance per input class.

   ```ts
   createBend(el, {
     resistance: { wheel: 5, touch: 3 },
   });
   ```

   The defaults come from equating one wheel notch with a shorter finger travel:
   `100 / 5 = 20` and `60 / 3 = 20`. A single number applies to both classes, so
   `resistance: 4` means wheel and touch both use 4. A partial object keeps the
   other default.

2. Opt into the saturating curve if long pulls feel pinned.

   ```ts
   createBend(el, { curve: "ease" });
   ```

   The shape is `limit × (1 - exp(-|d| / limit))`. It starts with the same slope
   as `linear`, so short pulls are barely changed, and long gestures approach the
   limit instead of hitting it.

3. Adjust the spring and the ceiling together.

   ```ts
   createBend(el, {
     spring: { stiffness: 200, damping: 25, mass: 1 },
     max: { px: 120, ratio: 0.18 },
   });
   ```

   The default damping ratio is about 0.88, slightly underdamped. `max` is the
   smaller of the absolute pixel limit and the viewport ratio.

## Result

Wheel and touch land on comparable displacement for comparable effort. A coarse
device and a precise one settle in the same place, because resistance applies to
the cumulative gesture distance and the spring runs on a fixed substep.

## Caveat

`curve: "ease"` changes the feel and has not been tuned on physical devices. The
default stays `"linear"`. Options are read once at creation, so changing them
means destroying and recreating the instance.

## Next

- [Read the full options reference](/reference/options)
- [See the tuning table](/guide/tuning)
