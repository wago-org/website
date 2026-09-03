# Wago benchmark interpretation

Last synchronized: 2026-09-03
Wago source commit: 7a2bd2451cda55fb4b2b23071a5cd68a2473408e
Canonical JSON: https://wago.sh/data/facts.json

## Published data

- Whole-process end-to-end latency: https://wago.sh/#latency
- Six-engine comparisons by architecture: https://wago.sh/#performance
- Structured rows: https://wago.sh/data/project.json
- Full Markdown tables: https://wago.sh/llms-full.txt

## Interpretation rules

- Compare runtimes only within the same architecture and workload.
- Do not compare absolute values across machines.
- Allocation rows measure Go heap allocation traffic measured during the named operation.
- Allocation rows exclude guest linear memory, native code mappings, native virtual-memory reservations, process RSS/PSS.

## Many-instance benchmark

Status: protocol-published-results-not-measured
Planned instance counts: 1, 8, 80, 120

No 80-instance memory or throughput result is claimed until raw samples and reproduction commands are committed.
