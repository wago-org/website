(module
  (import "wasi_snapshot_preview1" "args_sizes_get"
    (func $args_sizes_get (param i32 i32) (result i32)))
  (import "wasi_snapshot_preview1" "args_get"
    (func $args_get (param i32 i32) (result i32)))
  (import "wasi_snapshot_preview1" "fd_write"
    (func $fd_write (param i32 i32 i32 i32) (result i32)))

  (memory (export "memory") 1)
  (data (i32.const 96) "\n")

  (func (export "_start")
    (local $ptr i32)
    (local $len i32)

    ;; Store argc at byte 0 and the string-buffer size at byte 4.
    i32.const 0
    i32.const 4
    call $args_sizes_get
    drop

    ;; argv[0] is the module name. Print argv[1] when one was supplied.
    i32.const 0
    i32.load
    i32.const 1
    i32.gt_u
    if
      i32.const 16
      i32.const 128
      call $args_get
      drop

      i32.const 20
      i32.load
      local.set $ptr

      block $found_end
        loop $count
          local.get $ptr
          local.get $len
          i32.add
          i32.load8_u
          i32.eqz
          br_if $found_end

          local.get $len
          i32.const 1
          i32.add
          local.set $len
          br $count
        end
      end

      ;; Two iovecs: argv[1], then a newline.
      i32.const 32
      local.get $ptr
      i32.store
      i32.const 36
      local.get $len
      i32.store
      i32.const 40
      i32.const 96
      i32.store
      i32.const 44
      i32.const 1
      i32.store

      i32.const 1
      i32.const 32
      i32.const 2
      i32.const 8
      call $fd_write
      drop
    end))
