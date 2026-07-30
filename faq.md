# Wago FAQ

Last synchronized: 2026-07-30
Wago source commit: 7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de
Canonical JSON: https://wago.sh/data/facts.json

## What is Wago?

Wago is a WebAssembly engine implemented in Go. It decodes, validates, compiles, instantiates, and executes modules itself rather than wrapping a C or C++ runtime.

## Is Wago pure Go, and does it use cgo?

The Wago engine is pure Go and does not use cgo.

## Which native runtime targets does Wago support?

Required native runtime CI currently covers linux/amd64, linux/arm64, darwin/arm64. Darwin/amd64 receives portable compiler checks but is not a supported native runtime target; Windows native execution is not currently claimed.

## Is Wago a JIT or an AOT compiler?

The least ambiguous description is single-pass native compiler. Wago compiles Wasm to native code during Compile and has no interpreter tier. Its Go interface can also serialize versioned .wago compiled blobs, but stable portable artifact compatibility is not promised.

## What is Wago’s current release status?

Pre-v0.1 development with nightly and canary artifacts; public stable installation is not yet claimed.

## Can Wago instances execute concurrently?

Calls on one instance must be serialized. Concurrent goroutines may call separate instances, but native Wasm activations are currently serialized process-wide, so independent instances are not fully parallel.

## Can Wago interrupt an infinite or CPU-bound guest?

Yes on amd64 and arm64 when the caller uses Call or InvokeContext with a canceled context or deadline. Interruption occurs at cooperative native safepoints. Wago does not currently expose deterministic fuel accounting, and Policy.MaxInvokeDuration is reserved rather than enforced.

## How does Wago bound memory and tables?

Wago can cap a module’s declared maximum linear memory. Policy.MaxTableEntries currently checks each table’s initial or minimum size, not its complete growth ceiling. No runtime-wide aggregate memory budget is published.

## Which WASI version does Wago support?

WASI is outside Wago core. External plugin integration exists, but this audit did not establish a function-by-function Preview 1 or Preview 2 support matrix, so complete WASI coverage is not claimed.

## Does Wago pass the full wazero and Wasmtime test suites?

No such blanket claim is made. Wago maintains a pinned applicability ledger for all 234 wazero Go test files and ports or adapts relevant contracts and fixtures. No comparable Wasmtime suite import is published.

## Do Wago’s allocation benchmarks measure total instance memory?

No. The published allocation rows measure Go heap allocation traffic during the named operation. They exclude guest linear memory, native code mappings, virtual-memory reservations, RSS, and PSS.

## Has Wago published an 80-instance memory benchmark?

Not yet. A reproducible protocol for 1, 8, 80, and 120 instances is published, but no synthetic results or memory headline are claimed.
