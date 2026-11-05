/**
 * How much of a gesture distance becomes displacement.
 *
 * Linear division, deliberately: it is the shape the reference implementation
 * shipped with and the one that was tuned by hand. A progressive curve
 * (iOS-style `max * (1 - 1 / (1 + d / max))`) is a candidate for a later
 * release, but it changes the feel and needs its own tuning pass.
 */
export function resist(delta: number, resistance: number): number {
  if (resistance <= 0) return delta;
  return delta / resistance;
}

/**
 * Ceiling for the current viewport: whichever of the absolute pixel limit and
 * the viewport ratio is smaller.
 */
export function pullLimit(px: number, ratio: number, viewport: number): number {
  return Math.max(0, Math.min(px, viewport * ratio));
}

/**
 * Direction-aware clamp. `top` keeps the pull positive (content follows a
 * downward pull), `bottom` keeps it negative.
 */
export function clampToEdge(value: number, limit: number, edge: "top" | "bottom"): number {
  if (edge === "top") return Math.max(0, Math.min(limit, value));
  return Math.max(-limit, Math.min(0, value));
}
