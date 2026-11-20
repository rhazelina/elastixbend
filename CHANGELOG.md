# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Docs rewritten for a consistent voice; no runtime change.

## [0.1.2] - 2026-11-20

### Changed

- `edge` no longer jumps the band to the displaced position on each event. It
  keeps a cumulative gesture distance and lets the spring chase the target, so
  the rendered motion comes from the integrator instead of the input's event
  cadence. A wheel tick and a stream of touch moves now produce the same visible
  movement instead of the same total in a different shape.
- The velocity carry is sampled from the band's rendered position at release,
  including when the frame loop has already gone idle.

### Fixed

- A `pointerdown` during an active pull now clears the accumulated gesture as
  well as the displacement, so the band cannot resume from a stale total.

### Notes

- The settled displacement for a given gesture is unchanged: `resist()` still
  divides the cumulative distance and the same `max` clamp applies.
- `0.1.0`, `0.1.1`, and `0.1.2` are not feel-identical. The spring-chase is
  visible on the first gesture.

## [0.1.1] - 2026-11-05

### Added

- `CHANGELOG.md` now ships inside the published package and is linked from the
  README's API section.

No runtime change. `0.1.0` and `0.1.1` behave identically.

## [0.1.0] - 2026-11-05

First public release.

### Added

- `createBend(element, options)` core: a scroll **displacement** effect that
  never calls `preventDefault` and never writes scroll position.
- `edge` preset: rubber-band pull at the top and bottom of the document, driven
  by wheel and touch. Excludes gestures over nested scrollers that still have
  room in that direction.
- `surface` preset (`lean`): content trails behind scroll velocity and catches
  up. Reads scroll position, so it works for wheel, touch, keyboard, scrollbar,
  and programmatic scroll alike.
- Renderers: `transform` (default, writes `translate3d`) and `cssVar` (writes
  `--bend-pull` for the consumer to compose with their own transform).
- `BendInstance`: `state`, `subscribe`, `settle`, `pause`, `resume`, `destroy`.
- React binding at `elastixbend/react`: `<Bend>`, `useBend`, `useBendPhase`,
  `useBendRef`. The pull is never exposed through `useState`.
- `prefers-reduced-motion: reduce` makes the effect inert, not slower.
- On-demand animation loop: no `requestAnimationFrame` is pending while idle.

### Notes

- Options are read once at creation. There is no `setOptions`; destroy and
  recreate instead.
- The default `transform` renderer takes over `style.transform` and makes the
  target a containing block, so `position: fixed` descendants move with it.
- `axis: "x"` is wired but no preset listens to horizontal input yet.
- No Lenis adapter. Scroll ownership stays with whoever owns it.

[Unreleased]: https://github.com/rhazelina/elastixbend/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/rhazelina/elastixbend/releases/tag/v0.1.2
[0.1.1]: https://github.com/rhazelina/elastixbend/releases/tag/v0.1.1
[0.1.0]: https://github.com/rhazelina/elastixbend/releases/tag/v0.1.0
