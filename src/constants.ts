import type { SpringConfig } from "./types";

export const DEFAULT_RESISTANCE = 3;
export const DEFAULT_MAX_PX = 120;
export const DEFAULT_MAX_RATIO = 0.18;
export const DEFAULT_RELEASE_DELAY = 140;
export const DEFAULT_LAG_FACTOR = 0.04;
export const DEFAULT_SPRING: Required<SpringConfig> = {
  stiffness: 200,
  damping: 25,
  mass: 1,
};

/** Longest frame we integrate. A backgrounded tab can hand us a huge dt. */
export const MAX_FRAME_SECONDS = 0.064;

/** Fixed integration step, so 144 Hz and 60 Hz feel the same. */
export const SUBSTEP_SECONDS = 1 / 240;

/** Below this the pull is visually zero and the loop may sleep. */
export const SETTLE_PULL_EPSILON = 0.05;
export const SETTLE_VELOCITY_EPSILON = 1.5;

/** Scroll jumps above this are navigation, not a gesture. */
export const MAX_SURFACE_VELOCITY = 8000;

/** Quiet period before `surface` stops leaning. */
export const SURFACE_HOLD = 240;

export function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
