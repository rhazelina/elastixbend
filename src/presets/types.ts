import type { Geometry } from "../geometry";
import type { ResolvedOptions } from "../options";
import type { Axis } from "../types";

export type Edge = "top" | "bottom";

export interface PresetHost {
  readonly options: ResolvedOptions;
  readonly axis: Axis;
  readonly geometry: Geometry;
  readonly viewport: { width: number; height: number };
  /** Current displacement, read by the preset between frames. */
  readonly pull: number;

  /** Ceiling for the pull on the current viewport. */
  pullLimit(): number;
  /** Direction-aware clamp against `pullLimit()`. */
  clampPull(value: number, edge: Edge): number;
  /** Apply displacement for this frame. Moves the machine into `pulling`. */
  setPull(value: number): void;
  /** Spring back to zero, carrying the gesture velocity. */
  release(carried: number): void;
  /** Spring toward an arbitrary displacement, used by `surface`. */
  springTo(target: number): void;
  /** Cancel any motion and remove the transform immediately. */
  snapToRest(): void;
  requestFrame(): void;

  /** True when the gesture must be left alone: locked body, ignored origin. */
  isBlocked(origin: EventTarget | null): boolean;
  /** True when a nested scroller still has room in this direction. */
  isNested(origin: EventTarget | null, axis: Axis, delta: number): boolean;
}

export interface PresetModule {
  /** Advance one frame. Returns true while the preset is still driving. */
  frame(dt: number): boolean;
  /** True while a gesture is actively being pulled. */
  isEngaged(): boolean;
  destroy(): void;
}
