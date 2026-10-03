# Wago example modules

Small WebAssembly modules used by the Wago documentation. Each binary has an editable WAT source beside it.

| Module | What it demonstrates |
| --- | --- |
| [`fib.wasm`](https://wago.sh/corpora/fib.wasm) | A self-contained exported function with a 64-bit result and no host imports |
| [`wasi-hello.wasm`](https://wago.sh/corpora/wasi-hello.wasm) | WASI Preview 1 standard output |
| [`wasi-args.wasm`](https://wago.sh/corpora/wasi-args.wasm) | WASI Preview 1 arguments and standard output |

Rebuild the binaries with [WABT](https://github.com/WebAssembly/wabt):

```sh
for source in corpora/*.wat; do
  wat2wasm "$source" -o "${source%.wat}.wasm"
done
```

`fib` accepts an `i32` index and returns an `i64` value. Wago prints signed results, which are exact for indices 0 through 92. The unsigned result is exact through 93; higher values wrap modulo 2^64. For example, `wago fib.wasm 50` returns `12586269025`.

The website build checks the manifest, Wasm headers, matching source files, and Fibonacci results before deployment.
