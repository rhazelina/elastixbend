export { createBend } from "./core";
export { resolveOptions } from "./options";
export { dampingRatio } from "./kernels/spring";
export { pullLimit, resist, resistEase, clampToEdge } from "./kernels/resistance";
export { normalizeWheel, createVelocityTracker } from "./input";
export { createGeometry, edgeAt } from "./geometry";
export {
  DEFAULT_LAG_FACTOR,
  DEFAULT_MAX_PX,
  DEFAULT_MAX_RATIO,
  DEFAULT_RELEASE_DELAY,
  DEFAULT_RESISTANCE_TOUCH,
  DEFAULT_RESISTANCE_WHEEL,
  DEFAULT_SPRING,
} from "./constants";
export type {
  Axis,
  BendInstance,
  BendOptions,
  BendState,
  Curve,
  MaxPull,
  Phase,
  PresetName,
  RenderKind,
  Resistance,
  ResistanceConfig,
  SpringConfig,
} from "./types";
