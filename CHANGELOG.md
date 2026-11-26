# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Reactive `prefers-reduced-motion`: toggling the preference starts or tears
  down the effect on the existing instance. Subscriptions and `pause()` survive
  the switch; the target's styles are restored when going inert.
- Firefox and WebKit Playwright projects, opt-in with `E2E_ALL_BROWSERS=1`.
- GitHub Actions workflow running typecheck, unit tests, build, size budgets,
  and the three-browser e2e suite.

### Fixed

- E2E tests wait for the playground to signal readiness before sending input.
  A cold WebKit page could otherwise receive its first wheel before the demo
  installed its listeners, leaving the pull at zero.

### Documentation

- Six how-to guides lead the site: edge pull, scroll lean, draggable card,
  horizontal axis, feel tuning, and React without per-frame renders.
- The docs theme extends VitePress with layout slots and three small Vue
  components: a proof strip, a preset comparison, and a contextual playground
  link. Navigation puts How-to first.
- Redesigned the landing page around one signature element, a displacement
  instrument with a tick rail and a settling readout, instead of a gradient hero
  name and four floating cards. The feature list is now one surface with
  dividers, and the preset comparison moved into the hero.
- How-to pages use numbered steps, a callout for Result and Caveat, and a
  contextual next step. Touch targets reach 44 px, and the one motion on the
  page is disabled under reduced motion.
- Fixed stale landing-page claims: core size is 4.02 kB brotli and there are
  three presets.
- Internal Markdown links are checked in CI after the docs build. No runtime
  code changed in this pass.

## [0.3.0] - 2026-11-26

### Added

- `preset: "drag"`: the element follows a pointer inside itself and springs
  back on release. Needs `touch-action: none` on the target, declared by the
  consumer; the library never sets it and never calls `preventDefault`.
- `dragMaxRatio` (default `0.22`) caps a drag against the target's own size.

## [0.2.0] - 2026-11-20

### Added

- `resistance` accepts `{ wheel, touch }` so the two input classes can be tuned
  apart. Defaults are `{ wheel: 5, touch: 3 }`.
- `curve: "linear" | "ease"`, default `"linear"`. `ease` saturates toward the
  pull limit after the resistance is applied.
- `axis: "x"` works in every preset. Geometry, the edge clamp, and touch input
  all follow the configured axis instead of reading the vertical document.
- A VitePress documentation site with local search, canonical URLs, and a
  sitemap, deployed through Vercel.
- Public exports added: `DEFAULT_RESISTANCE_TOUCH`, `DEFAULT_RESISTANCE_WHEEL`,
  `resistEase`, `Curve`, `Resistance`, and `ResistanceConfig`.

### Changed

- **Breaking for direct callers:** `clampToEdge` takes `"start"` / `"end"`
  instead of `"top"` / `"bottom"`, matching `edgeAt`.
- `DEFAULT_RESISTANCE` is replaced by `DEFAULT_RESISTANCE_WHEEL` and
  `DEFAULT_RESISTANCE_TOUCH`.
- **Feel change:** the default wheel resistance is 5, where `resistance` was
  previously one number at 3. Same resistance on wheel now needs
  `resistance: 3`.
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

[Unreleased]: https://github.com/rhazelina/elastixbend/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/rhazelina/elastixbend/releases/tag/v0.3.0
[0.2.0]: https://github.com/rhazelina/elastixbend/releases/tag/v0.2.0
[0.1.2]: https://github.com/rhazelina/elastixbend/releases/tag/v0.1.2
[0.1.1]: https://github.com/rhazelina/elastixbend/releases/tag/v0.1.1
[0.1.0]: https://github.com/rhazelina/elastixbend/releases/tag/v0.1.0
