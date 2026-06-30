# wago.sh

The landing page for [**wago**](https://github.com/wago-org/wago) - a pure-Go
WebAssembly engine. Served at <https://wago.sh>.

A small static site: plain HTML + CSS, with the interactive bits written in
**TypeScript** and compiled to ES modules by `tsc` (no bundler, no framework).
The numbers and feature statuses on the page are **synced from wago's own
status files** so the site never drifts from what the engine actually does.

## Layout

```
index.html              # the page, structured by section (nav → hero → … → footer)
data/
  stats.json            # site numbers + conformance statuses (generated; committed)
scripts/
  sync-stats.mjs        # regenerates data/stats.json from wago's status files
src/                    # TypeScript source
  main.ts               #   entry point - wires everything up on load
  stats.ts              #   fetches data/stats.json and hydrates the page
  reveal.ts             #   scroll-triggered count-up numbers + progress bars
  copy.ts               #   copy-to-clipboard buttons
assets/
  wago-logo.png         # logo - favicon, apple-touch-icon, OG image
  css/
    tokens.css          # design tokens: the "sparkle" palette, type, keyframes
    components.css       # reusable pieces: nav, buttons, cards, pills, diagram
    sections.css         # page shell + per-section layout (hero, stats, …)
  js/                   # compiled output (git-ignored; emitted by `tsc`)
tsconfig.json
package.json
CNAME                    # custom domain for GitHub Pages
.github/workflows/
  deploy.yml            # build + deploy to GitHub Pages (reusable)
  sync.yml              # pull fresh stats from wago, commit, redeploy
```

`src/*.ts` compiles to `assets/js/*.js`, which `index.html` loads as
`<script type="module" src="/assets/js/main.js">`. Both `assets/js/` and `dist/`
are build output and are git-ignored. `data/` is copied into `dist/` at build.

## Develop

```bash
npm install          # one-time: installs TypeScript
npm run dev          # tsc --watch, recompiles src/ → assets/js/ on save
npm run serve        # in another terminal: serves the root at :8000
```

Then visit <http://localhost:8000>. Serving (rather than opening the file
directly) is required so the ES-module imports and the `data/stats.json` fetch
resolve.

Other scripts:

- `npm run typecheck` - type-check without emitting.
- `npm run sync` - regenerate `data/stats.json` from wago (see below).
- `npm run build` - compile, then assemble a clean `dist/` (the exact tree that
  gets deployed).

## Stats sync (the single source of truth)

Every number and feature status on the page comes from
[`data/stats.json`](data/stats.json), which is **generated** by
`scripts/sync-stats.mjs` from wago's own published files:

- `SPECTEST.md` → MVP files passing, assertion counts, conformance %
- `FEATURES.md` → per-area `pass / partial / planned` statuses
- `coverage-report.md` → test-coverage %

```bash
npm run sync                       # auto-detect source, rewrite data/stats.json
WAGO_DIR=/path/to/wago npm run sync # read from a specific local checkout
npm run sync:check                  # exit 1 if stats.json is stale (no write)
```

The script reads from a local wago checkout when one is present (`$WAGO_DIR`,
then a sibling `../wago`). With no checkout it falls back to GitHub: the
authenticated contents API when `WAGO_TOKEN`/`GITHUB_TOKEN` is set, else the
public raw URLs. `wago-org/wago` is **private**, so the remote path needs a
token (`WAGO_REPO` / `WAGO_REF` override the target).

At runtime `src/stats.ts` fetches `data/stats.json` and refreshes the numbers
and the conformance table before `reveal.ts` animates them. The HTML ships with
matching static defaults, so the page is still correct with JavaScript disabled
or if the fetch fails.

### Keeping it in sync automatically

`.github/workflows/sync.yml` runs `sync-stats.mjs` on a daily schedule (and on
demand). It checks wago out read-only and regenerates `data/stats.json`; if it
changed, it commits the update and calls the deploy workflow, so a passing-test
or feature change in wago shows up on the site without anyone touching this
repo. wago's CI can also trigger it immediately by sending a
`repository_dispatch` event of type `wago-updated`.

**Required secret:** because wago is private, add a repository secret
`WAGO_RO_TOKEN` - a fine-grained PAT with read-only **Contents** access to
`wago-org/wago`; the workflow uses it to check wago out.

## Editing content

- **Colors / fonts** live as CSS custom properties in `assets/css/tokens.css`.
- **Numbers & conformance statuses** are *not* hand-edited - run `npm run sync`
  (or let CI do it). The values in `index.html` are static fallbacks.
- **Marketing copy** (hero, feature cards, architecture) is plain markup in
  `index.html`.

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`: it runs `npm ci`,
`npm run build`, and publishes `dist/` to GitHub Pages. The `CNAME` file points
the deployment at `wago.sh` - set the matching custom domain in the repository's
Pages settings and the DNS records at the registrar. The sync workflow reuses
this same deploy workflow after committing fresh stats.
