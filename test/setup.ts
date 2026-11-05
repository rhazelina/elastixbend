import { afterEach, vi } from "vitest";

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

class MatchMediaStub {
  matches = false;
  media: string;
  constructor(query: string) {
    this.media = query;
  }
  addEventListener(): void {}
  removeEventListener(): void {}
  addListener(): void {}
  removeListener(): void {}
  onchange = null;
  dispatchEvent(): boolean {
    return false;
  }
}

if (!("ResizeObserver" in globalThis)) {
  Object.defineProperty(globalThis, "ResizeObserver", { value: ResizeObserverStub });
}

if (!("matchMedia" in window)) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => new MatchMediaStub(query),
  });
}

afterEach(() => {
  vi.useRealTimers();
});
