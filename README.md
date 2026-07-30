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
  facts.json            # canonical product/support facts + evidence (generated)
  facts.schema.json     # JSON Schema for facts.json (generated)
  project.json          # complete project + benchmark data for machines (generated)
compatibility/          # exact suite/accounting scope (generated)
security/               # current controls and explicit assurance gaps (generated)
benchmarks/             # crawlable benchmark index and ARM64 protocol (generated)
compare/                # factual runtime comparison pages (generated)
guides/                 # operational evaluation guides (generated)
llms.txt                # concise crawler/LLM discovery document (generated)
llms-full.txt           # complete readable stats and comparison tables (generated)
facts.md, ...           # direct Markdown mirrors of canonical pages (generated)
schema.json             # hosted manifest schema, mirrored from wago Go module
scripts/
  sync-stats.mjs        # regenerates data/stats.json from wago's status files
  sync-facts.mjs        # verifies source evidence and generates canonical pages
  sync-schema.mjs       # mirrors schema.json from the wago Go module
  sync-ai-metadata.mjs  # derives JSON-LD, llms files, and project.json
src/                    # TypeScript source
  head.ts               #   parser-blocking phase gate + analytics bootstrap
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
- `npm run sync` - regenerate stats and mirror the manifest schema from wago.
- `npm run sync:ai` - regenerate the crawler/LLM metadata from the committed
  stats and static benchmark markup (normally included in `npm run sync`).
- `npm run sync:schema` - update only `schema.json`.
- `npm run sync:check` - fail when either generated file is stale.
- `npm run build` - compile, then assemble a clean `dist/` (the exact tree that
  gets deployed).

## Wago data sync (the single source of truth)

Every number and feature status on the page comes from
[`data/stats.json`](data/stats.json), which is **generated** by
`scripts/sync-stats.mjs` from wago's own published files:

- `SPECTEST.md` → MVP files passing, assertion counts, conformance %
- `FEATURES.md` → per-area `pass / partial / planned` statuses
- `coverage-report.md` → test-coverage %

The Wago Go module's `schema.json` is also canonical. The sync process
mirrors it to `schema.json`, deployed at <https://wago.sh/schema.json> for JSON
editors and project manifests.

```bash
npm run sync                       # rewrite stats.json and schema.json
WAGO_DIR=/path/to/wago npm run sync # read from a specific local checkout
npm run sync:check                  # exit 1 if either generated file is stale
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

### Machine-readable and LLM-readable data

The site publishes several no-JavaScript discovery surfaces for link readers,
crawlers, and answer engines:

- `/llms.txt` is the concise project brief and discovery index.
- `/data/facts.json` is the canonical machine-readable product/support
  contract, pinned to a Wago commit and indexed through `/llms.txt`.
- `/data/facts.schema.json` validates that contract, while `/facts.md` and the
  other top-level Markdown mirrors avoid HTML extraction entirely.
- `/compatibility/` defines exact suite provenance, accounting units, ports,
  exclusions, and unsupported claims.
- `/security/`, `/benchmarks/`, `/compare/*`, and `/guides/*` are static HTML,
  so direct-link readers do not depend on client-side rendering.
- `/llms-full.txt` contains all current startup and wago-vs-wazero comparison
  tables in compact Markdown.
- `/data/project.json` contains the same project facts and benchmark rows as
  structured JSON.
- the page `<head>` embeds generated Schema.org `SoftwareApplication` and
  `Dataset` JSON-LD.

`scripts/sync-facts.mjs` first validates expected evidence in the Wago checkout
and generates the canonical fact layer and documentation routes. It deliberately
fails when a source contract disappears instead of silently retaining stale
copy. `scripts/sync-ai-metadata.mjs` then derives its artifacts from
`data/facts.json`, `data/stats.json`,
and the static fallback benchmark markup in `index.html`. It also rewrites the
homepage's no-JavaScript headline stats and full conformance tracker. The
benchmark publishers in the sibling wago repository already run `npm run sync`
after rewriting that markup, so machine-readable comparisons update with the
visible ones. `npm run build` fails if these generated artifacts are stale.

### Keeping it in sync automatically

`.github/workflows/sync.yml` runs the sync scripts on a daily schedule (and on
demand). It checks wago out read-only and regenerates `data/stats.json` plus
`schema.json`; if either changed, it commits the update and calls the deploy
workflow. Wago's CI can also trigger it immediately by sending a
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
