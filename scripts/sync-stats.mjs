#!/usr/bin/env node
// Regenerate data/stats.json from the wago repository's own status files.
//
// This is what the "sync" CI job runs: it pulls the live numbers and feature
// statuses out of wago's SPECTEST.md, FEATURES.md, and checked-in baselines.
// coverage-report.md, so the site never drifts from what the engine actually
// does. The same files are the project's own source of truth, so the website
// inherits whatever wago publishes.
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

import { parseFeatureRows, parsePlatformTargets, parseSIMDAssertions } from "./stats-parsers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = join(ROOT, "data", "stats.json");
const REPO = process.env.WAGO_REPO || "wago-org/wago";
const REF = process.env.WAGO_REF || "main";
const TOKEN = process.env.WAGO_TOKEN || process.env.GITHUB_TOKEN || "";
const RAW = `https://raw.githubusercontent.com/${REPO}/${REF}`;
const API = `https://api.github.com/repos/${REPO}/contents`;

const FILES = ["SPECTEST.md", "FEATURES.md", "coverage-report.md", "README.md", "tests/conformance/baselines/spec-v3-baseline.json"];

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
    /(\d+)\s*\/\s*(\d+)\s+applicable files fully passing[^|]*\|\s*assertions\s+pass=(\d+)\s+fail=(\d+)\s+skip=(\d+)/i,
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
    assertionsSkip: +m[5],
  };
}

// "Coverage: 77.3%"
function parseCoverage(text) {
  const m = text.match(/Coverage:\s*([\d.]+)\s*%/i);
  return m ? +m[1] : null;
}

// "**Verification: checks pass=96972 fail=0 skip=22**"
function parseVerification(text) {
  const m = text.match(/Verification:\s*checks\s+pass=(\d+)\s+fail=(\d+)\s+skip=(\d+)/i);
  if (!m) throw new Error("verification summary: could not find the verification summary line");
  const coverage = parseCoverage(text);
  return { checksPass: +m[1], checksFail: +m[2], checksSkip: +m[3], coverage };
}

// The Core 3 suite is recorded as a checked-in zero-gap baseline rather than

// Preserve the distinctions in Wago's feature legend in the site pills.
const STATUS_TAG = { done: "pass", partial: "partial", planned: "planned", unsupported: "unsupported", none: "none", flag: "flag", plugin: "plugin", unknown: "unknown" };

// Trim a verbose FEATURES cell to a compact tracker label: drop bold/backticks
// and the trailing parenthetical / em-dash gloss ("SIMD (`v128`)" -> "SIMD").
function shortLabel(feature) {
  return feature.replace(/\*\*/g, "").replace(/`/g, "").split(" (")[0].split(" — ")[0].trim();
}

// The tracker is a set of collapsible per-version dropdowns. "1.0" is built live
// from FEATURES.md's MVP rows (wago-authored, detailed). The remaining groups
// come from the released and active WebAssembly proposal catalogs in
// github.com/WebAssembly/proposals, ordered by release or current phase.
// JavaScript BigInt-to-i64 integration (2.0), JS String Builtins (3.0), and
// Custom Annotation Syntax (3.0) are intentionally omitted because they do not
// apply to Wago's Go-native, binary-Wasm runtime.
// Each catalog entry's status is resolved from FEATURES.md
// when a `match` keyword hits a row there (so what wago actually ships stays
// sourced from wago); otherwise it falls back to the entry's `status`. Since
// every listed proposal has reached at least phase 1, none are marked `none`
// (n/a) — reserve that for pre-phase-1 proposals only. Unimplemented is `planned`.
const VERSION_META = {
  "1.0": { label: "WebAssembly 1.0", sub: "MVP core" },
  "2.0": { label: "WebAssembly 2.0", sub: "finished proposals" },
  "3.0": { label: "WebAssembly 3.0", sub: "finished proposals" },
  future: { label: "Future features", sub: "active proposals" },
};
const CATALOG_ORDER = ["2.0", "3.0", "future"];

const CATALOG = {
  // WebAssembly 2.0 — the six proposals applicable to Wago's native runtime.
  // JavaScript BigInt-to-i64 integration is intentionally omitted (see above).
  "2.0": [
    { label: "Sign-extension ops", match: ["sign-extension"] },
    { label: "Non-trapping float→int", match: ["non-trapping", "trunc_sat"] },
    { label: "Multi-value", match: ["multi-value"] },
    { label: "Reference types", match: ["reference types"] },
    { label: "Bulk memory", match: ["bulk memory"] },
    { label: "Fixed-width SIMD", match: ["fixed-width simd", "simd (`v128`)"] },
  ],
  // WebAssembly 3.0 proposals applicable to Wago's native binary-Wasm runtime.
  // JS String Builtins and WAT-only custom annotations are omitted (see above).
  "3.0": [
    // --- Finished, shipped in WebAssembly 3.0 ---
    { label: "Tail calls", match: ["tail call"], status: "planned" },
    { label: "Extended const expressions", match: ["extended constant"], status: "planned" },
    { label: "Typed function references", match: ["typed function references"], status: "planned" },
    { label: "Memory64", match: ["memory64"], status: "planned" },
    { label: "Multiple memories", match: ["multiple memories", "multi-memory"], status: "planned" },
    { label: "Garbage collection", match: ["garbage collection", "wasm gc"], status: "planned" },
    { label: "Exception handling", match: ["exception handling"], status: "planned" },
    { label: "Relaxed SIMD", match: ["relaxed simd"], status: "planned" },
    { label: "Branch hinting", match: ["branch hint"], status: "planned" },
  ],
  // Active proposals not yet merged into a released specification.
  future: [
    // --- Phase 5 ---
    { label: "JS Promise integration", status: "planned" },
    { label: "Web Content Security Policy", status: "planned" },
    // --- Phase 4 ---
    { label: "Threads & atomics", match: ["threads", "atomics"], status: "planned" },
    { label: "Compact import section", status: "planned" },
    { label: "Wide arithmetic", status: "planned" },
    // --- Phase 3 ---
    { label: "ESM integration", status: "planned" },
    { label: "Stack switching", status: "planned" },
    { label: "Custom page sizes", status: "planned" },
    { label: "Custom descriptors & JS interop", match: ["custom descriptors and js interop"], status: "planned" },
    // --- Phase 2 ---
    { label: "Relaxed dead-code validation", match: ["relaxed dead code validation"], status: "planned" },
    { label: "Numeric values in WAT data", status: "planned" },
    { label: "Extended name section", status: "planned" },
    { label: "Rounding variants", status: "planned" },
    { label: "Compilation hints", status: "planned" },
    { label: "JS primitive builtins", status: "planned" },
    { label: "Acquire-Release Atomics", status: "planned" },
    { label: "Multibyte array access", status: "planned" },
    { label: "Half precision (FP16)", match: ["half precision"], status: "planned" },
    // --- Phase 1 ---
    { label: "Type imports", status: "planned" },
    { label: "Component model", status: "planned" },
    { label: "C / C++ embedding API", match: ["webassembly c and c++ api"], status: "planned" },
    { label: "Flexible vectors", status: "planned" },
    { label: "Memory control", status: "planned" },
    { label: "Reference-typed strings", status: "planned" },
    { label: "Profiles", status: "planned" },
    { label: "Shared-everything threads", status: "planned" },
    { label: "Frozen values", status: "planned" },
    { label: "More array constructors", status: "planned" },
    { label: "JIT interface", status: "planned" },
    { label: "Type reflection (JS API)", match: ["type reflection for js api"], status: "planned" },
    { label: "JS text-encoding builtins", status: "planned" },
  ],
};

// pass < partial < planned - the weakest applicable member sets the group's
// status. "none" (not-applicable) features are excluded from the roll-up.
function aggregate(statuses) {
  if (statuses.length === 0) return "planned";
  if (statuses.every((s) => s === "pass")) return "pass";
  if (statuses.some((s) => ["pass", "partial", "flag", "plugin"].includes(s))) return "partial";
  return "planned";
}

// Resolve a catalog entry's status: prefer a matching FEATURES.md row (so wago's
// real support wins), else the entry's declared fallback.
function resolveStatus(entry, featIndex) {
  {
    for (const m of entry.match ?? [entry.label.toLowerCase()]) {
      const row = featIndex.find((r) => r.lc.includes(m));
      if (row) return STATUS_TAG[row.status] || "unknown";
    }
  }
  return "unknown";
}

function makeGroup(key, features) {
  const active = features.filter((f) => f.status !== "none");
  const pass = features.filter((f) => f.status === "pass").length;
  const partial = features.filter((f) => ["partial", "flag", "plugin"].includes(f.status)).length;
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

function buildVersions(rows, legacyMVP) {
  const featIndex = rows.map((r) => ({ status: r.status, lc: r.feature.toLowerCase() }));
  const out = [];
  // 1.0 straight from FEATURES.md's MVP section.
  const mvp = rows
    .filter((r) => r.mvp)
    .map((r) => ({ label: shortLabel(r.feature), status: STATUS_TAG[r.status] || "planned" }));
  const group = makeGroup("1.0", mvp.length ? mvp : legacyMVP.features);
  if (!mvp.length) {
    group.sub = `MVP feature details · historical (${legacyMVP.sourceCommit.slice(0, 7)})`;
    group.historicalSourceCommit = legacyMVP.sourceCommit;
  }
  out.push(group);
  // 2.0 / 3.0 / future proposals from the full proposal catalog.
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
  const features = parseFeatureRows(srcs["FEATURES.md"].text);
  const legacyMVP = JSON.parse(await readFile(join(ROOT, "data", "legacy-mvp.json"), "utf8"));
  if (!/^[0-9a-f]{40}$/.test(legacyMVP.sourceCommit) || !legacyMVP.features?.length) throw new Error("invalid historical MVP matrix");
  const core3 = JSON.parse(srcs["tests/conformance/baselines/spec-v3-baseline.json"].text);
  const core3Assertions = core3.totals_excluding_parser_failures?.assertions;
  if (core3.result !== "pass" || !Number.isInteger(core3Assertions?.passed) || !Number.isInteger(core3Assertions.failed) || !Number.isInteger(core3Assertions.skipped)) throw new Error("invalid Core 3 baseline");
  const verification = {
    checksPass: mvp.assertionsPass, checksFail: mvp.assertionsFail, checksSkip: mvp.assertionsSkip,
    coverage: null, accountingNote: "Historical MVP execution assertions; Core 3 is reported separately.",
  };
  const coverage = srcs["coverage-report.md"]
    ? parseCoverage(srcs["coverage-report.md"].text)
    : verification.coverage;

  const mvpRows = features.filter((r) => r.mvp);
  const versions = buildVersions(features, legacyMVP);
  const featuresDone = versions[0].done;

  const stats = [
    { key: "files", value: mvp.filesPass, total: mvp.filesTotal, label: "MVP files pass" },
    { key: "assertions", value: verification.checksPass, label: "MVP assertions passed" },
    { key: "cgo", value: 0, label: "lines of cgo" },
  ];
  if (coverage != null) {
    stats.push({ key: "coverage", value: coverage, suffix: "%", label: "test coverage" });
  } else {
    stats.push({ key: "platforms", value: parsePlatformTargets(srcs["README.md"].text).length, label: "native runtime targets" });
  }

  const data = {
    generated: new Date().toISOString().slice(0, 10),
    source: "wago-org/wago @ main",
    mvp,
    suiteAssertions: {
      mvp: mvp.assertionsPass, simd: null, total: mvp.assertionsPass,
      accountingNote: "Historical MVP execution assertions; no independent SIMD total is published here.",
    },
    core3: { assertions: core3Assertions, files: core3.suite.wast_files, commit: core3.suite.commit },
    verification,
    coverage,
    featuresDone,
    featuresTotal: versions[0].total,
    cgoLines: 0,
    platforms: parsePlatformTargets(srcs["README.md"].text).length,
    stats,
    versions,
  };

  const json = JSON.stringify(data, null, 2) + "\n";
  const prev = (await exists(OUT)) ? await readFile(OUT, "utf8") : "";
  // Ignore the clock when detecting source changes. A no-op keeps the prior
  // generated date and avoids cascading rewrites of every derived artifact.
  const norm = (s) => s.replace(/"generated":\s*"[^"]*"/, '"generated":""');
  const changed = norm(prev) !== norm(json);

  if (check) {
    console.log(changed ? "stats.json is stale" : "stats.json is up to date");
    process.exit(changed ? 1 : 0);
  }

  if (changed) await writeFile(OUT, json);
  console.log(
    `${changed ? "wrote" : "kept"} data/stats.json from ${srcs["SPECTEST.md"].from}\n` +
      `  MVP ${mvp.filesPass}/${mvp.filesTotal} files (${mvp.percent}%) · ` +
      `${verification.checksPass} checks passed · coverage ${coverage ?? "n/a"}% · ` +
      `${featuresDone}/${versions[0].total} MVP features documented${mvpRows.length ? "" : " (historical matrix)"}` +
      (changed ? "" : " (no change)"),
  );
}

main().catch((e) => {
  console.error("sync-stats failed:", e.message);
  process.exit(1);
});
