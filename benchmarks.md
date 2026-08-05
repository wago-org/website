# Wago benchmark interpretation

Last synchronized: 2026-08-05
Wago source commit: ff87ac3a5868ebe074f06bf91ec61ac60c600924
Canonical JSON: https://wago.sh/data/facts.json

## Published data

- Whole-process startup latency: https://wago.sh/#latency
- Wago versus wazero by architecture: https://wago.sh/#performance
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
