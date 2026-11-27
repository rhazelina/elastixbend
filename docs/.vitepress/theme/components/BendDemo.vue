<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { createBend, type BendInstance } from "elastixbend";

/**
 * A live copy of the drag recipe, mounted in the how-to page. It reads the
 * public entry, so the example cannot drift away from the shipped API.
 * The readout is written straight to the DOM instead of going through Vue state,
 * which keeps a frame-rate effect out of the component's render cycle.
 */
const card = ref<HTMLElement | null>(null);
const pullOut = ref<HTMLElement | null>(null);
const phaseOut = ref<HTMLElement | null>(null);

let bend: BendInstance | null = null;
let unsubscribe: (() => void) | null = null;
let pending = false;

onMounted(() => {
  if (!card.value) return;

  bend = createBend(card.value, {
    preset: "drag",
    dragMaxRatio: 0.35,
    max: { px: 120, ratio: 0.3 },
  });

  unsubscribe = bend.subscribe((state) => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      if (pullOut.value) pullOut.value.textContent = state.pull.toFixed(2);
      if (phaseOut.value) phaseOut.value.textContent = state.phase;
    });
  });
});

onBeforeUnmount(() => {
  unsubscribe?.();
  bend?.destroy();
  unsubscribe = null;
  bend = null;
});
</script>

<template>
  <section class="bend-demo" aria-label="Live drag demo">
    <dl class="bend-demo-readout">
      <div>
        <dt>pull</dt>
        <dd><span ref="pullOut">0.00</span> px</dd>
      </div>
      <div>
        <dt>phase</dt>
        <dd><span ref="phaseOut">idle</span></dd>
      </div>
    </dl>
    <p class="bend-demo-note">
      The card holds the pointer on this area. Scroll everywhere else as usual.
    </p>
    <div ref="card" class="bend-demo-card">
      <strong>Drag me</strong>
      <span>Then let go</span>
    </div>
  </section>
</template>
