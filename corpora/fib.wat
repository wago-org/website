(module
  (func (export "fib") (param $n i32) (result i64)
    (local $a i64)
    (local $b i64)
    (local $next i64)
    (local $i i32)

    i64.const 1
    local.set $a

    loop $again
      local.get $n
      local.get $i
      i32.gt_s
      if
        local.get $a
        local.get $b
        i64.add
        local.set $next

        local.get $a
        local.set $b

        local.get $next
        local.set $a

        local.get $i
        i32.const 1
        i32.add
        local.set $i

        br $again
      end
    end

    local.get $b)

  (memory (export "memory") 0))
