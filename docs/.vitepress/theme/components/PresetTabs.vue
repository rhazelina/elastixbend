<script setup lang="ts">
import { ref } from "vue";

/**
 * Lets a reader compare the three drivers without leaving the page. The tabs
 * follow the WAI-ARIA pattern: one selected tab, arrow keys move between them,
 * and the panel is labelled by the active tab.
 */
const presets = [
  {
    key: "edge",
    label: "edge",
    driver: "Wheel and touch at the document edge",
    code: `createBend(el, { preset: "edge" });`,
    note: "Needs no CSS. Keyboard and scrollbar release the band.",
  },
  {
    key: "surface",
    label: "surface",
    driver: "Scroll velocity, whatever produced it",
    code: `createBend(el, {
  preset: "surface",
  lagFactor: 0.04,
});`,
    note: "Works with keyboard, scrollbar, and programmatic scroll.",
  },
  {
    key: "drag",
    label: "drag",
    driver: "A pointer inside the target",
    code: `.card { touch-action: none; }

createBend(card, { preset: "drag" });`,
    note: "The stylesheet gives up one small area, not the whole page.",
  },
];

const active = ref(0);

function select(index: number): void {
  active.value = (index + presets.length) % presets.length;
}

function onKeydown(event: KeyboardEvent, index: number): void {
  const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
  if (step === 0) return;

  event.preventDefault();
  const next = (index + step + presets.length) % presets.length;
  select(next);

  const buttons = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>("button");
  buttons?.[next]?.focus();
}
</script>

<template>
  <div class="preset-tabs">
    <div
      class="preset-tablist"
      role="tablist"
      aria-label="Compare presets"
    >
      <button
        v-for="(preset, index) in presets"
        :key="preset.key"
        type="button"
        role="tab"
        :id="`preset-tab-${preset.key}`"
        :aria-selected="active === index"
        :aria-controls="`preset-panel-${preset.key}`"
        :tabindex="active === index ? 0 : -1"
        @click="select(index)"
        @keydown="onKeydown($event, index)"
      >
        {{ preset.label }}
      </button>
    </div>

    <div
      v-for="(preset, index) in presets"
      :key="preset.key"
      v-show="active === index"
      class="preset-panel"
      role="tabpanel"
      :id="`preset-panel-${preset.key}`"
      :aria-labelledby="`preset-tab-${preset.key}`"
    >
      <p class="preset-driver">{{ preset.driver }}</p>
      <pre><code>{{ preset.code }}</code></pre>
      <p class="preset-note">{{ preset.note }}</p>
    </div>
  </div>
</template>
