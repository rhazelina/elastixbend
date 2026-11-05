import {
  DEFAULT_LAG_FACTOR,
  DEFAULT_MAX_PX,
  DEFAULT_MAX_RATIO,
  DEFAULT_RELEASE_DELAY,
  DEFAULT_RESISTANCE,
  DEFAULT_SPRING,
} from "./constants";
import type { BendOptions, Axis, MaxPull, PresetName, RenderKind, SpringConfig } from "./types";

export interface ResolvedOptions {
  preset: PresetName;
  axis: Axis;
  resistance: number;
  max: Required<MaxPull>;
  spring: Required<SpringConfig>;
  render: RenderKind;
  lagFactor: number;
  // `exactOptionalPropertyTypes` is off, so an explicit undefined here is fine.
  ignore: ((element: Element) => boolean) | undefined;
  releaseDelay: number;
  respectReducedMotion: boolean;
  debug: boolean;
}

export function resolveOptions(options: BendOptions = {}): ResolvedOptions {
  return {
    preset: options.preset ?? "edge",
    axis: options.axis ?? "y",
    resistance: options.resistance ?? DEFAULT_RESISTANCE,
    max: {
      px: options.max?.px ?? DEFAULT_MAX_PX,
      ratio: options.max?.ratio ?? DEFAULT_MAX_RATIO,
    },
    spring: {
      stiffness: options.spring?.stiffness ?? DEFAULT_SPRING.stiffness,
      damping: options.spring?.damping ?? DEFAULT_SPRING.damping,
      mass: options.spring?.mass ?? DEFAULT_SPRING.mass,
    },
    render: options.render ?? "transform",
    lagFactor: options.lagFactor ?? DEFAULT_LAG_FACTOR,
    ignore: options.ignore,
    releaseDelay: options.releaseDelay ?? DEFAULT_RELEASE_DELAY,
    respectReducedMotion: options.respectReducedMotion ?? true,
    debug: options.debug ?? false,
  };
}
