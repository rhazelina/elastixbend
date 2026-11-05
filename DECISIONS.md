# Decisions

Why the library looks like this. Written so a future reader can tell a deliberate
choice from an accident.

---

## D1. `surface` means `lean`, not `drag`

A rubber-band effect can be driven two ways:

- **lean**: content trails behind scroll velocity. Reads position, so it works for
  wheel, touch, keyboard, scrollbar, and programmatic scroll without knowing
  which one fired.
- **drag**: content follows a pointer drag, and needs `preventDefault` to stop
  the page from scrolling under the finger.

`drag` cannot satisfy constraint C1 (never cancel a gesture). It also conflicts
with native touch scrolling in a way no amount of `touch-action` styling fixes
cleanly. `lean` gets most of the perceived weight and is compatible with the
hard constraint, so `0.1.0` ships `lean` only.

`lean` is also the reason `surface` needs no input listeners at all: one passive
`scroll` listener is enough.

## D2. Lenis is ignored, not integrated

The effect ran next to Lenis in the host project, and the two fought:
`RubberBandScroll` pulled on the same wheel events Lenis was smoothing, so the
page felt like it had two springs. The tempting fix is an adapter that feeds
Lenis's smoothed position into the band.

Rejected. An adapter would:

- couple the library's release cycle to another library's version and internals,
- create the impression that the pair is supported together, which is a promise
  nobody has tested,
- add a bundle and a maintenance surface for a compatibility claim.

Instead the library obeys C2 and C4: it never writes scroll position and never
cancels gestures, so any scroll owner (native, Lenis, or something else) stays
authoritative. Whether the combination *feels* good is the consumer's call, and
`surface` (which reads position) behaves better next to a smooth-scroll library
than `edge` (which reads wheel events) does. That is documented, not hidden.

## D3. `transform` is the default renderer

Three candidates:

| Renderer | Feel | Cost |
|---|---|---|
| `transform` | exact, GPU-composited | takes over `transform`; creates a containing block |
| `cssVar` | exact | needs one CSS line from the consumer; not composited unless the CSS says so |
| `margin`/`top` | wrong (layout per frame) | disqualified by C6 |

`transform` needs no setup, so the first-run experience is "it just works". Its
two consequences are real and silent, so they are documented in `SPEC.md` §6.1
and detected by `debug` at creation. `cssVar` exists for pages that already
transform the element or pin `position: fixed` children inside it.

## D4. Zero runtime dependencies

A scroll effect is on the critical path of every page it touches. A single
transitive dependency that ships a polyfill or a helper is larger than this
whole library. React is an optional peer and is not imported by the core entry.

Consequence: no `easing` package, no tween library, no polyfill. The spring is
~20 lines and the scheduler is ~40.

## D5. One kernel, presets as configuration

The alternative, a separate implementation per preset, duplicates the spring,
the clamp, the scheduler, and the reduced-motion path, and lets them drift. Both
shipped presets therefore drive the same `PresetHost`, the same spring
integrator, and the same renderer. A preset only decides **which target** the
spring should chase:

- `edge` spreads wheel/touch delta into displacement.
- `surface` maps scroll velocity to a target and lets the spring chase it.

Adding a preset later is a new target function, not a new pipeline.

## D6. Spring: `{ stiffness: 200, damping: 25, mass: 1 }`

Damping ratio ζ = 25 / (2 × √200) ≈ 0.88, slightly underdamped, so the band
overshoots by about a pixel before settling. That reads as elastic rather than
bouncy. `stiffness: 200` and `damping: 25` come from the original PRD and were
kept so the feel matches the reference implementation.

No parity claim is made with Framer Motion's `stiffness`/`damping` units. Those
are tuned against a different integrator; matching the numbers would not match
the motion. The values here were tuned in the playground against a real
trackpad.

Integration is semi-implicit Euler at a fixed 1/240 s substep, clamped to 64 ms
per frame. Fixed substeps mean 60 Hz and 144 Hz produce the same trajectory
within a pixel, and a stalled tab cannot explode the integrator.

## D7. The loop sleeps

The reference implementation ran a permanent `requestAnimationFrame` loop, which
keeps the main thread and the compositor awake on an idle page. This library
schedules a frame only when a gesture starts and unschedules the moment the
machine returns to `idle` (C7).

Measured: the scheduler task count reads `0` within ~0.5 s of the last gesture on
both presets (see README's measurement table).

## D8. Reduced motion is inert, not slower

A slow spring is still motion, and still causes the vestibular discomfort the
media query exists to prevent. Under `reduce`, `createBend` returns an instance
that reports idle forever and installs no listeners. The shape is identical, so
callers do not need to branch.

## D9. Options are immutable after creation

No `setOptions`. A live option channel means:

- every frame must re-read config it could have closed over,
- a partial update has to reconcile against a previous resolved config,
- `useEffect` dependency arrays become the consumer's problem.

Destroy and recreate instead. It is one line, and the cost is visible.

## D10. Naming

`elastixbend` was chosen for the package. Known friction, accepted:

- It collides in search with an existing PBX product called Elastix.
- `createBend` is long, so `const bend = createBend(el)` is the recommended
  local pattern.

## D11. Measurement is a gate, not a claim

The plan asked for size and frame-cost numbers that are measured. Two things
followed:

1. **Bundle size** is checked with `size-limit` against real built output, and
   the raw gzip of the minified bundle is recorded too. The tool's number is
   *brotli, bundled, with dependencies*; the README reports both so nobody quotes
   the wrong unit.
2. **Composited layer size** is *not* measured. CDP's
   `LayerTree.layerTreeDidChange` emits nothing in headless Chromium (verified by
   probe: 0 events across page loads and gestures), so it is recorded as
   unverified rather than reported as a pass. It stays a manual DevTools Layers
   check.

Frame timing in headless Chromium is noisy, so the perf script takes three runs
and reports the median plus the over-32 ms count. It is not wired to a CI
threshold, because a headless CI machine would make it flap.

## D12. Two bugs found by the measurement gate, and what changed

Recording this because both were invisible to the tests that existed.

**Style recalculation per wheel event.** `isBlocked()` called `getComputedStyle`
on `html` and `body` for every wheel event to detect a scroll lock. That is 16
style recalculations per 24-event burst, and edge's main-thread script time was
~58 ms against a ~8 ms baseline. Fixed by caching the lock state and invalidating
it from a `MutationObserver` on `style`/`class`. Script time dropped to ~6 ms.

The same pass fixed a second instance of the same problem in
`hasScrollableAncestor`, which called `getComputedStyle` on every ancestor before
checking whether any of them could scroll. It now checks the live scroll range
first and only reads style for nodes that actually overflow.

**A geometry watcher that re-entered itself.** `geometry.watch(() => host.measure())`
combined with `measure()` calling `refresh()` meant a resize re-entered the
watcher forever. The tests never resized. Fixed by giving `createGeometry`
ownership of its observers, notifying only when the limit actually changes, and
adding a regression test that calls `refresh()` from inside a watcher.

**Mass was inert.** `stepSpring` multiplied stiffness and damping by `mass` and
then divided by `mass`, cancelling it out, while `dampingRatio()` reported a
value that assumed mass mattered. Fixed; a test now asserts a heavier spring
accelerates less.

**Velocity carry measured the wrong thing.** `edge` fed raw wheel deltas into the
velocity tracker, which measures how fast the user spun the wheel, not how fast
the band was moving. It now samples the band's own displacement each frame.

**`surface` stranded a lean.** The spring settled onto a non-zero target, the
machine went `idle`, the frame loop slept, and the preset's decay logic, which
only runs inside a frame, never ran again. The content stayed offset forever.
Found by probing the settle path directly, not by an assertion that already
existed. `tick` now only goes idle on a **zero** target, and a slow-scroll
regression test covers it.
