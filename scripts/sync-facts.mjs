#!/usr/bin/env node
// Generate the canonical product facts and static documentation routes from the
// same Wago checkout used by the site's daily sync.

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const REPO = process.env.WAGO_REPO || "wago-org/wago";
const REF = process.env.WAGO_REF || "main";
const FACTS_REF = process.env.WAGO_FACTS_REF || REF;
const TOKEN = process.env.WAGO_TOKEN || process.env.GITHUB_TOKEN || "";
const LOCAL = process.env.WAGO_DIR || resolve(ROOT, "..", "wago");
const STATS = join(ROOT, "data", "stats.json");
const OUT = join(ROOT, "data", "facts.json");
const OUT_SCHEMA = join(ROOT, "data", "facts.schema.json");

const INPUTS = [
  "README.md",
  "FEATURES.md",
  "VERIFICATION.md",
  "docs/ci.md",
  "docs/wazero-test-applicability.md",
  "testdata/wazero/README.md",
  ".github/workflows/ci.yml",
  "src/wago/api.go",
  "src/wago/instance_native_context.go",
  "src/wago/memory.go",
  "src/wago/managed_instances.go",
  "src/wago/policy.go",
  "src/wago/wazero_concurrency_port_test.go",
];

async function exists(path) {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function load(name) {
  const local = join(LOCAL, name);
  if (await exists(local)) return readFile(local, "utf8");

  const path = encodeURIComponent(name).replaceAll("%2F", "/");
  if (TOKEN) {
    const url = `https://api.github.com/repos/${REPO}/contents/${path}?ref=${encodeURIComponent(FACTS_REF)}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github.raw",
        "User-Agent": "wago-website-facts-sync",
      },
    });
    if (!response.ok) throw new Error(`GitHub API ${url}: ${response.status}`);
    return response.text();
  }

  const url = `https://raw.githubusercontent.com/${REPO}/${FACTS_REF}/${path}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `fetch ${url}: ${response.status}; set WAGO_DIR or WAGO_TOKEN for a private repository`,
    );
  }
  return response.text();
}

function localCommit() {
  if (process.env.WAGO_COMMIT) return process.env.WAGO_COMMIT;
  try {
    return execFileSync("git", ["-C", LOCAL, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

async function remoteCommit() {
  const response = await fetch(`https://api.github.com/repos/${REPO}/commits/${encodeURIComponent(FACTS_REF)}`, {
    headers: {
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      Accept: "application/vnd.github+json",
      "User-Agent": "wago-website-facts-sync",
    },
  });
  if (!response.ok) throw new Error(`could not resolve ${REPO}@${FACTS_REF}: ${response.status}`);
  return (await response.json()).sha;
}

async function resolveGitlink(path, envName) {
  const configured = process.env[envName];
  if (configured) {
    if (!/^[0-9a-f]{40}$/i.test(configured)) {
      throw new Error(`${envName} must be a 40-character commit`);
    }
    return configured;
  }
  try {
    const line = execFileSync("git", ["-C", LOCAL, "ls-tree", "HEAD", "--", path], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const found = line.match(/^160000 commit ([0-9a-f]{40})\t/);
    if (found) return found[1];
  } catch {
    // Fall through to the GitHub contents API.
  }

  const url = `https://api.github.com/repos/${REPO}/contents/${path}?ref=${encodeURIComponent(FACTS_REF)}`;
  const response = await fetch(url, {
    headers: {
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      Accept: "application/vnd.github+json",
      "User-Agent": "wago-website-facts-sync",
    },
  });
  if (!response.ok) {
    throw new Error(
      `could not resolve gitlink ${path}: ${response.status}; set ${envName} when using an exported source tree`,
    );
  }
  const data = await response.json();
  if (!/^[0-9a-f]{40}$/i.test(data.sha || "")) {
    throw new Error(`GitHub did not return a gitlink commit for ${path}`);
  }
  return data.sha;
}

function requireText(source, needle, file) {
  if (!source.includes(needle)) {
    throw new Error(`${file}: expected evidence disappeared: ${needle}`);
  }
}

function match(source, pattern, file, label) {
  const found = source.match(pattern);
  if (!found) throw new Error(`${file}: could not parse ${label}`);
  return found;
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function evidence(commit, path, label, anchor = "") {
  return {
    label,
    url: `https://github.com/${REPO}/blob/${commit}/${path}${anchor}`,
  };
}

function evidenceLinks(items) {
  return items
    .map((item) => `<a href="${esc(item.url)}" rel="external">${esc(item.label)}</a>`)
    .join(" · ");
}

function rows(entries) {
  return entries
    .map(
      ([thing, value, source]) =>
        `<tr><th scope="row">${thing}</th><td>${value}</td><td>${source}</td></tr>`,
    )
    .join("\n");
}

function page({ path, title, description, updated, sourceCommit, body, markdown = "" }) {
  const canonical = `https://wago.sh/${path ? `${path}/` : ""}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} · wago</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="robots" content="index, follow, max-snippet:-1" />
  <link rel="canonical" href="${canonical}" />
${markdown ? `  <link rel="alternate" type="text/markdown" href="/${esc(markdown)}" />\n` : ""}  <link rel="stylesheet" href="/assets/css/tokens.css" />
  <link rel="stylesheet" href="/assets/css/docs.css" />
</head>
<body>
  <header class="docs-nav">
    <a class="docs-brand" href="/">✦ wago</a>
    <nav aria-label="Documentation">
      <a href="/compatibility/">Compatibility</a>
      <a href="/benchmarks/">Benchmarks</a>
      <a href="/security/">Security</a>
      <a href="/llms.txt">llms.txt</a>
    </nav>
  </header>
  <main>
    <p class="docs-kicker">Canonical Wago documentation</p>
    <h1>${esc(title)}</h1>
    <p class="docs-lead">${esc(description)}</p>
    <div class="docs-meta">
      <span>Last synchronized: <time datetime="${esc(updated)}">${esc(updated)}</time></span>
      <span>Wago source: <a href="https://github.com/${REPO}/commit/${esc(sourceCommit)}"><code>${esc(sourceCommit.slice(0, 12))}</code></a></span>
    </div>
${body}
  </main>
  <footer>
    Generated from <a href="https://wago.sh/data/facts.json">facts.json</a>.
    Claims are scoped to the linked source commit.
  </footer>
</body>
</html>
`;
}

function compatibilityPage(facts) {
  const c = facts.compatibility;
  const e = facts.evidence;
  return page({
    path: "compatibility",
    title: "Compatibility and verification",
    description:
      "Exact scope for Wago’s published verification totals, official WebAssembly corpora, and imported wazero tests.",
    updated: facts.generated,
    sourceCommit: facts.source.commit,
    markdown: "compatibility.md",
    body: `
    <section id="result">
      <h2>Verified result</h2>
      <p class="docs-callout">At Wago commit <code>${esc(facts.source.commit.slice(0, 12))}</code>, the public verification report records <strong>${c.verification.pass.toLocaleString("en-US")} passed</strong>, <strong>${c.verification.fail} failed</strong>, and <strong>${c.verification.skip} skipped</strong> checks on <code>${esc(c.verification.host)}</code>.</p>
      <table><thead><tr><th>Gate</th><th>Passed</th><th>Failed</th><th>Skipped</th><th>Accounting unit</th></tr></thead>
      <tbody>${c.verification.gates.map((gate) => `<tr><th scope="row">${esc(gate.name)}</th><td>${gate.pass.toLocaleString("en-US")}</td><td>${gate.fail}</td><td>${gate.skip}</td><td>${esc(gate.unit)}</td></tr>`).join("\n")}</tbody></table>
      <p class="evidence">Primary result: ${evidenceLinks([e.verification])}</p>
    </section>
    <section id="official-suites">
      <h2>Official WebAssembly suites</h2>
      <p>Wago pins the WebAssembly MVP and Core 2.0 repositories as git submodules. The public gate reports 16,026 Release 1 execution assertions, 2,880 Release 2 validation assertions, 48,331 Release 2 execution assertions, and 24,325 SIMD execution assertions.</p>
      <table><thead><tr><th>Corpus</th><th>Pinned commit</th><th>Repository</th></tr></thead>
      <tbody>${c.verification.corpora.map((corpus) => `<tr><th scope="row">${esc(corpus.name)}</th><td><code>${esc(corpus.commit)}</code></td><td><a href="${esc(corpus.repository)}">${esc(corpus.repository)}</a></td></tr>`).join("\n")}</tbody></table>
      <p>These are assertion counts, not interchangeable “test case” counts. The separate legacy MVP page reports 57/57 applicable files and 16,592 passing assertions under its own older corpus/accounting boundary.</p>
      <p class="evidence">Evidence: ${evidenceLinks([e.verification, e.features])}</p>
    </section>
    <section id="wazero">
      <h2>Imported wazero coverage</h2>
      <p>The claim is not “Wago runs the entire wazero repository unchanged.” Wago audits all <strong>${c.wazero.filesAudited}</strong> upstream Go test files at wazero commit <code>${esc(c.wazero.commit.slice(0, 12))}</code>, then records each as ported/covered, not applicable, benchmark/example-only, or reviewed without a direct port. Named Wago suites contain copied or adapted semantic cases and pinned fixtures.</p>
      <p>The ledger separately accounts for 39 upstream engine cases, 147 Core v2 WAST files, ${c.wazero.fixtures.extendedConstantArtifacts} extended-constant artifacts, ${c.wazero.fixtures.failClosedProposalArtifacts} fail-closed proposal artifacts, ${c.wazero.fixtures.fuzzBinaries} fuzz fixtures, and ${c.wazero.fixtures.engineBinaries} engine fixtures.</p>
      <p>The ${c.wazero.fixtures.totalArtifacts} copied upstream artifacts are pinned by SHA-256 digest <code>${esc(c.wazero.fixtures.sha256)}</code>.</p>
      <p class="evidence">Scope and disposition ledger: ${evidenceLinks([e.wazeroLedger, e.wazeroFixtures])}</p>
    </section>
    <section id="wasmtime">
      <h2>Wasmtime suite claim</h2>
      <p class="docs-warning"><strong>Not claimed.</strong> The current source commit contains differential expectations informed by Wasmtime, but no comparable Wasmtime test-suite import ledger. Wago should not be described as “passing the full Wasmtime suite” on the evidence currently published.</p>
    </section>
    <section id="platform-scope">
      <h2>Architecture scope</h2>
      <p>Linux/amd64, Linux/arm64, and Darwin/arm64 run the native runtime/API, guard-page, and corpus matrix. Core v2 runs on Linux/amd64 and Linux/arm64. The checked-in aggregate verification report itself was generated on Darwin/arm64.</p>
      <p class="evidence">Evidence: ${evidenceLinks([e.ci, e.verification])}</p>
    </section>`,
  });
}

function securityPage(facts) {
  const e = facts.evidence;
  return page({
    path: "security",
    title: "Security and isolation status",
    description:
      "What Wago currently bounds, how runaway guest execution is interrupted, and which security assurances are not yet published.",
    updated: facts.generated,
    sourceCommit: facts.source.commit,
    markdown: "security.md",
    body: `
    <section id="controls">
      <h2>Published controls</h2>
      <ul>
        <li>Declared linear-memory maxima can be limited at instantiation; the table policy currently checks initial/minimum entries only.</li>
        <li>Explicit bounds checks are the default; signal-backed guard pages are an opt-in build/runtime path with native CI coverage.</li>
        <li>Context cancellation and deadlines interrupt amd64/arm64 native guest code at function-entry and loop-header safepoints.</li>
        <li>Capability policy can allow or deny plugin-provided host access.</li>
        <li>The repository contains Go fuzz targets and 71 pinned wazero fuzz-regression fixtures with ordinary test oracles.</li>
      </ul>
      <p class="evidence">Evidence: ${evidenceLinks([e.readme, e.api, e.features, e.ci])}</p>
    </section>
    <section id="not-published">
      <h2>Not currently published</h2>
      <ul>
        <li>No dedicated <code>SECURITY.md</code> or public vulnerability-reporting address was found at this source commit.</li>
        <li>No third-party security audit is claimed.</li>
        <li>No runtime-wide aggregate memory budget across all live instances is documented.</li>
        <li>No deterministic instruction-fuel accounting is documented; deadlines are cooperative safepoint interruption, and <code>Policy.MaxInvokeDuration</code> is reserved rather than enforced.</li>
        <li>No stable compiled-artifact compatibility guarantee across releases is documented.</li>
      </ul>
      <p>For hostile multi-tenant workloads, these gaps should be part of the deployment threat model. Process or container isolation remains an additional defense boundary, not something the engine can make unnecessary.</p>
    </section>`,
  });
}

function benchmarksIndex(facts) {
  return page({
    path: "benchmarks",
    title: "Benchmark index",
    description:
      "Crawlable Wago benchmark definitions, caveats, raw structured data, and planned many-instance measurements.",
    updated: facts.generated,
    sourceCommit: facts.source.commit,
    markdown: "benchmarks.md",
    body: `
    <section id="published">
      <h2>Published measurements</h2>
      <ul>
        <li><a href="/#latency">Whole-process startup latency</a>: process spawn to exit, across several runtimes.</li>
        <li><a href="/#performance">Wago versus wazero</a>: decode, validate, compile, instantiate, Go allocation, and warm execution rows split by architecture.</li>
        <li><a href="/benchmarks/arm64/">ARM64 benchmark interpretation and many-instance plan</a>.</li>
      </ul>
      <p>All visible comparison rows are also available without JavaScript in <a href="/llms-full.txt">llms-full.txt</a> and as JSON in <a href="/data/project.json">project.json</a>.</p>
    </section>
    <section id="rules">
      <h2>Interpretation rules</h2>
      <ul>
        <li>Compare runtimes only within one architecture and workload.</li>
        <li>Do not compare absolute values across machines.</li>
        <li>“Go heap bytes allocated” is allocation traffic measured by Go benchmarks, not total resident memory.</li>
        <li>Guest linear memory, native code mappings, virtual reservations, RSS, and PSS are separate quantities.</li>
      </ul>
    </section>`,
  });
}

function arm64Page(facts) {
  return page({
    path: "benchmarks/arm64",
    title: "ARM64 benchmarks and many-instance plan",
    description:
      "How to interpret the published ARM64 data and the reproducible protocol for the not-yet-published 1, 8, 80, and 120 instance benchmark.",
    updated: facts.generated,
    sourceCommit: facts.source.commit,
    body: `
    <section id="current">
      <h2>Current ARM64 data</h2>
      <p>The homepage publishes ARM64 Wago-versus-wazero rows measured on one ARM64 machine. The structured copy is in <a href="/data/project.json">project.json</a>. Published instantiation values describe <strong>Go heap bytes or allocation objects created during instantiation</strong>; they are not total per-instance memory.</p>
      <p class="docs-warning">Instantiation allocation figures exclude guest linear memory, native code mappings, and native virtual-memory reservations.</p>
    </section>
    <section id="many-instances">
      <h2>Many-instance benchmark status</h2>
      <p class="docs-callout"><strong>Status: protocol published; results not measured.</strong> Wago does not currently claim “80 instances under X MiB RSS.” Results will appear here only after the raw samples and reproduction command are committed.</p>
      <h3>Instance counts</h3>
      <p><code>N = 1, 8, 80, 120</code>, with compile-once and fresh-process runs separated.</p>
      <h3>Workloads</h3>
      <ul>
        <li>No-memory scalar module</li>
        <li>128 KiB initial linear memory</li>
        <li>1 MiB initialized data</li>
        <li>16 MiB active working set</li>
        <li>Host-call-heavy and compute-heavy loops</li>
        <li>Create/close churn and long-lived warm instances</li>
      </ul>
      <h3>Required outputs</h3>
      <ul>
        <li>Total throughput, per-instance fairness, and p50/p95/p99 latency</li>
        <li>RSS, PSS, and virtual memory reported separately</li>
        <li>Minor/major page faults, Go heap, GC CPU/time, and compile-once cost</li>
        <li>Incremental memory per live instance and memory returned after close</li>
        <li>A run under an explicit cgroup memory limit</li>
      </ul>
      <p>Until those fields are present, this page deliberately contains no synthetic headline.</p>
    </section>`,
  });
}

const competitorFacts = {
  wazero: {
    label: "wazero",
    mode: "Go-native compiler backend, with a portable interpreter fallback",
    chooseWago: "you are evaluating Wago’s single-pass compile latency, instance-allocation profile, plugin model, or its current benchmarked host-call path",
    chooseOther: "you need a stable v1 API promise, a mature pure-Go runtime with a broader production history, or a portable interpreter on additional Go targets",
    gaps: "Wago is pre-v1 and does not match wazero’s platform breadth or published API-stability promise.",
    source: "https://github.com/tetratelabs/wazero",
  },
  wasmtime: {
    label: "Wasmtime",
    mode: "Cranelift optimizing compiler, available at runtime and ahead of time",
    chooseWago: "a pure-Go, no-cgo embedding path and low single-pass compile overhead are primary constraints",
    chooseOther: "you need the Component Model ecosystem, fuel accounting, epoch interruption, broad WASI support, or Wasmtime’s security and release processes",
    gaps: "Wago has no published Component Model support, deterministic fuel system, third-party security audit, or Wasmtime-scale WASI surface.",
    source: "https://github.com/bytecodealliance/wasmtime",
  },
  wamr: {
    label: "WAMR",
    mode: "C runtime with interpreter, AOT, Fast JIT, and LLVM JIT modes",
    chooseWago: "the host is Go and avoiding cgo/native-library integration is a hard deployment requirement",
    chooseOther: "you need a small embedded C runtime, microcontroller/RTOS targets, AOT deployment, or WAMR’s wider architecture and execution-mode matrix",
    gaps: "Wago targets three native OS/architecture pairs; WAMR documents a substantially broader embedded and architecture matrix.",
    source: "https://github.com/bytecodealliance/wasm-micro-runtime",
  },
};

function comparePage(facts, key) {
  const other = competitorFacts[key];
  return page({
    path: `compare/${key}`,
    title: `Wago compared with ${other.label}`,
    description:
      `A scoped, source-linked comparison of Wago and ${other.label}, including when to choose either runtime and what has not been benchmarked.`,
    updated: facts.generated,
    sourceCommit: facts.source.commit,
    body: `
    <section id="summary">
      <h2>Short answer</h2>
      <p><strong>Choose Wago when</strong> ${esc(other.chooseWago)}.</p>
      <p><strong>Choose ${esc(other.label)} when</strong> ${esc(other.chooseOther)}.</p>
    </section>
    <section id="differences">
      <h2>Operational differences</h2>
      <table><thead><tr><th>Area</th><th>Wago</th><th>${esc(other.label)}</th></tr></thead>
      <tbody>${rows([
        ["Implementation", "Go; no cgo", `<a href="${esc(other.source)}">See the project’s current implementation and bindings</a>`],
        ["Execution terminology", "Single-pass native compiler", esc(other.mode)],
        ["Wago release maturity", "Pre-v1 development/nightly channels; no stable v1 API promise", "See the other project’s release and support policy"],
        ["Known Wago gap", esc(other.gaps), "Not applicable"],
      ])}</tbody></table>
    </section>
    <section id="benchmarks">
      <h2>Benchmark scope</h2>
      <p>${key === "wazero" ? "Wago publishes architecture-specific direct comparisons with wazero; see the homepage and project.json." : `Wago publishes whole-process startup rows that include ${esc(other.label)}, but does not publish the same detailed stage-by-stage comparison used for wazero.`}</p>
      <p>No result on this page should be treated as universal. Use identical versions, hardware, Wasm modules, warmup, and measurement boundaries.</p>
      <p>Raw Wago data: <a href="/data/project.json">project.json</a>. Other-runtime primary source: <a href="${esc(other.source)}">${esc(other.source)}</a>.</p>
    </section>
    <section id="verified">
      <h2>Verification date</h2>
      <p>Wago facts: ${esc(facts.generated)}, pinned to <code>${esc(facts.source.commit.slice(0, 12))}</code>. Competitor descriptions last reviewed against the linked primary project source on 2026-07-29.</p>
    </section>`,
  });
}

function guidePage(facts, key) {
  const guides = {
    "many-instances": {
      title: "Running many Wago instances",
      description: "The current compile-once, concurrency, allocation, and memory-accounting guidance for multi-instance Wago services.",
      body: `
    <section id="contract"><h2>Current contract</h2>
      <ul>
        <li>Compile a module once and instantiate it repeatedly.</li>
        <li>Serialize calls on any one instance. Separate instances isolate mutable state, but native Wasm activations are currently serialized process-wide.</li>
        <li>Treat published instantiation allocation bytes as Go allocation traffic, not total instance memory.</li>
        <li>Set declared memory/table policy limits and pass contexts with deadlines to untrusted calls.</li>
      </ul>
    </section>
    <section id="capacity"><h2>Capacity planning</h2>
      <p>Account separately for guest linear memory, initialized data, shared native code, per-instance Go heap, virtual reservations, and process RSS/PSS. Wago does not yet publish an aggregate-memory governor or completed 80-instance dataset.</p>
      <p>Use the <a href="/benchmarks/arm64/#many-instances">published many-instance protocol</a> as the minimum measurement checklist.</p>
    </section>`,
    },
    "no-cgo": {
      title: "Embedding Wago without cgo",
      description: "What Wago’s pure-Go and no-cgo claim means, and where native executable-memory behavior still matters.",
      body: `
    <section id="meaning"><h2>What no-cgo means</h2>
      <p>The Wago engine is implemented in Go and does not wrap a C/C++ runtime. Native backends emit machine code directly, and the runtime maps executable memory using Go and operating-system facilities.</p>
    </section>
    <section id="limits"><h2>What it does not mean</h2>
      <ul>
        <li>It does not mean architecture-independent execution: native runtime targets are currently Linux/amd64, Linux/arm64, and Darwin/arm64.</li>
        <li>It does not remove executable-memory policy, code-signing, or operating-system constraints.</li>
        <li>It does not imply every plugin is dependency-free; evaluate plugin manifests separately.</li>
      </ul>
      <p>Native target evidence: ${evidenceLinks([facts.evidence.ci])}.</p>
    </section>`,
    },
    "edge-runtime": {
      title: "Evaluating Wago for edge runtimes",
      description: "A deployment-oriented checklist for startup, isolation, concurrency, resource limits, plugins, and current Wago gaps.",
      body: `
    <section id="fit"><h2>Potential fit</h2>
      <p>Wago is designed for Go hosts that value no-cgo deployment, single-pass native compilation, compile-once/instantiate-many reuse, and low host/guest boundary overhead.</p>
    </section>
    <section id="checklist"><h2>Production checklist</h2>
      <ul>
        <li>Choose one of the three native CI targets.</li>
        <li>Set memory/table policies and invocation deadlines.</li>
        <li>Use separate instances for state isolation; current native guest execution is serialized process-wide.</li>
        <li>Grant plugin capabilities explicitly; audit each plugin separately.</li>
        <li>Measure RSS/PSS under the intended instance count and guest memory shape.</li>
        <li>Add process/container isolation when the threat model requires a second boundary.</li>
      </ul>
    </section>
    <section id="gaps"><h2>Current gaps to evaluate</h2>
      <p>Pre-v1 API/release maturity, no published aggregate memory governor, no function-level WASI matrix, no published security policy or third-party audit, and no completed many-instance benchmark.</p>
    </section>`,
    },
  };
  const guide = guides[key];
  return page({
    path: `guides/${key}`,
    title: guide.title,
    description: guide.description,
    updated: facts.generated,
    sourceCommit: facts.source.commit,
    body: guide.body,
  });
}

function markdownHeader(title, facts) {
  return `# ${title}

Last synchronized: ${facts.generated}
Wago source commit: ${facts.source.commit}
Canonical JSON: https://wago.sh/data/facts.json
`;
}

function factsMarkdown(facts) {
  const platformRows = facts.platforms
    .map((platform) => `| \`${platform.target}\` | ${platform.status} | ${platform.detail} |`)
    .join("\n");
  const proposals = facts.webAssembly.proposals
    .map((proposal) => `- ${proposal.name}: ${proposal.status}`)
    .join("\n");
  return `${markdownHeader("Wago facts", facts)}
## Identity and release

- Implementation: Go
- Pure Go: yes
- cgo: no
- Execution: ${facts.identity.execution}
- Interpreter tier: no
- Stable version: none published
- Release state: ${facts.release.status}

## Native runtime targets

| Target | Status | Scope |
| --- | --- | --- |
${platformRows}

## Concurrency

- Runtime: ${facts.concurrency.runtime}
- Compiled module: ${facts.concurrency.compiledModule}
- Instance: ${facts.concurrency.instance}
- Separate instances: ${facts.concurrency.separateInstances}
- Native execution parallelism: ${facts.concurrency.nativeExecutionParallelism}
- Result lifetime: ${facts.concurrency.resultLifetime}

## Limits and interruption

- Declared memory limit: supported
- Table limit: ${facts.limits.declaredTables}
- Context cancellation/deadline: supported on amd64 and arm64 at cooperative native safepoints
- Policy.MaxInvokeDuration: ${facts.limits.policyMaxInvokeDuration}
- Deterministic fuel: not implemented
- Aggregate memory accounting: not published

## WASI

- Delivery: ${facts.wasi.delivery}
- Preview 1: ${facts.wasi.preview1}
- Preview 2: ${facts.wasi.preview2}

## WebAssembly proposal tracker

${proposals}

## Read next

- Exact compatibility scope: https://wago.sh/compatibility.md
- Security and isolation status: https://wago.sh/security.md
- Benchmark interpretation: https://wago.sh/benchmarks.md
`;
}

function compatibilityMarkdown(facts) {
  const c = facts.compatibility;
  const gates = c.verification.gates
    .map(
      (gate) =>
        `| ${gate.name} | ${gate.pass} | ${gate.fail} | ${gate.skip} | ${gate.unit} |`,
    )
    .join("\n");
  const corpora = c.verification.corpora
    .map((corpus) => `| ${corpus.name} | \`${corpus.commit}\` | ${corpus.repository} |`)
    .join("\n");
  return `${markdownHeader("Wago compatibility and verification", facts)}
## Public verification

Host: \`${c.verification.host}\`
Result: ${c.verification.pass} passed, ${c.verification.fail} failed, ${c.verification.skip} skipped checks.

| Gate | Passed | Failed | Skipped | Accounting unit |
| --- | ---: | ---: | ---: | --- |
${gates}

The headline mixes Go tests/subtests and conformance assertions. Preserve the per-row accounting unit.

## Pinned official corpora

| Corpus | Commit | Repository |
| --- | --- | --- |
${corpora}

## Wazero scope

- Upstream commit: \`${c.wazero.commit}\`
- Go test files audited: ${c.wazero.filesAudited}
- Method: ${c.wazero.method}
- Copied upstream artifacts: ${c.wazero.fixtures.totalArtifacts}
- Artifact SHA-256: \`${c.wazero.fixtures.sha256}\`
- Fuzz binaries: ${c.wazero.fixtures.fuzzBinaries}
- Engine binaries: ${c.wazero.fixtures.engineBinaries}
- Extended-constant artifacts: ${c.wazero.fixtures.extendedConstantArtifacts}
- Fail-closed proposal artifacts: ${c.wazero.fixtures.failClosedProposalArtifacts}

Wago does not run the complete wazero repository unchanged. Applicable contracts and fixtures are ported or adapted, and exclusions are recorded in the applicability ledger.

## Wasmtime scope

No Wasmtime suite pin, fixture import, or applicability ledger is published. Wago does not claim to pass the full Wasmtime suite.
`;
}

function securityMarkdown(facts) {
  return `${markdownHeader("Wago security and isolation status", facts)}
## Published controls

- Declared linear-memory maxima can be limited at instantiation.
- Table policy checks initial/minimum entries; it is not a complete growth ceiling.
- Context cancellation and deadlines interrupt amd64/arm64 guest code at native safepoints.
- Explicit bounds checks are the default; signal-backed guard pages are opt-in and CI-tested.
- Capability policy can allow or deny plugin-provided host access.
- The repository contains Go fuzz targets and pinned fuzz-regression fixtures.

## Not currently published

- Dedicated SECURITY.md or first-party vulnerability-reporting process
- Third-party security audit
- Continuous time-budgeted fuzzing claim
- Deterministic instruction fuel
- Runtime-wide aggregate memory budget
- Stable cross-release compiled-artifact compatibility guarantee

For hostile multi-tenant workloads, process or container isolation remains an additional defense boundary.
`;
}

function benchmarksMarkdown(facts) {
  return `${markdownHeader("Wago benchmark interpretation", facts)}
## Published data

- Whole-process startup latency: https://wago.sh/#latency
- Wago versus wazero by architecture: https://wago.sh/#performance
- Structured rows: https://wago.sh/data/project.json
- Full Markdown tables: https://wago.sh/llms-full.txt

## Interpretation rules

- Compare runtimes only within the same architecture and workload.
- Do not compare absolute values across machines.
- Allocation rows measure ${facts.benchmarks.allocationMeaning}.
- Allocation rows exclude ${facts.benchmarks.allocationExcludes.join(", ")}.

## Many-instance benchmark

Status: ${facts.benchmarks.manyInstance.status}
Planned instance counts: ${facts.benchmarks.manyInstance.instanceCounts.join(", ")}

No 80-instance memory or throughput result is claimed until raw samples and reproduction commands are committed.
`;
}

function factsSchema() {
  const evidence = {
    type: "object",
    required: ["label", "url"],
    additionalProperties: false,
    properties: {
      label: { type: "string" },
      url: { type: "string", format: "uri" },
    },
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://wago.sh/data/facts.schema.json",
    title: "Wago canonical facts",
    description:
      "Schema for the generated, source-pinned product and compatibility facts at wago.sh/data/facts.json.",
    type: "object",
    required: [
      "$schema",
      "schemaVersion",
      "generated",
      "canonicalUrl",
      "source",
      "identity",
      "release",
      "platforms",
      "concurrency",
      "limits",
      "wasi",
      "webAssembly",
      "compatibility",
      "security",
      "benchmarks",
      "evidence",
    ],
    additionalProperties: false,
    properties: {
      $schema: { const: "https://wago.sh/data/facts.schema.json" },
      schemaVersion: { const: 1 },
      generated: { type: "string", format: "date" },
      canonicalUrl: { type: "string", format: "uri" },
      source: {
        type: "object",
        required: ["repository", "ref", "commit", "commitUrl"],
        additionalProperties: false,
        properties: {
          repository: { type: "string", format: "uri" },
          ref: { type: "string" },
          commit: { type: "string", pattern: "^[0-9a-f]{40}$" },
          commitUrl: { type: "string", format: "uri" },
        },
      },
      identity: {
        type: "object",
        required: ["name", "implementation", "pureGo", "cgo", "execution", "interpreter"],
        additionalProperties: false,
        properties: {
          name: { const: "wago" },
          implementation: { const: "Go" },
          pureGo: { const: true },
          cgo: { const: false },
          execution: { type: "string" },
          interpreter: { const: false },
        },
      },
      release: {
        type: "object",
        required: ["status", "stableVersion", "apiStability"],
        additionalProperties: false,
        properties: {
          status: { type: "string" },
          stableVersion: { type: ["string", "null"] },
          apiStability: { type: "string" },
        },
      },
      platforms: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["target", "status", "detail", "evidence"],
          additionalProperties: false,
          properties: {
            target: { type: "string" },
            status: {
              enum: ["supported", "compiler-only", "planned", "unsupported-native-runtime"],
            },
            detail: { type: "string" },
            evidence: { type: "array", items: { $ref: "#/$defs/evidence" } },
          },
        },
      },
      concurrency: {
        type: "object",
        required: [
          "runtime",
          "compiledModule",
          "instance",
          "separateInstances",
          "nativeExecutionParallelism",
          "resultLifetime",
        ],
        additionalProperties: false,
        properties: {
          runtime: { type: "string" },
          compiledModule: { type: "string" },
          instance: { type: "string" },
          separateInstances: { type: "string" },
          nativeExecutionParallelism: { type: "string" },
          resultLifetime: { type: "string" },
        },
      },
      limits: {
        type: "object",
        required: [
          "declaredMemory",
          "declaredTables",
          "deadlineInterruption",
          "policyMaxInvokeDuration",
          "deterministicFuel",
          "aggregateMemoryAccounting",
        ],
        additionalProperties: false,
        properties: {
          declaredMemory: { type: "boolean" },
          declaredTables: { type: "string" },
          deadlineInterruption: {
            type: "object",
            required: ["amd64", "arm64", "mechanism"],
            additionalProperties: false,
            properties: {
              amd64: { type: "boolean" },
              arm64: { type: "boolean" },
              mechanism: { type: "string" },
            },
          },
          policyMaxInvokeDuration: { type: "string" },
          deterministicFuel: { type: "boolean" },
          aggregateMemoryAccounting: { type: "boolean" },
        },
      },
      wasi: {
        type: "object",
        required: ["delivery", "preview1", "preview2"],
        additionalProperties: false,
        properties: {
          delivery: { type: "string" },
          preview1: { type: "string" },
          preview2: { type: "string" },
        },
      },
      webAssembly: {
        type: "object",
        required: ["mvpLegacyReport", "verification", "proposals"],
        additionalProperties: false,
        properties: {
          mvpLegacyReport: { type: "object" },
          verification: { type: "object" },
          proposals: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "status", "evidence"],
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                status: { enum: ["pass", "partial", "planned", "none"] },
                evidence: { type: "array", items: { $ref: "#/$defs/evidence" } },
              },
            },
          },
        },
      },
      compatibility: {
        type: "object",
        required: ["verification", "wazero", "wasmtime"],
        additionalProperties: false,
        properties: {
          verification: {
            type: "object",
            required: ["wagoCommit", "host", "pass", "fail", "skip", "gates", "corpora"],
          },
          wazero: {
            type: "object",
            required: ["repository", "commit", "filesAudited", "method", "fixtures"],
          },
          wasmtime: {
            type: "object",
            required: ["suiteImported", "claim"],
          },
        },
      },
      security: {
        type: "object",
        required: [
          "dedicatedPolicyPublished",
          "thirdPartyAuditClaimed",
          "fuzzTestsPresent",
          "recommendedAdditionalBoundary",
        ],
        additionalProperties: false,
        properties: {
          dedicatedPolicyPublished: { type: "boolean" },
          thirdPartyAuditClaimed: { type: "boolean" },
          fuzzTestsPresent: { type: "boolean" },
          recommendedAdditionalBoundary: { type: "string" },
        },
      },
      benchmarks: {
        type: "object",
        required: ["allocationMeaning", "allocationExcludes", "manyInstance"],
        additionalProperties: false,
        properties: {
          allocationMeaning: { type: "string" },
          allocationExcludes: { type: "array", items: { type: "string" } },
          manyInstance: {
            type: "object",
            required: ["status", "instanceCounts"],
            additionalProperties: false,
            properties: {
              status: { type: "string" },
              instanceCounts: { type: "array", items: { type: "integer", minimum: 1 } },
            },
          },
        },
      },
      evidence: {
        type: "object",
        additionalProperties: { $ref: "#/$defs/evidence" },
      },
    },
    $defs: { evidence },
  };
}

function validateFacts(facts) {
  const gates = facts.compatibility.verification.gates;
  for (const field of ["pass", "fail", "skip"]) {
    const sum = gates.reduce((total, gate) => total + gate[field], 0);
    if (sum !== facts.compatibility.verification[field]) {
      throw new Error(
        `verification ${field} total ${facts.compatibility.verification[field]} does not equal gate sum ${sum}`,
      );
    }
  }

  const fixtures = facts.compatibility.wazero.fixtures;
  const fixtureSum =
    fixtures.fuzzBinaries +
    fixtures.engineBinaries +
    fixtures.extendedConstantArtifacts +
    fixtures.failClosedProposalArtifacts;
  if (fixtureSum !== fixtures.totalArtifacts) {
    throw new Error(
      `wazero fixture total ${fixtures.totalArtifacts} does not equal manifest sum ${fixtureSum}`,
    );
  }

  const proposalNames = facts.webAssembly.proposals.map((proposal) => proposal.name);
  if (new Set(proposalNames).size !== proposalNames.length) {
    throw new Error("WebAssembly proposal names must be unique");
  }

  for (const [name, item] of Object.entries(facts.evidence)) {
    if (
      item.url.startsWith(`https://github.com/${REPO}/blob/`) &&
      !item.url.includes(`/blob/${facts.source.commit}/`)
    ) {
      throw new Error(`evidence ${name} is not pinned to ${facts.source.commit}`);
    }
  }
}

async function syncFile(path, content, stale) {
  const current = (await exists(path)) ? await readFile(path, "utf8") : "";
  if (current === content) return;
  if (CHECK) {
    stale.push(relative(ROOT, path));
    return;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

const loaded = Object.fromEntries(
  await Promise.all(INPUTS.map(async (name) => [name, await load(name)])),
);
const stats = JSON.parse(await readFile(STATS, "utf8"));
const commit = localCommit() || (await remoteCommit());
if (!/^[0-9a-f]{40}$/i.test(commit)) throw new Error(`invalid Wago commit: ${commit}`);

requireText(loaded["README.md"], "pure-Go, no-cgo WebAssembly JIT", "README.md");
requireText(loaded["README.md"], "Compile once, instantiate many times", "README.md");
requireText(loaded["README.md"], "same non-concurrent-call and result", "README.md");
requireText(loaded["README.md"], "MaxMemoryBytes", "README.md");
requireText(loaded["README.md"], "MaxTableEntries", "README.md");
requireText(loaded["FEATURES.md"], "Cooperative invocation cancellation", "FEATURES.md");
requireText(loaded[".github/workflows/ci.yml"], "Linux / arm64", ".github/workflows/ci.yml");
requireText(loaded[".github/workflows/ci.yml"], "Darwin / arm64", ".github/workflows/ci.yml");
requireText(loaded["src/wago/api.go"], "Native cancellation is available on amd64/arm64", "src/wago/api.go");
requireText(loaded["src/wago/managed_instances.go"], "Calls on one instance must be serialized", "src/wago/managed_instances.go");
requireText(loaded["src/wago/instance_native_context.go"], "nativeExecutionMu is the initial correctness execution lease", "src/wago/instance_native_context.go");
requireText(loaded["src/wago/policy.go"], "Accepted but not yet enforced", "src/wago/policy.go");

const verify = match(
  loaded["VERIFICATION.md"],
  /Generated by `make verify-public` on `([^`]+)`[\s\S]*?checks pass=(\d+) fail=(\d+) skip=(\d+)/,
  "VERIFICATION.md",
  "verification result",
);
const gateMatches = [
  ...loaded["VERIFICATION.md"].matchAll(
    /^\| ([^|]+) \| (\d+) \| (\d+) \| (\d+) \| ([^|]+) \|$/gm,
  ),
];
const wazero = match(
  loaded["docs/wazero-test-applicability.md"],
  /revision `([0-9a-f]{40})`[\s\S]*?all \*\*(\d+)\*\* upstream Go test files/,
  "docs/wazero-test-applicability.md",
  "wazero revision and file count",
);
const wazeroFixtures = match(
  loaded["testdata/wazero/README.md"],
  /includes (\d+) fuzz binaries, (\d+) engine binaries, all (\d+) generated[\s\S]*?all (\d+) generated artifacts[\s\S]*?The (\d+) upstream artifacts[\s\S]*?SHA-256 digest\s+`([0-9a-f]{64})`/,
  "testdata/wazero/README.md",
  "wazero fixture counts and digest",
);
const [mvpCorpusCommit, coreV2CorpusCommit] = await Promise.all([
  resolveGitlink("tests/spec", "WAGO_SPEC1_COMMIT"),
  resolveGitlink("tests/spec-v2", "WAGO_SPEC2_COMMIT"),
]);

const evidenceMap = {
  readme: evidence(commit, "README.md", "README", "#L48-L97"),
  features: evidence(commit, "FEATURES.md", "feature matrix", "#L45-L63"),
  verification: evidence(commit, "VERIFICATION.md", "public verification", "#L1-L15"),
  ci: evidence(commit, ".github/workflows/ci.yml", "native CI matrix", "#L92-L214"),
  api: evidence(commit, "src/wago/api.go", "public API source", "#L1675-L1715"),
  concurrency: evidence(commit, "src/wago/wazero_concurrency_port_test.go", "race-tested concurrency port", "#L13-L86"),
  nativeExecution: evidence(commit, "src/wago/instance_native_context.go", "native execution serialization", "#L10-L67"),
  memory: evidence(commit, "src/wago/memory.go", "borrowed memory-view contract", "#L84-L113"),
  policy: evidence(commit, "src/wago/policy.go", "resource policy enforcement", "#L10-L67"),
  wazeroLedger: evidence(commit, "docs/wazero-test-applicability.md", "wazero applicability ledger", "#L1-L66"),
  wazeroFixtures: evidence(commit, "testdata/wazero/README.md", "wazero fixture manifest", "#L1-L23"),
};

const webAssemblyGroups = stats.versions.filter((group) => group.version !== "engine");
const facts = {
  $schema: "https://wago.sh/data/facts.schema.json",
  schemaVersion: 1,
  generated: stats.generated,
  canonicalUrl: "https://wago.sh/data/facts.json",
  source: {
    repository: `https://github.com/${REPO}`,
    ref: REF,
    commit,
    commitUrl: `https://github.com/${REPO}/commit/${commit}`,
  },
  identity: {
    name: "wago",
    implementation: "Go",
    pureGo: true,
    cgo: false,
    execution: "single-pass native compiler",
    interpreter: false,
  },
  release: {
    status: "Pre-v0.1 development with nightly and canary artifacts; public stable installation is not yet claimed.",
    stableVersion: null,
    apiStability: "pre-v1; no stable-v1 compatibility promise",
  },
  platforms: [
    { target: "linux/amd64", status: "supported", detail: "native runtime CI", evidence: [evidenceMap.ci] },
    { target: "linux/arm64", status: "supported", detail: "native runtime CI", evidence: [evidenceMap.ci] },
    { target: "darwin/arm64", status: "supported", detail: "native runtime CI", evidence: [evidenceMap.ci] },
    { target: "darwin/amd64", status: "compiler-only", detail: "portable compiler/encoder checks; native JIT ABI is not claimed", evidence: [evidenceMap.ci] },
    { target: "windows/*", status: "planned", detail: "no native runtime target claimed", evidence: [evidenceMap.features] },
  ],
  concurrency: {
    runtime: "concurrent compile/instantiate/execute on distinct objects is race-tested",
    compiledModule: "compile once and instantiate many; blanket method-level goroutine-safety is not yet documented",
    instance: "one active caller at a time; serialize calls",
    separateInstances: "concurrent callers are accepted, but native Wasm activations are serialized process-wide",
    nativeExecutionParallelism: "one process-wide native activation at a time",
    resultLifetime: "instance-owned result buffer remains valid only until the next call",
  },
  limits: {
    declaredMemory: true,
    declaredTables: "partial: initial/minimum size checked; growth maximum is not enforced by Policy.MaxTableEntries",
    deadlineInterruption: { amd64: true, arm64: true, mechanism: "cooperative native safepoints" },
    policyMaxInvokeDuration: "accepted-but-not-enforced",
    deterministicFuel: false,
    aggregateMemoryAccounting: false,
  },
  wasi: {
    delivery: "outside core; external plugin integration exists but its function-level support was not audited here",
    preview1: "function-level support matrix not published",
    preview2: "not claimed",
  },
  webAssembly: {
    mvpLegacyReport: stats.mvp,
    verification: stats.verification,
    proposals: webAssemblyGroups.flatMap((group) =>
      group.features.map((feature) => ({
        name: feature.label,
        status: feature.status,
        evidence: [evidenceMap.features],
      })),
    ),
  },
  compatibility: {
    verification: {
      wagoCommit: commit,
      host: verify[1],
      pass: Number(verify[2]),
      fail: Number(verify[3]),
      skip: Number(verify[4]),
      gates: gateMatches.map((gate) => ({
        name: gate[1].trim(),
        pass: Number(gate[2]),
        fail: Number(gate[3]),
        skip: Number(gate[4]),
        unit: gate[5].trim(),
      })),
      corpora: [
        {
          name: "WebAssembly MVP testsuite",
          repository: "https://github.com/WebAssembly/testsuite",
          commit: mvpCorpusCommit,
        },
        {
          name: "WebAssembly Core 2.0 specification tests",
          repository: "https://github.com/WebAssembly/spec",
          commit: coreV2CorpusCommit,
        },
      ],
    },
    wazero: {
      repository: "https://github.com/tetratelabs/wazero",
      commit: wazero[1],
      filesAudited: Number(wazero[2]),
      method: "ported/adapted coverage with an applicability ledger",
      fixtures: {
        fuzzBinaries: Number(wazeroFixtures[1]),
        engineBinaries: Number(wazeroFixtures[2]),
        extendedConstantArtifacts: Number(wazeroFixtures[3]),
        failClosedProposalArtifacts: Number(wazeroFixtures[4]),
        totalArtifacts: Number(wazeroFixtures[5]),
        sha256: wazeroFixtures[6],
      },
    },
    wasmtime: { suiteImported: false, claim: "No full Wasmtime suite claim is published." },
  },
  security: {
    dedicatedPolicyPublished: false,
    thirdPartyAuditClaimed: false,
    fuzzTestsPresent: true,
    recommendedAdditionalBoundary: "process or container isolation for hostile multi-tenant guests",
  },
  benchmarks: {
    allocationMeaning: "Go heap allocation traffic measured during the named operation",
    allocationExcludes: ["guest linear memory", "native code mappings", "native virtual-memory reservations", "process RSS/PSS"],
    manyInstance: { status: "protocol-published-results-not-measured", instanceCounts: [1, 8, 80, 120] },
  },
  evidence: evidenceMap,
};
validateFacts(facts);

const generated = new Map([
  [OUT, `${JSON.stringify(facts, null, 2)}\n`],
  [OUT_SCHEMA, `${JSON.stringify(factsSchema(), null, 2)}\n`],
  [join(ROOT, "facts.md"), factsMarkdown(facts)],
  [join(ROOT, "compatibility.md"), compatibilityMarkdown(facts)],
  [join(ROOT, "security.md"), securityMarkdown(facts)],
  [join(ROOT, "benchmarks.md"), benchmarksMarkdown(facts)],
]);

const stale = [];
for (const [path, content] of generated) await syncFile(path, content, stale);

if (CHECK && stale.length) {
  console.error(`Canonical facts are stale: ${stale.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(
    `Canonical facts are current for ${commit.slice(0, 12)}: ${generated.size} generated files`,
  );
}
