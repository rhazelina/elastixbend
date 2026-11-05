export interface Geometry {
  /** Document scroll offset. Reading it does not force layout. */
  readonly offset: number;
  /** Maximum scroll offset. Cached until something invalidates it. */
  readonly limit: number;
  /** Re-measure now, then notify watchers. */
  refresh(): void;
  /** Subscribe to limit changes. Returns an unsubscribe function. */
  watch(onChange: () => void): () => void;
  destroy(): void;
}

export type EdgeSide = "start" | "end";

/**
 * Which document edge the offset sits on, if any.
 *
 * The one-pixel tolerance absorbs the fractional scroll offsets produced by
 * display scaling and browser zoom.
 */
export function edgeAt(offset: number, limit: number, tolerance = 1): EdgeSide | null {
  if (offset <= tolerance) return "start";
  if (offset >= limit - tolerance) return "end";
  return null;
}

function scrollRoot(): Element {
  return document.scrollingElement ?? document.documentElement;
}

/**
 * Layout reads are expensive and must never happen inside a frame tick, so the
 * limit is measured once and invalidated by observers instead of polled.
 *
 * The observers belong to the geometry, not to whoever happens to be watching,
 * so a watcher that triggers a re-measure can never re-enter itself: `refresh`
 * only runs the subscriber list after the new limit is already stored.
 */
export function createGeometry(): Geometry {
  let limit = measureLimit();
  const watchers = new Set<() => void>();
  let observer: ResizeObserver | null = null;

  function measureLimit(): number {
    const root = scrollRoot();
    return Math.max(0, root.scrollHeight - root.clientHeight);
  }

  function refresh(): void {
    const next = measureLimit();
    if (next === limit) return;
    limit = next;
    for (const watcher of watchers) watcher();
  }

  const onViewport = (): void => refresh();
  window.addEventListener("resize", onViewport);
  window.visualViewport?.addEventListener("resize", onViewport);

  if (typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(() => refresh());
    observer.observe(scrollRoot());
  }

  return {
    get offset() {
      return window.scrollY;
    },
    get limit() {
      return limit;
    },
    refresh,
    watch(onChange) {
      watchers.add(onChange);
      return () => {
        watchers.delete(onChange);
      };
    },
    destroy() {
      watchers.clear();
      observer?.disconnect();
      observer = null;
      window.removeEventListener("resize", onViewport);
      window.visualViewport?.removeEventListener("resize", onViewport);
    },
  };
}
