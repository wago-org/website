# Wago compatibility and verification

Last synchronized: 2026-11-12
Wago source commit: 227dfd64ddb3760ae8547eb69a27da38c6cd8676
Canonical JSON: https://wago.sh/data/facts.json

## Public verification

Host: `published repository baselines`
Historical MVP result: 16592 passed, 0 failed, 1591 skipped assertions.

| Gate | Passed | Failed | Skipped | Accounting unit |
| --- | ---: | ---: | ---: | --- |
| MVP legacy | 16592 | 0 | 1591 | assertions |

Core 3 is a separate baseline: 58038 passing assertions across 258 files, with 0 failed and 0 skipped. Do not add counts across suites.

## Pinned official corpora

| Corpus | Commit | Repository |
| --- | --- | --- |
| WebAssembly MVP testsuite | `a8bcbafe6d2fb191ce0188de0e18fdc107fa2598` | https://github.com/WebAssembly/testsuite |
| WebAssembly Core 2.0 specification tests | `05ca4182176763112561ae20153975c12bd689e4` | https://github.com/WebAssembly/spec |
| WebAssembly Core 3.0 specification tests | `9d36019973201a19f9c9ebb0f10828b2fe2374aa` | https://github.com/WebAssembly/spec |

## Wazero scope

- Upstream commit: `236c2458ed22010150de76c5397eca2c89af3b4f`
- Method: pinned upstream regression corpus integrated into the unified package-test surface
- Copied upstream artifacts: 939
- Artifact SHA-256: `910700035d51ffc50d380261168120f8d97ef4f0fb42e9c6dfe0824a79b8037a`
- Fuzz binaries: 71
- Engine binaries: 23
- Extended-constant artifacts: 63
- Fail-closed proposal artifacts: 782

Wago does not run the complete wazero repository unchanged. The pinned corpus runs through Wago's unified package-test surface.

## Wasmtime scope

No Wasmtime suite pin, fixture import, or applicability ledger is published. Wago does not claim to pass the full Wasmtime suite.
