export { createBend } from "./core";
export { resolveOptions } from "./options";
export { dampingRatio } from "./kernels/spring";
export { pullLimit, resist, clampToEdge } from "./kernels/resistance";
export { normalizeWheel, createVelocityTracker } from "./input";
export { createGeometry, edgeAt } from "./geometry";
export {
  DEFAULT_LAG_FACTOR,
  DEFAULT_MAX_PX,
  DEFAULT_MAX_RATIO,
  DEFAULT_RELEASE_DELAY,
  DEFAULT_RESISTANCE,
  DEFAULT_SPRING,
} from "./constants";
export type {
  Axis,
  BendInstance,
  BendOptions,
  BendState,
  MaxPull,
  Phase,
  PresetName,
  RenderKind,
  SpringConfig,
} from "./types";
