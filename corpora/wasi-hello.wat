(module
  (import "wasi_snapshot_preview1" "fd_write"
    (func $fd_write (param i32 i32 i32 i32) (result i32)))

  (memory (export "memory") 1)
  (data (i32.const 32) "hello from wasi\n")

  (func (export "_start")
    ;; One iovec: the string begins at byte 32 and is 16 bytes long.
    i32.const 0
    i32.const 32
    i32.store
    i32.const 4
    i32.const 16
    i32.store

    ;; fd_write(stdout, &iovec, 1, &bytes_written)
    i32.const 1
    i32.const 0
    i32.const 1
    i32.const 16
    call $fd_write
    drop))
