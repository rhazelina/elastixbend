<script setup lang="ts">
/**
 * A quiet caption under the wordmark. The animated proof lives in the wordmark
 * itself, so this strip only states the contract in plain text.
 */
const facts = [
  { label: "input", value: "passive listeners" },
  { label: "scroll", value: "never written" },
  { label: "gesture", value: "yours to give up" },
];
</script>

<template>
  <section class="contract-strip" aria-label="The scroll contract">
    <p class="contract-line">One gesture. One settled pull.</p>
    <dl class="contract-facts">
      <div v-for="fact in facts" :key="fact.label" class="contract-fact">
        <dt>{{ fact.label }}</dt>
        <dd>{{ fact.value }}</dd>
      </div>
    </dl>
  </section>
</template>
