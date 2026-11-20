# elastixbend docs

VitePress site for the library. It is a separate package on purpose: the root
`package.json` is the published library manifest and does not carry docs
dependencies.

## Local

```bash
cd docs
npm install
npm run dev       # http://localhost:5173
npm run build     # static output in .vitepress/dist
npm run preview
```

From the repo root, the same commands are `npm run docs:dev`,
`npm run docs:build`, and `npm run docs:preview`.

## Vercel

| Setting | Value |
|---|---|
| Root Directory | `docs` |
| Framework Preset | VitePress |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `.vitepress/dist` |
| Node.js Version | `22.x` |

`docs/package-lock.json` must stay committed, otherwise `npm ci` fails and the
install becomes non-deterministic.

## Changing the domain

The production origin is defined once in `.vitepress/config.mts`:

```ts
const hostname = process.env.DOCS_HOSTNAME ?? "https://elastixbend.vercel.app";
```

Set `DOCS_HOSTNAME` in the Vercel project, or change the fallback. Also update
the `Sitemap:` line in `public/robots.txt` and the documentation link in the
root `README.md`.

## Content

- `index.md` — landing page.
- `guide/` — task-oriented pages.
- `reference/` — the API, derived from `../SPEC.md`.
- `../SPEC.md` remains the contract. If a page and the spec disagree, fix the
  page.
