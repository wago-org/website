# Wago facts

Last synchronized: 2026-11-12
Wago source commit: 227dfd64ddb3760ae8547eb69a27da38c6cd8676
Canonical JSON: https://wago.sh/data/facts.json

## Identity and release

- Implementation: Go
- Pure Go: yes
- cgo: no
- Execution: single-pass native compiler
- Interpreter tier: no
- Stable version: none published
- Release state: Pre-v1 development with beta releases and per-commit canary tags plus workflow artifacts; public stable installation is not yet claimed.

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
- Instance: one active caller at a time; serialize calls
- Separate instances: concurrent callers are accepted, but native Wasm activations are serialized process-wide
- Native execution parallelism: one process-wide native activation at a time
- Result lifetime: instance-owned result buffer remains valid only until the next call

## Limits and interruption

- Declared memory limit: supported
- Table limit: partial: initial/minimum size checked; growth maximum is not enforced by Policy.MaxTableEntries
- Context cancellation/deadline: supported on amd64 and arm64 at cooperative native safepoints
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
