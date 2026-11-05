let cached: boolean | null = null;
let observer: MutationObserver | null = null;

function readLocked(): boolean {
  const root = document.documentElement;
  const body = document.body;
  return getComputedStyle(body).overflow === "hidden" || getComputedStyle(root).overflow === "hidden";
}

/**
 * Scroll locks are set by toggling `overflow: hidden` on `html` or `body`,
 * usually through a class or an inline style. Reading that with
 * `getComputedStyle` on every wheel event costs a style recalc per gesture, so
 * the answer is cached and only invalidated when an attribute that can flip it
 * actually changes.
 */
export function isScrollLocked(): boolean {
  if (cached === null) {
    cached = readLocked();
    watch();
  }
  return cached;
}

function watch(): void {
  if (observer !== null || typeof MutationObserver === "undefined") return;

  const invalidate = (): void => {
    cached = null;
  };

  observer = new MutationObserver(invalidate);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style", "class"],
  });
  if (document.body) {
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
  }

  // A media query can flip `overflow` without touching an attribute.
  window.addEventListener("resize", invalidate, { passive: true });
}
