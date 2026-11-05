import { describe, expect, it } from "vitest";
import { clampToEdge, pullLimit, resist } from "../src/kernels/resistance";
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
  it("keeps the top edge pull positive", () => {
    expect(clampToEdge(-40, 120, "top")).toBe(0);
    expect(clampToEdge(400, 120, "top")).toBe(120);
  });

  it("keeps the bottom edge pull negative", () => {
    expect(clampToEdge(40, 120, "bottom")).toBe(0);
    expect(clampToEdge(-400, 120, "bottom")).toBe(-120);
  });
});

describe("clamp", () => {
  it("bounds on both sides", () => {
    expect(clamp(0, -5, 10)).toBe(0);
    expect(clamp(0, 5, 10)).toBe(5);
    expect(clamp(0, 50, 10)).toBe(10);
  });
});
