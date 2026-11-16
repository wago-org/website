import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const facts = JSON.parse(await read("data/facts.json"));
const project = JSON.parse(await read("data/project.json"));
const brief = await read("llms.txt");
const full = await read("llms-full.txt");
const index = await read("index.html");

test("LLM views share canonical source, license, concurrency, and deadline facts", () => {
  assert.deepEqual(project.canonicalFacts, facts);
  assert.equal(project.license, facts.identity.license);
  for (const output of [brief, full]) {
    assert.ok(output.includes(facts.source.commitUrl));
    assert.ok(output.includes(`License: ${facts.identity.license}`));
    assert.ok(output.includes(facts.concurrency.separateInstances));
    assert.ok(output.includes(facts.limits.deadlineInterruption.mechanism));
    assert.ok(output.includes("HostCall"));
    assert.ok(output.includes("borrowed"));
    assert.doesNotMatch(output, /currently serialized process-wide|one process-wide native activation at a time|per-commit canary tags|Apache-2.0/);
  }
});

test("machine-readable platform lists include every documented target", () => {
  const targets = facts.platforms.filter((p) => p.status === "supported").map((p) => p.target);
  assert.deepEqual(project.facts.nativeArchitectures, [...new Set(targets.map((p) => p.split("/")[1]))]);
  const scripts = [...index.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const graph = scripts.flatMap((m) => JSON.parse(m[1])["@graph"] ?? []);
  const software = graph.find((node) => node["@type"] === "SoftwareApplication");
  assert.ok(software);
  assert.doesNotMatch(index, /Apache-licensed|Apache 2\.0/);
  assert.deepEqual(software.operatingSystem, targets);
  assert.ok(software.license.endsWith(`/${facts.source.commit}/LICENSE`));
  assert.equal(graph.find((node) => node["@type"] === "Dataset").license, undefined);
});

test("brief distinguishes product provenance from historical benchmark statistics", () => {
  assert.ok(brief.includes(`Statistics snapshot date: ${project.generated}`));
  assert.ok(brief.includes("Published benchmark snapshots are not measurements of every newer commit"));
  assert.ok(brief.includes("Historical conformance counts do not establish current whole-suite success"));
});
