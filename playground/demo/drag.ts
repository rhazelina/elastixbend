import { createBend } from "../../src/index";
import type { BendInstance } from "../../src/types";
import { mountControls, type ControlState } from "./controls";
import { bare, markReady } from "./harness";

const params = new URLSearchParams(location.search);
const off = params.has("off");
const axis = params.get("axis") === "x" ? "x" : "y";

const stage = document.querySelector<HTMLElement>("#stage");
const panel = document.querySelector<HTMLElement>("#controls");
const pullOut = document.querySelector<HTMLElement>("#pull");
const phaseOut = document.querySelector<HTMLElement>("#phase");

if (!stage) throw new Error("playground markup changed: #stage is missing");
const stageElement = stage;

function watch(instance: BendInstance): () => void {
  if (bare) return () => {};

  let pending = false;
  return instance.subscribe(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      if (pullOut) pullOut.textContent = instance.state.pull.toFixed(2);
      if (phaseOut) phaseOut.textContent = instance.state.phase;
    });
  });
}

function optionsFrom(raw: Record<string, number> = {}): Parameters<typeof createBend>[1] {
  return {
    preset: "drag",
    axis,
    debug: true,
    dragMaxRatio: raw.dragMaxRatio ?? 0.22,
    max: { px: raw.maxPx ?? 160, ratio: raw.maxRatio ?? 0.3 },
    spring: { stiffness: raw.stiffness ?? 240, damping: raw.damping ?? 26 },
  };
}

let bend: BendInstance | null = null;
let unsubscribe: () => void = () => {};

function mount(raw?: Record<string, number>): void {
  unsubscribe();
  bend?.destroy();
  bend = createBend(stageElement, optionsFrom(raw));
  unsubscribe = watch(bend);
}

if (!off) {
  mount();
  markReady();

  if (panel && !bare) {
    mountControls(
      panel,
      [
        { key: "dragMaxRatio", label: "drag max", min: 0.05, max: 0.6, step: 0.01, value: 0.22 },
        { key: "maxPx", label: "max px", min: 20, max: 400, step: 10, value: 160 },
        { key: "maxRatio", label: "max ratio", min: 0.05, max: 0.6, step: 0.01, value: 0.3 },
        { key: "stiffness", label: "stiffness", min: 60, max: 500, step: 10, value: 240 },
        { key: "damping", label: "damping", min: 8, max: 60, step: 1, value: 26 },
      ],
      (state: ControlState) => mount(state as Record<string, number>),
    );
  }
}

window.addEventListener("beforeunload", () => {
  unsubscribe();
  bend?.destroy();
});