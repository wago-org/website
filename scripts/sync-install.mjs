#!/usr/bin/env node
// Mirror Wago's canonical installer to the website root, where GitHub Pages
// serves it as https://wago.sh/install.sh.

import { access, chmod, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const REPO = process.env.WAGO_REPO || "wago-org/wago";
const REF = process.env.WAGO_REF || "main";
const TOKEN = process.env.WAGO_TOKEN || process.env.GITHUB_TOKEN || "";
const OUTPUT = join(ROOT, "install.sh");

async function exists(path) {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function loadInstaller() {
  const candidates = [];
  if (process.env.WAGO_DIR) candidates.push(join(process.env.WAGO_DIR, "install.sh"));
  candidates.push(resolve(ROOT, "..", "wago", "install.sh"));

  for (const candidate of candidates) {
    if (await exists(candidate)) return readFile(candidate);
  }

  const path = "install.sh";
  if (TOKEN) {
    const url = `https://api.github.com/repos/${REPO}/contents/${path}?ref=${encodeURIComponent(REF)}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github.raw",
        "User-Agent": "wago-website-installer-sync",
      },
    });
    if (!response.ok) throw new Error(`GitHub API ${url}: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  const url = `https://raw.githubusercontent.com/${REPO}/${REF}/${path}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "wago-website-installer-sync" },
  });
  if (!response.ok) {
    throw new Error(
      `fetch ${url}: ${response.status}; set WAGO_DIR or WAGO_TOKEN for a private repository`,
    );
  }
  return Buffer.from(await response.arrayBuffer());
}

const canonical = await loadInstaller();
if (!canonical.subarray(0, 10).equals(Buffer.from("#!/bin/sh\n"))) {
  throw new Error("canonical install.sh does not start with #!/bin/sh");
}

const current = (await exists(OUTPUT)) ? await readFile(OUTPUT) : Buffer.alloc(0);
if (current.equals(canonical)) {
  console.log("install.sh is current");
  process.exit(0);
}

if (CHECK) {
  console.error("install.sh is stale; run npm run sync:install");
  process.exit(1);
}

await writeFile(OUTPUT, canonical);
await chmod(OUTPUT, 0o755);
console.log(`Mirrored install.sh from ${REPO}@${REF}`);
