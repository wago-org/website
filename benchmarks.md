# Wago benchmark interpretation

Runtime tables measured: 2026-09-29
Runtime-table Wago source commit: 9f01d145d54ac7ab458b6b2f6047db90a757410a
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
- Runtime tables cover all 125 catalog workloads. Displayed comparisons have three samples per measurement, with medians shown; workloads missing a backend comparison are omitted from that row.
- The Host → Wasm row uses Wago `Instance.Invoke` and wazero's resolved public function call on the same `(i32) → i32` identity export. Wago's call returned an instance-owned result slice with zero Go heap allocations.
- The Wasm → host row still uses a caller-owned Wago session held across repeated calls; session opening and closing are outside the timed call.
- Every displayed workload has measurements from both Wago and Wazero on arm64 and amd64; the full correctness corpus remains separate.
- The json-as (simd) execution row is the geometric mean of its serialize and deserialize operations.
- Allocation rows measure Go heap allocation traffic measured during the named operation.
- Allocation rows exclude guest linear memory, native code mappings, native virtual-memory reservations, process RSS/PSS.

The runtime tables were measured on arm64 with Go 1.26.5 and amd64 with Go 1.22.2, using `GOMAXPROCS=1`, `WAGO_BOUNDS=signals`, `-tags wago_guardpage`, three samples, and `-benchtime=200ms`. Each benchmark checks its workload oracle before timing.

To reproduce the core call overhead measurement in `bench/`:

```sh
GOWORK=off GOMAXPROCS=1 WAGO_BOUNDS=signals go test -tags wago_guardpage ./suite -run '^$' -bench '^BenchmarkExec(InstanceCall_wago|CallOverhead_wazero)$' -benchmem -benchtime=200ms -count=3
```

## Many-instance benchmark

Status: protocol-published-results-not-measured
Planned instance counts: 1, 8, 80, 120

No 80-instance memory or throughput result is claimed until raw samples and reproduction commands are committed.
