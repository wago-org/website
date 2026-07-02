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

// The tracker groups every FEATURES row under a major WebAssembly version (a
// collapsible dropdown on the site). MVP rows are 1.0; post-1.0 rows are placed
// by matching their text against a version's keywords (first match wins, so
// order matters). Anything host/target-specific with no wasm version lands in
// the "engine" bucket. Keep the keyword lists aligned with FEATURES.md wording.
const VERSION_MATCH = [
  { version: "2.0", match: ["sign-extension", "trunc_sat", "non-trapping", "multi-value", "reference types", "bulk memory", "simd"] },
  { version: "3.0", match: ["tail call", "threads", "atomics", "multi-memory", "exception handling", "garbage collection", "wasm gc"] },
  { version: "engine", match: ["synchronous host", "wasi", "architectures beyond", "beyond linux", "arm64", "interpreter tier"] },
];

const VERSION_META = {
  "1.0": { label: "WebAssembly 1.0", sub: "MVP core" },
  "2.0": { label: "WebAssembly 2.0", sub: "finished proposals" },
  "3.0": { label: "WebAssembly 3.0", sub: "latest proposals" },
  engine: { label: "Engine & platform", sub: "host ABI · targets · WASI" },
};
const VERSION_ORDER = ["1.0", "2.0", "3.0", "engine"];

// FEATURES.md emoji status -> the site's status-pill vocabulary.
const STATUS_TAG = { done: "pass", partial: "partial", planned: "planned", none: "none" };

// Trim a verbose FEATURES cell to a compact tracker label: drop bold/backticks
// and the trailing parenthetical / em-dash gloss ("SIMD (`v128`)" -> "SIMD").
function shortLabel(feature) {
  return feature.replace(/\*\*/g, "").replace(/`/g, "").split(" (")[0].split(" — ")[0].trim();
}

function classifyVersion(row) {
  if (row.mvp) return "1.0";
  const lc = row.feature.toLowerCase();
  for (const b of VERSION_MATCH) {
    if (b.match.some((m) => lc.includes(m))) return b.version;
  }
  return "engine";
}

// pass < partial < planned - the weakest applicable member sets the group's
// status. "none" (not-planned) features are excluded from the roll-up.
function aggregate(statuses) {
  if (statuses.length === 0) return "planned";
  if (statuses.every((s) => s === "pass")) return "pass";
  if (statuses.some((s) => s === "pass" || s === "partial")) return "partial";
  return "planned";
}

function buildVersions(rows) {
  const byVer = {};
  for (const r of rows) {
    const v = classifyVersion(r);
    (byVer[v] ??= []).push({ label: shortLabel(r.feature), status: STATUS_TAG[r.status] || "planned" });
  }
  const out = [];
  for (const v of VERSION_ORDER) {
    const features = byVer[v];
    if (!features || features.length === 0) continue;
    const active = features.filter((f) => f.status !== "none");
    out.push({
      version: v,
      label: VERSION_META[v].label,
      sub: VERSION_META[v].sub,
      status: aggregate(active.map((f) => f.status)),
      done: features.filter((f) => f.status === "pass").length,
      total: features.length,
      features,
    });
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
