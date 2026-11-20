import {
  DEFAULT_LAG_FACTOR,
  DEFAULT_MAX_PX,
  DEFAULT_MAX_RATIO,
  DEFAULT_RELEASE_DELAY,
  DEFAULT_RESISTANCE_TOUCH,
  DEFAULT_RESISTANCE_WHEEL,
  DEFAULT_SPRING,
} from "./constants";
import type {
  Axis,
  BendOptions,
  Curve,
  MaxPull,
  PresetName,
  RenderKind,
  Resistance,
  ResistanceConfig,
  SpringConfig,
} from "./types";

export interface ResolvedOptions {
  preset: PresetName;
  axis: Axis;
  resistance: Required<ResistanceConfig>;
  curve: Curve;
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

/**
 * A number applies to both input classes. An object only overrides what it
 * names, so `{ touch: 4 }` keeps the wheel default.
 */
function resolveResistance(value: Resistance | undefined): Required<ResistanceConfig> {
  if (typeof value === "number") return { wheel: value, touch: value };
  return {
    wheel: value?.wheel ?? DEFAULT_RESISTANCE_WHEEL,
    touch: value?.touch ?? DEFAULT_RESISTANCE_TOUCH,
  };
}

export function resolveOptions(options: BendOptions = {}): ResolvedOptions {
  return {
    preset: options.preset ?? "edge",
    axis: options.axis ?? "y",
    resistance: resolveResistance(options.resistance),
    curve: options.curve ?? "linear",
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
