# Wago facts

Last synchronized: 2026-09-03
Wago source commit: 7ba65738410560f18d7a09cdbba26b752a5e077d
Canonical JSON: https://wago.sh/data/facts.json

## Identity and release

- Implementation: Go
- Pure Go: yes
- cgo: no
- Execution: single-pass native compiler
- Interpreter tier: no
- Stable version: none published
- Release state: Pre-v0.1 development with nightly and canary artifacts; public stable installation is not yet claimed.

## Native runtime targets

| Target | Status | Scope |
| --- | --- | --- |
| `linux/amd64` | supported | native runtime CI |
| `linux/arm64` | supported | native runtime CI |
| `darwin/arm64` | supported | native runtime CI |
| `darwin/amd64` | compiler-only | portable compiler/encoder checks; native JIT ABI is not claimed |
| `windows/*` | planned | no native runtime target claimed |

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

- i32 / i64 integer ops: pass
- f32 / f64 ops: pass
- f32 / f64 ceil / floor / trunc / nearest / copysign: pass
- Conversions + reinterpret: pass
- Float→int trunc NaN/overflow traps: pass
- Control flow: block / loop / if / else / br / br_if / br_table / return: pass
- call / call_indirect: pass
- select, drop, nop, unreachable: pass
- Locals: pass
- Globals: pass
- Linear memory load/store: pass
- memory.size / memory.grow: pass
- Active data segments: pass
- Tables + active element segments: pass
- Function imports / exports: pass
- Memory / table / global imports & exports: pass
- start function: pass
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
- Web Content Security Policy: planned
- Threads & atomics: pass
- Compact import section: planned
- Wide arithmetic: planned
- ESM integration: planned
- Stack switching: planned
- Custom page sizes: planned
- Custom descriptors & JS interop: planned
- Relaxed dead-code validation: planned
- Numeric values in WAT data: planned
- Extended name section: planned
- Rounding variants: planned
- Compilation hints: planned
- JS primitive builtins: planned
- Acquire-Release Atomics: planned
- Multibyte array access: planned
- Half precision (FP16): planned
- Type imports: planned
- Component model: planned
- C / C++ embedding API: planned
- Flexible vectors: planned
- Memory control: planned
- Reference-typed strings: planned
- Profiles: planned
- Shared-everything threads: planned
- Frozen values: planned
- More array constructors: planned
- JIT interface: planned
- Type reflection (JS API): planned
- JS text-encoding builtins: planned

## Read next

- Exact compatibility scope: https://wago.sh/compatibility.md
- Security and isolation status: https://wago.sh/security.md
- Benchmark interpretation: https://wago.sh/benchmarks.md
