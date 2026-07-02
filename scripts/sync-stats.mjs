#!/usr/bin/env node
// Regenerate data/stats.json from the wago repository's own status files.
//
// This is what the "sync" CI job runs: it pulls the live numbers and feature
// statuses out of wago's SPECTEST.md, FEATURES.md and coverage-report.md, so
// the site never drifts from what the engine actually does. The same files are
// the project's own source of truth, so the website inherits whatever wago
// publishes.
//
// Sources, in order of preference:
//   1. $WAGO_DIR/<file>            (explicit local checkout - the CI default,
//                                   which checks wago out into a sibling dir)
//   2. ../wago/<file>             (sibling checkout, the dev default)
//   3. GitHub contents API         (when $WAGO_TOKEN / $GITHUB_TOKEN is set;
//                                   required because wago-org/wago is private)
//   4. raw.githubusercontent.com  (only works if the repo is public)
//
// Env knobs: WAGO_DIR, WAGO_REPO (default wago-org/wago), WAGO_REF (default
// main), WAGO_TOKEN / GITHUB_TOKEN (read access for the private repo).
//
// Usage:
//   node scripts/sync-stats.mjs            # auto-detect source, write stats.json
//   WAGO_DIR=/path/to/wago node scripts/sync-stats.mjs
//   node scripts/sync-stats.mjs --check    # exit 1 if stats.json would change

import { readFile, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = join(ROOT, "data", "stats.json");
const REPO = process.env.WAGO_REPO || "wago-org/wago";
const REF = process.env.WAGO_REF || "main";
const TOKEN = process.env.WAGO_TOKEN || process.env.GITHUB_TOKEN || "";
const RAW = `https://raw.githubusercontent.com/${REPO}/${REF}`;
const API = `https://api.github.com/repos/${REPO}/contents`;

const FILES = ["SPECTEST.md", "FEATURES.md", "coverage-report.md"];

async function exists(p) {
  try {
    await access(p, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

// Resolve each status file from a local checkout if present, else fetch it.
async function load(name) {
  const candidates = [];
  if (process.env.WAGO_DIR) candidates.push(join(process.env.WAGO_DIR, name));
  candidates.push(resolve(ROOT, "..", "wago", name));
  for (const c of candidates) {
    if (await exists(c)) {
      return { text: await readFile(c, "utf8"), from: c };
    }
  }
  // Authenticated contents API (works for the private repo); else public raw.
  if (TOKEN) {
    const url = `${API}/${name}?ref=${encodeURIComponent(REF)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github.raw",
        "User-Agent": "wago-website-sync",
      },
    });
    if (!res.ok) throw new Error(`GitHub API ${url}: ${res.status}`);
    return { text: await res.text(), from: `api:${REPO}/${name}@${REF}` };
  }
  const url = `${RAW}/${name}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `fetch ${url}: ${res.status}` +
        (res.status === 404
          ? " (repo may be private - set WAGO_TOKEN, or check wago out and set WAGO_DIR)"
          : ""),
    );
  }
  return { text: await res.text(), from: url };
}

// "**MVP execution: 43/58 applicable files fully passing | assertions pass=15229 fail=460 skip=2244**"
function parseSpectest(text) {
  const m = text.match(
    /(\d+)\s*\/\s*(\d+)\s+applicable files fully passing[^|]*\|\s*assertions\s+pass=(\d+)\s+fail=(\d+)/i,
  );
  if (!m) throw new Error("SPECTEST.md: could not find the MVP execution summary line");
  const filesPass = +m[1];
  const filesTotal = +m[2];
  return {
    filesPass,
    filesTotal,
    percent: Math.round((filesPass / filesTotal) * 100),
    assertionsPass: +m[3],
    assertionsFail: +m[4],
  };
}

// "Coverage: 77.3%"
function parseCoverage(text) {
  const m = text.match(/Coverage:\s*([\d.]+)\s*%/i);
  return m ? Math.round(+m[1]) : null;
}

const STATUS_BY_EMOJI = [
  ["✅", "done"],
  ["🚧", "partial"],
  ["⬜", "planned"],
  ["❌", "none"],
];

// Pull `{ feature, status, mvp }` from every table row in FEATURES.md.
function parseFeatures(text) {
  const rows = [];
  let inMvp = false;
  for (const line of text.split("\n")) {
    const h = line.match(/^##\s+(.*)/);
    if (h) {
      inMvp = /\bMVP\b/i.test(h[1]);
      continue;
    }
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 3) continue;
    const feature = cells[0];
    if (!feature || /^-+$/.test(feature) || /^feature$/i.test(feature)) continue;
    const statusCell = cells[cells.length - 1];
    const hit = STATUS_BY_EMOJI.find(([e]) => statusCell.includes(e));
    if (!hit) continue;
    rows.push({ feature, status: hit[1], mvp: inMvp });
  }
  if (rows.length < 10) {
    throw new Error(`FEATURES.md: only parsed ${rows.length} feature rows - format changed?`);
  }
  return rows;
}

// FEATURES.md emoji status -> the site's status-pill vocabulary.
const STATUS_TAG = { done: "pass", partial: "partial", planned: "planned", none: "none" };

// Trim a verbose FEATURES cell to a compact tracker label: drop bold/backticks
// and the trailing parenthetical / em-dash gloss ("SIMD (`v128`)" -> "SIMD").
function shortLabel(feature) {
  return feature.replace(/\*\*/g, "").replace(/`/g, "").split(" (")[0].split(" — ")[0].trim();
}

// The tracker is a set of collapsible per-version dropdowns. "1.0" is built live
// from FEATURES.md's MVP rows (wago-authored, detailed). The remaining groups
// come from a catalog of the *entire* WebAssembly proposal landscape (finished
// phase-5 proposals + every in-progress phase 1-4 proposal, from
// github.com/WebAssembly/proposals) so the site tracks the full picture, not just
// what wago has started. Each catalog entry's status is resolved from FEATURES.md
// when a `match` keyword hits a row there (so what wago actually ships stays
// sourced from wago); otherwise it falls back to the entry's `status`
// ("planned" = a real future target, "none" = not applicable to a Go core engine,
// e.g. JS-API / text-format / embedding proposals).
const VERSION_META = {
  "1.0": { label: "WebAssembly 1.0", sub: "MVP core" },
  "2.0": { label: "WebAssembly 2.0", sub: "finished proposals" },
  next: { label: "WebAssembly 3.0+", sub: "3.0 & in-progress proposals" },
  engine: { label: "Engine & platform", sub: "host ABI · targets · WASI" },
};
const CATALOG_ORDER = ["2.0", "next", "engine"];

const CATALOG = {
  // WebAssembly 2.0 — the six finished proposals bundled into the 2.0 release.
  "2.0": [
    { label: "Sign-extension ops", match: ["sign-extension"] },
    { label: "Non-trapping float→int", match: ["non-trapping", "trunc_sat"] },
    { label: "Multi-value", match: ["multi-value"] },
    { label: "Reference types", match: ["reference types"] },
    { label: "Bulk memory", match: ["bulk memory"] },
    { label: "Fixed-width SIMD", match: ["simd"] },
  ],
  // WebAssembly 3.0 (finished) + every in-progress proposal, ordered by how close
  // it is to standard (3.0 first, then phase 4 -> 1).
  next: [
    // --- Finished, shipped in WebAssembly 3.0 ---
    { label: "Tail calls", match: ["tail call"], status: "planned" },
    { label: "Extended const expressions", status: "planned" },
    { label: "Typed function references", status: "planned" },
    { label: "Memory64", status: "planned" },
    { label: "Multiple memories", match: ["multi-memory"], status: "none" },
    { label: "Garbage collection", match: ["garbage collection", "wasm gc"], status: "none" },
    { label: "Exception handling", match: ["exception handling"], status: "none" },
    { label: "Relaxed SIMD", status: "planned" },
    { label: "Branch hinting", status: "planned" },
    { label: "Custom annotations (text)", status: "none" },
    { label: "JS string builtins", status: "none" },
    // --- Phase 4 ---
    { label: "Threads & atomics", match: ["threads", "atomics"], status: "planned" },
    { label: "JS Promise integration", status: "none" },
    { label: "Web Content Security Policy", status: "none" },
    // --- Phase 3 ---
    { label: "ESM integration", status: "none" },
    { label: "Wide arithmetic", status: "planned" },
    { label: "Stack switching", status: "planned" },
    { label: "Compact import section", status: "planned" },
    { label: "Custom page sizes", status: "planned" },
    { label: "Custom descriptors & JS interop", status: "none" },
    // --- Phase 2 ---
    { label: "Relaxed dead-code validation", status: "planned" },
    { label: "Numeric values in WAT data", status: "none" },
    { label: "Extended name section", status: "planned" },
    { label: "Rounding variants", status: "planned" },
    { label: "Compilation hints", status: "planned" },
    { label: "JS primitive builtins", status: "none" },
    { label: "Relaxed atomics", status: "planned" },
    // --- Phase 1 ---
    { label: "Type imports", status: "planned" },
    { label: "Component model", status: "none" },
    { label: "C / C++ embedding API", status: "none" },
    { label: "Flexible vectors", status: "planned" },
    { label: "Memory control", status: "planned" },
    { label: "Reference-typed strings", status: "planned" },
    { label: "Profiles", status: "planned" },
    { label: "Shared-everything threads", status: "planned" },
    { label: "Frozen values", status: "planned" },
    { label: "Half precision (FP16)", status: "planned" },
    { label: "More array constructors", status: "planned" },
    { label: "JIT interface", status: "none" },
    { label: "Multibyte array access", status: "planned" },
    { label: "Type reflection (JS API)", status: "none" },
    { label: "JS text-encoding builtins", status: "none" },
  ],
  // wago engine / platform capabilities that are not tied to a wasm version.
  engine: [
    { label: "Synchronous host-import results", match: ["synchronous host"] },
    { label: "WASI preview 1", match: ["wasi"] },
    { label: "Architectures beyond linux/amd64", match: ["architectures beyond", "beyond linux"] },
    { label: "Interpreter tier", match: ["interpreter tier"], status: "none" },
  ],
};

// pass < partial < planned - the weakest applicable member sets the group's
// status. "none" (not-applicable) features are excluded from the roll-up.
function aggregate(statuses) {
  if (statuses.length === 0) return "planned";
  if (statuses.every((s) => s === "pass")) return "pass";
  if (statuses.some((s) => s === "pass" || s === "partial")) return "partial";
  return "planned";
}

// Resolve a catalog entry's status: prefer a matching FEATURES.md row (so wago's
// real support wins), else the entry's declared fallback.
function resolveStatus(entry, featIndex) {
  if (entry.match) {
    for (const m of entry.match) {
      const row = featIndex.find((r) => r.lc.includes(m));
      if (row) return STATUS_TAG[row.status] || "planned";
    }
  }
  return entry.status || "planned";
}

function makeGroup(key, features) {
  const active = features.filter((f) => f.status !== "none");
  const pass = features.filter((f) => f.status === "pass").length;
  const partial = features.filter((f) => f.status === "partial").length;
  // Completion bar: a partial feature counts as half. "none" (n/a) features are
  // excluded from the denominator so they don't dilute the score.
  const pct = active.length ? Math.round(((pass + 0.5 * partial) / active.length) * 100) : 0;
  return {
    version: key,
    label: VERSION_META[key].label,
    sub: VERSION_META[key].sub,
    status: aggregate(active.map((f) => f.status)),
    done: pass,
    total: features.length,
    pct,
    features,
  };
}

function buildVersions(rows) {
  const featIndex = rows.map((r) => ({ status: r.status, lc: r.feature.toLowerCase() }));
  const out = [];
  // 1.0 straight from FEATURES.md's MVP section.
  const mvp = rows
    .filter((r) => r.mvp)
    .map((r) => ({ label: shortLabel(r.feature), status: STATUS_TAG[r.status] || "planned" }));
  out.push(makeGroup("1.0", mvp));
  // 2.0 / 3.0+ / engine from the full proposal catalog.
  for (const key of CATALOG_ORDER) {
    const features = CATALOG[key].map((e) => ({ label: e.label, status: resolveStatus(e, featIndex) }));
    out.push(makeGroup(key, features));
  }
  return out;
}

async function main() {
  const check = process.argv.includes("--check");
  const srcs = {};
  for (const f of FILES) {
    try {
      srcs[f] = await load(f);
    } catch (e) {
      if (f === "coverage-report.md") {
        srcs[f] = null; // coverage is optional
        console.warn(`! ${f}: ${e.message} (skipping coverage)`);
      } else {
        throw e;
      }
    }
  }

  const mvp = parseSpectest(srcs["SPECTEST.md"].text);
  const features = parseFeatures(srcs["FEATURES.md"].text);
  const coverage = srcs["coverage-report.md"]
    ? parseCoverage(srcs["coverage-report.md"].text)
    : null;

  const mvpRows = features.filter((r) => r.mvp);
  const featuresDone = mvpRows.filter((r) => r.status === "done").length;
  const versions = buildVersions(features);

  const stats = [
    { key: "files", value: mvp.filesPass, total: mvp.filesTotal, label: "MVP files pass" },
    { key: "assertions", value: mvp.assertionsPass, label: "assertions pass" },
    { key: "cgo", value: 0, label: "lines of cgo" },
  ];
  if (coverage != null) {
    stats.push({ key: "coverage", value: coverage, suffix: "%", label: "test coverage" });
  } else {
    stats.push({ key: "platforms", value: 1, label: "platform · linux/amd64" });
  }

  const data = {
    generated: new Date().toISOString().slice(0, 10),
    source: "wago-org/wago @ main",
    mvp,
    coverage,
    featuresDone,
    featuresTotal: mvpRows.length,
    cgoLines: 0,
    platforms: 1,
    stats,
    versions,
  };

  const json = JSON.stringify(data, null, 2) + "\n";
  const prev = (await exists(OUT)) ? await readFile(OUT, "utf8") : "";
  // Compare ignoring the `generated` date so a same-day no-op isn't a "change".
  const norm = (s) => s.replace(/"generated":\s*"[^"]*"/, '"generated":""');
  const changed = norm(prev) !== norm(json);

  if (check) {
    console.log(changed ? "stats.json is stale" : "stats.json is up to date");
    process.exit(changed ? 1 : 0);
  }

  await writeFile(OUT, json);
  console.log(
    `wrote data/stats.json from ${srcs["SPECTEST.md"].from}\n` +
      `  MVP ${mvp.filesPass}/${mvp.filesTotal} files (${mvp.percent}%) · ` +
      `${mvp.assertionsPass} assertions pass · coverage ${coverage ?? "n/a"}% · ` +
      `${featuresDone}/${mvpRows.length} MVP features done` +
      (changed ? "" : " (no change)"),
  );
}

main().catch((e) => {
  console.error("sync-stats failed:", e.message);
  process.exit(1);
});
