# Wago security and isolation status

Last synchronized: 2026-09-03
Wago source commit: a6f3810b85b31764c55d7e4757be1f8f6314c0d7
Canonical JSON: https://wago.sh/data/facts.json

## Published controls

- Declared linear-memory maxima can be limited at instantiation.
- Table policy checks initial/minimum entries; it is not a complete growth ceiling.
- Context cancellation and deadlines interrupt amd64/arm64 guest code at native safepoints.
- Explicit bounds checks are the default; signal-backed guard pages are opt-in and CI-tested.
- Capability policy can allow or deny plugin-provided host access.
- The repository contains Go fuzz targets and pinned fuzz-regression fixtures.

## Not currently published

- Dedicated SECURITY.md or first-party vulnerability-reporting process
- Third-party security audit
- Continuous time-budgeted fuzzing claim
- Deterministic instruction fuel
- Runtime-wide aggregate memory budget
- Stable cross-release compiled-artifact compatibility guarantee

For hostile multi-tenant workloads, process or container isolation remains an additional defense boundary.
