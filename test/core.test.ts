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

function setupScrollX(offset: number, total = 4000, viewport = 1200): void {
  scrollOffset = offset;
  Object.defineProperty(document.documentElement, "scrollWidth", {
    configurable: true,
    value: total,
  });
  Object.defineProperty(document.documentElement, "clientWidth", {
    configurable: true,
    value: viewport,
  });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: viewport });
  Object.defineProperty(window, "scrollX", {
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

/**
 * jsdom has no `TouchEvent`, and the preset only reads `clientY` and `length`,
 * so a plain event carrying those fields is enough.
 */
function touchEvent(type: string, clientY: number): Event {
  const event = new Event(type);
  Object.defineProperty(event, "touches", {
    value: type === "touchend" || type === "touchcancel" ? [] : [{ clientY }],
  });
  return event;
}

function wheelX(deltaX: number): void {
  window.dispatchEvent(new WheelEvent("wheel", { deltaX, cancelable: true }));
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
  // Most of these assert the settled target, so keep the release timer out of
  // the way. The spring needs ~0.4 s to arrive, and 16 ms frames have to tick.
  const settle = { preset: "edge" as const, releaseDelay: 10_000 };
  const ARRIVE = 40;

  it("pulls the content down when the wheel pushes past the top", () => {
    const mounted = mount({ ...settle });
    wheel(-240);
    frames(ARRIVE);

    // Default wheel resistance is 5, so 240 px of notch becomes 48 px of band.
    expect(mounted.bend.state.pull).toBeCloseTo(48, 1);
    expect(mounted.bend.state.phase).toBe("pulling");
    expect(mounted.element.style.transform).toContain("translate3d(0, 48");
  });

  it("arrives over frames instead of jumping to the target", () => {
    const mounted = mount({ ...settle });
    wheel(-240);
    frames(2);

    // The spring is the thing that moves the band, so one wheel tick cannot
    // teleport it. The first frame carries no dt at all.
    expect(mounted.bend.state.pull).toBeGreaterThan(0);
    expect(mounted.bend.state.pull).toBeLessThan(48);
  });

  it("reaches the same target however the gesture is split into events", () => {
    // This is the contract: the result belongs to the total gesture distance,
    // not to the browser's event cadence. One 240 px tick and twenty-four 10 px
    // moves must land in the same place.
    const once = mount({ ...settle });
    wheel(-240);
    frames(ARRIVE);
    const fromOneEvent = once.bend.state.pull;
    once.bend.destroy();

    const split = mount({ ...settle });
    for (let index = 0; index < 24; index += 1) {
      wheel(-10);
      frames(1);
    }
    frames(ARRIVE);

    expect(split.bend.state.pull).toBeCloseTo(fromOneEvent, 1);
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
    const mounted = mount({ ...settle });
    wheel(240);
    frames(ARRIVE);

    expect(mounted.bend.state.pull).toBeCloseTo(-48, 1);
    expect(mounted.element.style.transform).toContain("translate3d(0, -48");
  });

  it("caps the pull at the configured limit", () => {
    const mounted = mount({ ...settle, max: { px: 50, ratio: 1 } });
    for (let index = 0; index < 20; index += 1) {
      wheel(-240);
      frames(1);
    }
    frames(ARRIVE);
    expect(mounted.bend.state.pull).toBe(50);
  });

  it("springs back to rest after the release delay", () => {
    const mounted = mount({ preset: "edge", releaseDelay: 100 });
    wheel(-300);
    frames(5);
    expect(mounted.bend.state.pull).toBeGreaterThan(0);

    vi.advanceTimersByTime(120);
    expect(mounted.bend.state.phase).toBe("settling");

    frames(120);
    expect(mounted.bend.state.pull).toBe(0);
    expect(mounted.bend.state.phase).toBe("idle");
    expect(mounted.element.style.transform).toBe("");
  });

  it("respects the resistance option", () => {
    const mounted = mount({ ...settle, resistance: 1 });
    wheel(-90);
    frames(ARRIVE);
    expect(mounted.bend.state.pull).toBeCloseTo(90, 0);
  });

  it("applies the wheel resistance to a wheel gesture", () => {
    const mounted = mount({ ...settle, resistance: { wheel: 2 } });
    wheel(-240);
    frames(ARRIVE);
    // 240 / 2 = 120, but the viewport ratio caps the band at 144 px, so the
    // settled value is the target itself.
    expect(mounted.bend.state.pull).toBeCloseTo(120, 0);
  });

  it("applies the touch resistance to a touch gesture", () => {
    const mounted = mount({ ...settle, resistance: { wheel: 5, touch: 10 } });

    window.dispatchEvent(touchEvent("touchstart", 600));
    window.dispatchEvent(touchEvent("touchmove", 700));
    frames(ARRIVE);

    expect(mounted.bend.state.pull).toBeCloseTo(10, 1);
  });

  it("never crosses the limit under the ease curve", () => {
    const mounted = mount({ ...settle, curve: "ease", max: { px: 60, ratio: 1 } });
    for (let index = 0; index < 12; index += 1) {
      wheel(-240);
      frames(2);
    }
    frames(ARRIVE);

    expect(mounted.bend.state.pull).toBeLessThan(60);
    expect(mounted.bend.state.pull).toBeGreaterThan(40);
  });

  it("pulls along the x axis when axis is x", () => {
    setupScrollX(0);
    const mounted = mount({ ...settle, axis: "x" });
    wheelX(-240);
    frames(ARRIVE);

    expect(mounted.bend.state.pull).toBeCloseTo(48, 1);
    expect(mounted.element.style.transform).toContain("translate3d(48");
  });

  it("pulls back at the end of the x axis", () => {
    setupScrollX(2800);
    const mounted = mount({ ...settle, axis: "x" });
    wheelX(240);
    frames(ARRIVE);

    expect(mounted.bend.state.pull).toBeCloseTo(-48, 1);
    expect(mounted.element.style.transform).toContain("translate3d(-48");
  });

  it("ignores vertical input on the x axis", () => {
    setupScrollX(0);
    const mounted = mount({ ...settle, axis: "x" });
    wheel(-240);
    frames(ARRIVE);

    expect(mounted.bend.state.pull).toBe(0);
  });

  it("drops the pull when a click lands mid-band", () => {
    const mounted = mount({ ...settle });
    wheel(-240);
    frames(10);
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
    const mounted = mount({ ...settle });
    wheel(-240);
    frames(10);
    scrollTo(400);
    frames(1);
    expect(mounted.bend.state.phase).not.toBe("pulling");
  });
});

describe("instance lifecycle", () => {
  it("notifies subscribers with a stable snapshot object", () => {
    const { bend: instance } = mount({ preset: "edge", releaseDelay: 10_000 });
    const seen: number[] = [];
    const unsubscribe = instance.subscribe((state) => seen.push(state.pull));

    wheel(-240);
    frames(40);
    expect(seen.at(-1)).toBeCloseTo(48, 1);

    unsubscribe();
    wheel(-240);
    frames(2);
    expect(seen.at(-1)).toBeCloseTo(48, 1);
  });

  it("returns to rest on pause and stops responding", () => {
    const { bend: instance } = mount({ preset: "edge" });
    wheel(-240);
    frames(5);

    instance.pause();
    expect(instance.state.pull).toBe(0);

    wheel(-240);
    frames(2);
    expect(instance.state.pull).toBe(0);

    instance.resume();
    wheel(-240);
    frames(5);
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
    const mounted = mount({ preset: "edge", render: "cssVar", releaseDelay: 10_000 });
    wheel(-240);
    frames(40);
    expect(mounted.element.style.getPropertyValue("--bend-pull")).toBe("48.00px");
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
