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

function readPaint(): void {
  if (!bend) return;
  if (pullOut) pullOut.textContent = bend.state.pull.toFixed(2);
  if (phaseOut) phaseOut.textContent = bend.state.phase;
}

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
    preset: "edge",
    debug: true,
    resistance: raw.resistance ?? 3,
    max: { px: raw.maxPx ?? 120, ratio: raw.maxRatio ?? 0.18 },
    spring: { stiffness: raw.stiffness ?? 200, damping: raw.damping ?? 25 },
    releaseDelay: raw.releaseDelay ?? 140,
  };
}

let bend: BendInstance | null = null;
let unsubscribe: () => void = () => {};

function mount(raw?: Record<string, number>): void {
  unsubscribe();
  bend?.destroy();
  bend = createBend(stageElement, optionsFrom(raw));
  unsubscribe = watch(bend);
  readPaint();
}

// `?off=1` is the measurement baseline: same page, no library instance.
if (!off) {
  mount();

  if (panel && !bare) {
    mountControls(
      panel,
      [
        { key: "resistance", label: "resistance", min: 1, max: 8, step: 0.5, value: 3 },
        { key: "maxPx", label: "max px", min: 20, max: 300, step: 10, value: 120 },
        { key: "maxRatio", label: "max ratio", min: 0.05, max: 0.4, step: 0.01, value: 0.18 },
        { key: "stiffness", label: "stiffness", min: 60, max: 500, step: 10, value: 200 },
        { key: "damping", label: "damping", min: 8, max: 60, step: 1, value: 25 },
        { key: "releaseDelay", label: "release ms", min: 0, max: 400, step: 10, value: 140 },
      ],
      (state: ControlState) => mount(state as Record<string, number>),
    );
  }
}

window.addEventListener("beforeunload", () => {
  unsubscribe();
  bend?.destroy();
});
