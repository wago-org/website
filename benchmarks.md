# Wago benchmark interpretation

Runtime tables measured: 2026-09-23
Runtime-table Wago source commit: 4651e8cd7a3b8a91bc9d796d5def468e9b53c10f
Host-boundary measured: 2026-09-24
Host-boundary Wago source commit: efe96ebb62f230ac3a487222988fc5627b7c6ff7
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
- Runtime tables use 40 curated corpus workloads, including 21 command programs, with three samples per measurement and medians.
- The Host → Wasm row uses Wago `Instance.Invoke` and wazero's resolved public function call on the same `(i32) → i32` identity export. Ten samples per architecture were measured with `GOMAXPROCS=1`, `WAGO_BOUNDS=signals`, `-tags wago_guardpage`, and `-benchtime=750ms`; the displayed values are medians. Wago's call returned an instance-owned result slice with zero Go heap allocations.
- The Wasm → host row still uses a caller-owned Wago session held across repeated calls; session opening and closing are outside the timed call.
- Every displayed workload has measurements from both Wago and Wazero on arm64 and amd64; the full correctness corpus remains separate.
- The json-as (simd) execution row is the geometric mean of its serialize and deserialize operations.
- Allocation rows measure Go heap allocation traffic measured during the named operation.
- Allocation rows exclude guest linear memory, native code mappings, native virtual-memory reservations, process RSS/PSS.

From the host-boundary Wago commit, run this command in `bench/` on each architecture:

```sh
GOWORK=off GOMAXPROCS=1 WAGO_BOUNDS=signals go test -tags wago_guardpage ./suite -run '^$' -bench '^BenchmarkExec(InstanceCall_wago|CallOverhead_wazero)$' -benchmem -benchtime=750ms -count=10
```

## Many-instance benchmark

Status: protocol-published-results-not-measured
Planned instance counts: 1, 8, 80, 120

No 80-instance memory or throughput result is claimed until raw samples and reproduction commands are committed.
