import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  root: "playground",
  server: {
    port: 5173,
    fs: { allow: [".."] },
  },
  resolve: {
    alias: {
      elastixbend: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
    },
  },
  build: {
    outDir: "../playground-dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL("./playground/index.html", import.meta.url)),
        edge: fileURLToPath(new URL("./playground/edge.html", import.meta.url)),
        surface: fileURLToPath(new URL("./playground/surface.html", import.meta.url)),
      },
    },
  },
});
