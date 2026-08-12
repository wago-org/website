#!/usr/bin/env node
// Mirror Wago's JSON Schemas byte-for-byte into the versioned website routes.
// The Go module remains the source of truth; wago.sh provides the stable HTTPS
// URLs JSON-aware tools use for manifest and provider-catalog "$schema" fields.

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMAS = ["schema.json", "providers.schema.json"];
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

async function loadSchema(name) {
  const candidates = [];
  if (process.env.WAGO_DIR) candidates.push(join(process.env.WAGO_DIR, name));
  candidates.push(resolve(ROOT, "..", "wago", name));
  for (const path of candidates) {
    if (await exists(path)) return { text: await readFile(path, "utf8"), from: path };
  }

  if (TOKEN) {
    const url = `https://api.github.com/repos/${REPO}/contents/${name}?ref=${encodeURIComponent(REF)}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github.raw",
        "User-Agent": "wago-website-schema-sync",
      },
    });
    if (!response.ok) throw new Error(`GitHub API ${url}: ${response.status}`);
    return { text: await response.text(), from: `api:${REPO}/${name}@${REF}` };
  }

  const url = `https://raw.githubusercontent.com/${REPO}/${REF}/${name}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`fetch ${url}: ${response.status}; set WAGO_DIR or WAGO_TOKEN for a private repository`);
  return { text: await response.text(), from: url };
}

for (const name of SCHEMAS) {
  const out = join(ROOT, "v1", name);
  const { text, from } = await loadSchema(name);
  JSON.parse(text);
  const current = (await exists(out)) ? await readFile(out, "utf8") : "";

  if (current === text) {
    console.log(`${name} is current (${from})`);
  } else if (CHECK) {
    console.error(`${name} is stale (source: ${from})`);
    process.exitCode = 1;
  } else {
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, text);
    console.log(`updated v1/${name} from ${from}`);
  }
}
