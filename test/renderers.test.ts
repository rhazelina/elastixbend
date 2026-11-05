import { afterEach, describe, expect, it, vi } from "vitest";
import { createCssVarRenderer, createTransformRenderer } from "../src/renderers/index";

function mount(): HTMLElement {
  const element = document.createElement("div");
  document.body.appendChild(element);
  return element;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createTransformRenderer", () => {
  it("writes translate3d on the requested axis", () => {
    const element = mount();
    const renderer = createTransformRenderer(element, "y");
    renderer.write(42, true);
    expect(element.style.transform).toBe("translate3d(0, 42.00px, 0)");
  });

  it("writes x on the x axis", () => {
    const element = mount();
    const renderer = createTransformRenderer(element, "x");
    renderer.write(-12, true);
    expect(element.style.transform).toBe("translate3d(-12.00px, 0, 0)");
  });

  it("sets will-change only while active", () => {
    const element = mount();
    const renderer = createTransformRenderer(element, "y");
    renderer.write(10, true);
    expect(element.style.willChange).toBe("transform");
    renderer.write(0, false);
    expect(element.style.willChange).toBe("");
  });

  it("restores the properties it took over on destroy", () => {
    const element = mount();
    element.style.transform = "rotate(3deg)";
    element.style.willChange = "opacity";
    const renderer = createTransformRenderer(element, "y");
    renderer.write(30, true);
    renderer.destroy();
    expect(element.style.transform).toBe("rotate(3deg)");
    expect(element.style.willChange).toBe("opacity");
  });

  it("does not write anything once it is back at rest", () => {
    const element = mount();
    const renderer = createTransformRenderer(element, "y");
    renderer.write(5, true);
    renderer.write(0, false);
    expect(element.getAttribute("style")).toBe("");
  });
});

describe("createCssVarRenderer", () => {
  it("writes the pull as a custom property", () => {
    const element = mount();
    const renderer = createCssVarRenderer(element);
    renderer.write(18.5, true);
    expect(element.style.getPropertyValue("--bend-pull")).toBe("18.50px");
  });

  it("removes the property at rest", () => {
    const element = mount();
    const renderer = createCssVarRenderer(element);
    renderer.write(18, true);
    renderer.write(0, false);
    expect(element.style.getPropertyValue("--bend-pull")).toBe("");
  });

  it("preserves a value the consumer set themselves", () => {
    const element = mount();
    element.style.setProperty("--bend-pull", "3px");
    const renderer = createCssVarRenderer(element);
    renderer.write(40, true);
    renderer.destroy();
    expect(element.style.getPropertyValue("--bend-pull")).toBe("3px");
  });
});

describe("api surface", () => {
  it("keeps the pull at rest when reduced motion is on", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduced-motion"),
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent: () => false,
    }));

    const { createBend } = await import("../src/index");
    const element = mount();
    const bend = createBend(element, { preset: "edge" });

    window.dispatchEvent(new WheelEvent("wheel", { deltaY: -240, cancelable: true }));
    expect(bend.state.pull).toBe(0);
    expect(bend.state.phase).toBe("idle");
    bend.destroy();

    vi.unstubAllGlobals();
  });
});
