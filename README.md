# wago.sh

The landing page for [**wago**](https://github.com/wago-org/wago) - a pure-Go
WebAssembly Runtime. Served at <https://wago.sh>.

A small static site: plain HTML + CSS, with the interactive bits written in
**TypeScript** and compiled to ES modules by `tsc` (no bundler, no framework).

## Layout

```
index.html              # the page, structured by section (nav → hero → … → footer)
src/                    # TypeScript source
  main.ts               #   entry point - wires everything up on load
  terminal.ts           #   hero terminal typewriter
  reveal.ts             #   scroll-triggered count-up numbers + progress bars
  copy.ts               #   copy-to-clipboard buttons
assets/
  favicon.svg
  css/
    tokens.css          # design tokens: colors, type, resets, keyframes
    components.css       # reusable pieces: buttons, terminal, pills, feature rows
    sections.css         # page chrome + per-section layout (nav, hero, footer, …)
  js/                   # compiled output (git-ignored; emitted by `tsc`)
tsconfig.json
package.json
CNAME                    # custom domain for GitHub Pages
.github/workflows/       # build + deploy to GitHub Pages on push to main
```

`src/*.ts` compiles to `assets/js/*.js`, which `index.html` loads as
`<script type="module" src="/assets/js/main.js">`. Both `assets/js/` and `dist/`
are build output and are git-ignored.

## Develop

```bash
npm install          # one-time: installs TypeScript
npm run dev          # tsc --watch, recompiles src/ → assets/js/ on save
npm run serve        # in another terminal: serves the root at :8000
```

Then visit <http://localhost:8000>. Serving (rather than opening the file
directly) is required so the ES-module imports resolve.

Other scripts:

- `npm run typecheck` - type-check without emitting.
- `npm run build` - compile, then assemble a clean `dist/` (the exact tree that
  gets deployed).

## Theming

Light and dark themes are driven entirely by CSS custom properties in
`assets/css/tokens.css`: the dark palette is the `:root` default, and
`:root[data-theme="light"]` overrides it. An inline script in `index.html` sets
`data-theme` before first paint (from the saved choice in `localStorage`, else
the system `prefers-color-scheme`), so there's no flash. The nav toggle
(`src/theme.ts`) flips and persists the choice. To adjust a color, edit the
token in both palettes - nothing else hardcodes colors.

## Editing content

- **Colors / fonts** live as CSS custom properties in `assets/css/tokens.css`.
- **Feature-status rows** are plain markup in `index.html` under the `#features`
  section; each row pairs a name with a `pill--done / partial / planned / none`
  status. Keep these in sync with the project's `FEATURES.md`.
- **The conformance numbers** (`24/58`, `~7,450`) are `data-*` attributes on the
  elements inside `#conformance`; `reveal.ts` animates them.

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`: it runs `npm ci`,
`npm run build`, and publishes `dist/` to GitHub Pages. The `CNAME` file points
the deployment at `wago.sh` - set the matching custom domain in the repository's
Pages settings and the DNS records at the registrar.
