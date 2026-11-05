import { act, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Bend, useBend, useBendPhase, useBendRef } from "../src/react";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Bend", () => {
  it("exposes a stable instance to children", () => {
    const seen: unknown[] = [];

    function Child() {
      const bend = useBend();
      seen.push(bend);
      return createElement("span", null, bend ? "ready" : "empty");
    }

    const { rerender } = render(
      createElement(Bend, null, createElement(Child)),
    );

    expect(screen.getByText("ready")).toBeTruthy();
    rerender(createElement(Bend, null, createElement(Child)));

    // Same instance across renders, not a new one per render pass.
    const instances = seen.filter(Boolean);
    expect(new Set(instances).size).toBe(1);
  });

  it("starts in the idle phase", () => {
    function Child() {
      return createElement("span", null, useBendPhase());
    }

    render(createElement(Bend, null, createElement(Child)));
    expect(screen.getByText("idle")).toBeTruthy();
  });

  it("keeps the pull in a ref without re-rendering", () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"],
    });

    let renders = 0;
    let ref: { current: { pull: number } } | null = null;

    function Child() {
      renders += 1;
      ref = useBendRef() as unknown as { current: { pull: number } };
      return createElement("span", null, "child");
    }

    render(createElement(Bend, null, createElement(Child)));
    const baseline = renders;

    act(() => {
      window.dispatchEvent(new WheelEvent("wheel", { deltaY: -240, cancelable: true }));
      vi.advanceTimersByTime(32);
    });

    // The ref tracks the pull, and nothing re-rendered to make that happen.
    expect(ref).not.toBeNull();
    expect((ref as unknown as { current: { pull: number } }).current.pull).toBeGreaterThan(0);
    expect(renders).toBe(baseline);

    vi.useRealTimers();
  });

  it("unmounts cleanly", () => {
    function Child() {
      return createElement("span", null, useBendPhase());
    }

    const view = render(createElement(Bend, null, createElement(Child)));
    expect(() => view.unmount()).not.toThrow();
  });
});
