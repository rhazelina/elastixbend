import { describe, expect, it } from "vitest";
import { resolveOptions } from "../src/options";
import {
  DEFAULT_DRAG_MAX_RATIO,
  DEFAULT_LAG_FACTOR,
  DEFAULT_MAX_PX,
  DEFAULT_MAX_RATIO,
  DEFAULT_RELEASE_DELAY,
  DEFAULT_RESISTANCE_TOUCH,
  DEFAULT_RESISTANCE_WHEEL,
  DEFAULT_SPRING,
} from "../src/constants";

describe("resolveOptions", () => {
  it("returns the documented defaults for an empty object", () => {
    const resolved = resolveOptions();
    expect(resolved.preset).toBe("edge");
    expect(resolved.axis).toBe("y");
    expect(resolved.resistance).toEqual({
      wheel: DEFAULT_RESISTANCE_WHEEL,
      touch: DEFAULT_RESISTANCE_TOUCH,
    });
    expect(resolved.curve).toBe("linear");
    expect(resolved.max).toEqual({ px: DEFAULT_MAX_PX, ratio: DEFAULT_MAX_RATIO });
    expect(resolved.spring).toEqual({
      stiffness: DEFAULT_SPRING.stiffness,
      damping: DEFAULT_SPRING.damping,
      mass: DEFAULT_SPRING.mass,
    });
    expect(resolved.render).toBe("transform");
    expect(resolved.lagFactor).toBe(DEFAULT_LAG_FACTOR);
    expect(resolved.drag).toBe("element");
    expect(resolved.dragMaxRatio).toBe(DEFAULT_DRAG_MAX_RATIO);
    expect(resolved.releaseDelay).toBe(DEFAULT_RELEASE_DELAY);
    expect(resolved.respectReducedMotion).toBe(true);
    expect(resolved.ignore).toBeUndefined();
  });

  it("merges partial spring config instead of replacing it", () => {
    const resolved = resolveOptions({ spring: { stiffness: 300, damping: 30 } });
    expect(resolved.spring).toEqual({ stiffness: 300, damping: 30, mass: 1 });
  });

  it("applies a numeric resistance to both input classes", () => {
    expect(resolveOptions({ resistance: 4 }).resistance).toEqual({ wheel: 4, touch: 4 });
  });

  it("keeps the other default when the resistance object is partial", () => {
    expect(resolveOptions({ resistance: { touch: 4 } }).resistance).toEqual({
      wheel: DEFAULT_RESISTANCE_WHEEL,
      touch: 4,
    });
  });

  it("does not let an explicit zero fall back to the default", () => {
    const resolved = resolveOptions({
      resistance: 0,
      lagFactor: 0,
      releaseDelay: 0,
      max: { px: 0, ratio: 0 },
    });
    expect(resolved.resistance).toEqual({ wheel: 0, touch: 0 });
    expect(resolved.lagFactor).toBe(0);
    expect(resolved.releaseDelay).toBe(0);
    expect(resolved.max).toEqual({ px: 0, ratio: 0 });
  });

  it("keeps a provided ignore function", () => {
    const ignore = () => true;
    expect(resolveOptions({ ignore }).ignore).toBe(ignore);
  });
});