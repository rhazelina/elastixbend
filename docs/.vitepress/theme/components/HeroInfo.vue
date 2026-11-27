<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";
import ElasticWordmark from "./ElasticWordmark.vue";

/**
 * Replaces VitePress' default `home-hero-info` block. The wordmark is the one
 * animated element on the page; the tagline stays ordinary text, and the action
 * buttons still come from frontmatter through VPHero.
 */
const { frontmatter } = useData();
const tagline = computed(() => frontmatter.value.hero?.tagline ?? "");
</script>

<template>
  <div class="hero-info">
    <ElasticWordmark text="elastixbend" />
    <p v-if="tagline" class="hero-tagline" v-html="tagline"></p>
  </div>
</template>
