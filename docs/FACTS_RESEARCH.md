# Wago canonical-facts research

Audited source: [`wago-org/wago@227dfd64ddb3760ae8547eb69a27da38c6cd8676`](https://github.com/wago-org/wago/commit/227dfd64ddb3760ae8547eb69a27da38c6cd8676).

This replaces the July evidence ledger, whose license, release, platforms, concurrency, table-policy and interruption claims no longer described main. Generated facts remain source-pinned; the statistics date is not a claim that old benchmark measurements were rerun against that source revision.

## Current evidence and qualifications

All source paths below refer to the audited revision above. `data/facts.json` carries immutable evidence links.

| Area | Verified statement | Source |
| --- | --- | --- |
| License | Wago is MPL-2.0, not Apache-2.0. Do not infer a license for this website's combined dataset. | `LICENSE`, `README.md` |
| Releases | Beta/pre-v1; public installers are documented. Canary tags are discontinued; development builds use commit hashes. CI publishes commit-addressed artifacts, not canary tags/releases. | `README.md`, `go.mod`, `.github/workflows/canary.yml` |
| Execution | Pure-Go/no-cgo Railshot single-pass native compiler; no interpreter tier. No universal performance superiority claim follows. | `src/wago/doc.go`, `README.md`, `ARCHITECTURE.md` |
| Platforms | Derive native targets from the README marker, not a fixed architecture list. Target support does not mean every host/configuration has identical interruption or proposal coverage. | `README.md`, `.github/workflows/ci.yml` |
| Concurrency | Serialize public calls on each instance. Eligible independent instances use local execution leases by default; imported state, cross-instance Wasm bindings and shared GC domains may require the global fallback. Native-resource publication can revoke independence. Private threaded execution has a local-lease path, so not all shared memory implies global serialization. | `src/wago/config.go`, `instantiate.go`, `instance_native_context.go`, `hostcall_test.go` |
| Interruption | Standard-Go Linux amd64/arm64 and Darwin arm64 support asynchronous native interruption; other supported amd64/arm64 configurations use cooperative safepoints. TinyGo cancelable entry requires the threads scheduler. Deterministic fuel is not implemented. | `src/core/runtime/interrupt_linux.go`, `interrupt_darwin_arm64.go`, `src/wago/api.go`, TinyGo interrupt files |
| Table policy | Policy checks per-table runtime capacity and resolved imported capacity at admission, not merely initial size. This is not an aggregate table-memory governor. | `src/wago/policy.go`, `policy_test.go` |
| Bounds | Explicit checks default without `wago_guardpage`; the tag changes the default and `WAGO_BOUNDS` can override selection. | `src/wago/config.go` and bounds build-tag files |
| APIs | Use documented `HostFunc`, `HostCall`, `WasmFunc` and `InvokeContext`; invocation results and callback slots are borrowed. V128 callback boundaries remain unsupported. `I32HostEvent` callbacks are deferred, not synchronous substitutes. | `README.md`, `src/wago/api.go`, `hostcall.go` |
| Integrations | WASI and other host capabilities are plugins outside core. Do not infer full Preview 1/2 or Component Model coverage from plugin availability. | `README.md` |
| Measurements | Preserve architecture, workload, units and measurement kind. Historical MVP counts and imported regression corpora do not prove whole-suite success at every newer commit. No benchmark values were remeasured by this documentation refresh. | `data/stats.json`, `benchmarks.md`, `compatibility.md` |

## Maintaining the generated views

Update `scripts/sync-facts.mjs` and `scripts/sync-ai-metadata.mjs`, not generated outputs alone. Share facts across concise/full briefs, JSON and JSON-LD. Regenerate against an explicit clean `WAGO_DIR`, run both check modes, metadata regression tests, parser tests and the site build. Source-file links deliberately avoid obsolete hardcoded line ranges.
