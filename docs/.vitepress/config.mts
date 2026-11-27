import { fileURLToPath } from "node:url";
import { defineConfig, type HeadConfig } from "vitepress";

/**
 * Production origin. Override with `DOCS_HOSTNAME` when the site moves to a
 * custom domain, so canonical URLs and the sitemap follow without a code edit.
 */
const hostname = process.env.DOCS_HOSTNAME ?? "https://elastixbend.vercel.app";
const repo = "https://github.com/rhazelina/elastixbend";

function pageUrl(relativePath: string): string {
  const path = relativePath
    .replace(/(^|\/)index\.md$/, "$1")
    .replace(/\.md$/, "")
    .replace(/\/$/, "");

  return path ? `${hostname}/${path}` : `${hostname}/`;
}

export default defineConfig({
  // The docs demonstrate the package from this repo. Alias the public entry to
  // source so a doc build never depends on a prior library build.
  vite: {
    resolve: {
      alias: {
        elastixbend: fileURLToPath(new URL("../../src/index.ts", import.meta.url)),
      },
    },
    server: { fs: { allow: [".."] } },
  },
  title: "elastixbend",
  titleTemplate: ":title · elastixbend",
  description:
    "Elastic scroll displacement that never touches scroll. A small spring-driven offset at document edges, behind scroll velocity, or under a pointer.",
  lang: "en",
  cleanUrls: true,
  lastUpdated: true,
  // Deployment notes live next to the site, not on it.
  srcExclude: ["README.md"],
  sitemap: { hostname },

  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    ["meta", { name: "theme-color", content: "#f4f1ea" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "elastixbend" }],
    ["meta", { name: "twitter:card", content: "summary" }],
  ],

  transformHead({ pageData }): HeadConfig[] {
    const url = pageUrl(pageData.relativePath);
    const title = pageData.frontmatter.title ?? pageData.title;

    const tags: HeadConfig[] = [
      ["link", { rel: "canonical", href: url }],
      ["meta", { property: "og:url", content: url }],
      ["meta", { property: "og:title", content: title }],
    ];

    if (pageData.description) {
      tags.push([
        "meta",
        { property: "og:description", content: pageData.description },
      ]);
    }

    return tags;
  },

  markdown: {
    lineNumbers: true,
    theme: { light: "github-light", dark: "github-dark" },
  },

  themeConfig: {
    logo: "/favicon.svg",
    siteTitle: "elastixbend",

    nav: [
      { text: "How-to", link: "/how-to/rubber-band-at-the-edge", activeMatch: "/how-to/" },
      { text: "Guide", link: "/guide/getting-started", activeMatch: "/guide/" },
      {
        text: "Reference",
        link: "/reference/options",
        activeMatch: "/reference/",
      },
      { text: "Changelog", link: `${repo}/blob/main/CHANGELOG.md` },
    ],

    sidebar: {
      "/how-to/": [
        {
          text: "How-to",
          items: [
            { text: "Rubber band at the page edges", link: "/how-to/rubber-band-at-the-edge" },
            { text: "Lean behind the scroll", link: "/how-to/lean-behind-scroll" },
            { text: "Make a card follow a pointer", link: "/how-to/draggable-card" },
            { text: "Use a horizontal axis", link: "/how-to/horizontal-scroll" },
            { text: "Tune the weight and curve", link: "/how-to/tune-the-feel" },
            { text: "Read the pull from React", link: "/how-to/react-without-re-renders" },
          ],
        },
      ],
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "Getting started", link: "/guide/getting-started" },
            { text: "How it works", link: "/guide/how-it-works" },
            { text: "Edge preset", link: "/guide/edge" },
            { text: "Surface preset", link: "/guide/surface" },
            { text: "Drag preset", link: "/guide/drag" },
            { text: "Tuning", link: "/guide/tuning" },
            { text: "React", link: "/guide/react" },
          ],
        },
      ],
      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "Options", link: "/reference/options" },
            { text: "Instance & state", link: "/reference/instance" },
            { text: "Renderers", link: "/reference/renderers" },
            { text: "Utilities", link: "/reference/utilities" },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: repo }],

    editLink: {
      pattern: `${repo}/edit/main/docs/:path`,
      text: "Edit this page on GitHub",
    },

    search: { provider: "local" },

    outline: { level: [2, 3], label: "On this page" },

    lastUpdated: {
      text: "Updated",
      formatOptions: { dateStyle: "medium", timeStyle: "short" },
    },

    docFooter: { prev: "Previous", next: "Next" },

    footer: {
      message: "Elastic scroll displacement that never touches scroll.",
      copyright: "BSD-3-Clause · © 2026 Rhazelina Putri",
    },
  },
});
