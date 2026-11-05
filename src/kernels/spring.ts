import {
  MAX_FRAME_SECONDS,
  SETTLE_PULL_EPSILON,
  SETTLE_VELOCITY_EPSILON,
  SUBSTEP_SECONDS,
  clamp,
} from "../constants";
import type { SpringConfig } from "../types";

export interface SpringState {
  pull: number;
  velocity: number;
}

/**
 * Advance a damped spring toward `target` with a fixed substep.
 *
 * Semi-implicit Euler: velocity is integrated first, so the solver stays
 * stable at stiffness values that would blow up the explicit form.
 */
export function stepSpring(
  state: SpringState,
  target: number,
  config: SpringConfig,
  dt: number,
): void {
  const mass = config.mass ?? 1;
  const stiffness = config.stiffness;
  const damping = config.damping;

  let remaining = clamp(0, dt, MAX_FRAME_SECONDS);

  while (remaining > 0) {
    const h = Math.min(SUBSTEP_SECONDS, remaining);
    const stretch = state.pull - target;
    // a = (F_spring + F_damping) / mass. Mass must stay in the denominator;
    // multiplying the coefficients by it as well would cancel it out.
    const accel = (-stiffness * stretch - damping * state.velocity) / mass;
    state.velocity += accel * h;
    state.pull += state.velocity * h;
    remaining -= h;
  }
}

export function isSettled(state: SpringState, target = 0): boolean {
  return (
    Math.abs(state.pull - target) < SETTLE_PULL_EPSILON &&
    Math.abs(state.velocity) < SETTLE_VELOCITY_EPSILON
  );
}

/** Critical damping is where the spring stops overshooting. */
export function dampingRatio(config: SpringConfig): number {
  const mass = config.mass ?? 1;
  return config.damping / (2 * Math.sqrt(config.stiffness * mass));
}
