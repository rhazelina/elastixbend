import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGeometry, edgeAt } from "../src/geometry";

function setScroll(total: number, viewport: number): void {
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    value: total,
  });
  Object.defineProperty(document.documentElement, "clientHeight", {
    configurable: true,
    value: viewport,
  });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: viewport });
}

beforeEach(() => setScroll(3000, 800));

describe("createGeometry", () => {
  it("measures the scroll limit from the document", () => {
    const geometry = createGeometry();
    expect(geometry.limit).toBe(2200);
    geometry.destroy();
  });

  it("re-measures when asked", () => {
    const geometry = createGeometry();
    setScroll(5000, 800);
    expect(geometry.limit).toBe(2200);
    geometry.refresh();
    expect(geometry.limit).toBe(4200);
    geometry.destroy();
  });

  it("never reports a negative limit on a short page", () => {
    setScroll(400, 800);
    const geometry = createGeometry();
    expect(geometry.limit).toBe(0);
    geometry.destroy();
  });

  it("notifies the watcher only when the limit actually changes", () => {
    const geometry = createGeometry();
    let calls = 0;
    const unwatch = geometry.watch(() => {
      calls += 1;
    });

    geometry.refresh();
    expect(calls).toBe(0);

    setScroll(5000, 800);
    geometry.refresh();
    expect(calls).toBe(1);

    geometry.refresh();
    expect(calls).toBe(1);

    unwatch();
    setScroll(6000, 800);
    geometry.refresh();
    expect(calls).toBe(1);
    geometry.destroy();
  });

  it("does not re-enter a watcher that calls refresh", () => {
    const geometry = createGeometry();
    let calls = 0;

    // The shape that used to recurse: a watcher that re-measures.
    geometry.watch(() => {
      calls += 1;
      geometry.refresh();
    });

    setScroll(5000, 800);
    geometry.refresh();
    expect(calls).toBe(1);
    geometry.destroy();
  });

  it("drops watchers on destroy", () => {
    const geometry = createGeometry();
    let calls = 0;
    geometry.watch(() => {
      calls += 1;
    });
    geometry.destroy();
    setScroll(5000, 800);
    geometry.refresh();
    expect(calls).toBe(0);
  });
});

describe("edgeAt", () => {
  it("reports the start and end edges", () => {
    expect(edgeAt(0, 1000)).toBe("start");
    expect(edgeAt(1000, 1000)).toBe("end");
    expect(edgeAt(500, 1000)).toBeNull();
  });

  it("tolerates sub-pixel offsets", () => {
    expect(edgeAt(0.4, 1000)).toBe("start");
    expect(edgeAt(999.6, 1000)).toBe("end");
  });
});

afterEach(() => {
  setScroll(3000, 800);
});
