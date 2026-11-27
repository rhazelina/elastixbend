import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import { h } from "vue";
import HeroInfo from "./components/HeroInfo.vue";
import HeroProof from "./components/HeroProof.vue";
import PlaygroundLink from "./components/PlaygroundLink.vue";
import PresetTabs from "./components/PresetTabs.vue";
import "./custom.css";

/**
 * Keep the familiar VitePress navigation and search. The only additions are a
 * proof strip after the hero and a contextual next step after each doc page.
 * Components are registered globally so authors can use `<PresetTabs />` in
 * Markdown without importing it.
 */
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("HeroInfo", HeroInfo);
    app.component("HeroProof", HeroProof);
    app.component("PlaygroundLink", PlaygroundLink);
    app.component("PresetTabs", PresetTabs);
  },
  Layout() {
    return h(DefaultTheme.Layout, null, {
      "home-hero-info": () => h(HeroInfo),
      "home-hero-after": () => [h(HeroProof), h(PresetTabs)],
      "doc-after": () => h(PlaygroundLink),
    });
  },
} satisfies Theme;
