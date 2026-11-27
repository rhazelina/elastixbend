<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";

/**
 * The wordmark behaves like the library it names.
 *
 * The pointer only chooses a target pressure per letter. A spring with the
 * default kernel (200 / 25 / 1, fixed 1/240 s substep) chases that target, so
 * the visible motion comes from the integrator and not from event cadence.
 * Nothing runs while the page is idle or under reduced motion.
 */
const props = withDefaults(
  defineProps<{
    text?: string;
    radius?: number;
    ripple?: boolean;
  }>(),
  { text: "elastixbend", radius: 0.45, ripple: true },
);

const chars = Array.from(props.text);

interface Pressure {
  pull: number;
  velocity: number;
  target: number;
  center: { x: number; y: number };
}

const pressures: Pressure[] = chars.map(() => ({
  pull: 0,
  velocity: 0,
  target: 0,
  center: { x: 0, y: 0 },
}));

const SUBSTEP = 1 / 240;
const MAX_DT = 0.064;
const SETTLE = 0.004;
const RELEASE_DELAY = 1.3;
const MAX_RIPPLES = 6;

let container: HTMLElement | null = null;
const spanEls: HTMLElement[] = [];

let frameId = 0;
let last = 0;
let visible = true;
let attached = false;
let query: MediaQueryList | null = null;
let observer: ResizeObserver | null = null;
let intersection: IntersectionObserver | null = null;

let width = 0;
let pointer = { x: 0, y: 0, seen: false };
const ripples: Array<{ x: number; y: number; start: number }> = [];

function setSpan(el: unknown, index: number): void {
  if (el) spanEls[index] = el as HTMLElement;
}

function stepSpring(state: Pressure, dt: number): void {
  let remaining = Math.max(0, Math.min(dt, MAX_DT));
  while (remaining > 0) {
    const h = Math.min(SUBSTEP, remaining);
    const accel = -200 * (state.pull - state.target) - 25 * state.velocity;
    state.velocity += accel * h;
    state.pull += state.velocity * h;
    remaining -= h;
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function measure(): void {
  if (!container) return;
  const box = container.getBoundingClientRect();
  width = box.width;
  for (let index = 0; index < spanEls.length; index += 1) {
    const span = spanEls[index];
    if (!span) continue;
    const rect = span.getBoundingClientRect();
    pressures[index].center = {
      x: rect.left - box.left + rect.width / 2,
      y: rect.top - box.top + rect.height / 2,
    };
  }
}

function ripplePressure(point: { x: number; y: number }, now: number): number {
  if (ripples.length === 0) return 0;
  const band = Math.max(width * 0.12, 24);
  let total = 0;

  for (const ripple of ripples) {
    const age = (now - ripple.start) / 1000;
    if (age <= 0 || age >= RELEASE_DELAY) continue;

    const distance = Math.hypot(ripple.x - point.x, ripple.y - point.y);
    const offset = (distance - age * width * 1.25) / band;
    if (offset <= -1 || offset >= 1) continue;

    const fade = 1 - age / RELEASE_DELAY;
    const swell = (1 - offset * offset) ** 2 * fade * fade * Math.min(1, age / 0.06);
    total = 1 - (1 - total) * (1 - swell);
  }
  return total;
}

function write(state: Pressure, span: HTMLElement | undefined): void {
  if (!span) return;
  const pressure = clamp01(state.pull);
  const settings =
    `'wght' ${Math.round(600 + 300 * pressure)}, ` +
    `'wdth' ${(100 + 50 * pressure).toFixed(1)}, ` +
    `'ital' ${(pressure * 0.4).toFixed(3)}`;
  if (span.style.fontVariationSettings !== settings) {
    span.style.fontVariationSettings = settings;
  }
}

function frame(now: number): void {
  frameId = 0;
  if (!container || !visible || query?.matches) return;

  const dt = last ? Math.min(now - last, MAX_DT * 1000) / 1000 : 1 / 60;
  last = now;

  const box = container.getBoundingClientRect();
  const local = {
    x: pointer.seen ? pointer.x - box.left : Number.POSITIVE_INFINITY,
    y: pointer.seen ? pointer.y - box.top : Number.POSITIVE_INFINITY,
  };
  const reach = Math.max(box.width * props.radius, 1);

  let moving = false;
  let rippling = false;

  for (let index = 0; index < pressures.length; index += 1) {
    const state = pressures[index];
    const distance = Math.hypot(local.x - state.center.x, local.y - state.center.y);
    let target = clamp01(1 - distance / reach);

    if (ripples.length > 0) {
      const swell = ripplePressure(state.center, now);
      target = 1 - (1 - target) * (1 - swell);
    }

    state.target = target;
    stepSpring(state, dt);
    write(state, spanEls[index]);

    if (Math.abs(state.pull - state.target) > SETTLE || Math.abs(state.velocity) > SETTLE) {
      moving = true;
    }
  }

  while (ripples.length && now - ripples[0].start > RELEASE_DELAY * 1000) ripples.shift();
  rippling = ripples.length > 0;

  if (moving || rippling) {
    frameId = requestAnimationFrame(frame);
  } else {
    last = 0;
  }
}

function wake(): void {
  if (frameId === 0 && visible && !query?.matches) {
    frameId = requestAnimationFrame(frame);
  }
}

function track(x: number, y: number): void {
  pointer = { x, y, seen: true };
  wake();
}

function onMouseMove(event: MouseEvent): void {
  track(event.clientX, event.clientY);
}

function onTouch(event: TouchEvent): void {
  const touch = event.touches[0];
  if (touch) track(touch.clientX, touch.clientY);
}

function onLeave(): void {
  pointer.seen = false;
  wake();
}

function onPress(event: PointerEvent): void {
  if (!props.ripple || query?.matches || !container) return;
  const box = container.getBoundingClientRect();
  ripples.push({
    x: event.clientX - box.left,
    y: event.clientY - box.top,
    start: performance.now(),
  });
  if (ripples.length > MAX_RIPPLES) ripples.shift();
  wake();
}

function attach(): void {
  if (attached) return;
  attached = true;
  window.addEventListener("mousemove", onMouseMove, { passive: true });
  window.addEventListener("touchstart", onTouch, { passive: true });
  window.addEventListener("touchmove", onTouch, { passive: true });
  window.addEventListener("touchend", onLeave, { passive: true });
  window.addEventListener("touchcancel", onLeave, { passive: true });
  document.documentElement.addEventListener("mouseleave", onLeave);
  container?.addEventListener("pointerdown", onPress, { passive: true });
  wake();
}

function detach(): void {
  if (!attached) return;
  attached = false;
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("touchstart", onTouch);
  window.removeEventListener("touchmove", onTouch);
  window.removeEventListener("touchend", onLeave);
  window.removeEventListener("touchcancel", onLeave);
  document.documentElement.removeEventListener("mouseleave", onLeave);
  container?.removeEventListener("pointerdown", onPress);
  if (frameId) cancelAnimationFrame(frameId);
  frameId = 0;
  last = 0;
  pointer.seen = false;
  ripples.length = 0;

  for (let index = 0; index < pressures.length; index += 1) {
    pressures[index].pull = 0;
    pressures[index].velocity = 0;
    pressures[index].target = 0;
    write(pressures[index], spanEls[index]);
  }
}

function sync(): void {
  if (query?.matches) detach();
  else attach();
}

function onPreference(): void {
  sync();
}

onMounted(() => {
  container = document.querySelector<HTMLElement>(".elastic-wordmark");
  if (!container) return;

  measure();
  observer = new ResizeObserver(() => {
    measure();
    wake();
  });
  observer.observe(container);

  intersection = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    if (visible) wake();
  });
  intersection.observe(container);

  query = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
  query?.addEventListener?.("change", onPreference);
  document.fonts?.ready.then(() => {
    measure();
    wake();
  });

  sync();
});

onBeforeUnmount(() => {
  detach();
  observer?.disconnect();
  intersection?.disconnect();
  query?.removeEventListener?.("change", onPreference);
});
</script>

<template>
  <h1 class="elastic-wordmark" :aria-label="props.text">
    <span
      v-for="(char, index) in chars"
      :key="index"
      :ref="(el) => setSpan(el, index)"
      aria-hidden="true"
      >{{ char }}</span
    >
  </h1>
</template>
