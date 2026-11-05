import { describe, expect, it } from "vitest";
import { createVelocityTracker, normalizeWheel } from "../src/input";

interface WheelInit {
  deltaY?: number;
  deltaX?: number;
  deltaMode?: number;
  ctrlKey?: boolean;
}

function wheel(init: WheelInit = {}): WheelEvent {
  const event = new WheelEvent("wheel", {
    deltaY: init.deltaY ?? 0,
    deltaX: init.deltaX ?? 0,
    deltaMode: init.deltaMode ?? 0,
    ctrlKey: init.ctrlKey ?? false,
    cancelable: true,
  });
  return event;
}

const viewport = { width: 1024, height: 800 };

describe("normalizeWheel", () => {
  it("passes pixel deltas through", () => {
    expect(normalizeWheel(wheel({ deltaY: 120 }), "y", viewport)).toBe(120);
  });

  it("converts line deltas", () => {
    const value = normalizeWheel(wheel({ deltaY: 3, deltaMode: 1 }), "y", viewport);
    expect(value).toBeCloseTo(50, 5);
  });

  it("converts page deltas using the viewport", () => {
    expect(normalizeWheel(wheel({ deltaY: 1, deltaMode: 2 }), "y", viewport)).toBe(800);
    expect(normalizeWheel(wheel({ deltaX: 1, deltaMode: 2 }), "x", viewport)).toBe(1024);
  });

  it("reads the axis it was asked for", () => {
    expect(normalizeWheel(wheel({ deltaX: 30, deltaY: 90 }), "x", viewport)).toBe(30);
    expect(normalizeWheel(wheel({ deltaX: 30, deltaY: 90 }), "y", viewport)).toBe(90);
  });

  it("returns zero for a gesture with no delta", () => {
    expect(normalizeWheel(wheel({}), "y", viewport)).toBe(0);
  });
});

describe("createVelocityTracker", () => {
  it("returns zero until it has two samples", () => {
    const tracker = createVelocityTracker();
    expect(tracker.push(0, 0)).toBe(0);
    expect(tracker.push(10, 16)).toBeCloseTo(625, 0);
  });

  it("ignores zero and negative time steps", () => {
    const tracker = createVelocityTracker();
    tracker.push(0, 100);
    expect(tracker.push(20, 100)).toBe(0);
    expect(Number.isFinite(tracker.push(40, 120))).toBe(true);
  });

  it("remembers the last velocity so a release can read it", () => {
    const tracker = createVelocityTracker();
    tracker.push(0, 0);
    tracker.push(10, 10);
    expect(tracker.velocity()).toBeCloseTo(1000, 0);
  });

  it("reports the sign of the displacement, not of the input", () => {
    const tracker = createVelocityTracker();
    tracker.push(100, 0);
    expect(tracker.push(60, 20)).toBeCloseTo(-2000, 0);
  });

  it("resets back to the unprimed state", () => {
    const tracker = createVelocityTracker();
    tracker.push(0, 0);
    tracker.push(50, 10);
    tracker.reset();
    expect(tracker.push(200, 400)).toBe(0);
    expect(tracker.velocity()).toBe(0);
  });
});
