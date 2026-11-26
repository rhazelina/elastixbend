<script setup lang="ts">
/**
 * The hero's one signature element: a trace of a single gesture settling.
 *
 * It illustrates the library's actual claim, so it earns its place. Motion runs
 * once, is short, and is disabled under reduced motion like the library itself.
 */
const facts = [
  { label: "Input", value: "Passive listeners only" },
  { label: "Scroll", value: "Native, never written" },
  { label: "Gesture", value: "Yours to give up" },
];
</script>

<template>
  <section class="hero-proof" aria-label="The scroll contract">
    <div class="proof-trace" aria-hidden="true">
      <span class="proof-track"></span>
      <span class="proof-dot"></span>
    </div>
    <p class="proof-line">One gesture. One settled pull.</p>
    <dl class="proof-facts">
      <div v-for="fact in facts" :key="fact.label" class="proof-fact">
        <dt>{{ fact.label }}</dt>
        <dd>{{ fact.value }}</dd>
      </div>
    </dl>
  </section>
</template>
