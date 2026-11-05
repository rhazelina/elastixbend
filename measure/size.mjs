/**
 * Reports the two numbers that matter for the React entry point, because
 * `size-limit` can only measure `dist/react.js` with its shared chunk included.
 *
 *  1. the binding alone, with the core chunk and React marked external
 *  2. the binding plus the core chunk, with React external
 *
 * Run with `npm run size:react` after `npm run build`.
 */
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function esbuild(entry, outfile, external) {
  execFileSync(
    "npx",
    [
      "esbuild",
      entry,
      "--bundle",
      "--minify",
      "--format=esm",
      `--outfile=${outfile}`,
      ...external.flatMap((module) => [`--external:${module}`]),
      "--log-level=error",
    ],
    { stdio: "inherit" },
  );
  return readFileSync(outfile);
}

function report(label, buffer) {
  const gzip = gzipSync(buffer, { level: 9 }).length;
  console.log(
    `${label.padEnd(26)} raw ${String(buffer.length).padStart(6)} B   gzip ${String(gzip).padStart(5)} B`,
  );
  return gzip;
}

const chunk = readdirSync("dist").find((name) => name.startsWith("chunk-") && name.endsWith(".js"));
if (!chunk) throw new Error("dist has no shared chunk; run `npm run build` first");

const reactExternal = ["react", "react-dom", "react/jsx-runtime"];

report(
  "core",
  esbuild("dist/index.js", "/tmp/eb-core.min.js", []),
);
report(
  "react binding only",
  esbuild("dist/react.js", "/tmp/eb-react-only.min.js", [...reactExternal, `./${chunk}`]),
);
report(
  "react binding + core",
  esbuild("dist/react.js", "/tmp/eb-react-full.min.js", reactExternal),
);

// Guard against a stale build silently passing: the chunk must exist and be non-empty.
const chunkSize = statSync(join("dist", chunk)).size;
if (chunkSize === 0) throw new Error(`shared chunk ${chunk} is empty`);
