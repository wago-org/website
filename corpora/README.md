# Wago example modules

Small WebAssembly modules used by the Wago documentation. Each binary has an editable WAT source beside it.

| Module | What it demonstrates |
| --- | --- |
| [`fib.wasm`](https://wago.sh/corpora/fib.wasm) | A self-contained exported function with no host imports |
| [`wasi-hello.wasm`](https://wago.sh/corpora/wasi-hello.wasm) | WASI Preview 1 standard output |
| [`wasi-args.wasm`](https://wago.sh/corpora/wasi-args.wasm) | WASI Preview 1 arguments and standard output |

Rebuild the binaries with [WABT](https://github.com/WebAssembly/wabt):

```sh
for source in corpora/*.wat; do
  wat2wasm "$source" -o "${source%.wat}.wasm"
done
```

The website build checks the manifest, Wasm headers, and matching source files before deployment.
