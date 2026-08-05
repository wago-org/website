import assert from "node:assert/strict";
import test from "node:test";

import { parseSIMDAssertions } from "./stats-parsers.mjs";

test("parses the legacy official SIMD proposal wording", () => {
  const features = `| SIMD (\`v128\`) | ✓ | The official SIMD proposal corpus passes via WABT (24,325 assertions, 0 skipped). |`;
  assert.equal(parseSIMDAssertions(features), 24_325);
});

test("parses the current official SIMD acceptance wording", () => {
  const features = `| SIMD (\`v128\`) | ✓ | ARM64 has full official SIMD corpus acceptance (470 modules / 24,325 assertions, zero failures). The relaxed suite passes 69 assertions. |`;
  assert.equal(parseSIMDAssertions(features), 24_325);
});

test("rejects unrelated SIMD assertion counts", () => {
  const features = `| SIMD (\`v128\`) | ✓ | Focused lowering tests pass 69 assertions. |`;
  assert.throws(
    () => parseSIMDAssertions(features),
    /could not find the official SIMD assertion count/,
  );
});
