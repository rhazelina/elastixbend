import type { Axis } from "../types";

export interface Renderer {
  /** Displacement in CSS pixels on the configured axis. */
  write(pull: number, active: boolean): void;
  destroy(): void;
}

/**
 * Writes `translate3d` on the target itself.
 *
 * Two documented consequences: the target becomes a containing block, so a
 * `position: fixed` descendant moves with it, and whatever transform the target
 * already had is taken over. `debug` surfaces both at dev time in `core.ts`.
 */
export function createTransformRenderer(element: HTMLElement, axis: Axis): Renderer {
  const previousTransform = element.style.transform;
  const previousWillChange = element.style.willChange;
  let written = false;
  let active = false;

  return {
    write(pull, isActive) {
      if (pull === 0 && !isActive) {
        if (!written) return;
        element.style.transform = previousTransform;
        element.style.willChange = previousWillChange;
        written = false;
        active = false;
        return;
      }

      const distance = `${pull.toFixed(2)}px`;
      element.style.transform =
        axis === "y" ? `translate3d(0, ${distance}, 0)` : `translate3d(${distance}, 0, 0)`;
      written = true;

      if (isActive !== active) {
        element.style.willChange = isActive ? "transform" : "";
        active = isActive;
      }
    },
    destroy() {
      element.style.transform = previousTransform;
      element.style.willChange = previousWillChange;
    },
  };
}

/**
 * Writes `--bend-pull` so the effect composes with any transform the page
 * already applies. Costs the consumer one CSS line.
 */
export function createCssVarRenderer(element: HTMLElement): Renderer {
  const previous = element.style.getPropertyValue("--bend-pull");
  const previousPriority = element.style.getPropertyPriority("--bend-pull");
  let written = false;

  return {
    write(pull) {
      if (pull === 0) {
        if (!written) return;
        element.style.removeProperty("--bend-pull");
        written = false;
        return;
      }
      element.style.setProperty("--bend-pull", `${pull.toFixed(2)}px`);
      written = true;
    },
    destroy() {
      if (previous) {
        element.style.setProperty("--bend-pull", previous, previousPriority);
        return;
      }
      element.style.removeProperty("--bend-pull");
    },
  };
}
