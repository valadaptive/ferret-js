def i1 main { //boolean 0 for success, 1 for failure
  str = "Hello, world!\NUL" //str has type u8*
  call print str
  ret 0
  write stdout "Unreachable" 5
}
