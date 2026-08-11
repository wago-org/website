# WebAssembly proposal/version audit

Audit date: 2026-08-11
Official proposal snapshot: [`WebAssembly/proposals@f0db14a`](https://github.com/WebAssembly/proposals/tree/f0db14a5555abf7b931667fd289755124a3bf37e) (2026-08-10)
Website source audited: [`scripts/sync-stats.mjs`](../scripts/sync-stats.mjs)

## Conclusion

The website includes every proposal applicable to Wago's Go-native runtime under the chosen product boundary:

- **WebAssembly 1.0:** represented as Wago's 17 detailed MVP implementation families rather than two umbrella proposal rows. Mutable globals are covered by the generated `Globals` and import/export rows.
- **WebAssembly 2.0:** includes all six runtime-applicable proposals. **JavaScript BigInt to WebAssembly i64 integration** is intentionally omitted because it defines JavaScript host-boundary conversion and does not apply to Wago's Go API.
- **WebAssembly 3.0:** includes all nine runtime-applicable proposals. **JS String Builtins** and **Custom Annotation Syntax in the Text Format** are intentionally omitted because Wago exposes a Go-native binary-Wasm runtime, not JavaScript embedding or WAT parsing.
- **Future features:** all 31 currently active Phase 1-5 proposals are present and there are no extras. Phase ordering and the **Acquire-Release Atomics** name now match the official tracker snapshot.

The authoritative released-version inventory is the proposal repository's finished table, because it uniquely records both `Spec Version` and `Affected specs`. Its complete rows are [1.0](https://github.com/WebAssembly/proposals/blob/f0db14a5555abf7b931667fd289755124a3bf37e/finished-proposals.md#L7-L8), [2.0](https://github.com/WebAssembly/proposals/blob/f0db14a5555abf7b931667fd289755124a3bf37e/finished-proposals.md#L9-L15), and [3.0](https://github.com/WebAssembly/proposals/blob/f0db14a5555abf7b931667fd289755124a3bf37e/finished-proposals.md#L16-L26).

## Released-version inventory

These are additions assigned to each edition, not mutually exclusive runtime modes. Wasm evolution remains backward-compatible and feature-tested; the official goals explicitly call for a [versionless evolution story on the Web](https://webassembly.org/docs/high-level-goals/).

### WebAssembly 1.0

| Official proposal | Affected specs | Website result |
|---|---|---|
| MVP | core, js-api, web-api | Not named; replaced by 17 granular Wago MVP feature families |
| Import/Export of Mutable Globals | core, js-api | Not named; functionally folded into `Globals` and `Memory / table / global imports & exports` |

The deliberate extra detail is useful for the MVP surface and does not omit runtime capability: the group heading represents MVP while the rows expose its implementation families.

### WebAssembly 2.0

| Official proposal | Affected specs | Website result |
|---|---|---|
| Non-trapping float-to-int conversions | core | Present as `Non-trapping float→int` |
| Sign-extension operators | core | Present as `Sign-extension ops` |
| Multi-value | core, js-api | Present |
| JavaScript BigInt to WebAssembly i64 integration | js-api | Intentionally omitted as non-applicable to Wago's Go-native runtime |
| Reference Types | core, js-api | Present |
| Bulk memory operations | core | Present as `Bulk memory` |
| Fixed-width SIMD | core, js-api | Present |

The [official Wasm 2.0 announcement](https://webassembly.org/news/2025-03-20-wasm-2.0/) likewise summarizes the six language additions. The finished-proposals ledger records the JS-only integration for completeness, while the website intentionally scopes this released-version tracker to features applicable to Wago's runtime boundary.

### WebAssembly 3.0

| Official proposal | Affected specs | Website result |
|---|---|---|
| Tail call | core | Present as `Tail calls` |
| Extended Constant Expressions | core | Present as `Extended const expressions` |
| Typed Function References | core, js-api | Present |
| Garbage collection | core, js-api | Present |
| Multiple memories | core, js-api | Present |
| Relaxed SIMD | core | Present |
| Custom Annotation Syntax in the Text Format | core | Intentionally omitted because Wago does not parse WAT |
| Branch Hinting | core | Present |
| Exception handling | core, js-api | Present |
| JS String Builtins | core, js-api | Intentionally omitted as non-applicable to Wago's Go-native runtime |
| Memory64 | core | Present |

All nine runtime-applicable 3.0 proposals are present, with JS String Builtins and WAT-only custom annotations deliberately outside the tracker boundary. The [Wasm 3.0 announcement](https://webassembly.org/news/2025-09-17-wasm-3.0/) is again only a narrative summary: it does not name Extended Constant Expressions or Branch Hinting, and it describes a Deterministic Profile that is not a separate finished-proposal row. The finished-proposals ledger remains the source for version assignment.

## Current Future-features inventory

The proposal tracker says Phase 5 entries below are standardized but **not yet merged into the spec**, so they belong under Future rather than 3.0. The official current lists are [Phase 5 and Phase 4](https://github.com/WebAssembly/proposals/blob/f0db14a5555abf7b931667fd289755124a3bf37e/README.md#L10-L25), [Phase 3](https://github.com/WebAssembly/proposals/blob/f0db14a5555abf7b931667fd289755124a3bf37e/README.md#L27-L34), [Phase 2](https://github.com/WebAssembly/proposals/blob/f0db14a5555abf7b931667fd289755124a3bf37e/README.md#L36-L48), and [Phase 1](https://github.com/WebAssembly/proposals/blob/f0db14a5555abf7b931667fd289755124a3bf37e/README.md#L50-L66).

| Phase | Official proposals | Website discrepancies |
|---|---|---|
| 5 | JS Promise Integration; Web Content Security Policy | Both present |
| 4 | Threads; Compact Import Section; Wide Arithmetic | All present; `Threads & atomics` is a descriptive rename of `Threads` |
| 3 | ESM Integration; Stack Switching; Custom Page Sizes; Custom Descriptors and JS Interop | All present at the right effective membership |
| 2 | Relaxed dead code validation; Numeric Values in WAT Data Segments; Extended Name Section; Rounding Variants; Compilation Hints; JS Primitive Builtins; Acquire-Release Atomics; Multibyte Array Access; FP16 | All present |
| 1 | Type Imports; Component Model; WebAssembly C and C++ API; Flexible Vectors; Memory control; Reference-Typed Strings; Profiles; Shared-Everything Threads; Frozen Values; More Array Constructors; JIT Interface; Type Reflection for WebAssembly JavaScript API; JS Text Encoding Builtins | All present; several harmless shortened labels |

The active tracker does not publish an `Affected specs` column, so a precise core/embedding classification for active work cannot be copied from the central ledger. At minimum, the UI/data model should avoid implying that all Future entries are core instructions:

- Clearly embedding or non-core surfaces: ESM Integration; WebAssembly C and C++ API; JIT Interface; Type Reflection for the WebAssembly JavaScript API; Component Model.
- Explicit JS/Web or cross-layer work: JS Promise Integration; Web Content Security Policy; Custom Descriptors and JS Interop; JS Primitive Builtins; JS Text Encoding Builtins.
- Core, text/binary-format, or tool-convention work: the remaining proposals, with Threads and Stack Switching potentially requiring embedding/API work as their specifications mature.

That classification is an audit aid inferred from the official proposal titles and linked first-party repositories, not central tracker metadata. For released proposals, use the exact `Affected specs` values above.

## Applied tracker policy

1. Keep JavaScript BigInt-to-i64 integration, JS String Builtins, and WAT-only custom annotations omitted as non-applicable to Wago's Go-native binary-Wasm runtime.
2. Keep WebAssembly 1.0 as the more detailed implementation-family checklist.
3. Use the canonical `Acquire-Release Atomics` name.
4. Order Future entries by the current Phase 5 through Phase 1 tracker.
5. Keep active Phase 5 proposals under Future until they are merged into a released specification.

## Ambiguities to preserve

- `Spec Version` in the official finished table is the assignment authority. Marketing announcements are useful explanations, not exhaustive inventories.
- Released edition lists are cumulative deltas. They should not suggest that engines negotiate mutually exclusive Wasm binary versions.
- A proposal can affect `core` and an embedding API simultaneously. A native engine may legitimately mark the embedding portion not applicable, but the proposal should not disappear from a tracker claiming complete proposal coverage.
- Phase 0 ideas and inactive proposals are intentionally excluded from Future; the site's own rule is Phase 1+ active proposals.
