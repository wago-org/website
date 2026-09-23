# Wago benchmark interpretation

Runtime tables measured: 2026-09-23
Runtime-table Wago source commit: fc99b1719a7d499f8b8349c6c871c6abdce3f9c0
End-to-end startup sweep measured: 2026-09-10
Startup-sweep Wago source commit: 5158df0b6eb24a210460df5ad1c72832f98af3e5
Canonical JSON: https://wago.sh/data/facts.json

## Published data

- Whole-process end-to-end latency: https://wago.sh/#latency
- Three Go-engine comparisons by architecture: https://wago.sh/#performance
- Structured rows: https://wago.sh/data/project.json
- Full Markdown tables: https://wago.sh/llms-full.txt

## Interpretation rules

- Compare runtimes only within the same architecture and workload.
- Do not compare absolute values across machines.
- Runtime tables use 91 selected corpus workloads, including all 60 command programs, with three samples per measurement and medians.
- Comparisons and headline aggregates use only workloads measured by both engines; 12 programs with pinned V8 or Wasmtime oracles have Wago-only rows.
- The json-as and json-as (SIMD) execution rows are geometric means of their serialize and deserialize operations.
- Allocation rows measure Go heap allocation traffic measured during the named operation.
- Allocation rows exclude guest linear memory, native code mappings, native virtual-memory reservations, process RSS/PSS.

## Many-instance benchmark

Status: protocol-published-results-not-measured
Planned instance counts: 1, 8, 80, 120

No 80-instance memory or throughput result is claimed until raw samples and reproduction commands are committed.
