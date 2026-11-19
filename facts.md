# Wago facts

Last synchronized: 2026-11-12
Wago source commit: fba530d8c1fd6107e0db433cb77df4a002215eb0
Canonical JSON: https://wago.sh/data/facts.json

## Identity and release

- License: MPL-2.0
- Implementation: Go
- Pure Go: yes
- cgo: no
- Execution: Railshot single-pass native compiler
- Interpreter tier: no
- Stable version: none published
- Release state: Beta / pre-v1. Public installers are documented; no stable-v1 API compatibility promise. Canary tags are discontinued: use commit hashes for development builds.

## Native runtime targets

| Target | Status | Scope |
| --- | --- | --- |
| `linux/amd64` | supported | documented native runtime target |
| `linux/arm64` | supported | documented native runtime target |
| `darwin/amd64` | supported | documented native runtime target |
| `darwin/arm64` | supported | documented native runtime target |
| `windows/amd64` | supported | documented native runtime target |
| `windows/arm64` | supported | documented native runtime target |
| `linux/riscv64` | supported | documented native runtime target |

## Concurrency

- Runtime: concurrent compile/instantiate/execute on distinct objects is race-tested
- Compiled module: compile once and instantiate many; blanket method-level goroutine-safety is not yet documented
- Instance: serialize public calls on each instance
- Separate instances: eligible independent instances may execute native code concurrently by default; cross-instance dependencies or shared execution state can require the process-wide lease
- Native execution parallelism: instance-local leases for eligible independent instances; process-wide fallback for dependent execution
- Result lifetime: instance-owned result buffer remains valid only until the next call

Independent execution is enabled by default through `RuntimeConfig.WithIndependentInstanceExecution`. Imported memories, tables, globals, cross-instance Wasm function bindings, and shared Runtime GC domains can disqualify an instance. Publishing native resources can revoke independence. These are eligibility rules, not a claim that every separate instance runs in parallel or every shared-memory configuration is globally serialized. Serialize public calls per instance regardless of its native lease.

## Limits and interruption

- Declared memory limit: supported
- Table limit: Policy.MaxTableEntries checks per-table runtime capacity, including resolved imported capacity at instantiation; not an aggregate table-memory budget
- Context cancellation/deadline: asynchronous native interruption on standard-Go Linux amd64/arm64 and macOS arm64; cooperative safepoints on other supported amd64/arm64 configurations; TinyGo requires scheduler=threads for cancelable entry
- Policy.MaxInvokeDuration: deprecated-unsupported-use-context-deadline
- Deterministic fuel: not implemented
- Aggregate memory accounting: not published

## WASI

- Delivery: outside core; external plugin integration exists but its function-level support was not audited here
- Preview 1: function-level support matrix not published
- Preview 2: not claimed

## WebAssembly proposal tracker

- i32 / i64 integer ops (historical): pass
- f32 / f64 ops (historical): pass
- f32 / f64 ceil / floor / trunc / nearest / copysign (historical): pass
- Conversions + reinterpret (historical): pass
- Float→int trunc NaN/overflow traps (historical): pass
- Control flow: block / loop / if / else / br / br_if / br_table / return (historical): pass
- call / call_indirect (historical): pass
- select, drop, nop, unreachable (historical): pass
- Locals (historical): pass
- Globals (historical): pass
- Linear memory load/store (historical): pass
- memory.size / memory.grow (historical): pass
- Active data segments (historical): pass
- Tables + active element segments (historical): pass
- Function imports / exports (historical): pass
- Memory / table / global imports & exports (historical): pass
- start function (historical): pass
- Sign-extension ops: pass
- Non-trapping float→int: pass
- Multi-value: pass
- Reference types: pass
- Bulk memory: pass
- Fixed-width SIMD: pass
- Tail calls: pass
- Extended const expressions: pass
- Typed function references: pass
- Memory64: pass
- Multiple memories: pass
- Garbage collection: pass
- Exception handling: pass
- Relaxed SIMD: pass
- Branch hinting: pass
- JS Promise integration: planned
- Web Content Security Policy: none
- Threads & atomics: flag
- Compact import section: pass
- Wide arithmetic: pass
- ESM integration: none
- Stack switching: planned
- Custom page sizes: planned
- Custom descriptors & JS interop: unsupported
- Relaxed dead-code validation: unsupported
- Numeric values in WAT data: unsupported
- Extended name section: unsupported
- Rounding variants: unsupported
- Compilation hints: planned
- JS primitive builtins: none
- Acquire-Release Atomics: planned
- Multibyte array access: unsupported
- Half precision (FP16): unsupported
- Type imports: unsupported
- Component model: partial
- C / C++ embedding API: unsupported
- Flexible vectors: unsupported
- Memory control: unsupported
- Reference-typed strings: unsupported
- Profiles: unsupported
- Shared-everything threads: unsupported
- Frozen values: unsupported
- More array constructors: unsupported
- JIT interface: unknown
- Type reflection (JS API): unsupported
- JS text-encoding builtins: unknown

## Read next

- Exact compatibility scope: https://wago.sh/compatibility.md
- Security and isolation status: https://wago.sh/security.md
- Benchmark interpretation: https://wago.sh/benchmarks.md
