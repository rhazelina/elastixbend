import { createBend } from "../../src/index";
import type { BendInstance } from "../../src/types";
import { mountControls, type ControlState } from "./controls";
import { bare } from "./harness";

const params = new URLSearchParams(location.search);
const off = params.has("off");

const stage = document.querySelector<HTMLElement>("#stage");
const panel = document.querySelector<HTMLElement>("#controls");
const pullOut = document.querySelector<HTMLElement>("#pull");
const phaseOut = document.querySelector<HTMLElement>("#phase");

if (!stage) throw new Error("playground markup changed: #stage is missing");
const stageElement = stage;

function watch(instance: BendInstance): () => void {
  // `bare` is the measurement mode: the library runs, the harness harness does not.
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
    preset: "surface",
    debug: true,
    lagFactor: raw.lagFactor ?? 0.035,
    max: { px: raw.maxPx ?? 96, ratio: raw.maxRatio ?? 0.12 },
    spring: { stiffness: raw.stiffness ?? 180, damping: raw.damping ?? 26 },
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

  if (panel && !bare) {
    mountControls(
      panel,
      [
        { key: "lagFactor", label: "lag factor", min: 0.005, max: 0.2, step: 0.005, value: 0.035 },
        { key: "maxPx", label: "max px", min: 10, max: 160, step: 5, value: 96 },
        { key: "maxRatio", label: "max ratio", min: 0.02, max: 0.3, step: 0.01, value: 0.12 },
        { key: "stiffness", label: "stiffness", min: 60, max: 500, step: 10, value: 180 },
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
