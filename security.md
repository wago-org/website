# Wago security and isolation status

Last synchronized: 2026-11-12
Wago source commit: fba530d8c1fd6107e0db433cb77df4a002215eb0
Canonical JSON: https://wago.sh/data/facts.json

## Published controls

- Declared linear-memory maxima can be limited at instantiation.
- Policy.MaxTableEntries checks per-table runtime capacity, including resolved imported capacity at instantiation; not an aggregate table-memory budget.
- Context cancellation/deadlines: asynchronous native interruption on standard-Go Linux amd64/arm64 and macOS arm64; cooperative safepoints on other supported amd64/arm64 configurations; TinyGo requires scheduler=threads for cancelable entry.
- Without the wago_guardpage build tag, explicit bounds checks are the default. The tag changes the default to guard pages; WAGO_BOUNDS can override selection on supported configurations.
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
