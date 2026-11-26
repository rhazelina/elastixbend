<script setup lang="ts">
import { useData } from "vitepress";
import { computed } from "vue";

/**
 * Every guide and how-to ends with the same next step. The target changes with
 * the page, so readers do not have to guess which demo proves the point.
 */
const { page } = useData();

const demo = computed(() => {
  const path = page.value.relativePath;
  if (path.includes("draggable")) return { page: "drag.html", label: "the drag demo" };
  if (path.includes("horizontal")) return { page: "edge-x.html", label: "the horizontal demo" };
  if (path.includes("lean-behind")) return { page: "surface.html", label: "the surface demo" };
  if (path.includes("react-")) return { page: "index.html", label: "the playground" };
  return { page: "edge.html", label: "the edge demo" };
});

const url = "https://github.com/rhazelina/elastixbend#development";
</script>

<template>
  <aside class="playground-link" aria-label="Next step">
    <div>
      <p class="playground-kicker">Try it</p>
      <p class="playground-text">
        Run <code>npm run dev</code> to open {{ demo.label }} on your own machine.
      </p>
    </div>
    <a :href="url" class="playground-action">Setup instructions</a>
  </aside>
</template>
