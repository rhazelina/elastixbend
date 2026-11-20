import { describe, expect, it } from "vitest";
import { clampToEdge, pullLimit, resist, resistEase } from "../src/kernels/resistance";
import { clamp } from "../src/constants";

describe("resist", () => {
  it("divides the gesture by the resistance", () => {
    expect(resist(90, 3)).toBe(30);
  });

  it("passes the gesture through when resistance is disabled", () => {
    expect(resist(90, 0)).toBe(90);
    expect(resist(-90, -1)).toBe(-90);
  });
});

describe("resistEase", () => {
  it("starts with the same slope as the linear curve", () => {
    // d/dx limit * (1 - exp(-x / limit)) at 0 is 1, so a small gesture is
    // barely eased at all.
    expect(resistEase(1, 3, 120)).toBeCloseTo(resist(1, 3), 3);
  });

  it("stays under the linear curve past the knee", () => {
    expect(resistEase(90, 3, 120)).toBeLessThan(resist(90, 3));
    expect(resistEase(90, 3, 120)).toBeGreaterThan(resist(90, 3) / 2);
  });

  it("saturates below the limit instead of crossing it", () => {
    expect(resistEase(1200, 3, 120)).toBeLessThan(120);
    expect(resistEase(1200, 3, 120)).toBeGreaterThan(110);
  });

  it("keeps growing with the gesture", () => {
    expect(resistEase(600, 3, 120)).toBeGreaterThan(resistEase(300, 3, 120));
  });

  it("mirrors the sign of the gesture", () => {
    expect(resistEase(-300, 3, 120)).toBeCloseTo(-resistEase(300, 3, 120), 6);
  });

  it("falls back to linear without a limit", () => {
    expect(resistEase(90, 3, 0)).toBe(30);
  });
});

describe("pullLimit", () => {
  it("uses the absolute limit on a tall viewport", () => {
    expect(pullLimit(120, 0.18, 900)).toBe(120);
  });

  it("uses the ratio on a short viewport", () => {
    expect(pullLimit(120, 0.18, 500)).toBe(90);
  });

  it("never returns a negative limit", () => {
    expect(pullLimit(-10, -0.1, 800)).toBe(0);
  });
});

describe("clampToEdge", () => {
  it("keeps the start edge pull positive", () => {
    expect(clampToEdge(-40, 120, "start")).toBe(0);
    expect(clampToEdge(400, 120, "start")).toBe(120);
  });

  it("keeps the end edge pull negative", () => {
    expect(clampToEdge(40, 120, "end")).toBe(0);
    expect(clampToEdge(-400, 120, "end")).toBe(-120);
  });
});

describe("clamp", () => {
  it("bounds on both sides", () => {
    expect(clamp(0, -5, 10)).toBe(0);
    expect(clamp(0, 5, 10)).toBe(5);
    expect(clamp(0, 50, 10)).toBe(10);
  });
});