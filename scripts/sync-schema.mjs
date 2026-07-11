#!/usr/bin/env node
// Mirror schema.json from the wago Go module into the website root.
// The Go module remains the source of truth; wago.sh provides the stable HTTPS
// URL JSON-aware editors need for a manifest's "$schema" field.

import { access, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "schema.json");
const REPO = process.env.WAGO_REPO || "wago-org/wago";
const REF = process.env.WAGO_REF || "main";
const TOKEN = process.env.WAGO_TOKEN || process.env.GITHUB_TOKEN || "";
const CHECK = process.argv.includes("--check");

async function exists(path) {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function loadSchema() {
  const candidates = [];
  if (process.env.WAGO_DIR) candidates.push(join(process.env.WAGO_DIR, "schema.json"));
  candidates.push(resolve(ROOT, "..", "wago", "schema.json"));
  for (const path of candidates) {
    if (await exists(path)) return { text: await readFile(path, "utf8"), from: path };
  }

  if (TOKEN) {
    const url = `https://api.github.com/repos/${REPO}/contents/schema.json?ref=${encodeURIComponent(REF)}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github.raw",
        "User-Agent": "wago-website-schema-sync",
      },
    });
    if (!response.ok) throw new Error(`GitHub API ${url}: ${response.status}`);
    return { text: await response.text(), from: `api:${REPO}/schema.json@${REF}` };
  }

  const url = `https://raw.githubusercontent.com/${REPO}/${REF}/schema.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`fetch ${url}: ${response.status}; set WAGO_DIR or WAGO_TOKEN for a private repository`);
  return { text: await response.text(), from: url };
}

const { text, from } = await loadSchema();
JSON.parse(text);
const normalized = `${text.trimEnd()}\n`;
const current = (await exists(OUT)) ? await readFile(OUT, "utf8") : "";

if (current === normalized) {
  console.log(`schema.json is current (${from})`);
} else if (CHECK) {
  console.error(`schema.json is stale (source: ${from})`);
  process.exitCode = 1;
} else {
  await writeFile(OUT, normalized);
  console.log(`updated schema.json from ${from}`);
}
