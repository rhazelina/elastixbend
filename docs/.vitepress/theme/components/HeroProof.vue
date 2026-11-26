<script setup lang="ts">
/**
 * An illustration of the library's one job: a gesture produces a displacement,
 * the spring settles it, and the scroll position never moves.
 *
 * The readout is deliberately static and labelled as an illustration. It uses
 * the product's own vocabulary (px, phase, passive input) rather than a generic
 * hero motif. Motion runs once and stops under reduced motion.
 */
const facts = [
  { label: "input", value: "passive listeners" },
  { label: "scroll", value: "never written" },
  { label: "gesture", value: "yours to give up" },
];
</script>

<template>
  <section class="hero-proof" aria-label="Illustration of a pull settling">
    <div class="proof-instrument">
      <div class="proof-header">
        <span class="proof-name">displacement</span>
        <span class="proof-readout">+31 px <span class="proof-phase">settled</span></span>
      </div>

      <div class="proof-track" aria-hidden="true">
        <span class="proof-ticks"></span>
        <span class="proof-dot"></span>
      </div>

      <p class="proof-line">One gesture. One settled pull.</p>

      <dl class="proof-facts">
        <div v-for="fact in facts" :key="fact.label" class="proof-fact">
          <dt>{{ fact.label }}</dt>
          <dd>{{ fact.value }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>
