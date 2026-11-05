import type { Axis } from "./types";

/**
 * True when an ancestor between the event target and the root can still scroll
 * in the gesture direction. Those gestures belong to that scroller, not to us.
 *
 * The size check runs first because `scrollHeight` is a layout read (already
 * clean inside a passive wheel handler), while `getComputedStyle` forces a style
 * recalculation. Most ancestors have no scroll range, so the common case never
 * pays for the recalculation.
 */
export function hasScrollableAncestor(
  origin: EventTarget | null,
  axis: Axis,
  delta: number,
): boolean {
  if (!(origin instanceof Element)) return false;

  const sizeKey = axis === "y" ? "scrollHeight" : "scrollWidth";
  const clientKey = axis === "y" ? "clientHeight" : "clientWidth";
  const posKey = axis === "y" ? "scrollTop" : "scrollLeft";

  let node: Element | null = origin;
  while (node && node !== document.body && node !== document.documentElement) {
    const max = node[sizeKey] - node[clientKey];

    if (max > 1) {
      const style = getComputedStyle(node);
      const value = axis === "y" ? style.overflowY : style.overflowX;

      if (value === "auto" || value === "scroll") {
        const scrollPos = node[posKey];
        if (delta > 0 && scrollPos < max - 1) return true;
        if (delta < 0 && scrollPos > 1) return true;
      }
    }
    node = node.parentElement;
  }
  return false;
}
