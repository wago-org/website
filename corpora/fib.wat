(module
  (func (export "fib") (param $n i32) (result i32)
    (local $a i32)
    (local $b i32)
    (local $next i32)
    (local $i i32)

    i32.const 1
    local.set $a

    loop $again
      local.get $n
      local.get $i
      i32.gt_s
      if
        local.get $a
        local.get $b
        i32.add
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
