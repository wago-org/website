#!/usr/bin/env node
// Mirror Wago's canonical installer launchers to the website root, where
// GitHub Pages serves them as https://wago.sh/install.sh and /install.cmd.

import { access, chmod, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const REPO = process.env.WAGO_REPO || "wago-org/wago";
const REF = process.env.WAGO_REF || "main";
const TOKEN = process.env.WAGO_TOKEN || process.env.GITHUB_TOKEN || "";
const INSTALLERS = [
  { name: "install.sh", mode: 0o755, prefix: Buffer.from("#!/bin/sh\n") },
  { name: "install.cmd", mode: 0o644, prefix: Buffer.from("@echo off\n") },
];

async function exists(path) {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function loadInstaller(name) {
  const candidates = [];
  if (process.env.WAGO_DIR) candidates.push(join(process.env.WAGO_DIR, name));
  candidates.push(resolve(ROOT, "..", "wago", name));

  for (const candidate of candidates) {
    if (await exists(candidate)) return readFile(candidate);
  }

  if (TOKEN) {
    const url = `https://api.github.com/repos/${REPO}/contents/${name}?ref=${encodeURIComponent(REF)}`;
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

  const url = `https://raw.githubusercontent.com/${REPO}/${REF}/${name}`;
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

let stale = false;
for (const installer of INSTALLERS) {
  const canonical = await loadInstaller(installer.name);
  if (!canonical.subarray(0, installer.prefix.length).equals(installer.prefix)) {
    throw new Error(`canonical ${installer.name} has an unexpected header`);
  }

  const output = join(ROOT, installer.name);
  const current = (await exists(output)) ? await readFile(output) : Buffer.alloc(0);
  if (current.equals(canonical)) {
    console.log(`${installer.name} is current`);
    continue;
  }

  if (CHECK) {
    console.error(`${installer.name} is stale; run npm run sync:install`);
    stale = true;
    continue;
  }

  await writeFile(output, canonical);
  await chmod(output, installer.mode);
  console.log(`Mirrored ${installer.name} from ${REPO}@${REF}`);
}

if (stale) process.exitCode = 1;
