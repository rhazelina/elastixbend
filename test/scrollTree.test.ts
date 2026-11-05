import { describe, expect, it } from "vitest";
import { hasScrollableAncestor } from "../src/scrollTree";

function scroller(style: Partial<CSSStyleDeclaration>, range: number): HTMLElement {
  const element = document.createElement("div");
  Object.assign(element.style, style);

  Object.defineProperty(element, "scrollHeight", { configurable: true, value: 1000 });
  Object.defineProperty(element, "clientHeight", { configurable: true, value: 1000 - range });
  Object.defineProperty(element, "scrollTop", { configurable: true, value: 0, writable: true });

  document.body.appendChild(element);
  return element;
}

describe("hasScrollableAncestor", () => {
  it("claims a gesture for a nested scroller that still has room", () => {
    const outer = scroller({ overflowY: "auto" }, 500);
    const inner = document.createElement("span");
    outer.appendChild(inner);

    expect(hasScrollableAncestor(inner, "y", 120)).toBe(true);
    expect(hasScrollableAncestor(inner, "y", -120)).toBe(false);
  });

  it("releases the gesture once the scroller is at its end", () => {
    const outer = scroller({ overflowY: "auto" }, 500);
    const inner = document.createElement("span");
    outer.appendChild(inner);
    Object.defineProperty(outer, "scrollTop", { configurable: true, value: 500, writable: true });

    expect(hasScrollableAncestor(inner, "y", 120)).toBe(false);
    expect(hasScrollableAncestor(inner, "y", -120)).toBe(true);
  });

  it("ignores a box that clips without scrolling", () => {
    const outer = scroller({ overflowY: "hidden" }, 500);
    const inner = document.createElement("span");
    outer.appendChild(inner);

    expect(hasScrollableAncestor(inner, "y", 120)).toBe(false);
  });

  it("ignores a scroller with no range", () => {
    const outer = scroller({ overflowY: "auto" }, 0);
    const inner = document.createElement("span");
    outer.appendChild(inner);

    expect(hasScrollableAncestor(inner, "y", 120)).toBe(false);
  });

  it("reads the size before the style, and still sees a later resize", () => {
    const outer = scroller({ overflowY: "auto" }, 500);
    const inner = document.createElement("span");
    outer.appendChild(inner);

    expect(hasScrollableAncestor(inner, "y", 120)).toBe(true);

    // Shrink the content to nothing: the cached style is fine, the live size
    // is what decides.
    Object.defineProperty(outer, "scrollHeight", { configurable: true, value: 500 });
    expect(hasScrollableAncestor(inner, "y", 120)).toBe(false);
  });

  it("returns false for a detached target", () => {
    expect(hasScrollableAncestor(null, "y", 120)).toBe(false);
  });
});
