import type { EdgeSide } from "../geometry";

/**
 * How much of a gesture distance becomes displacement.
 *
 * Linear division, deliberately: it is the shape the reference implementation
 * shipped with and the one that was tuned by hand. `resistEase` below is the
 * opt-in alternative.
 */
export function resist(delta: number, resistance: number): number {
  if (resistance <= 0) return delta;
  return delta / resistance;
}

/**
 * Linear division that saturates toward `limit`.
 *
 * `limit * (1 - exp(-d / limit))` starts with the same slope as `resist` and
 * flattens as the gesture grows, so a long swipe keeps moving the band a
 * little instead of pinning it. `resistance` still sets the slope, so the two
 * curves stay tunable with the same number.
 */
export function resistEase(delta: number, resistance: number, limit: number): number {
  const linear = resist(delta, resistance);
  if (limit <= 0) return linear;
  const magnitude = Math.abs(linear);
  const eased = limit * (1 - Math.exp(-magnitude / limit));
  return Math.sign(linear) * eased;
}

/**
 * Ceiling for the current viewport: whichever of the absolute pixel limit and
 * the viewport ratio is smaller.
 */
export function pullLimit(px: number, ratio: number, viewport: number): number {
  return Math.max(0, Math.min(px, viewport * ratio));
}

/**
 * Direction-aware clamp. `start` is the top or left edge of the axis and keeps
 * the pull positive, `end` is the bottom or right edge and keeps it negative.
 */
export function clampToEdge(value: number, limit: number, edge: EdgeSide): number {
  if (edge === "start") return Math.max(0, Math.min(limit, value));
  return Math.max(-limit, Math.min(0, value));
}