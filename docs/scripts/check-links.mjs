import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

/**
 * Checks links between Markdown pages. It runs after `vitepress build`, but it
 * reads the source files because they are the thing authors edit. External URLs,
 * anchors, and asset paths are out of scope.
 */
const root = resolve(import.meta.dirname, "..");

function markdownFiles(directory) {
  const found = [];
  for (const entry of readdirSync(directory)) {
    if (entry === "node_modules" || entry === ".vitepress") continue;
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) found.push(...markdownFiles(path));
    else if (entry.endsWith(".md")) found.push(path);
  }
  return found;
}

function resolves(page, href) {
  const clean = href.split("#")[0].split("?")[0];
  if (!clean) return true;

  const target = clean.startsWith("/")
    ? join(root, clean.slice(1))
    : resolve(dirname(page), clean);

  const candidates = [target];
  if (!target.endsWith(".md")) {
    candidates.push(`${target}.md`);
    candidates.push(join(target, "index.md"));
  }
  return candidates.some((candidate) => existsSync(candidate));
}

const broken = [];
for (const page of markdownFiles(root)) {
  const text = readFileSync(page, "utf8");
  for (const [, href] of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    if (/^(https?:|mailto:|#|\/\/)/.test(href)) continue;
    if (!resolves(page, href)) {
      broken.push(`${relative(root, page)} -> ${href}`);
    }
  }
}

if (broken.length > 0) {
  console.error(`Broken internal links (${broken.length}):`);
  for (const item of broken) console.error(`  ${item}`);
  process.exit(1);
}

console.log("All internal Markdown links resolve.");
