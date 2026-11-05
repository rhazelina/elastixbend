import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBend } from "../src/core";
import { stopAllTasks } from "../src/scheduler";
import type { BendInstance } from "../src/types";

let scrollOffset = 0;

function setupScroll(offset: number, total = 3000, viewport = 800): void {
  scrollOffset = offset;
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    value: total,
  });
  Object.defineProperty(document.documentElement, "clientHeight", {
    configurable: true,
    value: viewport,
  });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: viewport });
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    get: () => scrollOffset,
  });
}

function scrollTo(offset: number): void {
  scrollOffset = offset;
  window.dispatchEvent(new Event("scroll"));
}

function wheel(deltaY: number): void {
  window.dispatchEvent(new WheelEvent("wheel", { deltaY, cancelable: true }));
}

function frames(count = 1): void {
  for (let index = 0; index < count; index += 1) vi.advanceTimersByTime(16);
}

let bend: BendInstance | null = null;

function mount(options: Parameters<typeof createBend>[1] = {}): {
  element: HTMLDivElement;
  bend: BendInstance;
} {
  const element = document.createElement("div");
  document.body.appendChild(element);
  bend = createBend(element, options);
  return { element, bend };
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance", "Date"],
  });
  setupScroll(0);
});

afterEach(() => {
  bend?.destroy();
  bend = null;
  stopAllTasks();
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("edge preset", () => {
  it("pulls the content down when the wheel pushes past the top", () => {
    const mounted = mount({ preset: "edge" });
    wheel(-240);
    frames(1);

    expect(mounted.bend.state.pull).toBeCloseTo(80, 1);
    expect(mounted.bend.state.phase).toBe("pulling");
    expect(mounted.element.style.transform).toContain("translate3d(0, 80");
  });

  it("ignores scrolling away from the top edge", () => {
    const mounted = mount({ preset: "edge" });
    wheel(240);
    frames(1);

    expect(mounted.bend.state.pull).toBe(0);
    expect(mounted.bend.state.phase).toBe("idle");
    expect(mounted.element.style.transform).toBe("");
  });

  it("pulls upward at the bottom edge", () => {
    setupScroll(2200);
    const mounted = mount({ preset: "edge" });
    wheel(240);
    frames(1);

    expect(mounted.bend.state.pull).toBeCloseTo(-80, 1);
    expect(mounted.element.style.transform).toContain("translate3d(0, -80");
  });

  it("caps the pull at the configured limit", () => {
    const mounted = mount({ preset: "edge", max: { px: 50, ratio: 1 } });
    for (let index = 0; index < 20; index += 1) {
      wheel(-240);
      frames(1);
    }
    expect(mounted.bend.state.pull).toBe(50);
  });

  it("springs back to rest after the release delay", () => {
    const mounted = mount({ preset: "edge", releaseDelay: 100 });
    wheel(-300);
    frames(1);
    expect(mounted.bend.state.pull).toBeGreaterThan(50);

    vi.advanceTimersByTime(120);
    expect(mounted.bend.state.phase).toBe("settling");

    frames(120);
    expect(mounted.bend.state.pull).toBe(0);
    expect(mounted.bend.state.phase).toBe("idle");
    expect(mounted.element.style.transform).toBe("");
  });

  it("respects the resistance option", () => {
    const mounted = mount({ preset: "edge", resistance: 1 });
    wheel(-90);
    frames(1);
    expect(mounted.bend.state.pull).toBeCloseTo(90, 1);
  });

  it("drops the pull when a click lands mid-band", () => {
    const mounted = mount({ preset: "edge" });
    wheel(-240);
    frames(1);
    expect(mounted.bend.state.pull).toBeGreaterThan(0);

    window.dispatchEvent(new Event("pointerdown"));
    expect(mounted.bend.state.pull).toBe(0);
    expect(mounted.element.style.transform).toBe("");
  });

  it("leaves ignored origins alone", () => {
    const blocker = document.createElement("div");
    blocker.className = "blocked";
    document.body.appendChild(blocker);

    const mounted = mount({
      preset: "edge",
      ignore: (element) => element.classList.contains("blocked"),
    });

    blocker.dispatchEvent(new WheelEvent("wheel", { deltaY: -240, bubbles: true, cancelable: true }));
    frames(1);
    expect(mounted.bend.state.pull).toBe(0);
  });

  it("releases when the page scrolls away from the edge", () => {
    const mounted = mount({ preset: "edge" });
    wheel(-240);
    frames(1);
    scrollTo(400);
    frames(1);
    expect(mounted.bend.state.phase).not.toBe("pulling");
  });
});

describe("instance lifecycle", () => {
  it("notifies subscribers with a stable snapshot object", () => {
    const { bend: instance } = mount({ preset: "edge" });
    const seen: number[] = [];
    const unsubscribe = instance.subscribe((state) => seen.push(state.pull));

    wheel(-240);
    frames(1);
    expect(seen.at(-1)).toBeCloseTo(80, 1);

    unsubscribe();
    wheel(-240);
    frames(2);
    expect(seen.at(-1)).toBeCloseTo(80, 1);
  });

  it("returns to rest on pause and stops responding", () => {
    const { bend: instance } = mount({ preset: "edge" });
    wheel(-240);
    frames(1);

    instance.pause();
    expect(instance.state.pull).toBe(0);

    wheel(-240);
    frames(2);
    expect(instance.state.pull).toBe(0);

    instance.resume();
    wheel(-240);
    frames(1);
    expect(instance.state.pull).toBeGreaterThan(0);
  });

  it("stops listening after destroy", () => {
    const { bend: instance } = mount({ preset: "edge" });
    wheel(-240);
    frames(1);
    instance.destroy();

    wheel(-240);
    frames(2);
    expect(instance.state.pull).toBe(0);
  });

  it("writes to the cssVar renderer when asked", () => {
    const mounted = mount({ preset: "edge", render: "cssVar" });
    wheel(-240);
    frames(1);
    expect(mounted.element.style.getPropertyValue("--bend-pull")).toBe("80.00px");
    expect(mounted.element.style.transform).toBe("");
  });
});

describe("surface preset", () => {
  it("leans against the scroll direction", () => {
    const mounted = mount({ preset: "surface" });

    for (let index = 1; index <= 6; index += 1) {
      scrollTo(index * 40);
      frames(1);
    }

    expect(mounted.bend.state.pull).not.toBe(0);
    expect(mounted.bend.state.pull).toBeLessThan(0);
  });

  it("does not strand a lean when a slow scroll ends", () => {
    const mounted = mount({ preset: "surface" });

    // A slow, steady scroll so the lean reaches a non-zero target and the
    // spring settles there. Before the fix the loop then slept with the content
    // still offset, because the decay only runs inside a frame.
    let offset = 0;
    for (let index = 0; index < 40; index += 1) {
      offset += 6;
      scrollTo(offset);
      frames(1);
    }
    expect(Math.abs(mounted.bend.state.pull)).toBeGreaterThan(1);

    frames(60);
    expect(Math.abs(mounted.bend.state.pull)).toBeLessThan(0.1);
    expect(mounted.bend.state.phase).toBe("idle");
    expect(mounted.element.style.transform).toBe("");
  });

  it("returns to rest once scrolling stops", () => {
    const mounted = mount({ preset: "surface" });
    for (let index = 1; index <= 10; index += 1) {
      scrollTo(index * 120);
      frames(1);
    }
    vi.advanceTimersByTime(400);
    frames(120);

    expect(mounted.bend.state.pull).toBe(0);
    expect(mounted.bend.state.phase).toBe("idle");
  });

  it("ignores anchor-sized jumps", () => {
    const mounted = mount({ preset: "surface" });
    scrollTo(0);
    frames(1);
    scrollTo(6000);
    frames(1);
    expect(Math.abs(mounted.bend.state.pull)).toBeLessThan(1);
  });
});
