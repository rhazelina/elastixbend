import { describe, expect, it } from "vitest";
import { resolveOptions } from "../src/options";
import {
  DEFAULT_LAG_FACTOR,
  DEFAULT_MAX_PX,
  DEFAULT_MAX_RATIO,
  DEFAULT_RELEASE_DELAY,
  DEFAULT_RESISTANCE,
  DEFAULT_SPRING,
} from "../src/constants";

describe("resolveOptions", () => {
  it("returns the documented defaults for an empty object", () => {
    const resolved = resolveOptions();
    expect(resolved.preset).toBe("edge");
    expect(resolved.axis).toBe("y");
    expect(resolved.resistance).toBe(DEFAULT_RESISTANCE);
    expect(resolved.max).toEqual({ px: DEFAULT_MAX_PX, ratio: DEFAULT_MAX_RATIO });
    expect(resolved.spring).toEqual({
      stiffness: DEFAULT_SPRING.stiffness,
      damping: DEFAULT_SPRING.damping,
      mass: DEFAULT_SPRING.mass,
    });
    expect(resolved.render).toBe("transform");
    expect(resolved.lagFactor).toBe(DEFAULT_LAG_FACTOR);
    expect(resolved.releaseDelay).toBe(DEFAULT_RELEASE_DELAY);
    expect(resolved.respectReducedMotion).toBe(true);
    expect(resolved.ignore).toBeUndefined();
  });

  it("merges partial spring config instead of replacing it", () => {
    const resolved = resolveOptions({ spring: { stiffness: 300, damping: 30 } });
    expect(resolved.spring).toEqual({ stiffness: 300, damping: 30, mass: 1 });
  });

  it("does not let an explicit zero fall back to the default", () => {
    const resolved = resolveOptions({
      resistance: 0,
      lagFactor: 0,
      releaseDelay: 0,
      max: { px: 0, ratio: 0 },
    });
    expect(resolved.resistance).toBe(0);
    expect(resolved.lagFactor).toBe(0);
    expect(resolved.releaseDelay).toBe(0);
    expect(resolved.max).toEqual({ px: 0, ratio: 0 });
  });

  it("keeps a provided ignore function", () => {
    const ignore = () => true;
    expect(resolveOptions({ ignore }).ignore).toBe(ignore);
  });
});
