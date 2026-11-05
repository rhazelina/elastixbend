import { describe, expect, it } from "vitest";
import { dampingRatio, isSettled, stepSpring } from "../src/kernels/spring";
import { DEFAULT_SPRING } from "../src/constants";

describe("stepSpring", () => {
  it("converges to the target and stops", () => {
    const state = { pull: 120, velocity: 0 };
    let elapsed = 0;

    for (let frame = 0; frame < 600; frame += 1) {
      stepSpring(state, 0, DEFAULT_SPRING, 1 / 60);
      elapsed += 1 / 60;
      if (!Number.isFinite(state.pull)) break;
      if (isSettled(state)) break;
    }

    expect(elapsed).toBeLessThan(2);
    expect(Math.abs(state.pull)).toBeLessThan(0.5);
    expect(Math.abs(state.velocity)).toBeLessThan(1.5);
  });

  it("moves toward a non-zero target", () => {
    const state = { pull: 0, velocity: 0 };
    for (let frame = 0; frame < 300; frame += 1) {
      stepSpring(state, 40, DEFAULT_SPRING, 1 / 60);
    }
    expect(state.pull).toBeCloseTo(40, 1);
  });

  it("stays finite after an oversized dt", () => {
    const state = { pull: 100, velocity: 0 };
    for (let frame = 0; frame < 20; frame += 1) {
      stepSpring(state, 0, DEFAULT_SPRING, 4);
    }
    expect(Number.isFinite(state.pull)).toBe(true);
    expect(Number.isFinite(state.velocity)).toBe(true);
    expect(Math.abs(state.pull)).toBeLessThan(1);
  });

  it("produces the same result at 60 Hz and 144 Hz", () => {
    const at60 = { pull: 100, velocity: 0 };
    const at144 = { pull: 100, velocity: 0 };

    for (let frame = 0; frame < 60; frame += 1) stepSpring(at60, 0, DEFAULT_SPRING, 1 / 60);
    for (let frame = 0; frame < 144; frame += 1) stepSpring(at144, 0, DEFAULT_SPRING, 1 / 144);

    expect(Math.abs(at60.pull - at144.pull)).toBeLessThan(1.5);
  });

  it("gives mass an effect: a heavier spring accelerates less", () => {
    const light = { pull: 100, velocity: 0 };
    const heavy = { pull: 100, velocity: 0 };

    stepSpring(light, 0, { stiffness: 200, damping: 25, mass: 1 }, 1 / 60);
    stepSpring(heavy, 0, { stiffness: 200, damping: 25, mass: 2 }, 1 / 60);

    // Same stretch, half the acceleration, so it has moved less toward rest.
    expect(heavy.pull).toBeGreaterThan(light.pull);
    expect(light.pull).toBeLessThan(100);
  });

  it("defaults mass to 1", () => {
    const implicit = { pull: 100, velocity: 0 };
    const explicit = { pull: 100, velocity: 0 };

    stepSpring(implicit, 0, { stiffness: 200, damping: 25 }, 1 / 60);
    stepSpring(explicit, 0, { stiffness: 200, damping: 25, mass: 1 }, 1 / 60);

    expect(implicit.pull).toBe(explicit.pull);
  });
});

describe("dampingRatio", () => {
  it("reports the documented default as slightly underdamped", () => {
    expect(dampingRatio(DEFAULT_SPRING)).toBeGreaterThan(0.8);
    expect(dampingRatio(DEFAULT_SPRING)).toBeLessThan(1);
  });

  it("is 1 at critical damping", () => {
    expect(dampingRatio({ stiffness: 100, damping: 20, mass: 1 })).toBeCloseTo(1, 5);
  });
});
