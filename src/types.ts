export type Axis = "x" | "y";

export type Phase = "idle" | "pulling" | "settling";

export type PresetName = "edge" | "surface";

export type RenderKind = "transform" | "cssVar";

export interface SpringConfig {
  /** Restoring force, in s^-2. Higher is snappier. */
  stiffness: number;
  /** Energy loss, in s^-1. Critical damping is `2 * sqrt(stiffness * mass)`. */
  damping: number;
  /** Inertia. Defaults to 1. */
  mass?: number;
}

/**
 * Resistance as a plain number applies to every input class. The object form
 * lets wheel and touch differ, which they need to: a wheel notch and a finger
 * swipe cover very different distances per unit of effort.
 */
export interface ResistanceConfig {
  /** Wheel and trackpad. Defaults to `5`. */
  wheel?: number;
  /** Single-finger touch drags. Defaults to `3`. */
  touch?: number;
}

export type Resistance = number | ResistanceConfig;

/**
 * How a gesture distance becomes displacement.
 *
 * `linear` divides by resistance and stops there. `ease` divides, then
 * saturates toward the pull limit, so long gestures give diminishing returns
 * instead of pinning the band against the ceiling.
 */
export type Curve = "linear" | "ease";

export interface MaxPull {
  /** Absolute ceiling in CSS pixels. */
  px?: number;
  /** Ceiling as a fraction of the viewport, so phones do not get an oversized pull. */
  ratio?: number;
}

export interface BendOptions {
  /** `edge` pulls at document edges, `surface` leans the content behind scroll velocity. */
  preset?: PresetName;
  axis?: Axis;
  /**
   * The gesture is divided by this, so 3 means two thirds of the delta is
   * absorbed. A number applies to every input class; pass
   * `{ wheel, touch }` to tune them apart.
   */
  resistance?: Resistance;
  /** Shape applied after resistance. Defaults to `"linear"`. */
  curve?: Curve;
  max?: MaxPull;
  spring?: SpringConfig;
  render?: RenderKind;
  /** `surface` only, in seconds: pull = -velocity * lagFactor. */
  lagFactor?: number;
  /** Wheel and touch origins matching this are left alone. */
  ignore?: (element: Element) => boolean;
  /** `edge` only: how long after the last wheel event the pull is released, in ms. */
  releaseDelay?: number;
  /** When true (default) the effect is inert under `prefers-reduced-motion: reduce`. */
  respectReducedMotion?: boolean;
  /** Logs contract violations (existing transform, fixed descendants) once. */
  debug?: boolean;
}

export interface BendState {
  /** Current displacement in CSS pixels. Positive pulls down/right. */
  readonly pull: number;
  /** Pixels per second. */
  readonly velocity: number;
  readonly phase: Phase;
}

export interface BendInstance {
  /**
   * Live snapshot. The object is reused across frames, so read the fields
   * instead of holding the object itself.
   */
  readonly state: BendState;
  subscribe(listener: (state: BendState) => void): () => void;
  /** Release now, springing back with the current velocity. */
  settle(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
