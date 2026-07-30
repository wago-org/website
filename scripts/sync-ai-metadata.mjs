#!/usr/bin/env node
// Generate the crawler/LLM-facing view of wago.sh from the same committed
// sources as the visual page. The benchmark publishers rewrite index.html and
// then run `npm run sync`, so these artifacts follow every benchmark refresh.

import { access, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = join(ROOT, "index.html");
const STATS = join(ROOT, "data", "stats.json");
const PROJECT = join(ROOT, "data", "project.json");
const LLMS = join(ROOT, "llms.txt");
const LLMS_FULL = join(ROOT, "llms-full.txt");
const SITEMAP = join(ROOT, "sitemap.xml");
const CHECK = process.argv.includes("--check");
const AI_START = "        <!-- AI-METADATA:START -->";
const AI_END = "        <!-- AI-METADATA:END -->";

function decodeHtml(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    micro: "µ",
    nbsp: " ",
    quot: '"',
  };
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}

function text(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function extractDivAt(html, start) {
  const tags = /<\/?div\b[^>]*>/g;
  tags.lastIndex = start;
  let depth = 0;
  for (let match; (match = tags.exec(html)); ) {
    depth += match[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(start, tags.lastIndex);
  }
  throw new Error(`unterminated div at byte ${start}`);
}

function extractDivById(html, id) {
  const idAt = html.indexOf(`id="${id}"`);
  if (idAt < 0) throw new Error(`index.html: missing #${id}`);
  const start = html.lastIndexOf("<div", idAt);
  if (start < 0) throw new Error(`index.html: #${id} is not a div`);
  return extractDivAt(html, start);
}

function extractBetween(html, startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) {
    throw new Error(`index.html: missing section markers ${startMarker} / ${endMarker}`);
  }
  return html.slice(start, end);
}

function capture(block, pattern, label) {
  const match = pattern.exec(block);
  if (!match) throw new Error(`index.html: could not parse ${label}`);
  return text(match[1]);
}

function parseStartup(index) {
  const section = extractBetween(index, "STARTUP LATENCY", "PERFORMANCE");
  const workloads = [];
  const tabs = [
    ...section.matchAll(
      /<button\b[^>]*id="su-tab-([^"]+)"[^>]*>([\s\S]*?)<\/button>/g,
    ),
  ];
  for (const [, id, labelHtml] of tabs) {
    const panel = extractDivById(section, `su-panel-${id}`);
    const rows = [];
    const rowStarts = [...panel.matchAll(/<div\b[^>]*class="[^"]*\brank__row\b[^"]*"[^>]*>/g)];
    for (const rowStart of rowStarts) {
      const row = extractDivAt(panel, rowStart.index);
      const nameBlock = capture(
        row,
        /<span\b[^>]*class="rank__name"[^>]*>([\s\S]*?)<\/span>/,
        `startup runtime for ${id}`,
      );
      const tierMatch = /<span\b[^>]*class="rank__tag"[^>]*>([\s\S]*?)<\/span>/.exec(row);
      const tier = tierMatch ? text(tierMatch[1]) : "";
      const runtime = tier && nameBlock.endsWith(tier) ? nameBlock.slice(0, -tier.length) : nameBlock;
      rows.push({
        runtime: runtime.trim(),
        ...(tier ? { executionMode: tier } : {}),
        value: capture(
          row,
          /<span\b[^>]*class="rank__val"[^>]*>([\s\S]*?)<\/span>/,
          `startup value for ${id}`,
        ),
      });
    }
    workloads.push({ id, label: text(labelHtml), unit: "wall-clock process latency", results: rows });
  }
  if (workloads.length === 0) throw new Error("index.html: no startup workloads found");
  return workloads;
}

function parseComparisonRows(panel) {
  const entries = [];
  const token = /<div\b[^>]*class="vs__(group|row)"[^>]*>/g;
  let group = "";
  for (let match; (match = token.exec(panel)); ) {
    if (match[1] === "group") {
      const end = panel.indexOf("</div>", token.lastIndex);
      group = text(panel.slice(token.lastIndex, end));
      token.lastIndex = end + 6;
      continue;
    }
    const row = extractDivAt(panel, match.index);
    const values = [
      ...row.matchAll(/<span\b[^>]*class="[^"]*\bvs__val\b[^"]*"[^>]*>([\s\S]*?)<\/span>/g),
    ].map((value) => text(value[1]));
    const deltaMatch =
      /<span\b[^>]*class="[^"]*\bvs__delta\b[^"]*"[^>]*>([\s\S]*?)<\/span>/.exec(row);
    const deltaClass = /\bvs__delta--(win|behind|tie)\b/.exec(row)?.[1] ?? "context";
    entries.push({
      ...(group ? { group } : {}),
      label: capture(
        row,
        /<span\b[^>]*class="vs__label"[^>]*>([\s\S]*?)<\/span>/,
        "performance label",
      ),
      workload: capture(
        row,
        /<span\b[^>]*class="vs__sub"[^>]*>([\s\S]*?)<\/span>/,
        "performance workload",
      ),
      wago: values[0],
      ...(values[1] ? { wazero: values[1] } : {}),
      comparison: deltaMatch ? text(deltaMatch[1]) : "",
      result:
        deltaClass === "win"
          ? values[1]
            ? "wago ahead"
            : "throughput context"
          : deltaClass === "behind"
            ? "wago behind"
            : deltaClass === "tie"
              ? "tie"
              : "context",
    });
    token.lastIndex = match.index + row.length;
  }
  return entries;
}

function parsePerformance(index) {
  const section = extractBetween(index, "PERFORMANCE", "ARCHITECTURE");
  const architectures = {};
  const archIds = [
    ...new Set([...section.matchAll(/id="arch-panel-([^"]+)"/g)].map((match) => match[1])),
  ];
  for (const arch of archIds) {
    const archPanel = extractDivById(section, `arch-panel-${arch}`);
    const categoryLabels = new Map(
      [...archPanel.matchAll(
        new RegExp(
          `<button\\b[^>]*id="perf-${arch}-tab-([^"]+)"[^>]*>([\\s\\S]*?)<\\/button>`,
          "g",
        ),
      )].map((match) => [match[1], text(match[2])]),
    );
    const categories = [];
    for (const [id, label] of categoryLabels) {
      const panel = extractDivById(archPanel, `perf-${arch}-panel-${id}`);
      categories.push({ id, label, entries: parseComparisonRows(panel) });
    }
    architectures[arch] = { architecture: arch, categories };
  }
  const comparisonCount = Object.values(architectures).reduce(
    (total, architecture) =>
      total + architecture.categories.reduce((sum, category) => sum + category.entries.length, 0),
    0,
  );
  if (Object.keys(architectures).length === 0 || comparisonCount === 0) {
    throw new Error("index.html: no performance comparisons found");
  }
  return { architectures, comparisonCount };
}

const STATUS_CLASS = {
  pass: "tag--pass",
  partial: "tag--partial",
  planned: "tag--planned",
  none: "tag--none",
};

const STATUS_TEXT = {
  pass: "pass",
  partial: "partial",
  planned: "planned",
  none: "n/a",
};

function renderVersions(versions) {
  const groups = versions.map((version) => {
    const statusClass = STATUS_CLASS[version.status];
    if (!statusClass || !Array.isArray(version.features)) {
      throw new Error(`stats.json: invalid version group ${version.version}`);
    }
    const rows = version.features
      .map((feature) => {
        const featureClass = STATUS_CLASS[feature.status];
        if (!featureClass) throw new Error(`stats.json: invalid status for ${feature.label}`);
        return `                                <div class="vgroup__row">
                                    <span class="vgroup__feat">${escapeHtml(feature.label)}</span>
                                    <span class="tag ${featureClass}">${STATUS_TEXT[feature.status]}</span>
                                </div>`;
      })
      .join("\n");
    const percent = Math.max(0, Math.min(100, version.pct ?? 0));
    return `                        <details class="vgroup" name="wasm-versions">
                            <summary class="vgroup__head">
                                <span class="vgroup__headrow">
                                    <span class="vgroup__chevron" aria-hidden="true"></span>
                                    <span class="vgroup__title">${escapeHtml(version.label)}</span>
                                    <span class="vgroup__sub">${escapeHtml(version.sub)}</span>
                                    <span class="vgroup__count">${version.done}/${version.total}</span>
                                    <span class="tag ${statusClass}">${STATUS_TEXT[version.status]}</span>
                                </span>
                                <span class="vgroup__prog">
                                    <span class="vgroup__prog-fill" data-bar data-width="${percent}"></span>
                                </span>
                            </summary>
                            <div class="vgroup__body">
${rows}
                            </div>
                        </details>`;
  });
  return `                    <div class="vtracker" data-versions>
${groups.join("\n")}
                    </div>`;
}

function replaceDataStat(index, key, target, display) {
  const pattern = new RegExp(
    `(<span\\b(?=[^>]*\\bdata-stat="${key}")[^>]*>)[\\s\\S]*?(<\\/span\\s*>)`,
    "g",
  );
  let found = false;
  const updated = index.replace(pattern, (_, open, close) => {
    found = true;
    const nextOpen = /\bdata-target="[^"]*"/.test(open)
      ? open.replace(/\bdata-target="[^"]*"/, `data-target="${target}"`)
      : open;
    return `${nextOpen}${display}${close}`;
  });
  if (!found) throw new Error(`index.html: missing data-stat="${key}"`);
  return updated;
}

function syncStaticStats(index, stats) {
  const formattedChecks = new Intl.NumberFormat("en-US").format(
    stats.verification?.checksPass ?? stats.suiteAssertions.total,
  );
  let updated = replaceDataStat(index, "files", stats.mvp.filesPass, String(stats.mvp.filesPass));
  updated = replaceDataStat(
    updated,
    "assertions",
    stats.verification?.checksPass ?? stats.suiteAssertions.total,
    formattedChecks,
  );
  updated = replaceDataStat(updated, "conf", stats.mvp.percent, String(stats.mvp.percent));
  if (typeof stats.coverage === "number") {
    updated = replaceDataStat(updated, "coverage", stats.coverage, `${stats.coverage}%`);
  }

  if (!/\bdata-stat-total\b/.test(updated)) {
    throw new Error("index.html: missing data-stat-total");
  }
  updated = updated.replace(
    /(<span\b[^>]*\bdata-stat-total\b[^>]*>)[\s\S]*?(<\/span>)/g,
    `$1/${stats.mvp.filesTotal}$2`,
  );
  if (!/\bdata-stat-bar\b/.test(updated)) {
    throw new Error("index.html: missing data-stat-bar");
  }
  updated = updated.replace(
    /(<div\b(?=[^>]*\bdata-stat-bar\b)[^>]*\bdata-width=")[^"]*("[^>]*>)/g,
    `$1${stats.mvp.percent}$2`,
  );

  const versionsAt = updated.indexOf("data-versions");
  if (versionsAt < 0) throw new Error("index.html: missing data-versions");
  const versionsStart = updated.lastIndexOf("<div", versionsAt);
  const versionsLineStart = updated.lastIndexOf("\n", versionsStart) + 1;
  const versionsReplaceStart = /^\s*$/.test(updated.slice(versionsLineStart, versionsStart))
    ? versionsLineStart
    : versionsStart;
  const versionsBlock = extractDivAt(updated, versionsStart);
  return `${updated.slice(0, versionsReplaceStart)}${renderVersions(stats.versions)}${updated.slice(
    versionsStart + versionsBlock.length,
  )}`;
}

function markdownTable(rows) {
  return [
    "| Runtime | Mode | Result |",
    "| --- | --- | ---: |",
    ...rows.map(
      (row) =>
        `| ${row.runtime} | ${row.executionMode ?? ""} | ${row.value} |`,
    ),
  ].join("\n");
}

function comparisonTable(entries) {
  return [
    "| Group | Benchmark | Workload | wago | wazero | Comparison | Result |",
    "| --- | --- | --- | ---: | ---: | --- | --- |",
    ...entries.map(
      (entry) =>
        `| ${entry.group ?? ""} | ${entry.label} | ${entry.workload} | ${entry.wago} | ${entry.wazero ?? "n/a"} | ${entry.comparison} | ${entry.result} |`,
    ),
  ].join("\n");
}

function makeProject(stats, startup, performance) {
  return {
    schemaVersion: 1,
    generated: stats.generated,
    canonicalUrl: "https://wago.sh/",
    name: "wago",
    summary:
      "A WebAssembly engine written in pure Go with single-pass native amd64 and arm64 backends, no cgo, tracked conformance, and a plugin system.",
    repository: "https://github.com/wago-org/wago",
    documentation: "https://github.com/wago-org/wago#readme",
    roadmap: "https://github.com/wago-org/wago/blob/main/ROADMAP.md",
    license: "Apache-2.0",
    programmingLanguage: "Go",
    sourceData: stats.source,
    facts: {
      nativeArchitectures: ["amd64", "arm64"],
      cgoLines: stats.cgoLines,
      conformance: stats.mvp,
      suiteAssertions: stats.suiteAssertions,
      verification: stats.verification,
      coveragePercent: stats.coverage,
      featureGroups: stats.versions,
    },
    benchmarks: {
      caveat:
        "Compare wago with other runtimes only within the same workload and architecture. Architectures are measured on different machines.",
      methodology: "https://github.com/wago-org/wago/tree/main/bench",
      startup: {
        definition: "Whole-process spawn-to-exit wall-clock latency.",
        workloads: startup,
      },
      wagoVsWazero: performance,
    },
    machineReadable: {
      project: "https://wago.sh/data/project.json",
      conformance: "https://wago.sh/data/stats.json",
      llmSummary: "https://wago.sh/llms.txt",
      llmFull: "https://wago.sh/llms-full.txt",
      manifestSchema: "https://wago.sh/schema.json",
    },
  };
}

function makeLlms(project) {
  const stats = project.facts;
  const architectures = Object.keys(project.benchmarks.wagoVsWazero.architectures);
  return `# wago

> wago is a WebAssembly engine written in pure Go. It decodes, validates, compiles, instantiates, and runs WebAssembly with single-pass native backends and no cgo.

Canonical site: https://wago.sh/
Source repository: https://github.com/wago-org/wago
License: Apache-2.0
Data updated: ${project.generated}

## Current verified facts

- MVP conformance: ${stats.conformance.filesPass}/${stats.conformance.filesTotal} applicable files pass (${stats.conformance.percent}%).
- Verification: ${stats.verification.checksPass} checks pass, ${stats.verification.checksFail} fail, ${stats.verification.checksSkip} skip.
- Test coverage: ${stats.coveragePercent}%.
- Native benchmark architectures published: ${architectures.join(", ")}.
- Published wago-vs-wazero comparisons: ${project.benchmarks.wagoVsWazero.comparisonCount}.
- Startup dataset: ${project.benchmarks.startup.workloads.length} real workloads across multiple WebAssembly runtimes.

## Read next

- [Complete project facts, conformance, startup rankings, and every benchmark comparison](https://wago.sh/llms-full.txt)
- [Structured project and benchmark data (JSON)](https://wago.sh/data/project.json)
- [Conformance and verification data (JSON)](https://wago.sh/data/stats.json)
- [Benchmark corpus and methodology](https://github.com/wago-org/wago/tree/main/bench)
- [Project documentation](https://github.com/wago-org/wago#readme)
- [Roadmap](https://github.com/wago-org/wago/blob/main/ROADMAP.md)

When describing performance, name the architecture and workload, preserve the published units, and do not compare values across architectures.
`;
}

function makeLlmsFull(project) {
  const { facts, benchmarks } = project;
  const out = [`# wago: complete machine-readable project brief

Source: ${project.canonicalUrl}
Repository: ${project.repository}
License: ${project.license}
Data updated: ${project.generated}

## What wago is

${project.summary}

The engine uses a shared decoder and validator, then emits native code with single-pass backends. It is an engine rather than a wrapper around a C/C++ runtime. Linear memory is exposed to Go as a byte slice, and the project includes typed host bindings, WASI support, and a plugin API.

## Verification and conformance

- Applicable MVP files passing: ${facts.conformance.filesPass}/${facts.conformance.filesTotal} (${facts.conformance.percent}%)
- Verification checks: ${facts.verification.checksPass} pass; ${facts.verification.checksFail} fail; ${facts.verification.checksSkip} skip
- Official MVP assertions: ${facts.suiteAssertions.mvp}
- Official SIMD assertions: ${facts.suiteAssertions.simd}
- Test coverage: ${facts.coveragePercent}%
- cgo lines: ${facts.cgoLines}

The detailed per-feature status is available at https://wago.sh/data/stats.json.

## Benchmark interpretation

${benchmarks.caveat}

Methodology and corpus: ${benchmarks.methodology}

### Whole-process startup latency

Definition: ${benchmarks.startup.definition}
`];
  for (const workload of benchmarks.startup.workloads) {
    out.push(`#### ${workload.label}\n\n${markdownTable(workload.results)}`);
  }
  out.push("## wago versus wazero");
  for (const architecture of Object.values(benchmarks.wagoVsWazero.architectures)) {
    out.push(`### ${architecture.architecture}`);
    for (const category of architecture.categories) {
      out.push(`#### ${category.label}\n\n${comparisonTable(category.entries)}`);
    }
  }
  out.push(`## Canonical machine-readable sources

- Complete structured project data: https://wago.sh/data/project.json
- Conformance and verification data: https://wago.sh/data/stats.json
- Wago manifest JSON Schema: https://wago.sh/schema.json
- Human-facing page: https://wago.sh/
`);
  return `${out.join("\n\n").trim()}\n`;
}

function makeJsonLd(project) {
  const facts = project.facts;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://wago.sh/#website",
        url: "https://wago.sh/",
        name: "wago",
        description: project.summary,
        inLanguage: "en",
        dateModified: project.generated,
        publisher: { "@id": "https://wago.sh/#org" },
      },
      {
        "@type": "Organization",
        "@id": "https://wago.sh/#org",
        name: "wago",
        url: "https://wago.sh/",
        logo: "https://wago.sh/assets/wago-logo.png",
        sameAs: [project.repository],
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://wago.sh/#app",
        name: "wago",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Linux, macOS, Windows",
        description: project.summary,
        url: "https://wago.sh/",
        downloadUrl: project.repository,
        codeRepository: project.repository,
        programmingLanguage: "Go",
        license: "https://www.apache.org/licenses/LICENSE-2.0",
        isAccessibleForFree: true,
        featureList: [
          "Pure Go with no cgo",
          "Single-pass native amd64 and arm64 backends",
          "WebAssembly validation and tracked conformance",
          "WASI and plugin support",
        ],
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        author: { "@id": "https://wago.sh/#org" },
      },
      {
        "@type": "Dataset",
        "@id": "https://wago.sh/#verification-dataset",
        name: "wago verification, conformance, and benchmark data",
        description:
          "Auto-generated conformance facts, verification totals, startup rankings, and architecture-specific wago-versus-wazero comparisons.",
        url: "https://wago.sh/data/project.json",
        dateModified: project.generated,
        license: "https://www.apache.org/licenses/LICENSE-2.0",
        creator: { "@id": "https://wago.sh/#org" },
        measurementTechnique: "https://github.com/wago-org/wago/tree/main/bench",
        variableMeasured: [
          `MVP files passing: ${facts.conformance.filesPass}/${facts.conformance.filesTotal}`,
          `Verification checks passing: ${facts.verification.checksPass}`,
          `Test coverage: ${facts.coveragePercent}%`,
          `Published performance comparisons: ${project.benchmarks.wagoVsWazero.comparisonCount}`,
        ],
        distribution: [
          {
            "@type": "DataDownload",
            encodingFormat: "application/json",
            contentUrl: "https://wago.sh/data/project.json",
          },
          {
            "@type": "DataDownload",
            encodingFormat: "text/plain",
            contentUrl: "https://wago.sh/llms-full.txt",
          },
        ],
      },
    ],
  };
  return `${AI_START}
        <link rel="alternate" type="text/plain" href="/llms.txt" title="wago summary for language models" />
        <link rel="alternate" type="application/json" href="/data/project.json" title="wago project and benchmark data" />
        <script type="application/ld+json">
${JSON.stringify(data, null, 12)}
        </script>
${AI_END}`;
}

function replaceGeneratedBlock(index, replacement) {
  const start = index.indexOf(AI_START);
  const end = index.indexOf(AI_END, start + AI_START.length);
  if (start < 0 || end < 0) {
    throw new Error("index.html: missing AI-METADATA markers");
  }
  return `${index.slice(0, start)}${replacement}${index.slice(end + AI_END.length)}`;
}

function updateSitemap(sitemap, generated) {
  return sitemap.replace(/<lastmod>[^<]+<\/lastmod>/g, `<lastmod>${generated}</lastmod>`);
}

async function exists(path) {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function syncFile(path, content, stale) {
  const current = (await exists(path)) ? await readFile(path, "utf8") : "";
  if (current === content) return;
  if (CHECK) {
    stale.push(path.slice(ROOT.length + 1));
    return;
  }
  await writeFile(path, content);
}

const index = await readFile(INDEX, "utf8");
const stats = JSON.parse(await readFile(STATS, "utf8"));
const startup = parseStartup(index);
const performance = parsePerformance(index);
const project = makeProject(stats, startup, performance);
const nextIndex = replaceGeneratedBlock(syncStaticStats(index, stats), makeJsonLd(project));
const sitemap = await readFile(SITEMAP, "utf8");
const stale = [];

await syncFile(PROJECT, `${JSON.stringify(project, null, 2)}\n`, stale);
await syncFile(LLMS, makeLlms(project), stale);
await syncFile(LLMS_FULL, makeLlmsFull(project), stale);
await syncFile(INDEX, nextIndex, stale);
await syncFile(SITEMAP, updateSitemap(sitemap, stats.generated), stale);

if (CHECK && stale.length > 0) {
  console.error(`AI metadata is stale: ${stale.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(
    `AI metadata is current: ${startup.length} startup workloads, ` +
      `${Object.keys(performance.architectures).length} architectures, ` +
      `${performance.comparisonCount} performance comparisons`,
  );
}
