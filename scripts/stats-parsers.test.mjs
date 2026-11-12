import assert from "node:assert/strict";
import test from "node:test";

import { parseFeatureRows, parsePlatformTargets, parseSIMDAssertions } from "./stats-parsers.mjs";

test("parses legacy and current feature tables by status column", () => {
  const legacy = `### WebAssembly 1.0 (MVP)\n| Feature | Planned | Status |\n| --- | --- | --- |\n` + Array.from({length: 10}, (_, i) => `| Feature ${i} | ✓ | ✅ done |`).join("\n");
  const current = `## Phase 5\n| Feature | Status | Perspective |\n| --- | --- | --- |\n` + Array.from({length: 10}, (_, i) => `| [Feature ${i}](https://example.com/${i}) | ${i === 0 ? '🔌 🚧' : i === 1 ? '' : i === 2 ? '❌' : '✔️'} | good |`).join("\n");
  assert.equal(parseFeatureRows(legacy).filter((row) => row.mvp && row.status === "done").length, 10);
  const rows = parseFeatureRows(current);
  assert.deepEqual(rows[0], { feature: "Feature 0", status: "partial", mvp: false });
  assert.equal(rows[1].status, "unknown");
  assert.equal(rows[2].status, "unsupported");
  assert.equal(rows.filter((row) => row.status === "done").length, 7);
});

test("rejects unrecognized feature matrices", () => {
  assert.throws(() => parseFeatureRows("| Feature | Status | Perspective |\n| example | unknown | good |"), /only parsed 0/);
});

test("parses the legacy official SIMD proposal wording", () => {
  const features = `| SIMD (\`v128\`) | ✓ | The official SIMD proposal corpus passes via WABT (24,325 assertions, 0 skipped). |`;
  assert.equal(parseSIMDAssertions(features), 24_325);
});

test("parses the current official SIMD acceptance wording", () => {
  const features = `| SIMD (\`v128\`) | ✓ | ARM64 has full official SIMD corpus acceptance (470 modules / 24,325 assertions, zero failures). The relaxed suite passes 69 assertions. |`;
  assert.equal(parseSIMDAssertions(features), 24_325);
});

test("parses the verification SIMD row when feature prose has no count", () => {
  const text = `| SIMD | 24325 | 0 | 0 | execution assertions |`;
  assert.equal(parseSIMDAssertions(text), 24325);
});

test("rejects unrelated SIMD assertion counts", () => {
  const features = `| SIMD (\`v128\`) | ✓ | Focused lowering tests pass 69 assertions. |`;
  assert.throws(
    () => parseSIMDAssertions(features),
    /could not find the official SIMD assertion count/,
  );
});

test("parses supported targets and rejects unknown platform claims", () => {
  assert.equal(parsePlatformTargets("Wago supports Linux on amd64, arm64, and riscv64, plus macOS and Windows on\namd64 and arm64.").length, 7);
  assert.equal(parsePlatformTargets("Wago supports Linux, macOS, and Windows on amd64 and arm64").length, 6);
  assert.throws(() => parsePlatformTargets("Wago supports everything"));
});
