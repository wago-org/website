# Wago canonical-facts research

Research date: 2026-07-29
Publishable source revision: [`wago-org/wago@7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de`](https://github.com/wago-org/wago/commit/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de) (`origin/main`)
Source revision date: 2026-07-27T17:41:44-07:00

This note uses committed `origin/main`, not the dirty local feature branch. It is an evidence ledger for generating website facts, not website copy itself. “Supported” below means the native runtime is exercised by required CI; a binary merely compiling is not treated as runtime support.

## Recommended canonical facts

### Identity, release state, and execution model

| Fact | Recommended machine value | Evidence and qualification |
|---|---|---|
| Product | Pure-Go, no-cgo WebAssembly engine | The architecture says modules are decoded, validated, compiled to native machine code, and executed directly from Go without a C toolchain, cgo, or FFI ([`ARCHITECTURE.md:3-7`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/ARCHITECTURE.md#L3-L7)). Release builds set `CGO_ENABLED=0` ([`.github/workflows/release.yml:84-90`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/.github/workflows/release.yml#L84-L90)). |
| Execution terminology | `single-pass native compiler`; optionally clarify `JIT-only, no interpreter tier` | The pipeline compiles Wasm to native code during `Compile` and executes it after instantiation ([`ARCHITECTURE.md:51-81`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/ARCHITECTURE.md#L51-L81)). The README calls the backend a direct single-pass compiler and says it is not an optimizing tier ([`README.md:566-574`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/README.md#L566-L574)). Do not call Wago “AOT” without explaining the optional compiled-blob API. |
| Stable release | None evidenced at this revision | There is no `v*` tag in the local canonical tag set. The README still says the public prebuilt installer is intended for after `v0.1.0` and builds from source until then ([`README.md:48-64`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/README.md#L48-L64)); the build system calls `0.0.0` the pre-release default until the first tag ([`Makefile:152-154`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/Makefile#L152-L154)). Canonical website status should therefore be `pre-release` or `development`, not `0.1.0-beta.3`. |
| Available channels | Canary and nightly prereleases | The README defines uniquely tagged nightly/canary channels ([`README.md:87-97`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/README.md#L87-L97)); the version manager recognizes `canary-*` and `nightly-*` as moving channels ([`cli/wagocli/version_common.go:145-163`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/cli/wagocli/version_common.go#L145-L163)). |
| Version field | `null` for stable version; publish `commit=7d8c58a…` and channel separately | An unstamped local build reports `0.0.0`, which is a fallback rather than a release version ([`cli/wagocli/main.go:12-21`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/cli/wagocli/main.go#L12-L21)). Do not synthesize a beta SemVer. |

### Platform support

| Platform | Recommended status | Evidence |
|---|---|---|
| `linux/amd64` | `supported` | Required native runtime, guard-page, corpus, SIMD, race, and Core v2 CI run on this target ([`.github/workflows/ci.yml:78-113`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/.github/workflows/ci.yml#L78-L113), [`.github/workflows/ci.yml:153-214`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/.github/workflows/ci.yml#L153-L214)). The architecture calls it the mature production target ([`ARCHITECTURE.md:9-13`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/ARCHITECTURE.md#L9-L13)). |
| `linux/arm64` | `supported` (or `supported, qualifying` if product language must remain conservative) | It has the same required native runtime, guard, corpus, SIMD and Core v2 CI gates as Linux/amd64 ([`.github/workflows/ci.yml:107-113`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/.github/workflows/ci.yml#L107-L113), [`.github/workflows/ci.yml:186-214`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/.github/workflows/ci.yml#L186-L214)). |
| `darwin/arm64` | `supported` (or `supported, qualifying`) | Required CI runs native runtime, guard-page, corpus, and SIMD tests ([`.github/workflows/ci.yml:121-127`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/.github/workflows/ci.yml#L121-L127), [`.github/workflows/ci.yml:153-184`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/.github/workflows/ci.yml#L153-L184)). |
| `darwin/amd64` | `unsupported-native-runtime` | CI explicitly sets `runtime: false` and says the native JIT ABI is not implemented ([`.github/workflows/ci.yml:114-120`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/.github/workflows/ci.yml#L114-L120), [`.github/workflows/ci.yml:157-162`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/.github/workflows/ci.yml#L157-L162)). |
| Windows | `unsupported-native-runtime` | Release jobs only make best-effort cross-platform binaries; their own header says non-Linux native JIT ports may be incomplete ([`.github/workflows/release.yml:3-5`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/.github/workflows/release.yml#L3-L5), [`.github/workflows/release.yml:42-65`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/.github/workflows/release.yml#L42-L65)). There is no Windows runtime test cell in required CI. |

The architecture target marker is mechanically checked as `linux/amd64 linux/arm64 darwin/arm64` ([`src/wago/documentation_consistency_test.go:11-24`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/documentation_consistency_test.go#L11-L24)). This is stronger current evidence than stale README/FEATURES prose saying only Linux/amd64 ships.

### Concurrency contract

| Object or operation | Supported statement | Evidence / caveat |
|---|---|---|
| `Runtime` | A shared runtime is regression-tested under concurrent compile, instantiate, and execute operations. | The race-oriented port uses 16 workers sharing one `Runtime` ([`src/wago/wazero_concurrency_port_test.go:13-38`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/wazero_concurrency_port_test.go#L13-L38), [`:52-86`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/wazero_concurrency_port_test.go#L52-L86)); required CI also runs focused packages with `-race` ([`.github/workflows/ci.yml:78-90`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/.github/workflows/ci.yml#L78-L90)). There is no complete public operation-by-operation Runtime concurrency contract. |
| `Compiled` | Compile once and instantiate many times. Existing instances retain the native mapping if `Compiled.Close` is called. | README guidance: [`README.md:247-252`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/README.md#L247-L252). The code cache is mutex/refcount protected, and close prevents future instantiation while existing instances retain it ([`src/wago/code_mapping.go:11-17`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/code_mapping.go#L11-L17), [`:37-76`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/code_mapping.go#L37-L76)). **Unknown:** no source explicitly promises that concurrent `Instantiate` calls on the same `Compiled` are a stable public contract. |
| `Instance` calls | Not safe for concurrent public calls; serialize calls per instance. Returned raw results are invalidated by the next call. | `PreparedFunction` explicitly says both it and its instance are not safe for concurrent calls because buffers are reused ([`src/wago/prepared_function.go:9-13`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/prepared_function.go#L9-L13)); `Invoke` documents the same result-buffer lifetime ([`src/wago/api.go:1675-1684`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/api.go#L1675-L1684)). The invocation lease counts concurrent entries for safe close; it does **not** reject a second active call ([`src/wago/instance_lifecycle.go:140-175`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/instance_lifecycle.go#L140-L175)). |
| Separate instances | They may be called by concurrent goroutines, but native Wasm execution is currently serialized process-wide. Do **not** claim “fully parallel independent instances.” | `nativeExecutionMu` intentionally permits exactly one process-wide native activation ([`src/wago/instance_native_context.go:10-30`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/instance_native_context.go#L10-L30)); every native entry holds it until return ([`src/wago/instance_native_context.go:51-67`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/instance_native_context.go#L51-L67)). Host dispatch temporarily releases it while arbitrary Go host code runs ([`src/wago/host_execution.go:64-79`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/host_execution.go#L64-L79)). |
| Memory view | `Memory.Bytes()` is a borrowed, zero-copy view valid only while memory and its owner remain open; callers must synchronize it against `Memory.Close`/`Instance.Close`. | [`src/wago/memory.go:84-113`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/memory.go#L84-L113). Instance `Read` copies while `Write` copies into guest memory and both hold an invocation lease against close ([`src/wago/memory_access.go:233-262`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/memory_access.go#L233-L262)). **Unknown:** there is no promise that a raw view or host reads/writes are race-free against guest memory mutation or `memory.grow`. |
| Shared memory | Explicit `NewSharedMemory` state and growth are visible to all compatible importers. | [`src/wago/memory.go:44-49`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/memory.go#L44-L49). This does not make unsynchronized bytes data-race safe. |
| Host imports / reentrancy | Nested same-instance Wasm reentry from a host import is regression-tested, but plugin-managed caller identity must not be invoked reentrantly. | The nested reentry test covers outer Wasm → Go host → inner Wasm, including GC and traps ([`src/wago/host_reentry_stress_test.go:13-17`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/host_reentry_stress_test.go#L13-L17), [`:36-68`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/host_reentry_stress_test.go#L36-L68)). The managed plugin API says its resolved caller pointer is identity only and must not be invoked reentrantly ([`src/wago/managed_instances.go:58-65`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/managed_instances.go#L58-L65)). A broader stable host-import reentrancy contract is not documented. |

### Limits and interruption

| Capability | Recommended value | Evidence and exact scope |
|---|---|---|
| Linear-memory limit | `true` | `RuntimeConfig.WithMemoryLimitPages` caps a module’s declared maximum in 64 KiB pages ([`src/wago/config.go:207-212`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/config.go#L207-L212)). Policy `MaxMemoryBytes` rejects a module whose maximum exceeds the per-instantiation policy ([`src/wago/policy.go:10-25`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/policy.go#L10-L25), [`:50-60`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/policy.go#L50-L60)). |
| Table limit | `partial` | `Policy.MaxTableEntries` checks each module table’s declared minimum/current initial size at instantiation, not its declared growth maximum ([`src/wago/policy.go:20-25`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/policy.go#L20-L25), [`:61-67`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/policy.go#L61-L67)). Do not describe this as a complete table-growth ceiling. |
| Context deadline / cancellation | `true` on amd64 and arm64 | `InvokeContext` interrupts at native safepoints and returns `ctx.Err()`; other architectures check only before entry ([`src/wago/api.go:1688-1715`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/api.go#L1688-L1715)). Safepoints are function entries and loop headers on both backends ([`src/wago/api.go:1920-1925`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/api.go#L1920-L1925)). Typed `Call(ctx, …)` uses the same watcher ([`src/wago/instance_call.go:12-21`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/instance_call.go#L12-L21), [`:49-57`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/instance_call.go#L49-L57)). This is cooperative safepoint interruption, not fuel accounting or asynchronous instruction-level preemption. |
| `Policy.MaxInvokeDuration` | `accepted-but-not-enforced` | The field comment explicitly says it is reserved and callers should use `Call(ctx, …)` ([`src/wago/policy.go:23-25`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/policy.go#L23-L25)). Do not flatten this into “execution deadlines unsupported”; the context API supports them while this policy field does not. |
| Fuel / epoch accounting | `false` | No public fuel or epoch budget API is present. The implementation uses context-triggered trap-cell polling instead. |
| Runtime-wide instance cap | `false-in-core` | Core intentionally leaves instance pools and actor/process policy to plugins ([`README.md:545-547`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/README.md#L545-L547)). |
| Aggregate memory accounting | `false` / unsupported claim | The sources expose per-module/per-managed-plugin declared limits, but no runtime-wide aggregate live-memory budget was found. |

### WebAssembly and WASI support

The implementation-defined default/ceiling feature set includes mutable globals, sign extension, multi-value, bulk memory, non-trapping float-to-int, reference types, SIMD, and extended constant expressions; tail calls have a bit name but are deliberately omitted from the supported ceiling ([`src/wago/config.go:44-70`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/config.go#L44-L70)).

| Feature family | Status |
|---|---|
| WebAssembly 1.0 MVP | Implemented; see the verification caveats below. |
| WebAssembly 2.0 core: bulk memory, multi-value, reference types, sign extension, non-trapping conversions | Implemented and default-enabled ([`src/wago/config.go:44-70`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/config.go#L44-L70)). |
| Extended constant expressions | Implemented and default-enabled ([`src/wago/config.go:36-39`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/config.go#L36-L39), [`:62-69`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/config.go#L62-L69)). |
| SIMD | Implemented and feature-gated. ARM64 admits baseline NEON; amd64 requires AVX OS support, SSSE3, and SSE4.1 ([`src/wago/simd_cpu.go:10-16`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/simd_cpu.go#L10-L16), [`:31-48`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/simd_cpu.go#L31-L48)). Required platform CI runs the SIMD suite on all three native runtime targets ([`.github/workflows/ci.yml:178-184`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/.github/workflows/ci.yml#L178-L184)). |
| Branch hints | Implemented as metadata; ARM64 uses them for layout/pinning. The status is documented in [`FEATURES.md:54`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/FEATURES.md#L54). |
| Threads/atomics | Planned / unsupported ([`FEATURES.md:55`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/FEATURES.md#L55)). |
| Tail calls | Planned / unsupported ([`FEATURES.md:52`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/FEATURES.md#L52)); the backend ceiling excludes the tail-call bit ([`src/wago/config.go:58-70`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/config.go#L58-L70)). |
| Multi-memory | Not planned / unsupported ([`FEATURES.md:60`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/FEATURES.md#L60)). |
| Exception handling | Not planned / unsupported ([`FEATURES.md:61`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/FEATURES.md#L61)). |
| Wasm GC | Not planned / unsupported ([`FEATURES.md:62`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/FEATURES.md#L62)). |
| Component Model | Unsupported / no implementation evidence found. |
| WASI Preview 1 | **Not implemented in Wago core.** The wazero applicability ledger explicitly marks upstream WASI tests not applicable because Wago does not implement the WASI/OS/CLI integration in core ([`docs/wazero-test-applicability.md:120-138`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/docs/wazero-test-applicability.md#L120-L138)). The CLI recognizes external plugin identifiers such as `wago-org/wasi`, but that is package plumbing, not evidence of a core WASI implementation ([`cli/wagocli/deps.go:25-35`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/cli/wagocli/deps.go#L25-L35)). Audit and cite the separate WASI plugin before claiming a function-level WASI matrix. |
| WASI Preview 2 | Unsupported / no implementation evidence found. |

### Compiled artifacts

| Fact | Evidence |
|---|---|
| Go API can serialize/load `.wago` blobs | [`README.md:486-502`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/README.md#L486-L502). |
| Current format version | Codec v23; older versions are rejected ([`src/wago/api.go:1599-1605`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/api.go#L1599-L1605), [`:1632-1639`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/api.go#L1632-L1639)). |
| Guard-page code is not serializable | The blob does not record the required memory-layout contract, so serialization fails ([`src/wago/api.go:1607-1616`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/api.go#L1607-L1616)). |
| Wide-SIMD plugin code is not serializable | CPU requirements are not yet recorded ([`src/wago/api.go:1617-1619`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/api.go#L1617-L1619)). |
| Safe runtime identity policy | Codec v23 never serializes live reference tokens, target/thunk addresses, owners, or store identity ([`src/wago/api.go:1601-1605`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/api.go#L1601-L1605)). |
| Stable cross-version/architecture compatibility | **Not promised.** CLI cache keys/productization are still planned ([`README.md:498-502`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/README.md#L498-L502)); the roadmap says future keys need module hash, compiler version, CPU features, bounds mode, and ABI ([`ROADMAP.md:130-132`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/ROADMAP.md#L130-L132)). The format contains native code but no explicit target-architecture field in its encoder ([`src/wago/codec.go:48-97`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/codec.go#L48-L97)); website copy should say blobs are internal/versioned and same-compatible-target only, not portable artifacts. |

## Verification and compatibility claim

### What the committed report actually proves

The committed public report says it was generated by `make verify-public` on `darwin/arm64`, with 96,972 passed checks, 0 failed, 22 skipped, and 86.1% coverage ([`VERIFICATION.md:1-15`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/VERIFICATION.md#L1-L15)).

The generator defines five independently counted gates, so the headline is checks, not unique source assertions ([`scripts/verification.sh:1-4`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/scripts/verification.sh#L1-L4)). It runs:

1. all Go tests;
2. selected guard-page Go and corpus tests;
3. the pinned Spec 1.0 execution harness;
4. exact Spec 2.0 validation and execution wrappers;
5. the SIMD execution suite

([`scripts/verification.sh:54-76`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/scripts/verification.sh#L54-L76)).

The pinned upstream corpora at this source revision are:

- WebAssembly/testsuite MVP: `a8bcbafe6d2fb191ce0188de0e18fdc107fa2598`;
- WebAssembly/spec Release 2: `05ca4182176763112561ae20153975c12bd689e4`;
- WARP reference submodule: `e0836b97d76f311c3be025feaf67159485893d05`.

The submodule owners are declared in [`.gitmodules:1-13`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/.gitmodules#L1-L13). The Release 2 harness discovers every `.wast` under official `test/core` and hashes paths plus contents to prevent silent fixture drift ([`internal/spectest/release2.go:16-66`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/internal/spectest/release2.go#L16-L66)).

Required CI runs native runtime/corpus/SIMD tests on Linux/amd64, Linux/arm64, and Darwin/arm64, and separately runs exact Core v2 on Linux/amd64 and Linux/arm64 ([`.github/workflows/ci.yml:92-214`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/.github/workflows/ci.yml#L92-L214)).

### Wazero scope

Wago does **not** run the complete upstream wazero test suite unchanged. It maintains an applicability ledger for all 234 Go test files at wazero revision `236c2458ed22010150de76c5397eca2c89af3b4f`; files are classified as ported/already covered/not applicable, and named port files adapt relevant contracts ([`docs/wazero-test-applicability.md:1-25`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/docs/wazero-test-applicability.md#L1-L25)).

Exact imported fixture scope is:

- 71 wazero fuzz regression binaries;
- 23 wazero engine binaries;
- 63 extended-constant artifacts;
- 782 artifacts from exception-handling, tail-call, threads, and typed-function-reference suites;
- 939 total upstream artifacts, pinned by SHA-256 digest `910700035d51ffc50d380261168120f8d97ef4f0fb42e9c6dfe0824a79b8037a`.

The fixtures are copied and assertions are adapted in Wago tests, not run unchanged ([`testdata/wazero/README.md:1-23`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/testdata/wazero/README.md#L1-L23)). The ledger additionally pins exact Core v2 counts: 147 WAST files, 1,600 modules, 2,880 validation assertions, 1,077 malformed-text commands, and 48,331 execution assertions including 83 unlinkable assertions ([`docs/wazero-test-applicability.md:42-66`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/docs/wazero-test-applicability.md#L42-L66)).

Recommended canonical wording:

> At Wago commit `7d8c58a`, required CI runs the native runtime and corpus gates on Linux/AMD64, Linux/ARM64, and Darwin/ARM64. The committed Darwin/ARM64 public-verification run reports 96,972 checks passed, 0 failed, and 22 Go-test skips. Wago also accounts for all 234 wazero Go test files at wazero commit `236c245…`: applicable runtime/compiler contracts are ported or matched by named Wago suites, while non-applicable wazero product and implementation tests are listed explicitly. Imported fixtures are copied and adapted, not run unchanged.

### Wasmtime scope

**Unsupported claim:** no Wasmtime suite pin, fixture import, applicability ledger, or adapted Wasmtime test collection exists in canonical `origin/main`. Wasmtime appears in the startup benchmark as a released external runtime, not as an imported compatibility suite ([`README.md:611-627`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/README.md#L611-L627)).

Do not publish “passes the full Wasmtime test suite” until a pinned, reviewable scope and generated result exist.

### Verification-report caveats that the generated facts layer should fix

- `VERIFICATION.md` records the host but not a tested Wago commit, upstream corpus commits, generation timestamp, CI run URL, or skip manifest. Add these fields before presenting it as independently reproducible evidence.
- The report’s 22 skips are only Go-test/subtest skips: the generator deliberately sets spec rows to zero skips and sums only normal and guard skips ([`scripts/verification.sh:97-123`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/scripts/verification.sh#L97-L123)).
- `SPECTEST.md` is stale/conflicting: it reports 16,592 MVP passes and 1,591 skips ([`SPECTEST.md:1-7`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/SPECTEST.md#L1-L7)), while the current public report records 16,026 Spec 1.0 execution assertions and zero in its skip column ([`VERIFICATION.md:9-15`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/VERIFICATION.md#L9-L15)). The generated website must not combine these into one claim.
- The 96,972 headline mixes Go tests/subtests and conformance assertions. Preserve the row units instead of describing all 96,972 as spec assertions.

## Security and fuzzing

Supported claims:

- Required CI runs `go test -race` on `src/wago` and `src/core/runtime` ([`.github/workflows/ci.yml:78-90`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/.github/workflows/ci.yml#L78-L90)).
- The repository contains Go fuzz targets for frontend GC descriptors, byte-backed validation differentials, runtime GC descriptors/operations/tiny allocation, and compiled-codec decoding; for example [`src/wago/codec_fuzz_test.go:11-64`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/codec_fuzz_test.go#L11-L64).
- All 71 pinned wazero fuzz regression fixtures are ordinary regression tests with concrete oracles ([`src/wago/wazero_fuzzcases_port_test.go:23-52`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/src/wago/wazero_fuzzcases_port_test.go#L23-L52)).

Unsupported or unknown claims:

- There is no committed `SECURITY.md` at `origin/main`.
- No scheduled or time-budgeted fuzzing workflow was found; normal `go test` runs fuzz seed corpora but is not evidence of continuous fuzzing.
- No first-party vulnerability-reporting address, response SLA, advisory process, or supported-version security policy was found.
- The roadmap still lists differential module fuzzing against WARP as planned ([`ROADMAP.md:134-139`](https://github.com/wago-org/wago/blob/7d8c58aa454adbdc1a1c80a5b8b2b7f1cfbad8de/ROADMAP.md#L134-L139)).

The website should say “contains fuzz targets and pinned fuzz-regression tests” rather than “continuously fuzzed,” and should not invent an advisory process.

## Claims that must not be generated from current sources

- A stable version such as `0.1.0-beta.3`.
- Native runtime support for Darwin/amd64 or Windows.
- A complete table-growth ceiling from `Policy.MaxTableEntries`; current enforcement checks initial/minimum size.
- Fully parallel execution of independent instances.
- A comprehensive stable concurrency contract for every public type.
- `Policy.MaxInvokeDuration` enforcement (context deadlines are a separate supported API).
- Fuel or epoch accounting.
- Runtime-wide aggregate memory accounting.
- Core WASI Preview 1/2 or Component Model support.
- “Passes the full wazero suite unchanged.”
- “Passes the full Wasmtime suite.”
- Portable or stable cross-version `.wago` artifacts.
- Continuous fuzzing, a security response SLA, or an advisory process.

## Priority fixes for the generated facts source

1. Generate provenance fields: Wago commit, source date, verification timestamp, host, CI run URL, corpus repository/commit/digest, and per-gate units.
2. Generate platforms from the required runtime-test matrix, not the release build matrix.
3. Keep `contextDeadline=true`, `policyMaxInvokeDuration=false`, and `fuel=false` as distinct fields.
4. Encode the current process-wide native serialization explicitly; do not promise independent-instance parallel execution.
5. Describe wazero coverage as a pinned applicability-and-port ledger; omit Wasmtime-suite language.
6. Make WASI a separate plugin-level fact with its own audited source and function matrix.
7. Treat `.wago` compatibility as versioned/internal until target, ABI, CPU, compiler, and bounds-mode compatibility are encoded and documented.
