# Wago compatibility and verification

Last synchronized: 2026-08-05
Wago source commit: ff87ac3a5868ebe074f06bf91ec61ac60c600924
Canonical JSON: https://wago.sh/data/facts.json

## Public verification

Host: `darwin/arm64`
Result: 96972 passed, 0 failed, 22 skipped checks.

| Gate | Passed | Failed | Skipped | Accounting unit |
| --- | ---: | ---: | ---: | --- |
| Normal | 4333 | 0 | 17 | Go tests and subtests |
| Guard pages | 1077 | 0 | 5 | Go tests and subtests |
| Spec 1.0 | 16026 | 0 | 0 | execution assertions |
| Spec 2.0 | 51211 | 0 | 0 | 2880 validation + 48331 execution assertions |
| SIMD | 24325 | 0 | 0 | execution assertions |

The headline mixes Go tests/subtests and conformance assertions. Preserve the per-row accounting unit.

## Pinned official corpora

| Corpus | Commit | Repository |
| --- | --- | --- |
| WebAssembly MVP testsuite | `a8bcbafe6d2fb191ce0188de0e18fdc107fa2598` | https://github.com/WebAssembly/testsuite |
| WebAssembly Core 2.0 specification tests | `05ca4182176763112561ae20153975c12bd689e4` | https://github.com/WebAssembly/spec |

## Wazero scope

- Upstream commit: `236c2458ed22010150de76c5397eca2c89af3b4f`
- Go test files audited: 234
- Method: ported/adapted coverage with an applicability ledger
- Copied upstream artifacts: 939
- Artifact SHA-256: `910700035d51ffc50d380261168120f8d97ef4f0fb42e9c6dfe0824a79b8037a`
- Fuzz binaries: 71
- Engine binaries: 23
- Extended-constant artifacts: 63
- Fail-closed proposal artifacts: 782

Wago does not run the complete wazero repository unchanged. Applicable contracts and fixtures are ported or adapted, and exclusions are recorded in the applicability ledger.

## Wasmtime scope

No Wasmtime suite pin, fixture import, or applicability ledger is published. Wago does not claim to pass the full Wasmtime suite.
